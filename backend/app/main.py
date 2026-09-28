import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text

from app.config import get_settings
from app.database import engine
from app.routers import auth, masters, users, workspaces

settings = get_settings()

app = FastAPI(title="Orion PLG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# The React app reads error text from `response.data.message`, so answer errors in that shape.
@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": False, "message": exc.detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", [])[1:])
    return JSONResponse(
        status_code=422,
        content={"status": False, "message": f"Invalid {field}: {first.get('msg', 'bad value')}".strip(),
                 "errors": exc.errors()},
    )


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(workspaces.router)
app.include_router(masters.router)


@app.get("/health", tags=["ops"])
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}


# ---------------------------------------------------------------- not-yet-migrated endpoints

_HOP_BY_HOP = {"connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade", "host",
               "content-length", "content-encoding"}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def not_migrated(path: str, request: Request):
    """Endpoints the Python API doesn't implement yet.

    With LEGACY_API_BASE_URL set, forward the call to the existing backend. Note the legacy
    backend validates Azure AD tokens, so forwarded calls only work once it trusts this
    API's JWT. Without it, answer 501. The message avoids the words token/auth/expired so
    the UI does not treat it as a session expiry.
    """
    if not settings.legacy_api_base_url:
        return JSONResponse(
            status_code=501,
            content={"status": False, "message": f"/{path} is not available in the Python API yet"},
        )

    url = f"{settings.legacy_api_base_url.rstrip('/')}/{path}"
    headers = {k: v for k, v in request.headers.items() if k.lower() not in _HOP_BY_HOP}
    async with httpx.AsyncClient(timeout=60) as client:
        upstream = await client.request(
            request.method, url, params=request.query_params, headers=headers, content=await request.body()
        )
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers={k: v for k, v in upstream.headers.items() if k.lower() not in _HOP_BY_HOP},
    )

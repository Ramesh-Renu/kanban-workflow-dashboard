import uuid

from pydantic import BaseModel, ConfigDict, Field


class LooseModel(BaseModel):
    """Request bodies from the UI carry extra keys we don't use — ignore them."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


# ---------------------------------------------------------------- auth


class LoginRequest(LooseModel):
    username: str = Field(min_length=1, max_length=255, description="Username or email")
    password: str = Field(min_length=1, max_length=255)


class RefreshRequest(LooseModel):
    refreshToken: str = Field(min_length=1)


class LogoutRequest(LooseModel):
    refreshToken: str | None = None


class ChangePasswordRequest(LooseModel):
    currentPassword: str
    newPassword: str = Field(min_length=8, max_length=255)


class CreateAccountRequest(LooseModel):
    username: str = Field(min_length=3, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=255)
    displayName: str = Field(min_length=1, max_length=200)
    jobTitle: str | None = None
    isSuperAdmin: bool = False


class ResetPasswordRequest(LooseModel):
    userId: uuid.UUID
    newPassword: str = Field(min_length=8, max_length=255)


# ---------------------------------------------------------------- users


class UserListRequest(LooseModel):
    searchTxt: str | None = None
    team: list[int] | int | None = None
    country: list[int] | int | None = None
    workspace: list[int] | int | None = None
    board: list[int] | int | None = None
    designation: list[int] | int | None = None
    userType: int | None = None
    pageOffset: int = 0
    pageSize: int = 10
    sortBy: str | None = None
    sortOrder: str | None = "asc"


class ShiftTime(LooseModel):
    from_: str = Field(default="", alias="from")
    to: str = ""


class AddUserRequest(LooseModel):
    userProfileId: int = 0
    userId: uuid.UUID
    teamId: int | None = None
    teamName: str | None = None
    isNewTeam: bool = False
    designationId: int | None = None
    designationName: str | None = None
    isNewDesignation: bool = False
    countryId: int | None = None
    userTypeId: int = 46
    shiftTime: ShiftTime | None = None


class UpdateUserTypeRequest(LooseModel):
    userId: uuid.UUID
    userTypeId: int
    previousUserTypeId: int | None = None


class BoardPermissionRequest(LooseModel):
    userBoardPermissionId: int | None = 0
    userId: uuid.UUID
    boardId: int | None = None
    roleId: int | None = None


class AppPermissionRequest(LooseModel):
    userId: uuid.UUID
    appId: int
    permission: int = 1


# ---------------------------------------------------------------- workspaces


class WorkspaceUpsertRequest(LooseModel):
    workspaceId: int = 0
    name: str = Field(min_length=1, max_length=200)
    workflowType: int | None = None


class LabelIn(LooseModel):
    labelId: int | None = 0
    name: str = ""
    color_Code: str | None = None
    position: int = 0


class BoardUpsertRequest(LooseModel):
    workSpaceId: int
    boardId: int = 0
    boardName: str = Field(min_length=1, max_length=200)
    type: str = "subtask"
    labels: list[LabelIn] = []
    deletedLabels: list[int | dict] = []


class DeleteWorkspaceBoardRequest(LooseModel):
    type: str  # "workspace" | "board"
    workSpaceId: int | None = None
    boardId: int | None = None

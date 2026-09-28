import React, { memo, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { Spinner } from "react-bootstrap";
import DOMPurify from "dompurify";
import { fetchAttachmentBlob } from "../../../services";
import { getAttachmentPreviewKind, getFileExtension } from "./attachmentPreviewUtils";

const UNAVAILABLE_MSG =
  "Preview unavailable for this file type.\nPlease download the file to view it.";
const UNAVAILABLE_MSG_NO_DOWNLOAD = "Preview unavailable for this file type.";

const IMAGE_MIME_BY_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

const ensureBlobMime = (blob, fileName, kind) => {
  if (!blob) return blob;
  if (blob.type && blob.type !== "application/octet-stream") return blob;
  const ext = getFileExtension(fileName);
  let mime = "";
  if (kind === "image") mime = IMAGE_MIME_BY_EXT[ext] || "image/png";
  else if (kind === "pdf") mime = "application/pdf";
  else if (kind === "html") mime = "text/html";
  else if (kind === "text") mime = "text/plain";
  if (!mime) return blob;
  return new Blob([blob], { type: mime });
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

const readImageSize = (img) => {
  if (!img) return null;
  const width = img.naturalWidth || img.width || 0;
  const height = img.naturalHeight || img.height || 0;
  if (!width || !height) return null;
  return { width, height };
};

const getWrapContentSize = (wrapEl) => {
  if (!wrapEl) return { width: 0, height: 0 };
  const styles = window.getComputedStyle(wrapEl);
  const padX =
    (Number.parseFloat(styles.paddingLeft) || 0) +
    (Number.parseFloat(styles.paddingRight) || 0);
  const padY =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0);
  return {
    width: Math.max(0, wrapEl.clientWidth - padX),
    height: Math.max(0, wrapEl.clientHeight - padY),
  };
};

const ExpandIcon = ({ expanded }) =>
  expanded ? (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M5 3H3v2H1V1h4v2zm6 0V1h4v4h-2V3h-2zM3 11v2h2v2H1v-4h2zm12 0v4h-4v-2h2v-2h2z"
      />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M1 5V1h4v2H3v2H1zm14 0h-2V3h-2V1h4v4zM3 13h2v2H1v-4h2v2zm10 0v-2h2v4h-4v-2h2z"
      />
    </svg>
  );

const ImagePreview = ({ url, fileName }) => {
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [fitSize, setFitSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef(null);
  const wrapRef = useRef(null);

  const applyNaturalSize = (img) => {
    const size = readImageSize(img);
    if (size) setNaturalSize(size);
  };

  const recomputeFit = () => {
    const wrapSize = getWrapContentSize(wrapRef.current);
    const nat = naturalSize.width
      ? naturalSize
      : readImageSize(imgRef.current) || { width: 0, height: 0 };

    if (!wrapSize.width || !wrapSize.height || !nat.width || !nat.height) {
      setFitSize({ width: 0, height: 0 });
      return;
    }

    const scale = Math.min(wrapSize.width / nat.width, wrapSize.height / nat.height, 1);
    setFitSize({
      width: Math.max(1, Math.round(nat.width * scale)),
      height: Math.max(1, Math.round(nat.height * scale)),
    });
  };

  useEffect(() => {
    setZoom(1);
    setNaturalSize({ width: 0, height: 0 });
    setFitSize({ width: 0, height: 0 });
    const frame = requestAnimationFrame(() => {
      applyNaturalSize(imgRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [url]);

  useEffect(() => {
    recomputeFit();
  }, [naturalSize.width, naturalSize.height]);

  useEffect(() => {
    const wrapEl = wrapRef.current;
    if (!wrapEl || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      recomputeFit();
    });
    observer.observe(wrapEl);
    return () => observer.disconnect();
  }, [naturalSize.width, naturalSize.height, url]);

  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, Number((z - ZOOM_STEP).toFixed(2))));
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, Number((z + ZOOM_STEP).toFixed(2))));
  const zoomReset = () => setZoom(1);

  const hasFit = fitSize.width > 0 && fitSize.height > 0;
  const displayWidth = hasFit ? Math.round(fitSize.width * zoom) : undefined;
  const displayHeight = hasFit ? Math.round(fitSize.height * zoom) : undefined;

  return (
    <div className="attachment-preview__image-panel">
      <div className="attachment-preview__zoom-bar" role="toolbar" aria-label="Image zoom">
        <button type="button" className="attachment-preview__zoom-btn" onClick={zoomOut} title="Zoom out" aria-label="Zoom out">
          −
        </button>
        <span className="attachment-preview__zoom-label">{Math.round(zoom * 100)}%</span>
        <button type="button" className="attachment-preview__zoom-btn" onClick={zoomIn} title="Zoom in" aria-label="Zoom in">
          +
        </button>
        <button type="button" className="attachment-preview__zoom-btn attachment-preview__zoom-btn--reset" onClick={zoomReset} title="Reset zoom" aria-label="Reset zoom">
          Reset
        </button>
      </div>
      <div ref={wrapRef} className="attachment-preview__image-wrap">
        <div
          className="attachment-preview__image-canvas"
          style={
            hasFit
              ? {
                  width: displayWidth,
                  height: displayHeight,
                }
              : undefined
          }
        >
          <img
            ref={imgRef}
            src={url}
            alt={fileName || "Attachment preview"}
            className="attachment-preview__image"
            draggable={false}
            onLoad={(event) => {
              applyNaturalSize(event.currentTarget);
            }}
            style={
              hasFit
                ? {
                    width: `${fitSize.width}px`,
                    height: `${fitSize.height}px`,
                    maxWidth: "none",
                    maxHeight: "none",
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }
                : {
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: "auto",
                    height: "auto",
                  }
            }
          />
        </div>
      </div>
    </div>
  );
};

const PdfPreview = ({ url }) => (
  <iframe title="PDF preview" src={url} className="attachment-preview__frame" />
);

const HtmlPreview = ({ url }) => (
  <iframe
    title="HTML preview"
    src={url}
    className="attachment-preview__frame attachment-preview__frame--html"
    sandbox=""
  />
);

const TextPreview = ({ text }) => (
  <pre className="attachment-preview__text">{text}</pre>
);

const SpreadsheetPreview = ({ rows }) => {
  if (!rows?.length) {
    return <p className="attachment-preview__empty">No spreadsheet data to display.</p>;
  }
  const header = rows[0] || [];
  const body = rows.slice(1);
  return (
    <div className="attachment-preview__sheet-wrap">
      <table className="attachment-preview__sheet">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={`h-${i}`}>{cell == null ? "" : String(cell)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rIdx) => (
            <tr key={`r-${rIdx}`}>
              {header.map((_, cIdx) => (
                <td key={`c-${rIdx}-${cIdx}`}>
                  {row?.[cIdx] == null ? "" : String(row[cIdx])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DocumentPreview = ({ html }) => (
  <div
    className="attachment-preview__doc"
    dangerouslySetInnerHTML={{
      __html: DOMPurify.sanitize(html, {
        ADD_ATTR: ["target"],
      }),
    }}
  />
);

const UnavailablePreview = ({ message = UNAVAILABLE_MSG }) => (
  <div className="attachment-preview__unavailable">
    {message.split("\n").map((line) => (
      <p key={line}>{line}</p>
    ))}
  </div>
);

/**
 * Reusable attachment preview modal for Comments / Activities / Knowledge Base.
 * Fetches via comment API by default, or a custom fetchBlob (no auto-download).
 */
const AttachmentPreview = ({
  show,
  file,
  attachmentType = "ticket",
  fetchBlob,
  onClose,
  onDownload,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [objectUrl, setObjectUrl] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [sheetRows, setSheetRows] = useState([]);
  const [docHtml, setDocHtml] = useState("");
  const [expanded, setExpanded] = useState(false);
  const requestIdRef = useRef(0);
  const objectUrlRef = useRef(null);
  const fetchBlobRef = useRef(fetchBlob);
  fetchBlobRef.current = fetchBlob;

  const canDownload = typeof onDownload === "function";
  const unavailableMsg = canDownload
    ? UNAVAILABLE_MSG
    : UNAVAILABLE_MSG_NO_DOWNLOAD;
  const fileName =
    file?.file_name || file?.fileName || file?.documentName || "Attachment";
  const titleName =
    file?.documentName || file?.file_name || file?.fileName || "Attachment";
  const localFile = file?.file instanceof File ? file.file : null;
  const directSrc = file?.previewSrc || file?.src || "";
  const kind = file
    ? directSrc
      ? "image"
      : getAttachmentPreviewKind(file)
    : "unsupported";
  const attachmentId = file?.attachement_id || file?.id;

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setObjectUrl(null);
  };

  useEffect(() => {
    if (!show) {
      setExpanded(false);
      return undefined;
    }

    // Direct image preview (inline comment images / data URLs) — no API fetch.
    if (directSrc) {
      clearObjectUrl();
      setError("");
      setTextContent("");
      setSheetRows([]);
      setDocHtml("");
      setObjectUrl(directSrc);
      setLoading(false);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;
    const activeFile = file;
    const resolveFetchBlob = fetchBlobRef.current;

    const applyTypedBlob = async (blob, previewUrl, previewKind, revokeUrl) => {
      const typedBlob = ensureBlobMime(blob, fileName, previewKind);
      const url =
        typedBlob === blob && previewUrl
          ? previewUrl
          : URL.createObjectURL(typedBlob);

      if (typedBlob !== blob && previewUrl && revokeUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      objectUrlRef.current = url;
      setObjectUrl(url);

      if (previewKind === "text") {
        const text = await typedBlob.text();
        if (!cancelled && requestId === requestIdRef.current) {
          setTextContent(text);
        }
      } else if (previewKind === "spreadsheet") {
        const buffer = await typedBlob.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          raw: false,
        });
        if (!cancelled && requestId === requestIdRef.current) {
          setSheetRows(rows);
        }
      } else if (previewKind === "document") {
        const ext = getFileExtension(fileName);
        if (ext === "doc") {
          setError(
            canDownload
              ? "Preview unavailable for .doc files.\nPlease download the file to view it."
              : "Preview unavailable for .doc files.",
          );
          return;
        }
        try {
          const mammoth = await import("mammoth");
          const buffer = await typedBlob.arrayBuffer();
          const converted = await mammoth.convertToHtml({ arrayBuffer: buffer });
          if (!cancelled && requestId === requestIdRef.current) {
            setDocHtml(converted?.value || "<p>(Empty document)</p>");
          }
        } catch {
          if (!cancelled && requestId === requestIdRef.current) {
            setError(
              canDownload
                ? "Preview unavailable for this document.\nPlease download the file to view it."
                : "Preview unavailable for this document.",
            );
          }
        }
      }
    };

    const load = async () => {
      setLoading(true);
      setError("");
      setTextContent("");
      setSheetRows([]);
      setDocHtml("");
      clearObjectUrl();

      try {
        const previewKind = getAttachmentPreviewKind(activeFile);
        if (previewKind === "unsupported") {
          if (!cancelled && requestId === requestIdRef.current) {
            setError(unavailableMsg);
          }
          return;
        }

        // Local File (e.g. pending KB upload) — preview via object URL.
        if (localFile) {
          const previewUrl = URL.createObjectURL(localFile);
          if (cancelled || requestId !== requestIdRef.current) {
            URL.revokeObjectURL(previewUrl);
            return;
          }
          await applyTypedBlob(localFile, previewUrl, previewKind, true);
          return;
        }

        if (!attachmentId && typeof resolveFetchBlob !== "function") {
          if (!cancelled && requestId === requestIdRef.current) {
            setError(unavailableMsg);
          }
          return;
        }

        const result =
          typeof resolveFetchBlob === "function"
            ? await resolveFetchBlob(activeFile)
            : await fetchAttachmentBlob({
                ...activeFile,
                type: attachmentType,
              });

        if (cancelled || requestId !== requestIdRef.current) {
          if (result?.url) URL.revokeObjectURL(result.url);
          return;
        }

        await applyTypedBlob(result.blob, result.url, previewKind, true);
      } catch (err) {
        if (!cancelled && requestId === requestIdRef.current) {
          setError(
            err?.message ||
              (canDownload
                ? "Failed to load preview.\nPlease download the file to view it."
                : "Failed to load preview."),
          );
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // Intentionally key off attachment id / type / name / direct src / local file.
    // fetchBlob is read via ref so identity changes do not re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, attachmentId, attachmentType, fileName, directSrc, localFile]);

  useEffect(() => {
    return () => {
      clearObjectUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    requestIdRef.current += 1;
    clearObjectUrl();
    setExpanded(false);
    onClose?.();
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="attachment-preview__loading">
          <Spinner animation="border" size="sm" />
          <span>Loading preview…</span>
        </div>
      );
    }
    if (error) {
      return <UnavailablePreview message={error} />;
    }
    switch (kind) {
      case "image":
        return objectUrl ? <ImagePreview url={objectUrl} fileName={fileName} /> : null;
      case "pdf":
        return objectUrl ? <PdfPreview url={objectUrl} /> : null;
      case "html":
        return objectUrl ? <HtmlPreview url={objectUrl} /> : null;
      case "text":
        return <TextPreview text={textContent} />;
      case "spreadsheet":
        return <SpreadsheetPreview rows={sheetRows} />;
      case "document":
        return docHtml ? (
          <DocumentPreview html={docHtml} />
        ) : (
          <UnavailablePreview message={unavailableMsg} />
        );
      default:
        return <UnavailablePreview message={unavailableMsg} />;
    }
  };

  const isWidePreview = kind === "image" || kind === "html";
  const modalClassName = [
    "attachment-preview-modal",
    kind === "image" ? "attachment-preview-modal--image" : "",
    kind === "html" ? "attachment-preview-modal--html" : "",
    expanded ? "attachment-preview-modal--expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const previewClassName = [
    "attachment-preview",
    kind === "image" ? "attachment-preview--image" : "",
    kind === "html" ? "attachment-preview--html" : "",
    expanded ? "attachment-preview--expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <PopupModal
      show={show}
      onClose={handleClose}
      header
      title={titleName}
      size={isWidePreview ? "xl" : "lg"}
      backdrop
      centered={!expanded}
      className={`attachment-preview__body${kind === "image" ? " attachment-preview__body--image" : ""}${kind === "html" ? " attachment-preview__body--html" : ""}`}
      customClassName={modalClassName}
      headerActions={
        <button
          type="button"
          className="attachment-preview__expand-btn"
          onClick={() => setExpanded((value) => !value)}
          title={expanded ? "Exit expand view" : "Expand view"}
          aria-label={expanded ? "Exit expand view" : "Expand view"}
          aria-pressed={expanded}
        >
          <ExpandIcon expanded={expanded} />
        </button>
      }
    >
      <div className={previewClassName}>
        {renderBody()}
      </div>
      <div className="attachment-preview__footer">
        <button type="button" className="attachment-preview__btn" onClick={handleClose}>
          Close
        </button>
        {canDownload && (
          <button
            type="button"
            className="attachment-preview__btn attachment-preview__btn--primary"
            onClick={() => onDownload(file)}
          >
            Download
          </button>
        )}
      </div>
    </PopupModal>
  );
};

export default memo(AttachmentPreview);

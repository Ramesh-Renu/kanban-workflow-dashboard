/**
 * Helpers for comment/activity attachment preview kind detection.
 */

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "ico"];
const SPREADSHEET_EXTS = ["xlsx", "xls", "csv"];
const DOCUMENT_EXTS = ["docx", "doc"];
const HTML_EXTS = ["html", "htm"];
const TEXT_EXTS = ["txt", "log", "md", "json", "xml", "csv"];
const PDF_EXTS = ["pdf"];

export const getFileExtension = (fileName = "") => {
  const name = String(fileName).trim();
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx + 1).toLowerCase();
};

/**
 * @returns {"image"|"pdf"|"html"|"text"|"spreadsheet"|"document"|"unsupported"}
 */
export const getAttachmentPreviewKind = (file = {}) => {
  const fileName = file.file_name || file.fileName || file.name || "";
  const mime = String(file.file_type || file.contentType || file.type || "").toLowerCase();
  const ext = getFileExtension(fileName);

  if (mime.startsWith("image/") || IMAGE_EXTS.includes(ext)) return "image";
  if (mime.includes("pdf") || PDF_EXTS.includes(ext)) return "pdf";
  if (
    mime.includes("text/html") ||
    mime.includes("xhtml") ||
    HTML_EXTS.includes(ext)
  ) {
    return "html";
  }
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    (SPREADSHEET_EXTS.includes(ext) && ext !== "csv")
  ) {
    return "spreadsheet";
  }
  if (mime.includes("wordprocessing") || mime.includes("msword") || DOCUMENT_EXTS.includes(ext)) {
    return "document";
  }
  if (mime.startsWith("text/") || TEXT_EXTS.includes(ext) || ext === "csv") {
    // Prefer spreadsheet table for CSV when possible
    if (ext === "csv") return "spreadsheet";
    return "text";
  }
  return "unsupported";
};

export const canPreviewAttachment = (file) =>
  getAttachmentPreviewKind(file) !== "unsupported";

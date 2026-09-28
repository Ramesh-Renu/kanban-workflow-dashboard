import { classNames } from "@euroland/libs";
import { getFileTypeClassName } from "utils/common";

/** Minimal folder glyph — no folder icon in the shared IcoMoon set. */
const FolderGlyph = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.879a1.5 1.5 0 0 1 1.06.44l.622.62H13A1.5 1.5 0 0 1 14.5 4v8a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 12V3z" />
  </svg>
);

export const getKbTypeIconClass = (kind, fileType) => {
  if (kind === "Link") return "icon-source-link";
  if (kind === "Folder") return null;
  if (kind === "Issue") return "icon-open-eye";
  if (kind === "KnowledgeBase") return "icon-unsupported-file";
  if (kind === "Attachment") {
    if (fileType) {
      const normalized = String(fileType).includes("/")
        ? fileType
        : `.${String(fileType).replace(/^\./, "")}`;
      const cls = getFileTypeClassName(normalized);
      if (cls) return cls;
    }
    return "icon-attachment";
  }
  return "icon-unsupported-file";
};

/** POC-style type pill: icon + label together in one badge. */
export const KbTypeBadge = ({ kind, fileType, label }) => {
  const text = label || kind;
  const iconClass = getKbTypeIconClass(kind, fileType);

  return (
    <span className="knowledge-base-hub__type-badge">
      {kind === "Folder" ? (
        <FolderGlyph className="knowledge-base-hub__type-icon" />
      ) : (
        <span
          className={classNames(iconClass, "knowledge-base-hub__type-icon")}
          aria-hidden="true"
        />
      )}
      <span>{text}</span>
    </span>
  );
};

const KbTypeIcon = ({ kind, fileType, className }) => {
  if (kind === "Folder") {
    return (
      <FolderGlyph
        className={classNames("knowledge-base-hub__type-icon", className)}
      />
    );
  }

  const iconClass = getKbTypeIconClass(kind, fileType);
  return (
    <span
      className={classNames(
        iconClass,
        "knowledge-base-hub__type-icon",
        className,
      )}
      aria-hidden="true"
    />
  );
};

export default KbTypeIcon;

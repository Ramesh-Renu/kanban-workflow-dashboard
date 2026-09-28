import { t } from "i18next";
import { MasterDB } from "assets/images";

const FolderPlusGlyph = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.05l1.8 1.8H16A1.5 1.5 0 0 1 17.5 9.3V12" />
    <path d="M3 7.5v10A1.5 1.5 0 0 0 4.5 19H14" />
    <path d="M19 15v6M16 18h6" />
  </svg>
);

export const KbOutlineButton = ({
  icon,
  children,
  onClick,
  ariaLabel,
  className = "",
}) => (
  <button
    type="button"
    className={`btn knowledge-base-hub__outline-btn ${className}`.trim()}
    onClick={onClick}
    aria-label={ariaLabel}
  >
    {icon}
    {children ? <span>{children}</span> : null}
  </button>
);

export const KbCreateFolderButton = ({ onClick }) => (
  <KbOutlineButton
    onClick={onClick}
    ariaLabel={t("knowledge_base.create_folder")}
    icon={
      <FolderPlusGlyph className="knowledge-base-hub__btn-icon" />
    }
  >
    {t("knowledge_base.create_folder")}
  </KbOutlineButton>
);

export const KbAddAttachmentButton = ({ onClick }) => (
  <KbOutlineButton
    onClick={onClick}
    ariaLabel={t("knowledge_base.add_attachment")}
    icon={
      <span className="icon-attachment knowledge-base-hub__btn-icon" aria-hidden="true" />
    }
  >
    {t("knowledge_base.add_attachment")}
  </KbOutlineButton>
);

export const KbAddLinkButton = ({ onClick }) => (
  <button
    type="button"
    className="btn knowledge-base-hub__outline-btn"
    onClick={onClick}
    aria-label={t("knowledge_base.add_link")}
    title={t("knowledge_base.add_link")}
  >
    <span className="icon-source-link" aria-hidden="true" /> {t("knowledge_base.add_link")}
  </button>
);

export const KbCreateIssueButton = ({ onClick }) => (
  <KbOutlineButton
    onClick={onClick}
    ariaLabel={t("common.create")}
    icon={
      <svg
        className="knowledge-base-hub__btn-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    }
  >
    {t("common.create")}
  </KbOutlineButton>
);

export const KbEditIssueButton = ({ onClick }) => (
  <KbOutlineButton
    onClick={onClick}
    ariaLabel={t("common.edit")}
    icon={
      <span
        className="icon-pencil-simple-line knowledge-base-hub__btn-icon"
        aria-hidden="true"
      />
    }
  >
    {t("common.edit")}
  </KbOutlineButton>
);

/**
 * Folder / KB identity row: icon + title, description + Edit, actions on the right.
 */
const KbIdentityHeader = ({
  kind = "Folder",
  title,
  description,
  onEdit,
  actions = null,
}) => {

  return (
    <div className="knowledge-base-hub__identity">
      <div className="knowledge-base-hub__identity-main">
        <span className="knowledge-base-hub__identity-icon" aria-hidden="true">
          <img src={"https://img.icons8.com/?size=100&id=Vps0Nsl80v4P&format=png&color=000000"} alt="" width={32} height={32} />
        </span>
        <div className="knowledge-base-hub__identity-copy">
          <h2 className="knowledge-base-hub__identity-title">{title}</h2>
          {description || onEdit ? (
            <div className="knowledge-base-hub__identity-meta">
              {description ? (
                <p className="knowledge-base-hub__identity-desc">{description}</p>
              ) : null}
              {onEdit ? (
                <button
                  type="button"
                  className="btn btn-0 p-0 border-0 knowledge-base-hub__identity-edit"
                  onClick={onEdit}
                >
                  <span className="icon-pencil-simple-line" aria-hidden="true" />
                  {t("common.edit")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="knowledge-base-hub__identity-actions">{actions}</div>
      ) : null}
    </div>
  );
};

export default KbIdentityHeader;

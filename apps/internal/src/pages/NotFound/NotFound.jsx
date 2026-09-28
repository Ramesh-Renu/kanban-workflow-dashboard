import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Shared not-found screen.
 * Optional overrides (title, description, actionLabel, actionTo, onAction)
 * keep existing code-based call sites working unchanged.
 */
const NotFound = ({
  code,
  name,
  title,
  description,
  actionLabel,
  actionTo = "/",
  onAction,
  ...rest
} = {}) => {
  const { t } = useTranslation();
  const resolvedCode = code ?? rest.code;
  const resolvedName = name ?? rest.name;

  const heading =
    title ||
    (resolvedCode
      ? `${resolvedName ? `${resolvedName} ` : ""}${t(
          `notFound.message_${resolvedCode}`,
        )}`
      : t("notFound.page_not_found"));

  const body =
    description ||
    (resolvedCode
      ? t(`notFound.content_${resolvedCode}`)
      : t("notFound.content"));

  const buttonLabel = actionLabel || t("notFound.back_to_home");

  return (
    <div className="not-found">
      <div className="not-found-content">
        {resolvedCode !== "400" && (
          <div className="error-code">
            {resolvedCode
              ? t(`notFound.${resolvedCode}`)
              : t("notFound.404")}
          </div>
        )}
        <h2 className="error-message">{heading}</h2>
        <p className="error-description">{body}</p>
        {typeof onAction === "function" ? (
          <button
            type="button"
            className="not-found-content-button"
            onClick={onAction}
          >
            {buttonLabel}
          </button>
        ) : (
          <Link to={actionTo} className="not-found-content-button">
            {buttonLabel}
          </Link>
        )}
      </div>
    </div>
  );
};

export default NotFound;

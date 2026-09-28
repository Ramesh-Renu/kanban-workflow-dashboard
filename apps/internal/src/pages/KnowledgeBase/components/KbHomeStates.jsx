import { t } from "i18next";
import { MasterDB } from "assets/images";

const KbCardSkeleton = () => (
  <div className="knowledge-base-hub__card knowledge-base-hub__card--skeleton" aria-hidden>
    <div className="knowledge-base-hub__skel knowledge-base-hub__skel--icon" />
    <div className="knowledge-base-hub__card-body">
      <div className="knowledge-base-hub__skel knowledge-base-hub__skel--title" />
      <div className="knowledge-base-hub__skel knowledge-base-hub__skel--line" />
    </div>
  </div>
);

export const KbHomeLoading = ({ count = 4 }) => (
  <div
    className="knowledge-base-hub__grid"
    aria-busy="true"
    aria-label={t("common.loading")}
  >
    {Array.from({ length: count }, (_, index) => (
      <KbCardSkeleton key={`kb-skel-${index}`} />
    ))}
  </div>
);

export const KbHomeEmpty = ({
  title,
  message,
  actionLabel,
  onAction,
  variant = "empty",
}) => (
  <div
    className={`knowledge-base-hub__state knowledge-base-hub__state--${variant}`}
    role="status"
  >
    <div className="knowledge-base-hub__state-icon" aria-hidden="true">
      <img src={MasterDB} alt="" width={36} height={36} />
    </div>
    <h3 className="knowledge-base-hub__state-title">{title}</h3>
    {message ? (
      <p className="knowledge-base-hub__state-message">{message}</p>
    ) : null}
    {actionLabel && typeof onAction === "function" ? (
      <button
        type="button"
        className="btn knowledge-base-hub__outline-btn"
        onClick={onAction}
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
);

export default KbHomeEmpty;

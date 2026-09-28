import { Row, Spinner } from "react-bootstrap";
import { t } from "i18next";

const KbModalActions = ({
  onCancel,
  onSubmit,
  saving = false,
  disabled = false,
  isEdit = false,
  className = "",
  submitType = "button",
}) => (
  <Row
    className={`d-flex w-100 flex-row align-items-center justify-content-end gap-3 action_btn_row mt-3 ${className}`.trim()}
  >
    <button
      type="button"
      className="btn w-auto cancel_btn px-3"
      onClick={onCancel}
    >
      {t("common.cancel")}
    </button>
    <button
      type={submitType}
      className="btn w-auto create_btn px-3 d-flex flex-row gap-2 align-items-center"
      onClick={submitType === "button" ? onSubmit : undefined}
      disabled={saving || disabled}
    >
      {t(
        `common.${
          saving
            ? isEdit
              ? "updating"
              : "creating"
            : isEdit
              ? "update"
              : "create"
        }`,
      )}
      {saving && (
        <Spinner
          as="span"
          animation="border"
          size="sm"
          role="status"
          aria-hidden="true"
        />
      )}
    </button>
  </Row>
);

export default KbModalActions;

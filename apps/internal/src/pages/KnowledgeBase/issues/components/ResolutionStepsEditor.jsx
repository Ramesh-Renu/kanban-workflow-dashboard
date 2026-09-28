import { Form } from "react-bootstrap";
import { t } from "i18next";
import { trashFull } from "assets/images";
import { KbOutlineButton } from "../../components/KbIdentityHeader";

const ResolutionStepsEditor = ({
  steps = [],
  onChange,
  editable = true,
  emptyLabel,
  itemLabel,
  placeholder,
  addLabel,
  ariaLabelPrefix,
}) => {
  const resolvedEmpty =
    emptyLabel || t("knowledge_base.no_resolution_steps");
  const resolvedItemLabel =
    itemLabel || t("knowledge_base.resolution_steps");
  const resolvedPlaceholder =
    placeholder || t("knowledge_base.resolution_step_placeholder");
  const resolvedAddLabel = addLabel || t("knowledge_base.add_step");
  const resolvedAriaPrefix = ariaLabelPrefix || resolvedItemLabel;

  const updateStep = (index, value) => {
    const next = [...steps];
    next[index] = value;
    onChange?.(next);
  };

  const addStep = () => {
    onChange?.([...(steps || []), ""]);
  };

  const removeStep = (index) => {
    onChange?.((steps || []).filter((_, i) => i !== index));
  };

  if (!editable) {
    return (
      <div className="knowledge-base-hub__repeat-editor">
        {(steps || []).length === 0 ? (
          <p className="text-muted small mb-0">{resolvedEmpty}</p>
        ) : (
          <ol className="knowledge-base-hub__issue-steps mb-0">
            {(steps || []).map((step, index) => (
              <li key={`step-read-${index}`}>{step}</li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="knowledge-base-hub__repeat-editor">
      {(steps || []).length === 0 ? (
        <p className="text-muted small mb-2">{resolvedEmpty}</p>
      ) : (
        (steps || []).map((step, index) => (
          <div
            key={`step-${index}`}
            className="knowledge-base-hub__step-row d-flex align-items-center gap-2 mb-2"
          >
            <span
              className="text-muted small knowledge-base-hub__step-index"
              aria-hidden="true"
            >
              {index + 1}.
            </span>
            <Form.Control
              type="text"
              value={step}
              onChange={(e) => updateStep(index, e.target.value)}
              disabled={!editable}
              className="fs-14 py-2"
              aria-label={`${resolvedAriaPrefix} ${index + 1}`}
              placeholder={resolvedPlaceholder}
            />
            {editable ? (
              <button
                type="button"
                className="btn btn-0 p-1 border-0"
                onClick={() => removeStep(index)}
                title={t("common.delete")}
                aria-label={`${t("common.delete")} ${resolvedAriaPrefix} ${index + 1}`}
              >
                <img src={trashFull} alt="" />
              </button>
            ) : null}
          </div>
        ))
      )}
      {editable ? (
        <KbOutlineButton
          className="knowledge-base-hub__outline-btn--sm"
          onClick={addStep}
        >
          {resolvedAddLabel}
        </KbOutlineButton>
      ) : null}
    </div>
  );
};

export default ResolutionStepsEditor;

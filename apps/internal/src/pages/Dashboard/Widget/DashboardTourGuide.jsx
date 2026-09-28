import React, { useMemo, useState } from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";

const DashboardTourGuide = ({
  show,
  onClose,
  title,
  steps = [],
  StepsComponent = null,
  totalSteps = 0,
  dashboardFormulaData = [],
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const isComponentMode = Boolean(StepsComponent);
  const stepCount = isComponentMode ? totalSteps : steps.length;

  const safeIndex = useMemo(() => {
    if (!stepCount) return 0;
    return Math.min(currentStep, stepCount - 1);
  }, [currentStep, stepCount]);

  const step = steps[safeIndex] || {};
  const progress = stepCount ? ((safeIndex + 1) / stepCount) * 100 : 0;

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  const handleNext = () => {
    if (safeIndex >= stepCount - 1) {
      handleClose();
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <PopupModal
      show={show}
      onClose={handleClose}
      title={title}
      header={true}
      customClassName="dashboard-tour__modal"
      className="dashboard-tour"
    >
      {isComponentMode ? (
        <div className="dashboard-tour__component-view">
          <div className="dashboard-tour__progress-wrap">
            <div className="dashboard-tour__progress-track-wrap">
              <div className="dashboard-tour__progress-text">
                Step {stepCount ? safeIndex + 1 : 0} of {stepCount}
              </div>
              <div className="dashboard-tour__progress-track">
                <div
                  className="dashboard-tour__progress-fill"
                  style={{ width: `${progress}%` }}
                >
                  <p className="dashboard-tour__progress-fill-text">
                    {stepCount ? safeIndex + 1 : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <StepsComponent
            currentStep={safeIndex}
            dashboardFormulaData={dashboardFormulaData}
          />
          <div className="dashboard-tour__actions">
            <button
              type="button"
              className="dashboard-tour__btn dashboard-tour__btn--ghost"
              onClick={handleBack}
              disabled={safeIndex === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="dashboard-tour__btn dashboard-tour__btn--primary"
              onClick={handleNext}
            >
              {safeIndex === stepCount - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-tour__progress-wrap">
            <span className="dashboard-tour__progress-text">
              Step {steps.length ? safeIndex + 1 : 0} of {steps.length}
            </span>
            <div className="dashboard-tour__progress-track">
              <div
                className="dashboard-tour__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="dashboard-tour__content">
            {step?.image && (
              <div className="dashboard-tour__image-wrap">
                <img
                  src={step.image}
                  alt={step?.imageAlt || step?.title || "Tour step"}
                  className="dashboard-tour__image"
                />
              </div>
            )}
            <h4 className="dashboard-tour__title">{step?.title || ""}</h4>
            <p className="dashboard-tour__description">{step?.description || ""}</p>
          </div>

          <div className="dashboard-tour__actions">
            <button
              type="button"
              className="dashboard-tour__btn dashboard-tour__btn--ghost"
              onClick={handleBack}
              disabled={safeIndex === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="dashboard-tour__btn dashboard-tour__btn--primary"
              onClick={handleNext}
            >
              {safeIndex === steps.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </>
      )}
    </PopupModal>
  );
};

export default DashboardTourGuide;

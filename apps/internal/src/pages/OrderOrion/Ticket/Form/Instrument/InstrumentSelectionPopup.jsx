import React, { useState, useCallback } from "react";
import InstrumentTable from "./InstrumentTable";
import SelectedInstrumentsDisplay from "./SelectedInstrumentsDisplay";
import PopupModal from "@orion/shared/src/components/PopupModal";

const InstrumentSelectionPopup = ({
  instruments = [],
  onSave,
  onCancel,
  initialSelectedInstruments = [],
  show,
  disabled,
}) => {
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState(
    initialSelectedInstruments
  );
  const [showRemoveFieldMsg, setShowRemoveFieldMsg] = useState(false);

  const handleSelectInstrument = useCallback((instrumentId, isSelected) => {
    setSelectedInstrumentIds((prev) => {
      if (isSelected) {
        // Add to selected if not already present
        return prev.includes(instrumentId) ? prev : [...prev, instrumentId];
      } else {
        // Remove from selected
        return prev.filter((id) => id !== instrumentId);
      }
    });
  }, []);
  const handleRemoveInstrument = useCallback((instrumentId) => {
    setSelectedInstrumentIds((prev) =>
      prev.filter((id) => id !== instrumentId)
    );
  }, []);

  const handleReorderInstruments = useCallback((newOrderedIds) => {
    setSelectedInstrumentIds(newOrderedIds);
  }, []);

  const handleSave = () => {
    const result = {
      instruments: selectedInstrumentIds,
    };
    onSave(result);
  };
  const closeShowPopup = () => {
    if (selectedInstrumentIds?.length === initialSelectedInstruments?.length) {
      onCancel();
    } else {
      setShowRemoveFieldMsg(!showRemoveFieldMsg);
    }
  };
  const handleRemoveinstrument = () => {
    onCancel();
    setSelectedInstrumentIds([]);
  };

  return (
    <PopupModal
      show={show}
      onClose={onCancel}
      customClassName={"custom-modal-width"}
      children={
        <>
          <h5 className="tabel-header">Choose Instrument ID</h5>
          <div
            className="mb-2"
            style={{ maxHeight: "59vh", overflowY: "auto" }}
          >
            <InstrumentTable
              instruments={instruments}
              selectedInstrumentIds={selectedInstrumentIds}
              onSelectInstrument={handleSelectInstrument}
            />
          </div>
          <div className="mt-2 selectedInstrumentsDisplay">
            <SelectedInstrumentsDisplay
              selectedInstrumentIds={selectedInstrumentIds}
              onRemoveInstrument={handleRemoveInstrument}
              onReorderInstruments={handleReorderInstruments}
            />
          </div>
          <div className="d-flex flex-row justify-content-end gap-3 mt-2 modalActions">
            <button
              className="btn btn-0 modalCancel_btn px-3"
              onClick={closeShowPopup}
            >
              Cancel
            </button>
            <button
              className="btn btn-0 modalSave_btn px-3"
              onClick={handleSave}
              // disabled={selectedInstrumentIds.length === 0}
            >
              Save
            </button>
          </div>
          {showRemoveFieldMsg && (
            <PopupModal
              show={showRemoveFieldMsg}
              onClose={onCancel}
              className={"orderOrionDashboard bg-white rounded-4"}
              width={"40vh"}
            >
              <div className="m-3">
                <h5 className="text-center">
                  Information will not be saved. Do you wish to proceed?
                </h5>
                <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
                  <button
                    className="btn btn-0 modalDelete_btn px-3"
                    onClick={handleRemoveinstrument}
                  >
                    Yes
                  </button>
                  <button
                    className="btn btn-0 modalCancel_btn px-3"
                    onClick={closeShowPopup}
                  >
                    No
                  </button>
                </div>
              </div>
            </PopupModal>
          )}
        </>
      }
    ></PopupModal>
  );
};

export default InstrumentSelectionPopup;

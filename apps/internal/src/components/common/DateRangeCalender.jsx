import React, { useState } from "react";
import DateRangePicker from "./DateRangePicker";
import PopupModal from "@orion/shared/src/components/PopupModal";
import dayjs from "dayjs";

const DateRangeCalendar = ({ title, initialDate, onApply, onCancel, isPast = null }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [range, setRange] = useState({
    startDate: initialDate?.startDate || null,
    endDate: initialDate?.endDate || null,
  });

  const handleApply = () => {
    if (range.startDate && range.endDate) {
      onApply?.(range);
      setIsVisible(false);
    }
  };

  const handleCancel = () => {
    setIsVisible(false);
    onCancel?.();
  };

  const formattedRange =
    range.startDate && range.endDate
      ? `${dayjs(range.startDate).format("MMM DD, YYYY")} - ${dayjs(
        range.endDate
      ).format("MMM DD, YYYY")}`
      : range.startDate
        ? `${dayjs(range.startDate).format("MMM DD, YYYY")} - ...`
        : "";

  return (
    <PopupModal
      show={isVisible}
      onClose={handleCancel}
      width={"60vh"}
      title={title}
      header={true}
      customClassName="customDateRangePopup"
    >

      <div className="range-date-picker customDateRange-picker">
        <DateRangePicker
          isPast={isPast} // null = Enables past and future date selection, True = Enables past date only selection, False = Enables future date only selection.
          value={{
            from: range.startDate,
            to: range.endDate,
          }}
          onApply={(newRange) => setRange(newRange)}
          onCancel={handleCancel}
        />
      </div>

      <div className="d-flex gap-2 mt-2 justify-content-between align-items-center">

        <span className="text-muted small fw-bold">{formattedRange}</span>

        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-light" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="btn border-none eu-btn-submit"
            disabled={!range.startDate || !range.endDate}
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      </div>
    </PopupModal>
  );
};

export default DateRangeCalendar;

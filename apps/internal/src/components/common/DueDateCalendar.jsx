import React, { Fragment, useState } from "react";
import dayjs from "dayjs";
import { TimerIcon } from "../../assets/images";
import PopupModal from "@orion/shared/src/components/PopupModal";

const DueDateCalendar = ({ defaultDate, onSelect, oncancel, onReset, apiLoading }) => {
  const today = dayjs();
  const [currentMonth, setCurrentMonth] = useState(
    defaultDate ? dayjs(defaultDate) : today.startOf("month"),
  );
  const [showPopup, setShowPopup] = useState(false);
  const [description, setDescription] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    defaultDate ? dayjs(defaultDate) : null,
  );

  const startOfMonth = currentMonth.startOf("month");
  const endOfMonth = currentMonth.endOf("month");
  const daysInMonth = currentMonth.daysInMonth();
  const startDay = startOfMonth.day(); // 0=Sunday, 1=Monday...

  const handlePrevMonth = () => setCurrentMonth(currentMonth.subtract(1, "month"));
  const handleNextMonth = () => setCurrentMonth(currentMonth.add(1, "month"));

  const handleDayClick = (day) => {
    const date = currentMonth.date(day);
    if (date.isBefore(today, "day")) return; // block past dates
    setSelectedDate(date);
  };
  const handleDone = () => {
    if (selectedDate) {
      onSelect({
        date: selectedDate.format("YYYY-MM-DD"),
        description: description,
      });
    }
  };

  const handleShowReason = () => {
    setShowPopup(!showPopup);
  };
  // Build days grid
  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null); // empty slots before start
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handleCancel = () => {
    const isSameAsDefault = defaultDate
      ? dayjs(selectedDate).isSame(dayjs(defaultDate), "day")
      : false;
    if (isSameAsDefault) {
      setSelectedDate(null);
      oncancel();
      setDescription("");
      setShowPopup(false);
    } else if (defaultDate) {
      setSelectedDate(dayjs(defaultDate));
      setCurrentMonth(dayjs(defaultDate).startOf("month"));
    } else {
      oncancel();
      setDescription("");
      setShowPopup(false);
    }
  };

  const handleReset = () => {
    setSelectedDate(null);
    setCurrentMonth(today.startOf("month"));
    onReset?.(); // optional chaining = safe
    setShowPopup(false);
  };

  return (
    <Fragment>
      <div className="border-0 w-100 rounded p-3 bg_light_grey">
        <div className="bg-light shadow-sm rounded p-3">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <button
              className="btn btn-0 arrowButton"
              onClick={handlePrevMonth}
              disabled={currentMonth.isSame(today, "month")}
            >
              ‹
            </button>
            <h6 className="mb-0">{currentMonth.format("MMMM YYYY")}</h6>
            <button className="btn btn-0 arrowButton  " onClick={handleNextMonth}>
              ›
            </button>
          </div>

          {/* Weekdays */}
          <div className="d-flex justify-content-between fw-bold text-center mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} style={{ width: "14.28%" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="d-flex flex-wrap text-center" style={{ minHeight: "32vh" }}>
            {days.map((day, i) => {
              if (!day) {
                return (
                  <div key={i} style={{ width: "14.28%" }} className="p-1">
                    {" "}
                  </div>
                );
              }
              const date = currentMonth.date(day);
              const isPast = date.isBefore(today, "day");
              const isSelected = selectedDate?.isSame(date, "day");
              const isToday = date.isSame(today, "day");

              return (
                <div
                  key={i}
                  className="p-1 d-flex align-items-center"
                  style={{
                    width: "14.28%",
                    cursor: isPast ? "not-allowed" : "pointer",
                    color: isPast ? "#ccc" : "#000",
                  }}
                  onClick={() => !isPast && handleDayClick(day)}
                >
                  <div
                    className={`rounded-circle d-flex align-items-center justify-content-center ${
                      isSelected ? "bg_primary text-white" : ""
                    }`}
                    style={{
                      width: 32,
                      height: 32,
                      margin: "0 auto",
                      border: isToday && !isSelected ? "1px solid #00ADF0" : "none",
                    }}
                  >
                    {day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Footer */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            {selectedDate && (
              <div className="text-muted">
                <div className="d-flex gap-2">
                  <img src={TimerIcon} alt="TimerIcon" />
                  Due Date
                </div>
                <div className="text-dark mt-2">
                  {selectedDate ? selectedDate.format("DD MMM YYYY") : "-- --- ----"}
                  {defaultDate && (
                    <button
                      className="reset-btn btn b-0 btn-0 text-danger p-0 ms-2"
                      onClick={handleReset}
                      disabled={apiLoading}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <button className="cancel-btn btn btn-0  me-2" onClick={() => handleCancel()}>
              Cancel
            </button>
            <button
              className={`save-btn btn btn-0 primaryButton ${
                apiLoading ? "loading" : ""
              }`}
              onClick={defaultDate ? handleShowReason : handleDone}
              // onClick={handleDone}
              disabled={!selectedDate || apiLoading}
            >
              Done
            </button>
          </div>
        </div>
      </div>
      {showPopup && (
        <PopupModal
          show={showPopup}
          onClose={() => {
            setShowPopup(false);
          }}
          header={true}
          title={"Reason for Date Change"}
          className={"addAttachmentModal"}
          key="deleteModal"
        >
          <div className="formContainer">
            <div className="mt-3 descriptionContainer">
              <label>
                Description
                <span className="text-danger"> *</span>
              </label>
              <textarea
                className="mt-2"
                placeholder="Changed Reason details..."
                value={description || ""}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1500}
              ></textarea>
            </div>
            <div className="d-flex flex-row align-items-center justify-content-end gap-3 footerContainer mt-4">
              <button
                className="btn btn-0 "
                onClick={() => {
                  setShowPopup(false);
                  setDescription(null);
                  handleCancel();
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-0 submitBtn px-4 "
                disabled={description?.length === 0 || description === null}
                onClick={() => {
                  handleDone();
                  setShowPopup(false);
                }}
              >
                {"Save"}
              </button>
            </div>
          </div>
        </PopupModal>
      )}
    </Fragment>
  );
};

export default DueDateCalendar;

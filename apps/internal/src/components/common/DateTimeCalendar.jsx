/** This component created by Ramesh R ***/
import React, { useState, useRef, useEffect } from "react";
import DateTime from "react-datetime";
import "react-datetime/css/react-datetime.css"; // Import the default styling
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

const DateTimeCalendar = ({
  value,
  dateFormat,
  placeholder,
  getDateTime,
  assignDueDateValidation,
  orderDateValidation,
  dueDateValidation,
  isDueDate,
  isOrderDate,
  timeFormat,
  customRenderInput,
  className,
  calendarPosition,
  customCancel,
  iconShow,
  ...rest
}) => {
  dayjs.extend(utc);
  dayjs.extend(isSameOrAfter);
  dayjs.extend(isSameOrBefore);
  // dayjs.utc(false); // Set dayjs to use local time
  const [selectedDate, setSelectedDate] = useState(
    value?.length > 0
      ? dayjs.utc(value).local().format(dateFormat)
      : timeFormat
        ? dayjs.utc(new Date()).local().format(dateFormat)
        : "",
  );
  const [dateTimeEdited, setDateTimeEdited] = useState(false);
  const [showContent, setShowContent] = useState("");
  const dateTimeRef = useRef(null);
  const handleChange = (date) => {
    setTempSelectedDate(date);
    setDateTimeEdited(true);
    setShowContent("");
  };
  const initialValueRef = useRef(value || "");
  const [tempSelectedDate, setTempSelectedDate] = useState(null);

  useEffect(() => {
    if (value) {
      setDateTimeEdited(false);
    } else {
      setDateTimeEdited(true);
    }
    if (value?.length == 0) {
      handleCancel();
    }
    setSelectedDate(
      value?.length > 0
        ? dayjs.utc(value).local().format(dateFormat)
        : timeFormat
          ? dayjs.utc(new Date()).local().format(dateFormat)
          : "",
    );
    initialValueRef.current = value || "";
  }, [value]);

  const handleOK = () => {
    // Handle OK button click action here
    if (dateTimeRef.current && dateTimeEdited && tempSelectedDate) {
      setSelectedDate(tempSelectedDate); // confirm value
      getDateTime(tempSelectedDate);
      setTempSelectedDate(null);
    }
    setShowContent("");
    dateTimeRef.current._closeCalendar(); // Close the calendar popover
  };

  const handleCancel = () => {
    // Handle Cancel button click action here
    setSelectedDate("");
    if (dateTimeRef.current) {
      dateTimeRef.current.state.inputValue = value
        ? dayjs.utc(value).local().format("MMM DD, YYYY")
        : "";
      setSelectedDate(
        value ? dayjs.utc(value).local().format("MMM DD, YYYY") : "",
      );
      setShowContent("");
      dateTimeRef.current._closeCalendar(); // Close the calendar popover
    }
    if (customCancel) {
      customCancel();
    }
  };

  const handleReset = () => {
    setSelectedDate("");
    getDateTime("");

    setDateTimeEdited(true);
    setShowContent("");

    if (dateTimeRef.current) {
      dateTimeRef.current.state.inputValue = "";
      dateTimeRef.current._closeCalendar?.();
    }
  };

  /** Function to validate if a date is valid or not **/
  const isValidDate = (current) => {
    if (!current) return false;

    const today = dayjs().startOf("day");

    // 🔹 ORDER DATE VALIDATION
    if (orderDateValidation) {
      if (isDueDate) {
        // disable dates AFTER due date
        return current.isAfter(dayjs(isDueDate).endOf("day"));
      }

      // disable past dates (allow today & future)
      return current.isBefore(today);
    }

    if (dueDateValidation) {
      // disable future dates, allow today & past
      return !current.isBefore(today, "day");
    }

    // 🔹 ASSIGN DUE DATE VALIDATION
    if (assignDueDateValidation) {
      if (isDueDate) {
        // allow between today and due date
        return (
          current.isBefore(today) ||
          current.isAfter(dayjs(isDueDate).endOf("day"))
        );
      }

      // allow today & future only
      return current.isBefore(today);
    }

    return true;
  };

  const customRenderer = (viewMode, renderDefault) => {
    return (
      <div className="wrapper">
        <div className="calendar-wrapper">{renderDefault()}</div>
        <div className="time-picker-wrapper">
          <div className="button-container">
            <div className="button-container__left">
              {rest.canReset && initialValueRef.current && dateTimeEdited && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-danger"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="button-container__right">
              <button type="button" onClick={handleCancel}>
                Cancel
              </button>
              <button type="button" onClick={handleOK}>
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const handleShowPopup = (id) => {
    setShowContent(id);
  };

  // Function to render each day cell
  const renderDay = (props, currentDate, selectedDate) => {
    const { key, className, ...otherProps } = props;
    const disabled = className && className.includes("rdtDisabled");
    if (disabled && dueDateValidation) {
      return (
        <td
          key={key}
          {...otherProps}
          className={className}
          onClick={() => handleShowPopup(currentDate?._d)}
        >
          {currentDate.date()}
          {currentDate?._d.toString() == showContent.toString() && (
            <div className="disabled-date-error-show">
              {/* Due Date and Time can't be lesser than Order Date and Time */}
              Select a date which is greater than the ticket’s created date
            </div>
          )}
        </td>
      );
    } else if (
      (disabled && orderDateValidation && isDueDate) ||
      (disabled && assignDueDateValidation && isDueDate)
    ) {
      return (
        <td
          key={key}
          {...otherProps}
          className={className}
          onClick={() => handleShowPopup(currentDate?._d)}
        >
          {currentDate.date()}
          {currentDate?._d.toString() == showContent.toString() && (
            <div className="disabled-date-error-show">
              {assignDueDateValidation
                ? "Select a date which is lesser than the ticket’s due date" //"Due Date can't be greater than Ticket Due Date and less than Current Date"
                : "Order Date and Time can't be greater than Due Date and Time"}
            </div>
          )}
        </td>
      );
    } else {
      return (
        <td
          key={key}
          className={className}
          {...otherProps}
          // className={`rdtDay ${
          //   currentDate.isSame(dayjs(value), "day") ? "rdtActive rdtToday" : ""
          // }`}
        >
          {currentDate.date()}
        </td>
      );
    }
  };

  let inputProps = {
    placeholder: placeholder || "Select the Date",
    readOnly: true,
  };

  const handleToggleCalendar = () => {
    if (dateTimeRef.current?.state?.open) {
      dateTimeRef.current._closeCalendar?.();
    } else {
      dateTimeRef.current._openCalendar?.();
    }
  };

  const handleClose = () => {
    // If user closed without clicking OK
    if (tempSelectedDate) {
      // Restore confirmed selectedDate
      const restoredValue =
        value?.length > 0
          ? dayjs.utc(value).local().format(dateFormat)
          : timeFormat
            ? dayjs.utc(new Date()).local().format(dateFormat)
            : "";

      setSelectedDate(restoredValue);

      // IMPORTANT: Reset internal input value
      if (dateTimeRef.current) {
        dateTimeRef.current.state.inputValue = restoredValue;
      }
    }

    setTempSelectedDate(null);
  };

  return (
    <>
      {customRenderInput ? (
        <DateTime
          value={
            dateTimeRef.current?.state?.open && tempSelectedDate
              ? tempSelectedDate
              : selectedDate
          }
          onChange={handleChange}
          inputProps={{ ...inputProps, disabled: rest.disabled }}
          renderView={customRenderer}
          updateOnView={"days"}
          dateFormat={dateFormat ? dateFormat : "YYYY-MM-DD"}
          isValidDate={isValidDate}
          ref={dateTimeRef}
          utc={false} // Display time in system's local time format
          renderDay={renderDay}
          timeFormat={timeFormat ? timeFormat : false}
          renderInput={(props, openCalendar) => (
            <div onClick={openCalendar} style={{ cursor: "pointer" }}>
              {customRenderInput}
            </div>
          )}
          {...rest}
          className={className}
          onClose={handleClose}
        ></DateTime>
      ) : (
        <>
          <DateTime
            value={
              dateTimeRef.current?.state?.open && tempSelectedDate
                ? tempSelectedDate
                : selectedDate
            }
            onChange={handleChange}
            inputProps={{ ...inputProps, disabled: rest.disabled }}
            renderView={customRenderer}
            updateOnView={"days"}
            dateFormat={dateFormat ? dateFormat : "YYYY-MM-DD"}
            onFocus={(event) => {
              event.target.click(); // Open the calendar on focus
            }}
            isValidDate={isValidDate}
            ref={dateTimeRef}
            utc={false} // Display time in system's local time format
            renderDay={renderDay}
            timeFormat={timeFormat ? timeFormat : false}
            className={`${
              className || ""
            } calendar-position-${calendarPosition}`}
            calendarPosition={"top"}
            {...rest}
            onClose={handleClose}
          ></DateTime>
          {iconShow && (
            <span
              className="icon-ss-calendar"
              onClick={!rest.disabled ? handleToggleCalendar : undefined}
              style={{ cursor: "pointer" }}
            ></span>
          )}
        </>
      )}
    </>
  );
};

export default DateTimeCalendar;

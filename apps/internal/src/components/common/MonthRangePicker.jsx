import React, { useState, useRef, useEffect } from "react";
import DateTime from "react-datetime";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useToast } from "@orion/shared";

dayjs.extend(isSameOrBefore);

const MonthRangePicker = ({
  hasInput = false,
  handleDateApply,
  handleCalenderCancel,
  selectedDateInput,
}) => {
  const dateTimeRef = useRef(null);
  const { showToast } = useToast();
  const [startMonth, setStartMonth] = useState(null);
  const [endMonth, setEndMonth] = useState(null);

  const monthDiff = (start, end) => {
    if (!start || !end) return 0;
    return end.diff(start, "months");
  };
  const startValue = startMonth?.format("YYYY-MM-DD");
  const endValue = endMonth?.format("YYYY-MM-DD");

  const isSameSelection =
    startValue === selectedDateInput?.start &&
    endValue === selectedDateInput?.end;
  const isDisabled = !startMonth || !endMonth || isSameSelection;

  useEffect(() => {
    if (!selectedDateInput) return;
    setStartMonth(dayjs(selectedDateInput.start));
    setEndMonth(dayjs(selectedDateInput.end));
  }, [selectedDateInput]);

  const handleChange = (date) => {
    if (!startMonth) {
      setStartMonth(date.clone().startOf("month"));
      setEndMonth(date.clone().endOf("month"));
      return;
    }

    const diff = monthDiff(startMonth, date);
    if (diff < 0) {
      // if user selects earlier month → reset start
      setStartMonth(date.clone().startOf("month"));
      setEndMonth(null);
      return;
    }

    if (diff > 5) {
      showToast({
        message: "Maximum 6 months allowed!",
        variant: "danger",
      });
      return;
    }
    setEndMonth(date.clone().endOf("month"));
  };

  const renderMonth = (props, month, year) => {
    const current = dayjs().year(year).month(month).startOf("month");

    let className = props.className;

    if (startMonth && current.isSame(startMonth, "month")) {
      className += " start-month";
    }

    if (endMonth && current.isSame(endMonth, "month")) {
      className += " end-month";
    }

    if (
      startMonth &&
      endMonth &&
      current.isAfter(startMonth) &&
      current.isBefore(endMonth)
    ) {
      className += " middle-month";
    }

    return (
      <td {...props} className={className} key={month}>
        {dayjs().month(month).format("MMM")}
      </td>
    );
  };

  const openCalendar = () => {
    if (dateTimeRef.current) {
      dateTimeRef.current.setState({ open: true });
    }
  };

  const isValidDate = (current) => {
    const currentMonth = dayjs().endOf("month");
    return current.isSameOrBefore(currentMonth, "month");
  };

  const monthCount =
    startMonth && endMonth && monthDiff(startMonth, endMonth) === 0
      ? "single"
      : "multiple";

  return (
    <div className="monthly-calendor">
      {/* Dropdown trigger */}
      {hasInput && (
        <div
          onClick={openCalendar}
          style={{
            cursor: "pointer",
            //   border: "1px solid #ccc",
            padding: "8px",
            borderRadius: "6px",
            width: "200px",
          }}
        >
          {startMonth && endMonth
            ? `${startMonth.format("YYYY-MM")} → ${endMonth.format("YYYY-MM")}`
            : "Custom Month"}
        </div>
      )}
      <DateTime
        value={startMonth || ""}
        onChange={handleChange}
        updateOnView="months"
        viewMode="months"
        dateFormat="YYYY-MM"
        timeFormat={false}
        renderMonth={renderMonth}
        ref={dateTimeRef}
        utc={false}
        isValidDate={isValidDate}
        renderInput={(props) => (
          <input {...props} style={{ display: "none" }} />
        )}
        onClose={() => {
          handleCalenderCancel();
          if (!endMonth) {
            setStartMonth(null);
          }
        }}
      />
      <div className="button-list">
        <button
          onClick={() => {
            setStartMonth(null);
            setEndMonth(null);
          }}
          style={{ cursor: "pointer", marginLeft: "10px" }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            handleDateApply({
              start: startMonth?.format("YYYY-MM-DD"),
              end: endMonth?.format("YYYY-MM-DD"),
              getMonthCount: monthCount,
            });
            setStartMonth(null);
            setEndMonth(null);
          }}
          disabled={isDisabled}
          className={`submit-btn ${!isDisabled ? "active" : "disabled"}`}
          style={{
            cursor: !startMonth || !endMonth ? "not-allowed" : "pointer",
            marginLeft: "10px",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default MonthRangePicker;

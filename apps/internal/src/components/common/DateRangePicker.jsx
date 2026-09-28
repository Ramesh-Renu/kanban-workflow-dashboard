import React, { useEffect, useState, useRef, useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getInitialLeftMonth = (isPast, today) => {
  if (isPast === true) {
    return today.startOf("month").subtract(1, "month");
  }
  return today.startOf("month");
};

/** Left + right panes; when isPast, right pane never exceeds current month. */
const getCalendarMonths = (leftMonth, isPast, today) => {
  const left = leftMonth.clone().startOf("month");
  const maxMonth = today.startOf("month");

  if (isPast === true) {
    const nextRight = left.clone().add(1, "month");
    const right = nextRight.isAfter(maxMonth, "month") ? maxMonth.clone() : nextRight;
    return { left: right.clone().subtract(1, "month"), right };
  }

  if (isPast === false) {
    const adjustedLeft = left.isBefore(maxMonth, "month") ? maxMonth.clone() : left;
    return { left: adjustedLeft, right: adjustedLeft.clone().add(1, "month") };
  }

  return { left, right: left.clone().add(1, "month") };
};

const normalizeDay = (date) => (date ? dayjs(date).startOf("day") : null);

const isSameRangeValue = (a, b) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return normalizeDay(a).isSame(normalizeDay(b), "day");
};

const isMonthSelectable = (year, monthIndex, isPast, today) => {
  if (year > today.year()) return isPast !== true;
  if (year < today.year()) return isPast !== false;
  if (isPast === true) return monthIndex <= today.month();
  if (isPast === false) return monthIndex >= today.month();
  return true;
};

const DateRangePicker = ({
  isPast = null,
  onApply,
  onCancel,
  value = { from: null, to: null },
}) => {
  const today = useMemo(() => dayjs(), []);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() =>
    getInitialLeftMonth(isPast, today),
  );
  const skipValueSyncRef = useRef(false);

  const { left: leftMonth, right: rightMonth } = useMemo(
    () => getCalendarMonths(currentMonth, isPast, today),
    [currentMonth, isPast, today],
  );

  useEffect(() => {
    if (skipValueSyncRef.current) {
      skipValueSyncRef.current = false;
      return;
    }

    const incomingStart = value?.from ? normalizeDay(value.from) : null;
    const incomingEnd = value?.to ? normalizeDay(value.to) : null;

    if (
      isSameRangeValue(incomingStart, startDate) &&
      isSameRangeValue(incomingEnd, endDate)
    ) {
      return;
    }

    setStartDate(incomingStart);
    setEndDate(incomingEnd);
    setHoverDate(null);

    if (incomingStart) {
      const anchor = incomingStart.startOf("month");
      setCurrentMonth(
        isPast === true &&
          anchor.isAfter(today.startOf("month").subtract(1, "month"), "month")
          ? today.startOf("month").subtract(1, "month")
          : anchor,
      );
    } else if (!incomingStart && !incomingEnd) {
      setCurrentMonth(getInitialLeftMonth(isPast, today));
    }
  }, [value?.from, value?.to, isPast, today]);

  const notifyParent = (start, end) => {
    skipValueSyncRef.current = true;
    onApply?.({
      startDate: start ? start.toDate() : null,
      endDate: end ? end.toDate() : null,
    });
  };

  const generateDays = (month) => {
    const startOfMonth = month.startOf("month");
    const endOfMonth = month.endOf("month");
    const days = [];
    const startDay = startOfMonth.day();
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= endOfMonth.date(); d++) {
      days.push(month.clone().date(d).startOf("day"));
    }
    return days;
  };

  const handleDateClick = (clickedDay) => {
    const date = normalizeDay(clickedDay);
    setHoverDate(null);

    // Complete range already selected — start a new range from the clicked day
    if (startDate && endDate) {
      setStartDate(date);
      setEndDate(null);
      notifyParent(date, null);
      return;
    }

    if (!startDate) {
      setStartDate(date);
      setEndDate(null);
      notifyParent(date, null);
      return;
    }

    if (date.isBefore(startDate, "day")) {
      setStartDate(date);
      setEndDate(startDate);
      notifyParent(date, startDate);
      return;
    }

    if (date.isSame(startDate, "day")) {
      setStartDate(date);
      setEndDate(null);
      notifyParent(date, null);
      return;
    }

    setEndDate(date);
    notifyParent(startDate, date);
  };

  const isInRange = (date) => {
    if (startDate && !endDate && hoverDate) {
      return date.isAfter(startDate) && date.isBefore(hoverDate);
    }
    if (startDate && endDate) {
      return date.isAfter(startDate) && date.isBefore(endDate);
    }
    return false;
  };

  const canGoPrev = () => {
    if (isPast === false) {
      return !(leftMonth.year() <= today.year() && leftMonth.month() <= today.month());
    }
    return true;
  };

  const canGoNext = () => {
    if (isPast === true) {
      return rightMonth.isBefore(today.startOf("month"), "month");
    }
    return true;
  };

  const renderCalendar = (month, { showPrev, showNext, panel }) => {
    const days = generateDays(month);
    const year = month.year();
    const monthIndex = month.month();
    const isLeftPanel = panel === "left";

    const handleYearChange = (e) => {
      const newYear = parseInt(e.target.value, 10);
      const next = month.clone().year(newYear).startOf("month");
      setCurrentMonth(isLeftPanel ? next : next.subtract(1, "month"));
    };

    const handleMonthChange = (e) => {
      const newMonth = parseInt(e.target.value, 10);
      const next = month.clone().month(newMonth).startOf("month");
      setCurrentMonth(isLeftPanel ? next : next.subtract(1, "month"));
    };

    const yearOptions = Array.from({ length: 21 }, (_, i) => year - 10 + i).filter(
      (y) => {
        if (isPast === true) return y <= today.year();
        if (isPast === false) return y >= today.year();
        return true;
      },
    );

    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          {showPrev ? (
            <button
              type="button"
              className="btn btn-0 icon-caret-circle-left fs-5 p-1 border-0"
              disabled={!canGoPrev()}
              onClick={() => setCurrentMonth((prev) => prev.subtract(1, "month"))}
            />
          ) : (
            <div style={{ width: "20px" }} />
          )}

          <div className="d-flex align-items-center">
            <select
              value={monthIndex}
              onChange={handleMonthChange}
              className="datepicker-select"
            >
              {MONTH_NAMES.map((m, i) => {
                if (!isMonthSelectable(year, i, isPast, today)) return null;
                return (
                  <option key={m} value={i}>
                    {m}
                  </option>
                );
              })}
            </select>

            <select
              value={year}
              onChange={handleYearChange}
              className="datepicker-select"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {showNext ? (
            <button
              type="button"
              className="btn btn-0 icon-caret-circle-right fs-5 p-1 border-0"
              disabled={!canGoNext()}
              onClick={() => setCurrentMonth((prev) => prev.add(1, "month"))}
            />
          ) : (
            <div style={{ width: "20px" }} />
          )}
        </div>

        <div className="d-grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="fw-bold text-center small fs-7 mb-2 text-black">
              {d}
            </div>
          ))}

          {days.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="p-2 m-1" />;

            const disabled =
              (isPast === true && day.isAfter(today, "day")) ||
              (isPast === false && day.isBefore(today, "day"));

            const isSelected =
              (startDate && day.isSame(startDate, "day")) ||
              (endDate && day.isSame(endDate, "day"));
            const inRange = isInRange(day);

            return (
              <div
                key={day.format("DD-MM-YYYY")}
                className={`text-center p-1 rounded m-1 dateText
                  ${disabled ? "text-muted bg-light" : ""}
                  ${isSelected ? "bg-selected-date text-white" : ""}
                  ${inRange ? "bg-range" : ""}
                  ${!disabled ? "cursor-pointer" : ""}`}
                onClick={() => !disabled && handleDateClick(day)}
                onMouseEnter={() => !disabled && setHoverDate(day)}
              >
                {day.date()}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="d-flex flex-column gap-3 p-2 rounded">
      <div className="d-flex gap-4">
        {renderCalendar(leftMonth, { showPrev: true, showNext: false, panel: "left" })}
        {renderCalendar(rightMonth, { showPrev: false, showNext: true, panel: "right" })}
      </div>
    </div>
  );
};

export default DateRangePicker;

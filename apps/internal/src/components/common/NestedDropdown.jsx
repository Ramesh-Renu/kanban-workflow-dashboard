import React, { Fragment, useState, useEffect, useRef } from "react";
import { Dropdown, Image } from "react-bootstrap";
import { radioChecked, radioUnChecked } from "../../assets/images";
import DateRangeCalendar from "./DateRangeCalender";
const NestedDropdown = ({
  data,
  getShowValue,
  placeHolder,
  styles,
  onChange,
  iconType,
  customIcon,
  showCalendarFor,
  setShowCalendarFor,
  selectedDate,
  setSelectedDate,
  ...props
}) => {
  const [show, setShow] = useState(false);
  const [getSelectedDate, setGetSelectedDate] = useState(null);
  const [selectedValues, setSelectedValues] = useState([]);
  const popupRef = useRef();
  // useEffect(() => {
  //   if (showCalendarFor) {
  //     setShow(true);
  //   } else {
  //     setShow(false);
  //   }
  // }, [showCalendarFor]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the click is outside the popup, close it
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        event.target.id !== "show_labels"
      ) {
        setSelectedValues([]);
        // setShow(false);
      }
    };
    // Attach the event listener to the document body
    document.addEventListener("click", handleClickOutside);

    // Cleanup the event listener when the component is unmounted
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleMainDropdownToggle = () => {
    if (props.defaultValue && props.defaultValue.length > 0) {
      const parentId = props.defaultValue[0];
      const childId = props.defaultValue[1];
      const parent = data.find((p) => p.id === parentId);
      const child = parent?.child?.find((c) => c.id === childId);
      setSelectedValues([parentId, childId]);
      if (child?.customEntry) {
        setShowCalendarFor(child.id);
        setShow(true);
      } else {
        setShow(true);
      }
      // setShow(getSelectedDate === null ? true :false);
    } else {
      setShow(true);
      // setSelectedValues([]);
      // setShow(false);
    }
  };

  const handleSelectedValue = (parent, children) => {
    // if (children?.customEntry) {
    //   setShowCalendarFor(children.id);
    // } else {
    //   setShowCalendarFor(null);
    // }

    setSelectedValues([parent.id, children.id]);

    setTimeout(() => {
      onChange(parent, children);
    }, 0);

    setShow(true);
  };

  const handleParentSelect = (parent) => {
    // setSelectedValues((prevSelected = []) => {
    //   if (prevSelected?.includes(parent.id)) {
    //     onChange({}, {});
    //     return []; // Remove
    //   } else {
    //     setShow(!show);
    //     return [...prevSelected, parent.id]; // Add
    //   }
    // });
    const isAlreadySelected = selectedValues?.includes(parent.id);
    onChange({}, {});
    if (isAlreadySelected) {
      setShowCalendarFor(null);
      setSelectedValues([]); // Remove
      return;
    }

    setShow((prev) => !prev);
    setSelectedValues([parent.id]); // Add
  };
  const handleDateApply = (date, parent, children) => {
    setGetSelectedDate(date);
    setSelectedDate(date, parent, children);
    setShowCalendarFor(null);
    setShow(false);
  };

  const handleCalenderCancel = () => {
    setShowCalendarFor(null);
    setShow(false);
    // if (props.defaultValue && props.lastConfirmedDateRange) {
    //   props.setValueOrderDateRange(props.lastConfirmedDateRange);
    //   setSelectedValues(props.lastConfirmedDateRange);
    // } else {
    //   // setSelectedValues([]);
    // }
  };

  return (
    <Dropdown
      drop="down"
      autoClose="outside"
      ref={popupRef}
      onClick={(e) => {
        e.stopPropagation();
        handleMainDropdownToggle();
      }}
      className="nestedDropdown"
    >
      <Dropdown.Toggle style={styles} aria-placeholder="Date" disabled={props.disabled}>
        {getShowValue ? getShowValue : placeHolder}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {/* Nested Dropdown */}
        {data?.map((parent) => (
          <Dropdown
            drop="end"
            show={showCalendarFor || show}
            autoClose="outside"
            key={parent.id}
            id={"show_labels"}
          >
            <Dropdown.Toggle
              as="button"
              className={`dropdown-item${parent.disabled ? " disabled" : ""} ${
                selectedValues.includes(parent.id) ? "selected" : ""
              }`}
              disabled={parent.disabled}
              onMouseDown={() => handleParentSelect(parent)} // <-- Add this line
            >
              {iconType && (
                <Image
                  src={selectedValues.includes(parent.id) ? radioChecked : radioUnChecked}
                  alt={iconType}
                  className={"iconType"}
                />
              )}
              {parent.name}
            </Dropdown.Toggle>
            {!parent.disabled && selectedValues.includes(parent.id) && (
              <Dropdown.Menu>
                {parent.child.map((children) => (
                  <Fragment key={children.id}>
                    <Dropdown.Item
                      className={`
                        ${
                          children.customEntry && showCalendarFor === children.id
                            ? "is_active"
                            : ""
                        }  ${selectedValues.includes(children.id) ? "selected" : ""}`}
                      disabled={children.disabled}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // prevents Bootstrap from auto closing
                        handleSelectedValue(parent, children);
                      }}
                    >
                      {iconType && !children.customEntry && (
                        <Image
                          src={
                            selectedValues.includes(children.id)
                              ? radioChecked
                              : radioUnChecked
                          }
                          alt={iconType}
                          className={"iconType"}
                        />
                      )}
                      {children.name}
                      {children.customEntry && React.isValidElement(customIcon) && (
                        <Fragment>{customIcon}</Fragment>
                      )}
                    </Dropdown.Item>
                    {children.customEntry && showCalendarFor === children.id && (
                      <div
                        className="calendar-wrapper"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DateRangeCalendar
                          initialDate={selectedDate}
                          onApply={(date) => {
                            handleDateApply(date, parent, children);
                          }}
                          onCancel={() => handleCalenderCancel()}
                          title={parent.name}
                          isPast={selectedValues.includes("orderDateRange") ? true : null}
                        />
                      </div>
                    )}
                  </Fragment>
                ))}
              </Dropdown.Menu>
            )}
          </Dropdown>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NestedDropdown;

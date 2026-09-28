import React, { Fragment, useEffect, useRef, useState } from "react";
import Select from "react-dropdown-select";
import checked from "../assets/images/checked.png";
import unChecked from "../assets/images/unchecked.png";
import radioChecked from "../assets/images/radio-checked.svg";
import radioUnChecked from "../assets/images/radio-uncheck.svg";
import { checkedBlueIcon, unCheckedBlueIcon } from "../assets/images/index";
import tick from "../assets/images/tick.svg";
import tickeCheck from "../assets/images/ticke-check-green.svg";
import { Form } from "react-bootstrap";

const renderOptionColorSwatch = (option, props) => {
  if (!props?.colorField) return null;

  const color = option?.[props.colorField];
  if (!color) return null;

  return (
    <span
      className="dropdown-option-color-swatch"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
};

const OverflowContent = ({ props, state }) => {
  const containerRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  // Prefer controlled values so external updates (e.g. chip remove) reflect immediately
  const selectedValues = Array.isArray(props.values) ? props.values : state.values;

  useEffect(() => {
    if (containerRef.current) {
      const hasOverflow =
        containerRef.current.scrollWidth > containerRef.current.clientWidth;
      setIsOverflowing(hasOverflow);
    }
  }, [selectedValues]);

  if (!props.multi || selectedValues.length === 0) {
    return <span className="dropdown-placeholder">{props.placeholder}</span>;
  }

  const selectedLabels = selectedValues.map((item) => item[props.labelField]);
  const displayText = selectedLabels.join(", ");

  return (
    <div
      className={`custom-tooltip-wrapper${props.colorField ? " label-multi-select-content" : ""}`}
    >
      <div ref={containerRef} className="selected-values-text">
        {displayText}
      </div>

      {/* Tooltip only if overflowing */}
      {isOverflowing && (
        <div className="custom-tooltip-box">
          {displayText}
          <span className="css-arrow"></span>
        </div>
      )}
    </div>
  );
};

const SelectDropDown = ({ options, ...props }) => {
  const [showPopup, setshowPopup] = useState(true);
  const [searchValue, setSearchValue] = useState("");

  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
  };

  /** CUSTOMIZED SINGLE SELECT DROPDOWN */
  const singleSelectDropdown = ({ props, state, methods }) => {
    const regexp = new RegExp(escapeRegExp(state.search), "i");
    if (state.values.length === 0) {
      state.searchResults = props?.options?.filter(
        (item) =>
          regexp.test(item[props?.labelField]) || regexp.test(item[props?.valueField]),
      );
    }
    if (state.values.length === 1) {
      state.search = "";
    }

    return (
      <div className="dropdwonList-main" key={`dropdown-main-${props.title}`}>
        {props.title && <p className="dropdwonList-head">{props.title}</p>}
        <div className="dropdwonLists single" key={`dropdown-list-${props.title}-single`}>
          {props.options
            .filter((item) => regexp.test(item[props.searchBy] || item[props.labelField]))
            .map((option, i) => (
              <Fragment key={i}>
                <p
                  className={`dropdwonLists-label ${option.disabled ? " disabled" : ""}  ${
                    state.values.filter(
                      (o) => o[props.valueField] === option[props.valueField],
                    ).length > 0
                      ? " active"
                      : ""
                  }`}
                  onClick={() => methods?.addItem(option)}
                  disabled={option.disabled}
                >
                  {props.optionType && props.optionType == "radio" && (
                    <img
                      onChange={() => methods?.addItem(option)}
                      className="checkbox-img"
                      src={
                        state.values.filter(
                          (o) => o[props.valueField] === option[props.valueField],
                        ).length > 0
                          ? radioChecked
                          : radioUnChecked
                      }
                      alt=""
                    />
                  )}
                  {props.optionType && props.optionType === "tick" && (
                    <img
                      onChange={() => methods?.addItem(option)}
                      className="checkbox-img"
                      src={option.status === "close" ? tickeCheck : tick}
                      alt=""
                    />
                  )}
                  {renderOptionColorSwatch(option, props)}
                  <label>{option[props.labelField]}</label>
                </p>
              </Fragment>
            ))}
          {state?.searchResults?.length === 0 &&
            state.search?.trim() &&
            (props.isCanAddNew ? (
              <div className="p-2">
                <div className="d-flex flex-row justify-content-between align-items-center mt-2">
                  <div className="text-muted ">
                    Do you want add this {props?.labelValue} ?
                  </div>
                  <button
                    className="btn addButton border-0"
                    onClick={() => {
                      const newItem = {
                        [props?.valueField]: 0,
                        [props?.keyValue]: state.search.trim(),
                      };
                      methods.addItem(newItem);
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="text-center text-danger fs-12 text-capitalize py-3">
                  {props.options.length > 0 &&
                    (props?.notFoundText || `${props?.keyValue} Not found`)}
                </div>
              </div>
            ) : (
              <p className="error-show m-0 fs-14">No result found</p>
            ))}
          {props.options.length === 0 &&
            state.search?.trim()?.length === 0 &&
            props.isCanAddNew && (
              <div className="p-2">
                <div className="d-flex flex-row align-items-center mt-2">
                  <div className="text-muted text-center m-auto">
                    Enter and Add the {props?.labelValue}
                  </div>
                </div>
                <div className="text-center text-danger fs-12 text-capitalize py-3">
                  {`No ${props?.labelValue} List`}
                </div>
              </div>
            )}
        </div>
      </div>
    );
  };

  const multiSelectDropdown = ({ props, state, methods }) => {
    const regexp = new RegExp(escapeRegExp(searchValue || ""), "i");

    // Filtered options based on search input
    const filteredOptions = props?.options?.filter(
      (item) =>
        regexp.test(item[props?.labelField]) || regexp.test(item[props?.valueField]),
    );

    // Controlled values win over internal state (chip/parent updates)
    const selectedValues = Array.isArray(props.values) ? props.values : state.values;
    const sameValue = (a, b) =>
      a === b || Number(a) === Number(b) || String(a) === String(b);
    const isValueSelected = (option) =>
      selectedValues.some((v) =>
        sameValue(v?.[props.valueField], option?.[props.valueField]),
      );

    // Check if all items (in full list) are selected
    const allSelected =
      props.options &&
      props.options.length > 0 &&
      props.options.every((opt) => isValueSelected(opt));

    // Toggle Select All — keep disabled (locked) selections when deselecting
    const toggleSelectAll = () => {
      const allOptions = props.options || [];
      const lockedSelected = selectedValues.filter((val) => {
        const opt = allOptions.find((o) =>
          sameValue(o?.[props.valueField], val?.[props.valueField]),
        );
        return opt?.disabled;
      });

      if (allSelected) {
        if (typeof props.onChange === "function") {
          props.onChange(lockedSelected);
          if (typeof methods.clearAll === "function") methods.clearAll();
          requestAnimationFrame(() => {
            lockedSelected.forEach((opt) => {
              const option = allOptions.find((o) =>
                sameValue(o?.[props.valueField], opt?.[props.valueField]),
              );
              if (option && typeof methods.addItem === "function") {
                methods.addItem(option);
              }
            });
          });
          return;
        }
        if (typeof methods.clearAll === "function") {
          methods.clearAll();
        }
        return;
      }

      const newSelected = [...allOptions];

      if (typeof props.onChange === "function") {
        props.onChange(newSelected);
        return;
      }

      // Fallback approach: clear first, then add items in next tick
      if (typeof methods.clearAll === "function") {
        methods.clearAll();
      }

      requestAnimationFrame(() => {
        // NOTE: addItem toggles; since we've cleared first this will add cleanly
        newSelected.forEach((opt) => {
          if (typeof methods.addItem === "function") {
            methods.addItem(opt);
          }
        });
      });
    };

    // Toggle individual item — disabled/locked options cannot be toggled
    const setOptionValue = (option) => {
      if (!option || option[props.valueField] == null || option[props.valueField] === "")
        return;
      if (option.disabled) return;
      methods?.addItem(option);
    };

    return (
      <div
        className={`dropdwonList-main${props.colorField ? " has-color-options" : ""}`}
        key={`dropdown-main-${props.title}`}
      >
        <div className="d-flex justify-content-between">
          {props.title && <p className="dropdwonList-head m-0">{props.title}</p>}

          {/* Select All */}
          {props.showSelectAll &&
            props.options.length > 1 &&
            searchValue.trim() === "" && (
              <p
                className={`d-flex gap-2 align-items-center dropdwonLists-label select-all m-0`}
                onClick={toggleSelectAll}
              >
                {props.optionType === "checkbox" && (
                  <img
                    className="checkbox-img"
                    src={allSelected ? checkedBlueIcon : unCheckedBlueIcon}
                    alt=""
                  />
                )}
                <label>{allSelected ? "Deselect All" : "Select All"}</label>
              </p>
            )}
        </div>

        {props.customSearch && (
          <div
            className="p-2"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder="Search..."
              value={searchValue}
              autoFocus
              onChange={(e) => setSearchValue(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              onKeyUp={(e) => e.stopPropagation()}
              className="dropdwonList-search"
            />
          </div>
        )}

        <div className="dropdwonLists" key={`dropdown-list-${props.title}-multiple`}>
          {filteredOptions.map((option, i) => {
            const isSelected = isValueSelected(option);
            const isDisabled = !!option.disabled;
            return (
              <p
                tabIndex={isDisabled ? -1 : 0}
                className={`dropdwonLists-label ${isDisabled ? "disabled" : ""} ${isSelected ? "active" : ""}`}
                key={i}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled}
                title={
                  isDisabled
                    ? "Previously selected tool cannot be removed"
                    : undefined
                }
                onClick={() => setOptionValue(option)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOptionValue(option);
                  }
                }}
                disabled={isDisabled}
              >
                {props.optionType === "checkbox" && (
                  <img
                    className="checkbox-img dropdown-option-checkbox"
                    src={isSelected ? checkedBlueIcon : unCheckedBlueIcon}
                    alt=""
                  />
                )}
                {renderOptionColorSwatch(option, props)}
                <label>{option[props.labelField]}</label>
              </p>
            );
          })}

          {filteredOptions.length === 0 && (
            <p className="error-show m-0 fs-14">No {props.placeholder} Listed</p>
          )}
        </div>
      </div>
    );
  };

  /** CUSTOMIZED DROPDOWN RENDER - Lested List */
  const nestedListCustomDropdownRenderer = ({ props, state, methods }) => {
    return (
      <div className="dropdwonList-main" key={`dropdown-main-${props.title}`}>
        {props.title && <p className="dropdwonList-head">{props.title}</p>}
        <div className="dropdwonLists" key={`dropdown-list-${props.title}-custom`}>
          {props.options.map((option, i) => (
            <Fragment key={`dropdown-option-${i + "1"}`}>
              {option.countryList && (
                <p className="dropdwonList-subhead">{option.name}</p>
              )}
              {option.countryList &&
                option.countryList.map((opt, k) => {
                  return (
                    <Fragment key={`dropdown-option-${k + "2"}`}>
                      <p
                        className={
                          option.disabled
                            ? "dropdwonLists-label sub-list disabled"
                            : "dropdwonLists-label sub-list"
                        }
                        disabled={option.disabled}
                        key={opt.countryId}
                        onClick={() => methods.addItem(opt)}
                      >
                        <img
                          onChange={() => methods.addItem(opt)}
                          className="checkbox-img"
                          src={
                            state?.values?.find((o) => o.countryId === opt.countryId)
                              ? checked
                              : unChecked
                          }
                          alt=""
                        />
                        <label>{opt.name + " (" + opt.code + ")"}</label>
                      </p>
                    </Fragment>
                  );
                })}
            </Fragment>
          ))}
        </div>
      </div>
    );
  };

  /** CUSTOMIZED DROPDOWN RENDER - Add Member */
  const addMembercustomDropdownRenderer = ({ props, state, methods }) => {
    const regexp = new RegExp(escapeRegExp(state.search), "i");
    setshowPopup(true);
    //INCLUDE MEMBERS TO SELECTED MEMBER BOX
    // const includeMemebers = () => {
    //   setAddMemberList(state?.values);
    //   setErrorRole(false);
    //   setshowPopup(false);
    // };
    state.searchResults = props?.options?.filter(
      (item) =>
        regexp.test(item[props?.labelField]) || regexp.test(item[props?.valueField]),
    );
    state.dropdown = showPopup;
    return (
      <div className="dropdwonList-main" key={`dropdown-main-addmember`}>
        <div className="dropdwonLists" key={`dropdown-list-addmember`}>
          {props?.options
            .filter(
              (item) =>
                regexp.test(item[props?.labelField]) ||
                regexp.test(item[props?.valueField]),
            )
            .map((option, i) => (
              <Fragment key={`dropdown-option-${i + "1"}`}>
                <p
                  className={
                    option.disabled
                      ? "dropdwonLists-label disabled"
                      : "dropdwonLists-label"
                  }
                  disabled={option.disabled}
                  key={option?.regId}
                  onClick={() => methods?.addItem(option)}
                >
                  {props.optionType && props.optionType == "checkbox" && (
                    <img
                      onChange={() => methods?.addItem(option)}
                      className="checkbox-img"
                      src={
                        state.values.filter(
                          (o) => o[props?.valueField] === option[props?.valueField],
                        )?.length > 0
                          ? checked
                          : unChecked
                      }
                      alt=""
                    />
                  )}
                  {props.optionType && props.optionType == "radio" && (
                    <img
                      onChange={() => methods?.addItem(option)}
                      className="checkbox-img"
                      src={
                        state.values.filter(
                          (o) => o[props?.valueField] === option[props?.valueField],
                        )?.length > 0
                          ? radioChecked
                          : radioUnChecked
                      }
                      alt=""
                    />
                  )}
                  <span className="lable-field">
                    <label>{option[props?.labelField]}</label>
                    {option?.email && (
                      <label className="mail-field">{option?.email}</label>
                    )}
                  </span>
                </p>
              </Fragment>
            ))}
          {state?.searchResults?.length === 0 && (
            <p className="error-show m-0 fs-14">Not Found User/Member</p>
          )}
        </div>
        {/* {props?.title === "Add Member" && state?.searchResults?.length > 0 && (
            <div className="flex-btn">
              <button onClick={methods.clearAll} className="reset-btn">
                Reset
              </button>
              <button onClick={includeMemebers} className="includemember-btn">
                Add
              </button>
            </div>
          )} */}
      </div>
    );
  };

  return (
    <>
      <Select
        options={options}
        {...props}
        dropdownRenderer={
          props.nestedList && props.multi === true
            ? nestedListCustomDropdownRenderer
            : props.addMember === true
              ? addMembercustomDropdownRenderer
              : props.multi
                ? multiSelectDropdown
                : singleSelectDropdown
        }
        // contentRenderer={props.contentRenderer}
        contentRenderer={
          props.multi && !props.contentRenderer
            ? (renderProps) => <OverflowContent {...renderProps} />
            : props.contentRenderer && props.contentRenderer
        }
      ></Select>
      {props?.isInvalid && (
        <Form.Text className="text-danger">{props?.errorMsg}</Form.Text>
      )}
    </>
  );
};

export default SelectDropDown;

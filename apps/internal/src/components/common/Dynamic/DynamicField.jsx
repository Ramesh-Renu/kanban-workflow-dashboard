import React, { useState, useRef, useEffect, Fragment } from "react";
import { pencilSimpleLine, trashFull } from "../../../assets/images";
import { ColorPicker } from "@euroland/react";
import appConstants from "../../../constant/common";

const DynamicField = ({
  getData,
  setIsClicked,
  fieldAdd,
  fieldRemove,
  updateFieldData,
  errorMsg,
  type,
  ...props
}) => {
  const [changedHeading, setChangedHeading] = useState("");
  const [changedValue, setChangedValue] = useState("");
  const getId = useRef();
  const inputFieldRef = useRef(null);
  const colorPickerRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  /** EVENT LISTENER TO CLOSE THE COLOR PICKER POPUP - WHEN CLICKED OUTSIDE */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputFieldRef.current &&
        !inputFieldRef.current.contains(event.target)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setChangedHeading((prev) =>
      prev === getData?.fieldName ? prev : (getData?.fieldName ?? ""),
    );
    setChangedValue((prev) =>
      prev === getData?.fieldValue ? prev : (getData?.fieldValue ?? ""),
    );
  }, [getData?.fieldName, getData?.fieldValue]);

  const fieldHeadingChanged = (e) => {
    const headVal = e.target.value;
    if (headVal.trim().length > 60) {
      setChangedHeading(headVal.trim().substring(0, 60));
    } else {
      setChangedHeading(headVal);
      updateFieldData(type, getData?.getId, headVal, changedValue);
    }
  };

  const fieldValueChanged = (e) => {
    const val = e.target.value;
    if (props.inputType === "number") {
      // Allow clearing the input
      if (val === "") {
        setChangedValue(val);
        updateFieldData(type, getData?.getId, changedHeading, val);
        return;
      }

      // Enforce maxLength
      const maxLen = parseInt(props.maxLength || "3");
      if (val.length > maxLen) {
        return;
      }

      // Allow only positive integers (no 0 or negatives)
      const num = Number(val);
      if (!/^\d+$/.test(val) || num <= 0) {
        return;
      }
    }

    if (
      props.format === "colorPicker" &&
      val?.trim().length > 1 &&
      !val?.match(appConstants.VALIDATION_PATTERNS.colorPickerPattern)
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    } else {
      setChangedValue(val);
      updateFieldData(type, getData?.getId, changedHeading, val);
    }
  };

  const handleFieldValueChanged = (val) => {
    setChangedValue(val);
    updateFieldData(type, getData?.getId, changedHeading, val);
  };

  const handleInputClick = () => {
    setIsClicked(getData?.getId);
  };

  const handleAddField = () => {
    fieldAdd(type, "Field " + [getData?.getId + 1], "");
  };
  const handleRemoveField = () => {
    fieldRemove(type, getData?.getId, getData?.fieldName);
  };

  const handleColorPicker = () => {
    setShowColorPicker((prev) => !prev);
  };

  const handleImageClick = () => {
    if (getId.current) {
      getId.current.focus(); // focuses the input
    }
  };

  return (
    <Fragment>
      <div className="input-field position-relative" ref={inputFieldRef}>
        {props?.extraFlag && type === "otherData" ? (
          <p className="flex-col">
            <span className="head-field">
              {
                <input
                  ref={getId}
                  id={getData?.getId}
                  className={`${getData?.labelClassName} rounded p-1`}
                  value={`${changedHeading}`}
                  onChange={fieldHeadingChanged}
                  onClick={() => handleInputClick(getData?.getId)}
                  maxLength={"15"}
                  disabled={props.disabled}
                />
              }
              <button id={getData?.getId} onClick={handleImageClick} className="p-0 bg-transparent border-0 mx-1">
                <img src={pencilSimpleLine} alt="editIcons" style={{ cursor: "pointer" }} />
              </button>
            </span>

            {getData?.removeBtn && (
              <button
                className="remove-field"
                onClick={() => handleRemoveField(getData?.getId)}
              >
                <img src={trashFull} alt={"trashFull"} />
              </button>
            )}
          </p>
        ) : (
          <label className="pb-2" htmlFor={changedHeading}>
            {changedHeading}
          </label>
        )}

        {props.format === "colorPicker" ? (
          <>
            <input
              className="input-type"
              value={changedValue === null ? "" : changedValue}
              onChange={(e) => fieldValueChanged(e)}
              onClick={handleColorPicker}
              maxLength={"10"}
              id={changedHeading}
              disabled={props.disabled}
            />
            <button
              className="color-sample rounded"
              style={{
                backgroundColor:
                  changedValue === null ? "#FFFFFF" : changedValue,
              }}
              disabled={props.disabled}
              onClick={handleColorPicker}
            ></button>
            {showColorPicker && (
              <ColorPicker
                ref={colorPickerRef}
                onChangeColor={handleFieldValueChanged}
                color={changedValue === null ? "" : changedValue}
              />
            )}
          </>
        ) : (
          <>
            <input
              className={`input-type`}
              value={changedValue}
              onChange={fieldValueChanged}
              placeholder={changedHeading}
              id={changedHeading}
              maxLength={props.maxLength || "250"}
              type={props.inputType || "text"}
              disabled={props.disabled}
            />
            {errorMsg && <label className="error-msg">{errorMsg}</label>}
          </>
        )}

        {props?.extraFlag && (
          <div className="d-flex flex-row justify-content-end py-1">
            {errorMsg && (
              <label className="error-msg">
                {errorMsg === true &&
                  !getData?.removeBtn &&
                  "* Please Enter the " + getData?.fieldName}
              </label>
            )}
            {getData?.addBtn && !getData?.disabled && (
              <button
                className="add-field mt-2"
                disabled={getData?.disabled}
                onClick={() => handleAddField()}
              >
                + Add extra field
              </button>
            )}
          </div>
        )}
      </div>
    </Fragment>
  );
};

export default DynamicField;

import React, { Fragment, useEffect, useState } from "react";
import { trashFull } from "../../../assets/images";
import PopupModal from "@orion/shared/src/components/PopupModal";
import DynamicField from "./DynamicField";

export default function DynamicInputFields({
  getDataList,
  placeholder,
  updateDataList,
  getRegex,
  addFieldText,
  disabled,
  isRequiredColor,
}) {
  const [sameNameError, setSameNameError] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [removeIndexField, setRemoveIndexField] = useState(null);

  useEffect(() => {
    // normalize list for comparison
    const normalized = getDataList.map((f) => f.name.trim().toLowerCase());
    const hasDuplicate = normalized.some(
      (val, i) => val && normalized.indexOf(val) !== i
    );
    setSameNameError(hasDuplicate);
  }, [getDataList]);

  const normalize = (val) => val.trim().toLowerCase(); // ✅ normalize input

  const addField = () => {
    const updated = [...getDataList, { name: "", id: "0" }];
    updateDataList(updated);
  };

  const removeField = (index) => {
    setShowDeleteModal(false);
    const updated = getDataList.filter((_, i) => i !== index);
    updateDataList(updated.length ? updated : [{ name: "", id: "0" }]);
  };
  // Delete Confirmation and store selected Row
  const handleDeleteConfirm = (data, index) => {
    setShowDeleteModal(true);
    setRemoveIndexField(index);

    // if (data.name !== "") {
    //   setShowDeleteModal(true);
    //   setRemoveIndexField(index);
    // } else {
    //   removeField(index);
    // }
  };
  const handleChange = (index, value) => {
    if (getRegex && !getRegex.test(value)) return;

    const updated = [...getDataList];
    updated[index] = {
      ...updated[index],
      name: value,
      ...(isRequiredColor ? { colorCode: "#ffffff" } : {}),
    }; // ✅ add only if true

    // check if any duplicate exists (case-insensitive + trim)
    const normalized = updated.map((f) => normalize(f.name));
    const hasDuplicate = normalized.some(
      (val, i) => val && normalized.indexOf(val) !== i
    );

    setSameNameError(hasDuplicate);
    updateDataList(updated);
  };
  const handleChangeColorCode = (index, value) => {
    const updated = [...getDataList];
    updated[index] = { ...updated[index], colorCode: value };
    updateDataList(updated);
  };
  return (
    <Fragment>
      <div className="rendered-inputs">
        {getDataList.map((field, index) => {
          const normalizedList = getDataList.map((f) => normalize(f.name));
          const currentValue = normalize(field.name);
          const firstIndex = normalizedList.indexOf(currentValue);

          // ✅ only duplicates AFTER the first one should show error
          const isDuplicate = currentValue && firstIndex !== index;

          return (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: "10px",
                gap: "5px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <input
                  type="text"
                  placeholder={placeholder || "New field"}
                  value={field.name}
                  onChange={(e) => handleChange(index, e.target.value)}
                  style={{ flex: 1 }}
                />
                {isRequiredColor && (
                  <DynamicField
                    format={"colorPicker"}
                    getData={{
                      fieldName: field?.label,
                      fieldValue: field?.colorCode,
                    }}
                    updateFieldData={(type, id, name, val) =>
                      handleChangeColorCode(index, val)
                    }
                    extraFlag={false}
                  />
                )}
                {getDataList?.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteConfirm(field, index)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "red",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    <img src={trashFull} alt="delete" />
                  </button>
                )}
              </div>
              {isDuplicate && (
                <p
                  className="my-2 mx-0 fs-12"
                  style={{ color: "var(--bs-danger)" }}
                >
                  This name is already available!
                </p>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addField}
          style={{
            border: "none",
            cursor: "pointer",
            marginTop: "5px",
            backgroundColor: "var(--color-white)",
            color: "var(--color-darkLiver)",
            fontSize: "12px",
            fontWeight: "400",
            opacity:
              disabled || (getDataList?.length > 0 && sameNameError)
                ? "0.5"
                : "1",
          }}
          disabled={disabled || (getDataList?.length > 0 && sameNameError)}
        >
          + {addFieldText ? addFieldText : "Add extra field"}
        </button>
      </div>
      <PopupModal
        show={showDeleteModal}
        onClose={setShowDeleteModal}
        className={"deleteConfirmModal"}
      // header={false}
      >
        <div className="deleteConfirmation">
          <div className="w-100 mx-auto">
            <h5 className="text-danger text-center">Confirm Deletion</h5>
            <p className="text-center">
              Deleting this{" "}
              <b>
                {getDataList.filter((_, i) => i === removeIndexField)[0]?.name}{" "}
                Stage
              </b>{" "}
              will remove all their access related ticket.
            </p>
          </div>
          <div className="d-flex flex-row align-items-center justify-content-center gap-3 delete_btn_rows">
            <button
              className="btn btn-0 yes_btn px-4 rounded"
              onClick={() => removeField(removeIndexField)}
            >
              Yes
            </button>
            <button
              className="btn btn-0 no_btn px-4 rounded"
              onClick={() => {
                setShowDeleteModal(false);
              }}
            >
              No
            </button>
          </div>
        </div>
      </PopupModal>
    </Fragment>
  );
}

import { useState, useEffect, useMemo } from "react";
import DynamicField from "components/common/Dynamic/DynamicField";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { useToast } from "@orion/shared";
import { trashFull, pluseIcon } from "assets/images";
import {
  getRowId,
  isNewRow,
  getItemStatusCode,
  collectUsedStatusCodes,
  buildUniqueStatusCode,
  isStatusCodeAvailable,
  getDuplicateNameError,
} from "./masterDataUtils";

const EMPTY_ROW = {
  id: 0,
  name: "",
  code: "",
  back_ground_colour: "#ffffff",
  colour_code: "#000000",
};

const normalizeRows = (rows = []) =>
  rows.map((item) => ({
    ...item,
    back_ground_colour: item?.back_ground_colour || "#ffffff",
    colour_code: item?.colour_code || "#000000",
  }));

const isRowEqual = (a, b) =>
  String(getRowId(a)) === String(getRowId(b)) &&
  String(a?.name ?? "").trim() === String(b?.name ?? "").trim() &&
  String(a?.back_ground_colour ?? "") === String(b?.back_ground_colour ?? "") &&
  String(a?.colour_code ?? "") === String(b?.colour_code ?? "");

const getPendingChanges = (temp = [], original = []) => {
  const newItems = temp.filter((item) => isNewRow(item));

  const editedItems = temp.filter((item) => {
    if (isNewRow(item)) return false;
    const originalItem = original.find((row) => getRowId(row) === getRowId(item));
    return originalItem && !isRowEqual(item, originalItem);
  });

  const deletedItems = original.filter((item) => {
    if (isNewRow(item)) return false;
    return !temp.some((row) => getRowId(row) === getRowId(item));
  });

  return { newItems, editedItems, deletedItems };
};

const PreviewMasterData = ({
  masterData,
  loading,
  saving,
  error,
  onSaveMasterData,
}) => {
  const { showToast } = useToast();
  const [tempMasterData, setTempMasterData] = useState([]);
  const [originalMasterData, setOriginalMasterData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

  useEffect(() => {
    const normalized = normalizeRows(masterData);
    setTempMasterData(normalized);
    setOriginalMasterData(normalized);
  }, [masterData]);

  const headerColumns = ["Name", "Background Colour", "Colour Code", "Actions"];

  const pendingChanges = useMemo(
    () => getPendingChanges(tempMasterData, originalMasterData),
    [tempMasterData, originalMasterData],
  );

  const isDirty = useMemo(() => {
    const { newItems, editedItems, deletedItems } = pendingChanges;
    return newItems.length > 0 || editedItems.length > 0 || deletedItems.length > 0;
  }, [pendingChanges]);

  const getRowKey = (item, index) => {
    if (item._localKey) return `new-${item._localKey}`;
    const rowId = getRowId(item);
    return rowId ? `id-${rowId}` : `new-${index}`;
  };

  const activeRowKey = useMemo(() => {
    const { editedItems, newItems } = pendingChanges;

    if (editedItems.length > 0) {
      const editedItem = editedItems[0];
      const index = tempMasterData.findIndex(
        (row) => getRowId(row) === getRowId(editedItem),
      );
      return index >= 0 ? getRowKey(tempMasterData[index], index) : null;
    }

    if (newItems.length > 0) {
      const index = tempMasterData.findIndex((row) => isNewRow(row));
      return index >= 0 ? getRowKey(tempMasterData[index], index) : null;
    }

    return null;
  }, [pendingChanges, tempMasterData]);

  const isRowDisabled = (item, index) => {
    if (!activeRowKey) return false;
    return getRowKey(item, index) !== activeRowKey;
  };

  const getRowNameError = (item, index) => {
    if (isRowDisabled(item, index)) return null;
    return getDuplicateNameError(item?.name, tempMasterData, index);
  };

  const hasInvalidPendingRows = useMemo(() => {
    const { newItems, editedItems } = pendingChanges;
    const hasEmptyOrMissingCode = [...newItems, ...editedItems].some(
      (item) => !String(item?.name ?? "").trim() || (isNewRow(item) && !getItemStatusCode(item)),
    );
    if (hasEmptyOrMissingCode) return true;

    return tempMasterData.some((item, index) => Boolean(getRowNameError(item, index)));
  }, [pendingChanges, tempMasterData, activeRowKey]);

  const getNewRowStatusMeta = (item, index) => {
    if (!isNewRow(item)) return null;
    const code = getItemStatusCode(item);
    if (!code) return null;

    const usedCodes = collectUsedStatusCodes(tempMasterData, originalMasterData, index);
    return {
      code,
      available: isStatusCodeAvailable(code, usedCodes),
    };
  };

  const handleChangeMasterDataInfo = (value, key, index) => {
    if (isRowDisabled(tempMasterData[index], index)) return;

    setTempMasterData((prev) =>
      prev.map((row, itemIndex) => {
        if (itemIndex !== index) return row;

        const updated = { ...row, [key]: value };

        if (isNewRow(row) && key === "name") {
          const usedCodes = collectUsedStatusCodes(prev, originalMasterData, itemIndex);
          updated.code = buildUniqueStatusCode(value, usedCodes);
        }

        return updated;
      }),
    );
  };

  const handleAddRow = () => {
    if (activeRowKey) {
      showToast({
        message: "Please save or cancel the current row before adding a new one",
        variant: "warning",
      });
      return;
    }

    setTempMasterData((prev) => [...prev, { ...EMPTY_ROW, _localKey: Date.now() }]);
  };

  const handleDeleteConfirm = (index) => {
    if (isRowDisabled(tempMasterData[index], index)) {
      showToast({
        message: "Please save or cancel the current row before deleting another",
        variant: "warning",
      });
      return;
    }

    setDeleteIndex(index);
    setShowDeleteModal(true);
  };

  const handleDeleteRow = () => {
    if (deleteIndex === null) return;
    setTempMasterData((prev) => prev.filter((_, index) => index !== deleteIndex));
    setDeleteIndex(null);
    setShowDeleteModal(false);
  };

  const handleCancel = () => {
    setTempMasterData(normalizeRows(originalMasterData));
  };

  const handleSave = () => {
    if (!isDirty || hasInvalidPendingRows) return;

    if (pendingChanges.editedItems.length > 1) {
      showToast({
        message: "Only one existing row can be updated at a time",
        variant: "warning",
      });
      return;
    }

    if (pendingChanges.newItems.length > 1) {
      showToast({
        message: "Only one new row can be added at a time",
        variant: "warning",
      });
      return;
    }

    onSaveMasterData(pendingChanges);
  };

  return (
    <aside className="master_data_preview_table master_data_preview_table--clean">
      <header className="master_data_preview_table__header">
        {headerColumns.map((item, index) => (
          <h5 className={`master_data_preview_table__header-${index + 1}`} key={item}>
            <span>{item}</span>
          </h5>
        ))}
      </header>

      <ul className="master_data_preview_table__list">
        {loading ? (
          <li className="master_data_preview_table__list-item-empty is-muted">
            Loading...
          </li>
        ) : tempMasterData.length > 0 ? (
          tempMasterData.map((item, index) => {
            const statusMeta = getNewRowStatusMeta(item, index);
            const nameError = getRowNameError(item, index);
            const rowKey = getRowKey(item, index);
            const rowDisabled = isRowDisabled(item, index);
            const isActiveRow = activeRowKey === rowKey;

            return (
              <li
                className={`master_data_preview_table__list-item${
                  isActiveRow && activeRowKey ? " is-active-row" : ""
                }${rowDisabled ? " is-row-disabled" : ""}`}
                key={rowKey}
              >
                <span className="master_data_preview_table__list-item-name">
                  <input
                    type="text"
                    className={`form-control master_data_preview_table__name-input ${
                      nameError ? "is-invalid" : ""
                    }`}
                    value={item.name ?? ""}
                    placeholder="Enter name"
                    disabled={rowDisabled || loading || saving}
                    onChange={(e) => handleChangeMasterDataInfo(e.target.value, "name", index)}
                  />
                  {nameError && (
                    <span className="master_data_preview_table__name-error">{nameError}</span>
                  )}
                  {statusMeta && (
                    <span
                      className={`master_data_preview_table__status-code ${
                        statusMeta.available ? "is-available" : "is-taken"
                      }`}
                    >
                      {/* {statusMeta.code} - {statusMeta.available ? "Available" : "Not available"} */}
                    </span>
                  )}
                </span>

                <span className="master_data_preview_table__list-item-background-colour">
                  <DynamicField
                    format="colorPicker"
                    getData={{
                      fieldName: "",
                      fieldValue: item?.back_ground_colour || "#ffffff",
                    }}
                    updateFieldData={(type, id, name, val) =>
                      handleChangeMasterDataInfo(val, "back_ground_colour", index)
                    }
                    type="Background Colour"
                    extraFlag={false}
                    disabled={rowDisabled || loading || saving}
                  />
                </span>

                <span className="master_data_preview_table__list-item-colour-code">
                  <DynamicField
                    format="colorPicker"
                    getData={{
                      fieldName: "",
                      fieldValue: item?.colour_code || "#000000",
                    }}
                    updateFieldData={(type, id, name, val) =>
                      handleChangeMasterDataInfo(val, "colour_code", index)
                    }
                    type="Colour Code"
                    extraFlag={false}
                    disabled={rowDisabled || loading || saving}
                  />
                </span>

                <span className="master_data_preview_table__list-item-actions">
                  <button
                    type="button"
                    className="master_data_preview_table__delete-btn"
                    onClick={() => handleDeleteConfirm(index)}
                    title="Delete"
                    disabled={rowDisabled || loading || saving}
                    aria-label={`Delete ${item.name || "row"}`}
                  >
                    <img src={trashFull} alt="Delete" />
                  </button>
                </span>
              </li>
            );
          })
        ) : (
          <li className="master_data_preview_table__list-item-empty is-muted">
            No Data Found
          </li>
        )}
      </ul>

      <div className="master_data_preview_table__footer">
        <button
          type="button"
          className="master_data_preview_table__add-btn"
          onClick={handleAddRow}
          disabled={loading || saving || Boolean(activeRowKey)}
        >
          <img src={pluseIcon} alt="" />
          Add New
        </button>

        <div className="master_data_preview_table__save-actions">
          <button
            type="button"
            className="master_data_preview_table__cancel-btn"
            onClick={handleCancel}
            disabled={!isDirty || loading || saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="master_data_preview_table__save-btn"
            onClick={handleSave}
            disabled={!isDirty || hasInvalidPendingRows || loading || saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p className="master_data_preview_table__error">
          {error?.message || String(error)}
        </p>
      )}

      <PopupModal
        show={showDeleteModal}
        onClose={setShowDeleteModal}
        className="deleteConfirmModal"
      >
        <div className="deleteConfirmation">
          <div className="w-100 mx-auto">
            <h5 className="text-danger text-center">Confirm Deletion</h5>
            <p className="text-center">
              Are you sure you want to delete{" "}
              <b>{tempMasterData[deleteIndex]?.name || "this item"}</b>?
            </p>
          </div>
          <div className="d-flex flex-row align-items-center justify-content-center gap-3 delete_btn_rows">
            <button
              type="button"
              className="btn btn-0 yes_btn px-4 rounded"
              onClick={handleDeleteRow}
            >
              Yes
            </button>
            <button
              type="button"
              className="btn btn-0 no_btn px-4 rounded"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteIndex(null);
              }}
            >
              No
            </button>
          </div>
        </div>
      </PopupModal>
    </aside>
  );
};

export default PreviewMasterData;

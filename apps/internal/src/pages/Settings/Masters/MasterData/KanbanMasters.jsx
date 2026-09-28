import { useGlobalMaster, useToast } from "@orion/shared";
import { useState, useEffect, Fragment, useMemo } from "react";
import { t } from "i18next";
import { getandUpdateFreeFlowLabelMaster, globalMaster } from "services";
import PreviewMasterData from "./PreviewMasterData";
import { useGlobalContext } from "store/context/GlobalProvider";
import {
  mapToRequestBody,
  collectUsedStatusCodes,
  getItemStatusCode,
  buildUniqueStatusCode,
  isStatusCodeAvailable,
} from "./masterDataUtils";

const MASTER_DATA_HEADER = [
  {
    label: "Free Flow Label",
    accessorKey: "getFreeFlowLabelList",
    stateKey: "freeFlowLabelList",
    masterType: "FREEFLOWLABLE",
    description: "Labels used in free-flow stages",
  },
  {
    label: "Task Priority",
    accessorKey: "getTaskPriority",
    stateKey: "taskPriority",
    masterType: "TASKPRIORITY",
    description: "Priority levels for tasks",
  },
  {
    label: "Order Type",
    accessorKey: "getOrderType",
    stateKey: "orderType",
    masterType: "ORDERTYPE",
    description: "Types available for orders",
  },
  {
    label: "Order Category",
    accessorKey: "getOrderCategory",
    stateKey: "orderCategory",
    masterType: "ORDERCATEGORY",
    description: "Categories for order classification",
  },
  {
    label: "Label",
    accessorKey: "getLabelList",
    stateKey: "labelList",
    masterType: "ORDERLABEL",
    description: "Board labels for tickets",
  },
];

const KanbanMasters = () => {
  const { dispatch } = useGlobalContext();
  const { showToast } = useToast();
  const {
    labelList,
    orderCategory,
    taskPriority,
    orderType,
    freeFlowLabelList,
    getOrderType,
    getLabelList,
    getTaskPriority,
    getOrderCategory,
    getFreeFlowLabelList,
  } = useGlobalMaster();

  const masterSources = useMemo(
    () => ({
      taskPriority,
      orderType,
      orderCategory,
      labelList,
      freeFlowLabelList,
    }),
    [taskPriority, orderType, orderCategory, labelList, freeFlowLabelList],
  );

  const masterGetters = useMemo(
    () => ({
      getTaskPriority,
      getOrderType,
      getOrderCategory,
      getLabelList,
      getFreeFlowLabelList,
    }),
    [getTaskPriority, getOrderType, getOrderCategory, getLabelList, getFreeFlowLabelList],
  );

  const [masterData, setMasterData] = useState([]);
  const [selectedMasterData, setSelectedMasterData] = useState(MASTER_DATA_HEADER[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedMasterData?.stateKey) return;

    const slice = masterSources[selectedMasterData.stateKey];
    const getter = masterGetters[selectedMasterData.accessorKey];

    // Use loaded (not data.length) so empty API responses do not retrigger forever.
    if (getter && !slice?.loading && !slice?.loaded) {
      getter();
    }
  }, [selectedMasterData, masterSources, masterGetters]);

  useEffect(() => {
    if (!selectedMasterData?.stateKey) {
      setMasterData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const slice = masterSources[selectedMasterData.stateKey];
    setMasterData(slice?.data || []);
    setLoading(slice?.loading ?? false);
    setError(slice?.error ?? null);
  }, [selectedMasterData, masterSources]);

  const handleSelectMaster = (header) => {
    if (selectedMasterData?.accessorKey === header?.accessorKey) return;
    setSelectedMasterData(header);
  };

  const getItemCount = (header) => {
    const slice = masterSources[header.stateKey];
    if (!slice?.loaded) return null;
    return Array.isArray(slice?.data) ? slice.data.length : 0;
  };

  const refreshMasterList = async () => {
    const getter = masterGetters[selectedMasterData.accessorKey];
    const refreshResponse = await globalMaster({ type: selectedMasterData.masterType });
    const savedData = refreshResponse?.data ?? [];

    setMasterData(savedData);
    dispatch({
      type: "SUCCESS",
      payload: {
        key: selectedMasterData.stateKey,
        data: savedData,
      },
    });

    if (getter) {
      await getter();
    }

    return savedData;
  };

  const saveMasterData = async (changes) => {
    if (!selectedMasterData?.masterType || !selectedMasterData?.stateKey) return;

    const { newItems = [], editedItems = [], deletedItems = [] } = changes;

    if (newItems.length > 0 && (editedItems.length > 0 || deletedItems.length > 0)) {
      showToast({
        message: "Please save new items or edit/delete one existing item at a time",
        variant: "warning",
      });
      return;
    }

    let itemsToSave = [];
    let isDeleteAction = false;

    if (newItems.length > 0) {
      if (newItems.length > 1) {
        showToast({
          message: "Only one new row can be added at a time",
          variant: "warning",
        });
        return;
      }

      const item = newItems[0];
      const usedCodes = collectUsedStatusCodes([], masterData);
      const code = getItemStatusCode(item) || buildUniqueStatusCode(item.name, usedCodes);

      if (!isStatusCodeAvailable(code, usedCodes)) {
        showToast({
          message: `Status code "${code}" already exists. Please change the name.`,
          variant: "warning",
        });
        return;
      }

      itemsToSave = [{ ...item, code }];
    } else if (editedItems.length > 0) {
      itemsToSave = [editedItems[0]];
    } else if (deletedItems.length > 0) {
      itemsToSave = [deletedItems[0]];
      isDeleteAction = true;
    } else {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let lastResponse;

      for (const item of itemsToSave) {
        const payload = mapToRequestBody(
          item,
          selectedMasterData.masterType,
          isDeleteAction,
        );
        lastResponse = await getandUpdateFreeFlowLabelMaster(payload);

        if (lastResponse?.status !== 200 && lastResponse?.status !== 201) {
          throw new Error(lastResponse?.data?.message || "Failed to save master data");
        }
      }

      await refreshMasterList();

      const savedCount = itemsToSave.length;
      const pendingEdits = editedItems.length > 1 ? editedItems.length - 1 : 0;

      showToast({
        message:
          lastResponse?.data?.message ||
          (pendingEdits > 0
            ? `Saved ${savedCount} item(s). ${pendingEdits} more edit(s) pending.`
            : "Master data saved successfully"),
        variant: "success",
      });
    } catch (err) {
      setError(err);
      showToast({
        message: err?.message || "Failed to save master data",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Fragment>
      <div className="kanban-masters">
        <header className="kanban-masters__intro">
          <h3 className="kanban-masters__title mb-1">
            {t("settings.master_data.kanban_section_title")}
          </h3>
          <p className="kanban-masters__subtitle mb-0">
            {t("settings.master_data.kanban_section_subtitle")}
          </p>
        </header>

        <div className="kanban-masters__layout">
          <nav className="kanban-masters__nav" aria-label="Kanban master types">
            <p className="kanban-masters__nav-label">Master types</p>
            <ul className="kanban-masters__nav-list">
              {MASTER_DATA_HEADER.map((header) => {
                const isActive = selectedMasterData?.accessorKey === header.accessorKey;
                const count = getItemCount(header);

                return (
                  <li key={header.accessorKey}>
                    <button
                      type="button"
                      className={`kanban-masters__nav-item${isActive ? " is-active" : ""}`}
                      onClick={() => handleSelectMaster(header)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="kanban-masters__nav-item-text">
                        <span className="kanban-masters__nav-item-title">{header.label}</span>
                        <span className="kanban-masters__nav-item-desc">
                          {header.description}
                        </span>
                      </span>
                      {count !== null && (
                        <span className="kanban-masters__nav-item-count">{count}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section className="kanban-masters__detail" aria-live="polite">
            <div className="kanban-masters__detail-header">
              <div>
                <h4 className="kanban-masters__detail-title mb-1">
                  {selectedMasterData?.label}
                </h4>
                <p className="kanban-masters__detail-subtitle mb-0">
                  {selectedMasterData?.description}
                </p>
              </div>
            </div>

            <div className="kanban-masters__detail-body">
              <PreviewMasterData
                masterData={masterData}
                loading={loading}
                saving={saving}
                error={error}
                onSaveMasterData={saveMasterData}
              />
            </div>
          </section>
        </div>
      </div>
    </Fragment>
  );
};

export default KanbanMasters;

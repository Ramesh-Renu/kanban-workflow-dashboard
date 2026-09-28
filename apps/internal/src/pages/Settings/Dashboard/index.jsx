import { Col, Row } from "react-bootstrap";
import { t } from "i18next";
import { Fragment, useEffect, useState } from "react";
import DynamicField from "../../../components/common/Dynamic/DynamicField";
import { addUpdateDashboardFormula } from "../../../services";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import { useToast } from "@orion/shared";
import { useGlobalMaster } from "@orion/shared";

const CONFIG_DISPLAY_NAMES = {
  HealthStatus: "Workspace",
  BoardHealthStatus: "Board",
  TaskHealthStatus: "Task",
};

const cloneHealthItems = (items = []) =>
  items.map((item) => ({
    ...item,
    overduePercentageRange: { ...item.overduePercentageRange },
  }));

/** Min is derived: first row = 0, each next row = previous max + buffer. */
const recalculateDerivedMins = (items = []) => {
  if (!items.length) return items;

  items[0].overduePercentageRange.min = 0;
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const max = Number(prev.overduePercentageRange.max) || 0;
    const buffer = Number(prev.breathingRoomPercentageRange) || 0;
    items[i].overduePercentageRange.min = max + buffer;
  }
  return items;
};

const mapFormulaToDashboardInfo = (formulaData) => {
  if (!Array.isArray(formulaData)) return [];

  return formulaData.map((config) => ({
    name: CONFIG_DISPLAY_NAMES[config.name] || config.name,
    id: config.id,
    configName: config.name,
    data: recalculateDerivedMins(cloneHealthItems(config.value)),
  }));
};

const fieldChanged = (current, original) => String(current ?? "") !== String(original ?? "");

const isHealthDataChanged = (current = [], original = []) => {
  if (current.length !== original.length) return true;

  return current.some((item, index) => {
    const temp = original[index];
    if (!temp || String(item.id) !== String(temp.id)) return true;

    return (
      fieldChanged(item.label, temp.label) ||
      fieldChanged(item.color, temp.color) ||
      fieldChanged(item.breathingRoomPercentageRange, temp.breathingRoomPercentageRange) ||
      fieldChanged(item.overduePercentageRange?.min, temp.overduePercentageRange?.min) ||
      fieldChanged(item.overduePercentageRange?.max, temp.overduePercentageRange?.max)
    );
  });
};

const Dashboard = () => {
  const [loadingId, setLoadingId] = useState(null);
  const { dashboardFormula, getDashboardFormulaData } = useGlobalMaster();
  const { showToast } = useToast();
  const [dashBoardTempData, setdashBoardTempData] = useState([]);
  const [dashboardInfo, setDashboardInfo] = useState([]);

  useEffect(() => {
    if (dashboardFormula?.loading) return;

    if (
      (!dashboardFormula?.data || dashboardFormula.data.length === 0) &&
      dashboardFormula?.error === null
    ) {
      getDashboardFormulaData();
      return;
    }

    if (dashboardFormula?.data?.length > 0) {
      const mapped = mapFormulaToDashboardInfo(dashboardFormula.data);
      setDashboardInfo(mapped);
      setdashBoardTempData(mapFormulaToDashboardInfo(dashboardFormula.data));
    }
  }, [dashboardFormula]);

  const handleChangedashboardInfo = (value, key, type, mainId, healthId) => {
    const updated = dashboardInfo.map((group) => ({
      ...group,
      data: cloneHealthItems(group.data),
    }));
    const groupIndex = updated.findIndex((g) => g.id === mainId);

    if (groupIndex === -1) return;

    const dataList = updated[groupIndex].data;
    const index = dataList.findIndex((item) => String(item.id) === String(healthId));
    if (index === -1) return;

    if (key === "overduePercentageRange" && type === "min") {
      return;
    }

    if (key === "overduePercentageRange") {
      const parsed = value === "" ? "" : Number(value);
      dataList[index].overduePercentageRange[type] =
        parsed === "" || Number.isNaN(parsed) ? value : parsed;
    }

    if (key === "breathingRoomPercentageRange") {
      const parsed = value === "" ? "" : Number(value);
      dataList[index].breathingRoomPercentageRange =
        parsed === "" || Number.isNaN(parsed) ? value : parsed;
    }
    if (key === "color") {
      dataList[index].color = value || "#000000";
    }

    if (
      key === "overduePercentageRange" ||
      key === "breathingRoomPercentageRange"
    ) {
      recalculateDerivedMins(dataList);
    }

    setDashboardInfo(updated);
  };

  const handleEditVlaues = () => {
    setDashboardInfo(
      dashBoardTempData.map((group) => ({
        ...group,
        data: cloneHealthItems(group.data),
      })),
    );
  };

  const handleTiggerApi = async (paramData, master) => {
    const masterId = master.id;
    const configName = master.configName;

    setLoadingId(masterId);
    try {
      const response = await addUpdateDashboardFormula({
        configId: masterId,
        configName,
        configType: "Health",
        configValue: paramData,
      });
      if (response.status === 200) {
        const savedData = recalculateDerivedMins(cloneHealthItems(paramData));
        setDashboardInfo((prev) =>
          prev.map((group) =>
            group.id === masterId ? { ...group, data: savedData } : group,
          ),
        );
        setdashBoardTempData((prev) =>
          prev.map((group) =>
            group.id === masterId ? { ...group, data: savedData } : group,
          ),
        );
        await getDashboardFormulaData({ force: true });
        showToast({
          message: response?.data?.message || "Range updated successfully",
          variant: "success",
        });
      } else {
        showToast({
          message: response?.data?.message || "Failed to update master",
          variant: "danger",
        });
      }
    } catch (error) {
      showToast({
        message: error?.message || error || "Failed to update master",
        variant: "danger",
      });
    } finally {
      setLoadingId(null);
    }
  };
  return (
    <Fragment>
      <div className="settings-workspace-user userOverViewContainer bg-transparent">
        <Row className="w-100 d-flex flex-row align-items-center justify-content-between border border-1 rounded mx-auto p-4 eu-header-bg">
          <Col>
            <span className="settings-workspace-user-title ">
              {t("settings.dashboardName")}
            </span>
            <p className="m-0 mt-2 settings-workspace-user-subtitle">
              {t("settings.view_and_manage_all_workspaces_and_their_associated_boards")}
            </p>
          </Col>
          <Col className="d-flex justify-content-end">
            <p>&#160;</p>
          </Col>
        </Row>
      </div>

      {dashboardFormula?.loading || dashboardInfo?.length === 0 ? (
        <Spinner />
      ) : (
        dashboardInfo.map((master, index) => {
          return (
          <div
            className="settings-workspace-user body-container dashBoardSettingsContainer"
            key={master.id}
          >
            <Row className="w-100 d-flex flex-row align-items-center justify-content-between border border-1 rounded mx-auto p-4 mt-4">
              <h2 className="dashBoardSettingsContainer-headding">
                {master.name} Overdue % Range
              </h2>

              {master?.data?.map((item, i) => (
                <Col
                  lg={4}
                  md={6}
                  xs={10}
                  key={item.id}
                  className={`dashBoardSettingsItemContainer mb-4 ${i === 0 ? "ps-0" : ""}`}
                >
                  <h4
                    className={`dashBoardSettingsItemContainer-subHeadding ${"heading-" + (i + 1)}`}
                    style={{
                      backgroundColor: `${item?.color}20`,
                      color: item.color,
                      border: `1px solid ${item.color}`,
                    }}
                  >
                    {item?.label}
                  </h4>
                  <Row className="w-100 d-flex flex-row align-items-center justify-content-between border-right border-1 rounded m-0 mt-3 p-0">
                    <Row className="m-0 p-0">
                      <Col lg={4} md={4} xs={4} className="px-0 py-0">
                        <label className="dashBoardSettingsItemContainer-label">
                          Min
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={item.overduePercentageRange.min}
                          readOnly
                          disabled
                          title={
                            i === 0
                              ? "Min is always 0 for the first health band"
                              : "Min is calculated from the previous band Max + Buffer"
                          }
                          placeholder="0%"
                        />
                      </Col>
                      <Col lg={4} md={4} xs={4}>
                        <label className="dashBoardSettingsItemContainer-label">
                          Max
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={item.overduePercentageRange.max}
                          onChange={(e) =>
                            handleChangedashboardInfo(
                              e.target.value,
                              "overduePercentageRange",
                              "max",
                              master.id,
                              item.id,
                            )
                          }
                          maxLength={item.maxLength || ""}
                          disabled={item.disabled}
                          placeholder="0%"
                        />
                      </Col>
                      <Col lg={4} md={4} xs={4}>
                        <label className="dashBoardSettingsItemContainer-label">
                          Buffer
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={item.breathingRoomPercentageRange}
                          onChange={(e) =>
                            handleChangedashboardInfo(
                              e.target.value,
                              "breathingRoomPercentageRange",
                              null,
                              master.id,
                              item.id,
                            )
                          }
                          maxLength={item.maxLength || ""}
                          disabled={item.disabled}
                          placeholder="0%"
                        />
                      </Col>
                    </Row>
                    {item?.color && (
                      <Col lg={12} md={12} xs={12} className="mt-2 p-0">
                        <DynamicField
                          format="colorPicker"
                          getData={{
                            fieldName: "Color",
                            fieldValue: item?.color || "#000000",
                          }}
                          updateFieldData={(type, id, name, val) =>
                            handleChangedashboardInfo(
                              val,
                              "color",
                              null,
                              master.id,
                              item.id,
                            )
                          }
                          type="color"
                          extraFlag={false}
                          disabled={false}
                        />
                      </Col>
                    )}
                  </Row>
                </Col>
              ))}
              <div className="edit-save-buttons">
                <button type="button" className="edit-button" onClick={handleEditVlaues}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="save-button"
                  onClick={() => handleTiggerApi(master?.data, master)}
                  disabled={
                    !isHealthDataChanged(
                      master?.data,
                      dashBoardTempData.find((g) => g.id === master.id)?.data,
                    ) || loadingId === master.id
                  }
                >
                  {loadingId === master.id ? "Saving..." : "Save"}
                </button>
              </div>
            </Row>
          </div>
        )
      })
      )}
    </Fragment>
  );
};

export default Dashboard;

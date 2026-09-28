import { t } from "i18next";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Col, Row } from "react-bootstrap";
import useAuth from "../../../../hooks/useAuth";
import { useGlobalMaster } from "@orion/shared";
import Table from "../../../../components/common/Table";
import { createColumnHelper } from "@tanstack/react-table";
import { classNames } from "@euroland/libs";
import { EmptyOrder, pencilSimpleLine } from "../../../../assets/images";
import trashIcon from "../../../../assets/images/trash_full.svg";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  deleteWorkFlow,
  getWorkspaceList,
  getWorkFlowMappingList,
  deleteWorkFlowMapping,
} from "../../../../services";
import LogoAvatarShowLetter from "../../../../components/common/LogoAvatarShowLetter";
import { useToast } from "@orion/shared";
import CreateFlow from "./CreateFlow";
import WorkFlowDetails from "./WorkFlowDetails";
import TabComponent from "../../../../components/common/TabComponent";
import DeleteConfirmModal from "../../../../components/common/DeleteConfirmModal";
import CreateFlowMapping from "./CreateFlowMapping";

/** API HELPERS */
const fetchWorkflowMapping = async () => {
  const res = await getWorkFlowMappingList({ tool_flow_id: "" });
  return res?.data || [];
};

const fetchWorkspaces = async () => {
  const res = await getWorkspaceList();
  return res?.data || [];
};

/** AVATAR RENDERER */
const renderUserCell = (user) => (
  <div className="d-flex flex-row align-items-center justify-content-center gap-2">
    <div className="avatars m-0">
      {user && Array(user).length > 0 && (
        <LogoAvatarShowLetter
          genaralData={user}
          profileName="name"
          outerClassName="avatars__item"
          innerClassName="avatars__img"
        />
      )}
    </div>
    <div className="d-flex flex-column truncate-2-lines align-items-baseline nameContainer">
      <span>{user?.name}</span>
    </div>
  </div>
);

const columnHelper = createColumnHelper();

const WorkFlowManagement = () => {
  /** STATE */
  const [activeWorkFlowInfo, setActiveWorkFlowInfo] = useState(false);
  const [selectedWorkFlow, setSelectedWorkFlow] = useState(null);
  const {
    roleList,
    toolsList,
    getToolsList,
    workFlowList,
    getWorkFlowList,
    workFlowType,
    getWorkFlowType,
  } = useGlobalMaster();
  const [{ data }] = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workflowMapping, setWorkflowMapping] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedRowType, setSelectedRowType] = useState(null);
  const [currentTab, setCurrentTab] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const { showToast } = useToast();

  dayjs.extend(utc);
  dayjs.utc(false);

  /** INIT LOAD */
  useEffect(() => {
    const loadInitialData = async () => {
      const [mapping, workspaces] = await Promise.all([
        fetchWorkflowMapping(),
        fetchWorkspaces(),
      ]);
      setWorkflowMapping(mapping);      
      setWorkspaces(workspaces);
    };

    if (!toolsList?.loading && !toolsList?.data?.length) getToolsList();
    if (!workFlowList?.loading && !workFlowList?.data?.length)
      getWorkFlowList({ flow_id: "" });

    if (!workFlowType?.loading && workFlowType?.data?.length === 0) {
      getWorkFlowType();
    }

    loadInitialData();
  }, []);

  const workflowTypeMap = useMemo(() => {
    if (!workFlowType?.data) return {};
    return workFlowType.data.reduce((acc, w) => {
      acc[w.status_id] = w.name;
      return acc;
    }, {});
  }, [workFlowType?.data]);

  /** MASTER BOARD BASED ON SELECTED WORKFLOW */
  const masterBoard = useMemo(() => {
    if (!selectedWorkFlow || !Array.isArray(workspaces)) return [];

    return workspaces
      .filter((ws) => ws.workflowType === selectedWorkFlow.workflowType)
      .flatMap((ws) =>
        (ws.boards || []).map((board) => ({
          ...board,
          workspaceName: ws.name,
          workspaceId: ws.workspaceId,
        })),
      )
      .filter((b) => b.boardId !== 121);
  }, [selectedWorkFlow, workspaces]);

  const filteredWorkspaces = useMemo(() => {
    if (!selectedWorkFlow || !Array.isArray(workspaces)) return [];

    return workspaces.filter((ws) => ws.workflowType === selectedWorkFlow.workflowType);
  }, [selectedWorkFlow, workspaces]);

  /** DELETE CONFIRM HANDLER */
  const handleDeleteConfirm = useCallback((data, type) => {
    setSelectedRowType(type);
    setSelectedRow(data);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteCancel = () => {
    setSelectedRowType(null);
    setSelectedRow(null);
    setShowDeleteModal(false);
  };

  /** TABLE ROWS */
  const tableRows = useMemo(
    () =>
      workFlowList?.data?.map((w) => ({
        flowId: w.flow_id,
        name: w.name,
        createdBy: w.user_info[0],
        description: w.description,
        workflowType: workflowTypeMap[w.workflowType] || "-",
        workSpaceName: w.workSpaceName || "-",
        createdDate: w.created_date
          ? dayjs.utc(w.created_date).local().format("DD/MM/YYYY")
          : "-",
        _raw: w,
      })),
    [workFlowList, workflowTypeMap],
  );

  /** FLOW COLUMNS */
  const columns = useMemo(
    () => [
      columnHelper.accessor("s_no", {
        header: () => (
          <span className="order_orion_header serial_no">{t("order_orion_v2.s_no")}</span>
        ),
        cell: (info) => info.row.index + 1,
        canSort: false,
      }),
      columnHelper.accessor("flowname", {
        header: () => (
          <span className="order_orion_header">{t("settings.formField.flowName")}</span>
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <button
              className="btn p-0 text-decoration-none"
              onClick={() => {
                setSelectedWorkFlow(row._raw);
                setActiveWorkFlowInfo(true);
              }}
              title="View workflow details"
            >
              {row.name}
            </button>
          );
        },
      }),
      columnHelper.accessor("workSpaceName", {
        header: () => (
          <span className="order_orion_header">{t("settings.workSpaceName")}</span>
        ),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("workflowType", {
        header: () => (
          <span className="order_orion_header">{t("settings.workFlowType")}</span>
        ),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("createdDate", {
        header: () => (
          <span className="order_orion_header">{t("settings.createdDate")}</span>
        ),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("createdBy", {
        header: () => (
          <span className="order_orion_header">{t("settings.createdBy")}</span>
        ),
        cell: (info) => renderUserCell(info.row.original.createdBy),
      }),
      columnHelper.accessor("action", {
        header: () => (
          <span className="order_orion_header">{t("order_orion_v2.action")}</span>
        ),
        cell: (info) => {
          const rowData = info.row.original._raw;
          const canDelete =
            roleList?.data?.find((u) => u.status_id === data?.details?.user_type)
              ?.code === "ADM" || data?.details?.isSuperAdmin;
          return (
            <div className="mx-auto w-100 d-flex gap-1 align-items-center justify-content-center">
              <button
                className="btn btn-link btn-sm"
                onClick={() => {
                  setSelectedWorkFlow(rowData);
                  setShowCreateModal(true);
                }}
              >
                <img src={pencilSimpleLine} alt="pencilSimpleLine" />
              </button>
              {canDelete && (
                <button
                  className="btn btn-link btn-sm"
                  onClick={() => handleDeleteConfirm(rowData, "flow")}
                >
                  <img src={trashIcon} alt="Remove User" />
                </button>
              )}
            </div>
          );
        },
        canSort: false,
      }),
    ],
    [
      roleList?.data,
      data?.details?.user_type,
      data?.details?.isSuperAdmin,
      handleDeleteConfirm,
    ],
  );

  /** MAPPING ROWS */
  const mappingRows = useMemo(
    () =>
      (workflowMapping || []).map((m) => {
        const toolNames = (m.tool_id || [])
          .map(
            (id) =>
              toolsList?.data?.find((tool) => tool.toolId === id)?.toolName ||
              `Tool-${id}`,
          )
          .join(", ");

        const flowName =
          workFlowList?.data.find((w) => w.flow_id === m.flow_id)?.name ||
          `Flow-${m.flow_id}`;

        return {
          toolFlowId: m.tool_flow_id,
          toolName: toolNames,
          flowName,
          createdBy: m.user_info[0],
          createdDate: m.created_date
            ? dayjs.utc(m.created_date).local().format("DD/MM/YYYY")
            : "-",
          _raw: m,
        };
      }),
    [workflowMapping, toolsList, workFlowList],
  );

  /** MAPPING COLUMNS */
  const mappingColumns = useMemo(
    () => [
      columnHelper.accessor("s_no", {
        header: () => (
          <span className="order_orion_header serial_no">{t("order_orion_v2.s_no")}</span>
        ),
        cell: (info) => info.row.index + 1,
      }),
      columnHelper.accessor("toolName", {
        header: () => (
          <span className="order_orion_header">{t("settings.toolName")}</span>
        ),
      }),
      columnHelper.accessor("flowName", {
        header: () => (
          <span className="order_orion_header">{t("settings.flowName")}</span>
        ),
      }),
      columnHelper.accessor("createdDate", {
        header: () => (
          <span className="order_orion_header">{t("settings.createdDate")}</span>
        ),
      }),
      columnHelper.accessor("createdBy", {
        header: () => (
          <span className="order_orion_header">{t("settings.createdBy")}</span>
        ),
        cell: (info) => renderUserCell(info.row.original.createdBy),
      }),
      columnHelper.accessor("action", {
        header: () => (
          <span className="order_orion_header">{t("order_orion_v2.action")}</span>
        ),
        cell: (info) => (
          <div className="mx-auto w-100 d-flex gap-1 align-items-center justify-content-center">
            <button
              className="btn btn-link btn-sm"
              onClick={() =>
                handleDeleteConfirm(info.row.original._raw, "flow_mapping")
              }
            >
              <img src={trashIcon} alt="delete" />
            </button>
          </div>
        ),
      }),
    ],
    [handleDeleteConfirm],
  );

  /** REFRESH LIST */
  const refreshList = useCallback(async () => {
    const updatedFlows = await getWorkFlowList({ flow_id: "" }, { force: true });
    const flows = Array.isArray(updatedFlows?.data)
      ? updatedFlows.data
      : Array.isArray(updatedFlows?.data?.data)
        ? updatedFlows.data.data
        : workFlowList?.data || [];

    if (selectedWorkFlow) {
      const selected = flows.find(
        (item) => String(item.flow_id) === String(selectedWorkFlow?.flow_id),
      );
      // Keep current selection if refresh payload does not include the flow
      if (selected) {
        setSelectedWorkFlow(selected);
      }
    }
    setWorkflowMapping(await fetchWorkflowMapping());
  }, [getWorkFlowList, selectedWorkFlow, workFlowList?.data]);

  /** PERMISSIONS */
  const canCreate =
    roleList?.data?.find((u) => u.status_id === data?.details?.user_type)?.code ===
      "ADM" || data?.details?.isSuperAdmin;

  /** DELETE */
  const confirmDelete = async () => {
    if (!selectedRow) return;
    try {
      const response =
        selectedRowType === "flow"
          ? await deleteWorkFlow({ flow_id: selectedRow?.flow_id })
          : await deleteWorkFlowMapping({
              tool_flow_id: selectedRow?.tool_flow_id,
            });

      if (response?.data?.status) {
        refreshList();
        showToast({ message: response?.data?.message, variant: "success" });
      } else {
        showToast({
          message: response?.data?.message || "Action failed",
          variant: "danger",
        });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: "Something went wrong", variant: "danger" });
    } finally {
      setSelectedRow(null);
      setSelectedRowType(null);
      setShowDeleteModal(false);
    }
  };

  /** EMPTY CONTENT */
  const renderEmptyContent = useMemo(
    () => (
      <div className="d-flex flex-column align-items-center justify-content-center py-5 createOrderContainer">
        <img src={EmptyOrder} alt="Empty Order" />
        <h5 className="mt-4 text-center">No Flow Creation yet</h5>
        <p className="text-center w-25">Click "Create Workflow" to get started</p>
        {canCreate && (
          <button
            className="btn border-0 add_user_btn px-4 py-2"
            onClick={() => {
              setSelectedWorkFlow(null);
              setShowCreateModal(true);
            }}
          >
            + {t("settings.formField.button.createFlow")}
          </button>
        )}
      </div>
    ),
    [canCreate],
  );

  const refreshWorkflowMapping = useCallback(async () => {
    setWorkflowMapping(await fetchWorkflowMapping());
  }, []);

  /** Keep tab panels stable — nested components remount the table and cause flicker */
  const tabItems = useMemo(
    () => [
      {
        id: "flow",
        label: "Flow",
        content: (
          <>
            <Row className="d-flex flex-row flex-wrap justify-content-end align-items-center">
              <Col lg={12} className="d-flex flex-column align-items-end">
                <div className="results_text m-0 p-0 text-end mt-3 fs-14 position-relative">
                  Total flow count :
                  <span className="mx-2">{tableRows?.length || 0}</span>
                </div>
              </Col>
            </Row>
            <Row className="w-100 m-0 p-0 d-flex mt-3 userListTable_Section">
              <div className="userListTable_Section p-0">
                <div className="tableSection">
                  <Table
                    columns={columns}
                    columnData={tableRows}
                    className={classNames("products__body-table dashboard_table")}
                    tableName="Order_list"
                    bgColor="#FFF"
                    loading={workFlowList?.loading}
                    noDataContent={!tableRows?.length && renderEmptyContent}
                    tableHeight="calc(100vh - 320px)"
                    enableVirtualization={false}
                  />
                </div>
              </div>
            </Row>
          </>
        ),
      },
      {
        id: "flow_mapping",
        label: "Flow Mapping",
        content: (
          <>
            <Row className="w-100 d-flex bg-white border border-1 rounded mx-auto p-4">
              <CreateFlowMapping
                workFlowList={workFlowList}
                toolsList={toolsList}
                refreshWorkflowMapping={refreshWorkflowMapping}
                mappingRows={mappingRows}
                masterWorkFlowType={workFlowType?.data}
              />
            </Row>
            <Row className="justify-content-end">
              <Col lg={12} className="d-flex justify-content-end">
                <div className="results_text mt-3 fs-14">
                  Total flow mapping count:
                  <span className="mx-2">{mappingRows.length || 0}</span>
                </div>
              </Col>
            </Row>
            <Row className="w-100 m-0 p-0 d-flex mt-3 userListTable_Section">
              <div className="userListTable_Section p-0">
                <div className="tableSection">
                  <Table
                    columns={mappingColumns}
                    columnData={mappingRows}
                    className={classNames("products__body-table dashboard_table")}
                    tableName="Flow_mapping_list"
                    bgColor="#FFF"
                    loading={workFlowList?.loading}
                    noDataContent={!mappingRows.length && renderEmptyContent}
                    tableHeight="calc(100vh - 420px)"
                    enableVirtualization={false}
                  />
                </div>
              </div>
            </Row>
          </>
        ),
      },
    ],
    [
      tableRows,
      columns,
      mappingRows,
      mappingColumns,
      workFlowList,
      toolsList,
      workFlowType?.data,
      renderEmptyContent,
      refreshWorkflowMapping,
    ],
  );

  const handleTabChange = useCallback((item) => setCurrentTab(item), []);

  /** HEADER */
  const RenderHeader = () => (
    <Row className="w-100 d-flex border border-1 rounded mx-auto p-4 eu-header-bg">
      <Col>
        <span className="settings-workspace-user-title ">
          {t("settings.workflow_management")}
        </span>
        <p className="m-0 mt-2 settings-workspace-user-subtitle">
          {t("settings.view_and_manage_all_workflows")}
        </p>
      </Col>
      {canCreate && currentTab === "flow" && (
        <Col className="d-flex justify-content-end align-items-center">
          <button
            className="btn border-0 add_user_btn"
            onClick={() => {
              setSelectedWorkFlow(null);
              setShowCreateModal(true);
            }}
          >
            + {t("settings.formField.button.createFlow")}
          </button>
        </Col>
      )}
    </Row>
  );

  return (
    <Fragment>
      <div className="settings-workspace-user userOverViewContainer bg-transparent">
        {!activeWorkFlowInfo ? (
          <>
            <RenderHeader />
            <div className="w-100 align-items-center justify-content-between mt-3">
              <TabComponent
                tabItems={tabItems}
                className=""
                currentTab={handleTabChange}
              />
            </div>
          </>
        ) : (
          <WorkFlowDetails
            workflow={selectedWorkFlow}
            refreshList={refreshList}
            workspaces={filteredWorkspaces}
            masterBoard={masterBoard}
            masterWorkFlowType={workFlowType?.data || []}
            onBack={() => {
              setActiveWorkFlowInfo(false);
              setSelectedWorkFlow(null);
            }}
          />
        )}
      </div>

      {/* CREATE WORKFLOW MODAL */}
      <CreateFlow
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        refreshList={refreshList}
        workflow={selectedWorkFlow}
        workspaces={workspaces}
        masterWorkFlowType={workFlowType?.data || []}
      />

      {/* DELETE CONFIRM */}
      <DeleteConfirmModal
        show={showDeleteModal}
        message={
          <>
            Deleting <b>{selectedRow?.name}</b> will remove all its mapped flows.
            <br />
            Are you sure you want to proceed?
          </>
        }
        onClose={handleDeleteCancel}
        confirmDelete={confirmDelete}
      />
    </Fragment>
  );
};

export default WorkFlowManagement;

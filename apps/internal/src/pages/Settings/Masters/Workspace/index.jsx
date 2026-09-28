import { t } from "i18next";
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import useAuth from "../../../../hooks/useAuth";
import { useGlobalMaster } from "@orion/shared";
import Table from "../../../../components/common/Table";
import { createColumnHelper } from "@tanstack/react-table";
import { classNames } from "@euroland/libs";
import variables from "@orion/shared/src/styles/variables-style.json";
import { ActiveProjects, pencilSimpleLine, projectsIcon } from "../../../../assets/images";
import PopupModal from "@orion/shared/src/components/PopupModal";
import trashIcon from "../../../../assets/images/trash_full.svg";
import CreateWorkspace from "./CreateWorkspace";
import WorkspaceDetails from "./WorkspaceDetails";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { deleteWorkSpaceBoard, getWorkspaceList } from "../../../../services";
import LogoAvatarShowLetter from "../../../../components/common/LogoAvatarShowLetter";
import { useToast } from "@orion/shared";

const fetchWorkspaces = async () => {
  const res = await getWorkspaceList();
  return res?.data || [];
};

const WorkSpaceManagement = () => {
  /** VARIABLES */
  const [activeWorkspaceInfo, setActiveWorkspaceInfo] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const { roleList, workFlowType, getWorkFlowType } = useGlobalMaster();
  const [{ data }] = useAuth();
  const [getImageleft, setImageleft] = useState(30);
  const [getImageHeight, setImageHeight] = useState(20);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const columnHelper = createColumnHelper();
  const { showToast } = useToast();
  dayjs.extend(utc);
  dayjs.utc(false);

  /** SET IMAGE POSITION */
  useEffect(() => {
    const getWith = 450 / 15;
    setImageleft(getWith);
    setImageHeight(30);
  }, []);

  // Load workspace listing from API
  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspacesData = await fetchWorkspaces();
      setWorkspaces(workspacesData);
    };
    loadWorkspaces();

    if (!workFlowType?.loading && workFlowType?.data?.length === 0) {
      getWorkFlowType();
    }
  }, []);

  const workflowTypeMap = useMemo(() => {
    if (!workFlowType?.data) return {};
    return workFlowType.data.reduce((acc, w) => {
      acc[w.status_id] = w.name;
      return acc;
    }, {});
  }, [workFlowType?.data]);

  // Delete Confirmation and store selected Row
  const handleDeleteConfirm = (data) => {
    setSelectedRow(data);
    setShowDeleteModal(true);
  };

  // transform api -> table rows
  const tableRows = useMemo(
    () =>
      workspaces.map((w) => ({
        workspaceId: w.workspaceId,
        name: w.name,
        boards: w.boards,
        workflowType: workflowTypeMap[w.workflowType] || "-",
        createdBy: w.user_Info[0],
        createdDate: w.created_Date
          ? dayjs.utc(w.created_Date).local().format("DD/MM/YYYY")
          : "-",
        _raw: w,
      })),
    [workspaces, workflowTypeMap]
  );

  const refreshList = async () => {
    const workspacesData = await fetchWorkspaces();
    setWorkspaces(workspacesData);

    if (selectedWorkspace) {
      const selected = workspacesData.find(
        (item) => item.workspaceId === selectedWorkspace?.workspaceId
      );
      setSelectedWorkspace(selected);
    }
  };

  const columns = [
    columnHelper.accessor("s_no", {
      header: () => (
        <span className="order_orion_header serial_no">
          {t("order_orion_v2.s_no")}
        </span>
      ),
      cell: (info) => info.row.index + 1,
      canSort: false,
    }),
    columnHelper.accessor("name", {
      header: () => (
        <span className="order_orion_header">
          {t("settings.formField.workspaceName")}
        </span>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <button
            className="btn p-0 text-decoration-none"
            onClick={() => {
              setSelectedWorkspace(row._raw);
              setActiveWorkspaceInfo(true);
            }}
            title="View workspace details"
          >
            {row.name}
          </button>
        );
      },
    }),
    columnHelper.accessor("boards", {
      header: () => (
        <span className="order_orion_header">
          {t("settings.formField.boardCount")}
        </span>
      ),
      cell: (info) => {
        const rowData = info.row.original;
        const hasBoards = rowData?.boards?.length > 0;

        const boardContent = (
          <div className="d-flex justify-content-center align-items-center ">
            <div
              className="board_container p-2 w-100"
              style={{
                background: hasBoards && variables.common["--color-bg-board"],
              }}
            >
              <img
                src={rowData?.boards === null ? projectsIcon : ActiveProjects}
                alt="projectsIcon"
              />
              <span
                style={{
                  color: hasBoards && variables.common["--color-primary"],
                }}
              >
                {rowData?.boards?.length || 0} Boards
              </span>
            </div>
          </div>
        );
        return (
          <div>
            {hasBoards ? (
              <OverlayTrigger
                placement="left"
                overlay={(tooltipProps) =>
                  renderBoards(tooltipProps, info.getValue())
                }
              >
                {boardContent}
              </OverlayTrigger>
            ) : (
              boardContent
            )}
          </div>
        );
      },
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
      cell: (info) => {
        const user = info.row.original.createdBy;
        return (
          <>
            <div className="d-flex flex-row align-items-center justify-content-center gap-2">
              <div className="avatars m-0">
                {user && Array(user).length > 0 && (
                  <LogoAvatarShowLetter
                    genaralData={user}
                    profileName={"name"}
                    outerClassName={"avatars__item"}
                    innerClassName={"avatars__img"}
                  ></LogoAvatarShowLetter>
                )}
              </div>
              <div className="d-flex flex-column truncate-2-lines align-items-baseline nameContainer">
                <span>{user?.name}</span>
              </div>
            </div>
          </>
        );
      },
    }),
    columnHelper.accessor("action", {
      header: () => (
        <span className="order_orion_header">{t("order_orion_v2.action")}</span>
      ),
      cell: (info) => {
        const rowData = info.row.original._raw;
        return (
          <div className="mx-auto w-100 d-flex gap-1 align-items-center justify-content-center">
            <button
              className="btn btn-link btn-sm"
              disabled={rowData?.workspaceId === 1}
              onClick={() => {
                setSelectedWorkspace(rowData);
                setShowCreateModal(true);
              }}
            >
              <img src={pencilSimpleLine} alt="pencilSimpleLine" />
            </button>
            {data?.details?.isSuperAdmin && (
              <button
                className="btn btn-link btn-sm"
                onClick={() => handleDeleteConfirm(rowData)}
                disabled={rowData?.workspaceId === 1}
              >
                <img src={trashIcon} alt="Remove User" />
              </button>
            )}
          </div>
        );
      },
      canSort: false,
    }),
  ];

  //RENDER BOARDS CONTAINER
  const renderBoards = (props, board) => {
    return (
      <Tooltip id="order-type-tooltip" className="custom-tooltip" {...props}>
        {board?.map((row, i) => (
          <div
            className="fs-12 w-100 text-start py-1 "
            key={i}
            style={{
              color: "#828282",
              fontWeight: 500,
            }}
          >
            {row.name}
          </div>
        ))}
      </Tooltip>
    );
  };

  const canCreate =
    roleList?.data?.filter(
      (user) => user.status_id === data?.details?.user_type
    )[0]?.code === "ADM" || data?.details?.isSuperAdmin === true;

  const confirmDelete = async () => {
    if (selectedRow?.workspaceId) {
      try {
        const deleteParams = {
          type: "workspace",
          workSpaceId: selectedRow?.workspaceId,
          boardId: 0,
        };
        const response = await deleteWorkSpaceBoard(deleteParams);
        if (response?.data?.status) {
          refreshList();
          setSelectedRow(null);
          setShowDeleteModal(false);
          showToast({
            message: response?.data?.message,
            variant: "success",
          });
        } else {
          setShowDeleteModal(false);
          showToast({
            message: response?.data?.message,
            variant: "success",
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <Fragment>
      <div className="settings-workspace-user userOverViewContainer bg-transparent">
        {!activeWorkspaceInfo ? (
          <>
            {/* HEADER */}
            <Row className="w-100 d-flex flex-row align-items-center justify-content-between border border-1 rounded mx-auto p-4 eu-header-bg">
              <Col>
                <span className="settings-workspace-user-title ">
                  {t("settings.workspace_management")}
                </span>
                <p className="m-0 mt-2 settings-workspace-user-subtitle">
                  {t(
                    "settings.view_and_manage_all_workspaces_and_their_associated_boards"
                  )}
                </p>
              </Col>
              {canCreate && (
                <Col className="d-flex justify-content-end">
                  <button
                    className="btn border-0 add_user_btn"
                    onClick={() => {
                      setSelectedWorkspace(null);
                      setShowCreateModal(true);
                    }}
                  >
                    + {t("settings.formField.button.createWorkspace")}
                  </button>
                </Col>
              )}
            </Row>

            {/* COUNT */}
            <Row className="d-flex flex-row flex-wrap justify-content-end  align-items-center">
              <Col
                lg={12}
                md={12}
                className="d-flex flex-column align-items-end justify-content-end"
              >
                <div className="">
                  <div className="results_text m-0 p-0 text-end mt-3 fs-14 position-relative">
                    Total workspace count :
                    <span className="mx-2">{tableRows.length || "0"}</span>
                  </div>
                </div>
              </Col>
            </Row>

            {/* TABLE */}
            <Row className="w-100 m-0 p-0 d-flex flex-row align-items-center justify-content-between  mt-3 userListTable_Section ">
              <div className="userListTable_Section p-0">
                <div className="tableSection">
                  <Table
                    columns={columns}
                    columnData={tableRows}
                    className={classNames(
                      "products__body-table dashboard_table"
                    )}
                    tableName={"Order_list"}
                    bgColor={"#FFF"}
                  />
                </div>
              </div>
            </Row>
          </>
        ) : (
          <WorkspaceDetails
            workspace={selectedWorkspace}
            refreshList={refreshList}
            onBack={() => {
              setActiveWorkspaceInfo(false);
              setSelectedWorkspace(null);
            }}
          />
        )}
      </div>

      {/* CREATE WORKSPACE MODAL */}
      <CreateWorkspace
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        refreshList={refreshList}
        masterWorkFlowType={workFlowType?.data}
        workspace={selectedWorkspace}
      />

      {/* DELETE CONFIRM */}
      <PopupModal
        show={showDeleteModal}
        onClose={setShowDeleteModal}
        className={"deleteConfirmModal"}
      >
        <div className="deleteConfirmation">
          <div className="w-100 mx-auto">
            <h5 className="text-danger text-center">
              {t("settings.confirm_deletion")}
            </h5>
            <p className="text-center">
              Deleting <b>{selectedRow?.name}</b> will remove all its associated
              boards. Are you sure you want to proceed?
            </p>
          </div>
          <div className="d-flex flex-row align-items-center justify-content-center gap-3 delete_btn_rows">
            <button
              className="btn btn-0 yes_btn px-4 rounded"
              onClick={() => confirmDelete()}
            >
              Yes
            </button>
            <button
              className="btn btn-0 no_btn px-4 rounded"
              onClick={() => {
                setSelectedRow(null);
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
};

export default WorkSpaceManagement;

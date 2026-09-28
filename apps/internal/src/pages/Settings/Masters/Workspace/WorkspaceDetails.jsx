import React, { useState } from "react";
import { Button, Row, Col } from "react-bootstrap";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "../../../../components/common/Table";
import CreateBoard from "./CreateBoard";
import { pencilSimpleLine } from "../../../../assets/images";
import CreateWorkspace from "./CreateWorkspace";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { Link } from "react-router-dom";
import trashIcon from "../../../../assets/images/trash_full.svg";
import { t } from "i18next";
import useAuth from "../../../../hooks/useAuth";
import { deleteWorkSpaceBoard } from "../../../../services";
import { useToast } from "@orion/shared";

const WorkspaceDetails = ({ workspace, refreshList, onBack }) => {
  /** VARIABLES */
  const [showBoardCreateModal, setShowBoardCreateModal] = useState(false);
  const [showWorkspaceEditModal, setShowWorkspaceEditModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const columnHelper = createColumnHelper();
  const [{ data }] = useAuth();
  const { showToast } = useToast();

  const CustomBreadcrumb = ({ getName }) => {
    const changeRoot = () => {
      onBack();
    };
    return (
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb custom-userInfo">
          <li
            key={`breadcrumb-item-${1}`}
            className={`breadcrumb-item ${`active`} `}
            aria-current="page"
            title={""}
            onClick={changeRoot}
          >
            <Link to={""}>{"Workspace Management"}</Link>
            <span className="breadcrumb-item-divider">
              {" "}
              <span className="icon-chevron-thin-right"></span>{" "}
            </span>
          </li>
          <li key={`breadcrumb-item-${2}`} className="breadcrumb-item">
            <Link to="/master/workspace">{getName}</Link>
          </li>
        </ol>
      </nav>
    );
  };

  const CustomBack = () => {
    return (
      <button
        className="btn btn-0 p-0 fs-6 border-0 d-flex align-items-center gap-2"
        onClick={() => onBack()}
      >
        <span className="icon-caret-circle-left "></span>
        <span>Back</span>
      </button>
    );
  };

  /** BOARD LISTING */
  const BoardListing = () => {
    const boardColumns = [
      columnHelper.accessor("boardId", {
        header: "Board ID",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("name", {
        header: "Board Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("labels", {
        header: "Labels",
        cell: (info) => (
          <div className="d-flex flex-wrap gap-1 justify-content-center">
            {info.getValue().map(
              (label) =>
                label.name && (
                  <span
                    key={label.labelId}
                    className="px-2 py-1 text-white rounded-pill small"
                    style={{
                      backgroundColor: label.color_Code || "#6c757d", // fallback gray
                      minWidth: "fit-content",
                    }}
                  >
                    {label.name}
                  </span>
                )
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="d-flex gap-1 justify-content-center">
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setShowBoardCreateModal(true);
                  setEditingBoard(row);
                }}
                disabled={row.boardId === 121}
              >
                <img src={pencilSimpleLine} alt="pencilSimpleLine" />
              </Button>
              {data?.details?.isSuperAdmin && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleDeleteConfirm(row)}
                  disabled={row.boardId === 108 || row.boardId === 121}
                >
                  <img src={trashIcon} alt="trashIcon" />
                </Button>
              )}
            </div>
          );
        },
      }),
    ];

    return (
      <div className=" bg-white rounded mx-auto mt-4">
        {/* {workspace.boards?.length > 0 && (
          <div className="d-flex justify-content-end flex-end align-items-center mb-3">
            <button
              className="btn border-0 add_user_btn px-4 py-2"
              onClick={() => setShowBoardCreateModal(true)}
            >
              + {t("settings.formField.button.addBoard")}
            </button>
          </div>
        )} */}
        <div className="tableSection">
          {(!workspace.boards || workspace.boards.length === 0) && (
            <div className="text-center p-5">
              <h5 className="mb-2">{t("settings.formField.noBoard")}</h5>
              <p className="text-muted mb-3">
                {t("settings.formField.noBoardDescription")}
              </p>
              <Button
                className="btn border-0 add_user_btn"
                onClick={() => setShowBoardCreateModal(true)}
              >
                + {t("settings.formField.button.createBoard")}
              </Button>
            </div>
          )}
          {workspace.boards && workspace.boards.length > 0 && (
            <Table
              columns={boardColumns}
              columnData={workspace.boards}
              className={"products__body-table userPermission_table"}
            />
          )}
        </div>
      </div>
    );
  };

  /** RULES LISTING */
  const RulesListing = () => {
    return (
      <>
        <div className="tableSection  bg-white border border-1 rounded mx-auto p-4 mt-4">
          {(!workspace.rules || workspace.rules.length === 0) && (
            <div className="text-center p-5">
              <h5 className="mb-2">No rules mapped yet</h5>
              <p className="text-muted mb-3">
                Start by creating your first rule.
              </p>
              <Button
                className="btn border-0 add_user_btn"
              // onClick={() => setShowBoardCreateModal(true)}
              >
                + Create Rule
              </Button>
            </div>
          )}
        </div>
      </>
    );
  };

  const tabItems = [
    {
      id: "board",
      label: "Board",
      content: <BoardListing />,
    },
    {
      id: "ticket",
      label: "Rules Mapping",
      content: <RulesListing />,
    },
  ];

  const handleDeleteConfirm = (data) => {
    setSelectedRow(data);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedRow?.boardId) {
      try {
        const deleteParams = {
          type: "board",
          workSpaceId: workspace?.workspaceId,
          boardId: selectedRow?.boardId,
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
    <div className="workspace-details-container">
      <CustomBack />
      {/* HEADER SECTION */}
      <Row className="mt-4 w-100 d-flex flex-row align-items-center justify-content-between rounded mx-auto mb-4">
        <Col className="p-0">
          <div className="d-flex align-items-center gap-3">
            <h4 className="mb-0">{workspace.name}</h4>
            {workspace?.workspaceId !== 1 && (
              <button
                className="btn activeButton"
                onClick={() => setShowWorkspaceEditModal(true)}
              >
                <img src={pencilSimpleLine} alt="pencilSimpleLine" />{" "}
                {/* {t("common.edit")} */}
              </button>
            )}
          </div>
          <p className="m-0 mt-2 settings-workspace-user-subtitle">
            {t("settings.workspace_details")}
          </p>
        </Col>

        {/* <Col lg={2} md={2} xs={2} className="text-end">
          <div className="editUserDetails">
            <button
              className="btn activeButton"
              onClick={() => setShowWorkspaceEditModal(true)}
            >
              <img src={pencilSimpleLine} alt="pencilSimpleLine" />{" "}
              {t("common.edit")}
            </button>
          </div>{" "}
        </Col> */}
        <Col lg={2} md={2} xs={2} className="text-end">
          {workspace.boards?.length > 0 && (
            <div className="d-flex justify-content-end flex-end align-items-center mb-3">
              <button
                className="btn border-0 add_user_btn"
                onClick={() => setShowBoardCreateModal(true)}
              >
                + {t("settings.formField.button.addBoard")}
              </button>
            </div>
          )}
        </Col>
      </Row>
      {/* <div className="w-100 align-items-center justify-content-between"> */}
      {/* <TabComponent tabItems={tabItems} className="bg-white"></TabComponent> */}
      <BoardListing />
      {/* </div> */}
      {/* TAB SECTION */}

      <CreateWorkspace
        show={showWorkspaceEditModal}
        onClose={() => setShowWorkspaceEditModal(false)}
        workspace={workspace}
        refreshList={refreshList}
      />

      {/* CREATE BOARD MODAL */}
      <CreateBoard
        show={showBoardCreateModal}
        onClose={() => {
          setEditingBoard(null);
          setShowBoardCreateModal(false);
        }}
        refreshList={() => refreshList()}
        workspace={workspace}
        board={editingBoard}
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
              Deleting <b>{selectedRow?.name}</b> stage will remove all its
              associated tasks. Do you want to continue?
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
    </div>
  );
};

export default WorkspaceDetails;

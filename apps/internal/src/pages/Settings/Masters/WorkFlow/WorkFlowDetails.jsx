import React, { useCallback, useState } from "react";
import { Button, Row, Col } from "react-bootstrap";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "../../../../components/common/Table";
import { pencilSimpleLine } from "../../../../assets/images";
import TabComponent from "../../../../components/common/TabComponent";
import { t } from "i18next";
import CreateFlow from "./CreateFlow";
import CreateRule from "./CreateRule";
import trashIcon from "../../../../assets/images/trash_full.svg";
import { useToast } from "@orion/shared";
import { createWorkFlow } from "../../../../services";
import { useGlobalMaster } from "@orion/shared";
import useAuth from "../../../../hooks/useAuth";
import DeleteConfirmModal from "../../../../components/common/DeleteConfirmModal";
import WorkFlowPreview from "./WorkFlowPreview";

const WorkFlowDetails = ({
  workflow,
  refreshList,
  workspaces,
  masterBoard,
  onBack,
  masterWorkFlowType = [],
}) => {
  /** VARIABLE DECLARATIONS */
  const [showWorkFlowEditModal, setShowWorkFlowEditModal] = useState(false);
  const [showRulesCreateModal, setShowRulesCreateModal] = useState(false);
  const [editingRules, setEditingRules] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const { roleList } = useGlobalMaster();
  const columnHelper = createColumnHelper();
  const [{ data: auth }] = useAuth();
  const { showToast } = useToast();

  const handleDeleteConfirm = useCallback((data) => {
    setSelectedRow(data);
    setShowDeleteModal(true);
  }, []);

  /** Custom Back Button */
  const CustomBack = () => (
    <button
      className="btn btn-0 p-0 fs-6 border-0 d-flex align-items-center gap-2"
      onClick={onBack}
    >
      <span className="icon-caret-circle-left" />
      <span>Back</span>
    </button>
  );

  if (!workflow) {
    return (
      <div className="workspace-details-container">
        <CustomBack />
        <p className="mt-4 settings-workspace-user-subtitle">
          Workflow details are unavailable. Please go back and select a workflow again.
        </p>
      </div>
    );
  }

  /** Reusable Create Group Button */
  const CreateGroupButton = ({ onClick }) => (
    <Button className="btn border-0 add_user_btn" onClick={onClick}>
      + {t("settings.formField.button.createAction")}
    </Button>
  );

  const handleDeleteCancel = () => {
    setSelectedRow(null);
    setShowDeleteModal(false);
  };

  const confirmDelete = async () => {
    const updatedFlowDetail = (workflow.flow_detail || []).filter(
      (rule) => rule.action_id !== selectedRow.action_id,
    );

    const payload = {
      ...workflow,
      flow_detail: updatedFlowDetail,
    };
    try {
      const res = await createWorkFlow(payload);
      if (res?.data?.status) {
        showToast({ message: res?.data?.message, variant: "success" });
        refreshList();
        setShowDeleteModal(false);
      } else {
        showToast({ message: res?.data?.message || "Save failed", variant: "danger" });
      }
    } catch (err) {
      showToast({ message: "API call failed", variant: "danger" });
      console.error("CreateRule Save Error:", err);
    } finally {
      setShowDeleteModal(false);
    }
  };

  const workflowTypeInfo = masterWorkFlowType?.find(
    (wt) => wt?.status_id === workflow?.workflowType,
  );

  const isToolWorkflow = workflowTypeInfo?.name?.toLowerCase() === "tool"; // assuming code or some identifier exists
  const isTaskWorkflow = workflowTypeInfo?.name?.toLowerCase() === "task";

  /** Table Columns Definition */
  const flowDetailsColumns = [
    ...(isToolWorkflow
      ? [
          columnHelper.accessor("action_name", {
            header: "Action Name",
            cell: (info) => info.getValue(),
          }),
        ]
      : []),
    columnHelper.accessor("source", {
      header: "Source",
      cell: ({ getValue }) => {
        const source = getValue();
        return source ? (
          <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center">
            <div className={` ${isTaskWorkflow ? "d-flex gap-1 flex-column" : ""}`}>
              {isTaskWorkflow && (
                <span className="customBadge customBadge-workspace">
                  {source.workspace_name}
                </span>
              )}
              <span className="customBadge bg-light">
                {source.board_name} {isToolWorkflow && ` ➝ ${source.label_name}`}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-muted">N/A</span>
        );
      },
    }),
    columnHelper.accessor("targets", {
      header: "Targets",
      cell: ({ getValue }) => {
        const targets = getValue() || [];
        if (!targets.length) return <span className="text-muted">N/A</span>;

        const visible = targets.slice(0, 3);
        const remaining = targets.length - visible.length;

        return (
          <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center">
            {visible.map((t, idx) => (
              <div className="d-flex flex-column gap-1">
                {isTaskWorkflow && (
                  <span className="customBadge customBadge-workspace">
                    {t.workspace_name}
                  </span>
                )}
                <span key={idx} className="customBadge target">
                  {t.board_name} ➝ {t.label_name}
                </span>
              </div>
            ))}
            {remaining > 0 && (
              <span className="customBadge bg-light">+{remaining} more</span>
            )}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const data = row.original;
        const canDelete =
          roleList?.data?.find((u) => u.status_id === auth?.details?.user_type)?.code ===
            "ADM" || auth?.details?.isSuperAdmin;
        return (
          <div className="mx-auto w-100 d-flex gap-1 align-items-center justify-content-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setEditingRules(data);
                setShowRulesCreateModal(true);
              }}
            >
              <img src={pencilSimpleLine} alt="edit" />
            </Button>
            {canDelete && (
              <button
                className="btn btn-link btn-sm"
                onClick={() => handleDeleteConfirm(data)}
              >
                <img src={trashIcon} alt="Remove User" />
              </button>
            )}
          </div>
        );
      },
    }),
  ];

  /** Tab 1: Rules Listing */
  const RulesListing = () => (
    <>
      {workflow.flow_detail?.length > 0 && (
        <div className="d-flex justify-content-end mb-3">
          <CreateGroupButton onClick={() => setShowRulesCreateModal(true)} />
        </div>
      )}

      <div className="bg-white rounded mx-auto mt-4">
        <div className="tableSection">
          {!workflow.flow_detail?.length ? (
            <div className="text-center p-5">
              <h5 className="mb-2">{t("settings.formField.noActionDescription")}</h5>
              <p className="text-muted mb-3">
                {t("settings.formField.noActionDescriptionSub")}
              </p>
              <CreateGroupButton onClick={() => setShowRulesCreateModal(true)} />
            </div>
          ) : (
            <Table
              columns={flowDetailsColumns}
              columnData={workflow.flow_detail}
              className="products__body-table userPermission_table"
            />
          )}
        </div>
      </div>
    </>
  );

  /** Tabs */
  const tabItems = [
    {
      id: "rules",
      label: "Rules",
      content: <RulesListing />,
    },
    {
      id: "preview",
      label: "Preview",
      content: (
        <WorkFlowPreview
          flowData={workflow}
          boards={masterBoard}
          masterWorkFlowType={masterWorkFlowType}
        />
      ), // To be implemented
    },
  ];

  return (
    <div className="workspace-details-container">
      <CustomBack />

      {/* Header */}
      <Row className="mt-4 w-100 align-items-center justify-content-between mx-auto mb-4">
        <Col className="p-0">
          <div className="d-flex align-items-center gap-3">
            <h4 className="mb-0">{workflow.name}</h4>
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowWorkFlowEditModal(true)}
            >
              <img src={pencilSimpleLine} alt="edit" />
            </Button>
          </div>
          <p className="m-0 mt-2 settings-workspace-user-subtitle">
            {t("settings.workspace_details")}
          </p>
        </Col>
        {/* Future board controls could go here */}
        <Col lg={2} md={2} xs={2} className="text-end"></Col>
      </Row>

      {/* Tabs */}
      <div className="w-100">
        <TabComponent tabItems={tabItems} className="" />
      </div>

      {/* Edit Modal */}
      <CreateFlow
        show={showWorkFlowEditModal}
        onClose={() => setShowWorkFlowEditModal(false)}
        workflow={workflow}
        refreshList={refreshList}
        workspaces={workspaces}
        masterWorkFlowType={masterWorkFlowType}
      />

      {/* Create Rule */}
      <CreateRule
        show={showRulesCreateModal}
        onClose={() => {
          setShowRulesCreateModal(false);
          setEditingRules(null);
        }}
        workflow={workflow}
        boards={masterBoard}
        workspaces={workspaces}
        initialVal={editingRules}
        refreshList={refreshList}
        masterWorkFlowType={masterWorkFlowType}
      />

      <DeleteConfirmModal
        show={showDeleteModal}
        message={
          <>
            {" "}
            Are you sure you want to delete{" "}
            <b>{isToolWorkflow && selectedRow?.action_name}</b> ?{" "}
          </>
        }
        onClose={handleDeleteCancel}
        confirmDelete={confirmDelete}
      />
    </div>
  );
};

export default WorkFlowDetails;

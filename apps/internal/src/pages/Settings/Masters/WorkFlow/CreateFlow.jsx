import { Fragment, useEffect, useState } from "react";
import { Form, Row, Col, Spinner } from "react-bootstrap";
import { t } from "i18next";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { useToast } from "@orion/shared";
import { createWorkFlow } from "../../../../services";
import ToggleSwitch from "../../../../components/common/ToggleSwitch";
import { SelectDropDown } from "@orion/shared";

const CreateFlow = ({
  show,
  onClose,
  refreshList,
  workflow,
  workspaces,
  masterWorkFlowType = [],
}) => {
  // Use a single state object for both name and description
  const [workFlowDetails, setWorkFlowDetails] = useState({
    name: "",
    description: "",
    flow_detail: [],
    workflowType: true, // true for Task, false for Tool
    workspaceId: null,
  });
  const [showApiLoading, setApiLoading] = useState(false);
  const { showToast } = useToast();

  const TASK_ID = masterWorkFlowType?.find(
    (w) => w.name?.toLowerCase() === "task",
  )?.status_id;

  const TOOL_ID = masterWorkFlowType?.find(
    (w) => w.name?.toLowerCase() === "tool",
  )?.status_id;

  useEffect(() => {
    if (workflow) {
      setWorkFlowDetails({
        name: workflow.name || "",
        description: workflow.description || "",
        flow_detail: workflow.flow_detail || [],
        workflowType: workflow.workflowType === TASK_ID,
        workspaceId: workflow.workspace_id,
      });
    } else {
      resetForm();
    }
  }, [workflow, show]);

  const resetForm = () => {
    setWorkFlowDetails({
      name: "",
      description: "",
      flow_detail: [],
      workflowType: true, // default to Task
      workspaceId: null,
    });
  };

  const handleClose = () => {
    setApiLoading(false);
    resetForm();
    onClose();
  };

  // 🔹 Handle Final Submit
  const handleSubmit = () => {
    const payload = {
      flow_id: workflow?.flow_id || 0, // send id if editing
      name: workFlowDetails.name.trim(),
      description: workFlowDetails.description.trim(),
      flow_detail: workflow?.flow_detail || [],
      workflowType: workFlowDetails.workflowType ? TASK_ID : TOOL_ID,
      workspace_id: workFlowDetails.workspaceId || null,
    };
    setApiLoading(true);

    try {
      const response = createWorkFlow(payload);
      response.then((res) => {
        if (res?.data?.status) {
          showToast({
            message: res?.data?.message,
            variant: "success",
          });
          setApiLoading(false);
          refreshList();
          handleClose();
        } else {
          showToast({
            message: res?.data?.message,
            variant: "danger",
          });
          setApiLoading(false);
          // handleClose();
        }
      });
    } catch (error) {
      showToast({
        message: "Creation Failed",
        variant: "danger",
      });
      setApiLoading(false);
      handleClose();
    }
  };

  return (
    <Fragment>
      <PopupModal
        show={show}
        onClose={handleClose}
        className="bg-white rounded-4 commonForm"
        header
        title={workflow ? t("settings.updateFlow") : t("settings.createFlow")}
      >
        <div className="form-Container">
          {/* FLOW NAME */}
          <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap small">
            <Col className="mb-4">
              <Form.Group controlId="workflow-name">
                <Form.Label className="mb-3">
                  {t("settings.formField.flowName")}{" "}
                  <span className="text-danger">*</span>
                </Form.Label>

                <Form.Control
                  className="fs-14 py-2"
                  type="text"
                  placeholder={t("settings.formField.placeholder.flowName")}
                  value={workFlowDetails.name}
                  maxLength={50}
                  isInvalid={workFlowDetails.name?.length === 50}
                  onChange={(e) =>
                    setWorkFlowDetails((prevDetails) => ({
                      ...prevDetails,
                      name: e.target.value,
                    }))
                  }
                />

                <Form.Control.Feedback type="invalid">
                  Maximum 50 characters are allowed.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* DESCRIPTION */}
          <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap small">
            <Col className="mb-4">
              <Form.Group controlId="workflow-description">
                <Form.Label className="mb-3">
                  {t("settings.formField.description")}
                </Form.Label>
                <Form.Control
                  className="fs-14 py-2"
                  type="text"
                  placeholder={t("settings.formField.placeholder.flowDescription")}
                  value={workFlowDetails.description} // workFlowDetails.description is the description
                  maxLength={500}
                  onChange={(e) =>
                    setWorkFlowDetails((prevDetails) => ({
                      ...prevDetails,
                      description: e.target.value,
                    }))
                  }
                />
              </Form.Group>
            </Col>
          </Row>

          {/* WORKFLOW TYPE */}
          <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap small">
            <Col>
              <Form.Label className="mb-2 fw-medium">
                {t("settings.workFlowType")}
              </Form.Label>
              <Form.Group controlId="workFlowType">
                <div className="d-flex align-items-center justify-content-between">
                  <Form.Label className="mb-0">
                    {t("settings.formField.freeFlow")}
                  </Form.Label>
                  <ToggleSwitch
                    toggled={workFlowDetails.workflowType}
                    onClick={(e) =>
                      setWorkFlowDetails((prevDetails) => ({
                        ...prevDetails,
                        workflowType: e,
                        workspaceId: !e
                          ? workspaces.find((w) => w.workflowType === TOOL_ID)
                              ?.workspaceId || null
                          : null,
                      }))
                    }
                    disabled={workflow?.flow_id ? true : false}
                  />
                </div>
                <Form.Text className="text-muted">
                  {t("settings.formField.placeholder.freeFlow-info")}
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {/* IF WORKFLOW TYPE IS ACTIVE */}
          {workFlowDetails.workflowType && (
            <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap small">
              <Col className="mt-2 mb-4">
                <Form.Group controlId="workSpaceName">
                  <Form.Label className="mb-2">
                    {t("settings.workspace")} <span className="text-danger">*</span>
                  </Form.Label>
                  <SelectDropDown
                    options={workspaces.filter((w) => w.workflowType === TASK_ID)}
                    labelField="name"
                    valueField="workspaceId"
                    values={
                      workFlowDetails.workspaceId
                        ? [
                            workspaces.find(
                              (w) =>
                                w.workspaceId === Number(workFlowDetails.workspaceId),
                            ),
                          ]
                        : []
                    }
                    onChange={(val) => {
                      const workspaceId = val?.[0]?.workspaceId || "";
                      setWorkFlowDetails((p) => ({
                        ...p,
                        workspaceId: workspaceId,
                      }));
                    }}
                    className="filter-select-dropDown p-2"
                    placeholder="Select Workspace"
                    disabled={workflow?.flow_id ? true : false}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          {/* WHAT'S NEXT SECTION */}
          <Row className="my-4 infoContent">
            <Col>
              <div>
                <div className="fw-semibold mb-2 infoContent-head">
                  {t("settings.formField.whatsNext")}
                </div>
                <div className="bg-light p-4 d-flex flex-column gap-3 infoContent-body">
                  <span className="small">
                    After creating your workspace, you'll be able to:
                  </span>
                  <ul className="mb-0 small ps-3">
                    <li>
                      Define custom workflow stages (To Do, In Progress, Done, etc.)
                    </li>
                    <li>Set up user roles with specific permissions</li>
                    <li>Preview your board configuration</li>
                    <li>Activate the workspace for your team</li>
                  </ul>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Footer Buttons */}
        <Row className="d-flex mx-auto flex-row align-items-center justify-content-end gap-3 mt-3 action_btn_row">
          <button className="btn w-auto cancel_btn px-3" onClick={handleClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn w-auto create_btn px-3 d-flex flex-row gap-2 align-items-center"
            onClick={handleSubmit}
            disabled={
              showApiLoading ||
              !workFlowDetails.name.trim() ||
              (workFlowDetails.workflowType && workFlowDetails.workspaceId === null) ||
              (workflow?.name === workFlowDetails.name &&
                workflow?.description === workFlowDetails.description)
            } // only check name for enabling button
          >
            {t(
              `common.${showApiLoading ? (workflow ? "updating" : "creating") : workflow ? "update" : "create"}`,
            )}
            {showApiLoading && (
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
            )}
          </button>
        </Row>
      </PopupModal>
    </Fragment>
  );
};

export default CreateFlow;

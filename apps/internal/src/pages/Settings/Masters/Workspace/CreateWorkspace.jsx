import { Fragment, useEffect, useState } from "react";
import { Form, Row, Col, Spinner } from "react-bootstrap";
import { t } from "i18next";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { useToast } from "@orion/shared";
import { createWorkspace } from "../../../../services";
import ToggleSwitch from "../../../../components/common/ToggleSwitch";

const CreateWorkspace = ({
  show,
  onClose,
  refreshList,
  workspace,
  masterWorkFlowType = [],
}) => {
  const [workspaceName, setWorkspaceName] = useState("");
  const [showApiLoading, setApiLoading] = useState(false);
  const [taskFlow, setTaskFlow] = useState(true);
  const { showToast } = useToast();

  const TASK_ID = masterWorkFlowType?.find(
    (w) => w.name.toLowerCase() === "task",
  )?.status_id;
  const TOOL_ID = masterWorkFlowType?.find(
    (w) => w.name.toLowerCase() === "tool",
  )?.status_id;

  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name || "");
      setTaskFlow(workspace.workflowType === TASK_ID);
    } else {
      resetForm();
    }
  }, [workspace, show]);

  const resetForm = () => {
    setWorkspaceName("");
    setTaskFlow(true);
  };

  const handleClose = () => {
    setApiLoading(false);
    resetForm();
    onClose();
  };

  // 🔹 Handle Final Submit
  const handleSubmit = () => {
    const payload = {
      workspaceId: workspace?.workspaceId || 0, // send id if editing
      name: workspaceName.trim(),
      workflowType: workspace
        ? workspace.workflowType
        : taskFlow
          ? masterWorkFlowType?.filter((w) => w.name.toLowerCase() === "task")[0]
              ?.status_id
          : masterWorkFlowType?.filter((w) => w.name.toLowerCase() === "tool")[0]
              ?.status_id, // if creating new, default to task flow
      createdDate: workspace?.createdDate || new Date().toISOString(),
    };
    setApiLoading(true);

    try {
      const response = createWorkspace(payload);
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
          handleClose();
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
        title={
          workspace ? t("settings.update_workspace") : t("settings.create_new_workspace")
        }
      >
        <div className="form-Container">
          <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap small">
            <Col className="mb-3">
              <Form.Group controlId="workspace-name">
                <Form.Label>{t("settings.formField.workspaceName")}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t("settings.formField.placeholder.workspaceName")}
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  maxLength={50}
                  isInvalid={workspaceName?.length > 50}
                />
                <Form.Control.Feedback type="invalid">
                  Maximum 50 characters are allowed.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap small">
            <Col>
              <Form.Group controlId="taskFlow">
                <div className="d-flex align-items-center justify-content-between">
                  <Form.Label className="mb-0 fw-medium">
                    {t("settings.formField.enableTaskFlow")}
                  </Form.Label>
                  <ToggleSwitch toggled={taskFlow} onClick={setTaskFlow} />
                </div>
                <Form.Text className="text-muted">
                  {t("settings.formField.placeholder.taskFlow-info")}
                </Form.Text>
              </Form.Group>
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
            disabled={showApiLoading || !workspaceName.trim()}
          >
            {/* {workspace ? t("common.update") : t("common.create")} */}
            {t(
              `common.${showApiLoading ? (workspace ? "updating" : "creating") : workspace ? "update" : "create"}`,
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

export default CreateWorkspace;

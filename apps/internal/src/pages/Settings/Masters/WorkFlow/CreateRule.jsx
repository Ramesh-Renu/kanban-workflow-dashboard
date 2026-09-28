import { Fragment, useEffect, useState, useMemo, useCallback } from "react";
import { Form, Row, Col, Spinner } from "react-bootstrap";
import PropTypes from "prop-types";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { t } from "i18next";
import { createWorkFlow } from "../../../../services";
import { useToast } from "@orion/shared";
import { SelectDropDown } from "@orion/shared";
import { UsersGroup } from "../../../../assets/images";

// Helper functions moved outside component for better performance
const findWorkspaceById = (workspaces, workspaceId) =>
  workspaces.find((w) => w.workspaceId === Number(workspaceId));

const findWorkspaceByBoardId = (workspaces, boardId) =>
  workspaces.find((w) => w.boards?.some((b) => b.boardId === Number(boardId)));

const getBoards = (workspaces, workspaceId) =>
  findWorkspaceById(workspaces, workspaceId)?.boards || [];

const findBoardInWorkspace = (workspaces, workspaceId, boardId) =>
  getBoards(workspaces, workspaceId).find((b) => b.boardId === Number(boardId));

const getStagesFromWorkspace = (workspaces, workspaceId, boardId) =>
  findBoardInWorkspace(workspaces, workspaceId, boardId)?.labels || [];

const findBoardById = (boards, boardId) =>
  boards.find((b) => b.boardId === Number(boardId));

const getStagesFromBoard = (boards, boardId) =>
  findBoardById(boards, boardId)?.labels || [];

// Generate random action name for Task workflows
const generateRandomActionName = (workflowName) => {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  return `${workflowName}_${timestamp}_${randomNum}`;
};

const CreateRule = ({
  show,
  onClose,
  workflow = null,
  boards = [],
  workspaces = [],
  initialVal = null,
  refreshList,
  masterWorkFlowType = [],
}) => {
  const { showToast } = useToast();

  // State management
  const [formData, setFormData] = useState({
    ruleName: "",
    sourceWorkspaceId: "",
    sourceBoardId: "",
    sourceStageId: "",
  });
  const [duplicatedName, setDuplicatedName] = useState(false);
  const [targets, setTargets] = useState([]);
  const [tempTarget, setTempTarget] = useState({
    workspaceId: "",
    boardId: "",
    stageId: "",
    unassign: false,
    emailnotify: false,
  });
  const [showApiLoading, setApiLoading] = useState(false);

  // Memoized computed values
  const workflowTypeInfo = masterWorkFlowType?.find(
    (wt) => wt?.status_id === workflow?.workflowType,
  );
  const isTaskWorkflow = workflowTypeInfo?.name?.toLowerCase() === "task";

  const sourceBoards = useMemo(() => {
    if (!isTaskWorkflow) return boards;
    return getBoards(workspaces, formData.sourceWorkspaceId);
  }, [isTaskWorkflow, workspaces, formData.sourceWorkspaceId, boards]);

  const targetBoards = useMemo(() => {
    if (!isTaskWorkflow) return boards;
    // return getBoards(workspaces, tempTarget.workspaceId);
    const boardsInWorkspace = getBoards(workspaces, tempTarget.workspaceId);

    // Exclude source board for Task workflows
    return boardsInWorkspace.filter(
      (b) => Number(b.boardId) !== Number(formData.sourceBoardId),
    );
  }, [
    isTaskWorkflow,
    workspaces,
    tempTarget.workspaceId,
    boards,
    formData.sourceBoardId,
  ]);

  const sourceStages = useMemo(() => {
    if (!formData.sourceBoardId) return [];

    if (isTaskWorkflow) {
      return getStagesFromWorkspace(
        workspaces,
        formData.sourceWorkspaceId,
        formData.sourceBoardId,
      );
    }
    return getStagesFromBoard(boards, formData.sourceBoardId);
  }, [
    isTaskWorkflow,
    workspaces,
    boards,
    formData.sourceWorkspaceId,
    formData.sourceBoardId,
  ]);

  const availableSourceStages = useMemo(() => {
    const tempBoardId = Number(tempTarget.boardId);
    const sourceBoardId = Number(formData.sourceBoardId);
    const tempStageId = Number(tempTarget.stageId);

    return sourceStages.filter((stage) => {
      const stageId = Number(stage.labelId);

      // Exclude if same board and same stage as temp target
      if (tempBoardId === sourceBoardId && stageId === tempStageId) {
        return false;
      }

      // Exclude if already in targets list for the same board
      return !targets.some(
        (t) => Number(t.boardId) === sourceBoardId && Number(t.stageId) === stageId,
      );
    });
  }, [
    sourceStages,
    tempTarget.boardId,
    tempTarget.stageId,
    formData.sourceBoardId,
    targets,
  ]);

  const targetStages = useMemo(() => {
    if (!tempTarget.boardId) return [];

    if (isTaskWorkflow) {
      return getStagesFromWorkspace(
        workspaces,
        tempTarget.workspaceId,
        tempTarget.boardId,
      );
    }
    return getStagesFromBoard(boards, tempTarget.boardId);
  }, [isTaskWorkflow, workspaces, boards, tempTarget.workspaceId, tempTarget.boardId]);

  const availableTargetStages = useMemo(() => {
    const tempBoardId = Number(tempTarget.boardId);
    const sourceBoardId = Number(formData.sourceBoardId);
    const sourceStageId = Number(formData.sourceStageId);

    return targetStages.filter((stage) => {
      const stageId = Number(stage.labelId);

      // Exclude if same board and same stage as source
      if (tempBoardId === sourceBoardId && stageId === sourceStageId) {
        return false;
      }

      // Exclude if already in targets list for the same board
      return !targets.some(
        (t) => Number(t.boardId) === tempBoardId && Number(t.stageId) === stageId,
      );
    });
  }, [
    targetStages,
    tempTarget.boardId,
    formData.sourceBoardId,
    formData.sourceStageId,
    targets,
  ]);

  // Memoized helper functions
  const findAnyBoard = useCallback(
    (workspaceId, boardId) => {
      if (!boardId) return null;

      if (isTaskWorkflow) {
        return findBoardInWorkspace(workspaces, workspaceId, boardId);
      }
      return findBoardById(boards, boardId);
    },
    [isTaskWorkflow, workspaces, boards],
  );

  const findAnyStage = useCallback(
    (workspaceId, boardId, stageId) => {
      if (!boardId || !stageId) return null;

      const stages = isTaskWorkflow
        ? getStagesFromWorkspace(workspaces, workspaceId, boardId)
        : getStagesFromBoard(boards, boardId);

      return stages.find((s) => s.labelId === Number(stageId));
    },
    [isTaskWorkflow, workspaces, boards],
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      ruleName: "",
      sourceWorkspaceId: "",
      sourceBoardId: "",
      sourceStageId: "",
    });
    setTargets([]);
    setTempTarget({
      workspaceId: "",
      boardId: "",
      stageId: "",
      unassign: false,
      emailnotify: false,
    });
    setDuplicatedName(false);
  }, []);

  // Pre-fill on edit
  useEffect(() => {
    if (show) {
      if (initialVal) {
        setFormData({
          ruleName: initialVal.action_name || "",
          sourceWorkspaceId: initialVal.source?.workspace_id || "",
          sourceBoardId: initialVal.source?.board_id || "",
          sourceStageId: initialVal.source?.label_id || "",
        });
        setTargets(
          (initialVal.targets || []).map((t) => ({
            workspaceId: t.workspace_id,
            boardId: t.board_id,
            stageId: t.label_id,
            unassign: t.unassigned,
            emailnotify: t.emailnotify,
          })),
        );
      } else {
        resetForm();
        // Auto-generate action name for Task workflows
        if (isTaskWorkflow && workflow?.name) {
          setFormData((prev) => ({
            ...prev,
            sourceWorkspaceId: workflow?.workspace_id || "",
            ruleName: generateRandomActionName(workflow.name),
          }));
        }
      }
    }
  }, [initialVal, show, resetForm, isTaskWorkflow, workflow?.name]);

  // Validation for duplicate action name (skip for Task workflows)
  useEffect(() => {
    if (!isTaskWorkflow && formData.ruleName && workflow?.flow_detail?.length) {
      const normalizedName = formData.ruleName.toLowerCase().trim();
      const isDuplicate = workflow.flow_detail.some(
        (rule) =>
          rule.action_name.toLowerCase().trim() === normalizedName &&
          (!initialVal || initialVal.action_id !== rule.action_id),
      );
      setDuplicatedName(isDuplicate);
    } else {
      setDuplicatedName(false);
    }
  }, [formData.ruleName, workflow?.flow_detail, initialVal, isTaskWorkflow]);

  // Event handlers
  const handleAddTarget = useCallback(() => {
    if (!tempTarget.boardId || !tempTarget.stageId) return;

    if (Number(tempTarget.boardId) === Number(formData.sourceBoardId)) {
      // Only one stage allowed if same board
      setTargets([tempTarget]);
    } else {
      setTargets((prev) => [...prev, tempTarget]);
    }

    setTempTarget({
      workspaceId: "",
      boardId: "",
      stageId: "",
      unassign: false,
      emailnotify: false,
    });
  }, [tempTarget, formData.sourceBoardId]);

  const handleRemoveTarget = useCallback((idx) => {
    setTargets((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(async () => {
    const { ruleName, sourceWorkspaceId, sourceBoardId, sourceStageId } = formData;

    // Validation - for Task workflows, sourceStageId is not required
    if (
      !ruleName ||
      !sourceBoardId ||
      (!isTaskWorkflow && !sourceStageId) ||
      (isTaskWorkflow && !sourceWorkspaceId) ||
      targets.length === 0
    ) {
      return;
    }

    try {
      setApiLoading(true);

      const sourceWorkspace = findWorkspaceById(workspaces, sourceWorkspaceId);
      const sourceBoard = findAnyBoard(sourceWorkspaceId, sourceBoardId);
      const sourceStage = findAnyStage(sourceWorkspaceId, sourceBoardId, sourceStageId);

      const mappedTargets = targets.map((t) => {
        const workspace = findWorkspaceById(workspaces, t.workspaceId);
        const board = findAnyBoard(t.workspaceId, t.boardId);
        const stage = findAnyStage(t.workspaceId, t.boardId, t.stageId);

        return {
          workspace_id: t.workspaceId,
          workspace_name: workspace?.name || "",
          board_id: t.boardId,
          board_name: board?.name || "",
          label_id: t.stageId,
          label_name: stage?.name || "",
          unassigned: t.unassign ?? false,
          emailnotify: t.emailnotify ?? false,
        };
      });

      const newRule = {
        ...(initialVal?.action_id && { action_id: initialVal.action_id }),
        action_name: ruleName,
        source: {
          workspace_id: sourceWorkspace?.workspaceId || "",
          workspace_name: sourceWorkspace?.name || "",
          board_id: sourceBoard?.boardId || "",
          board_name: sourceBoard?.name || "",
          label_id: sourceStage?.labelId || null,
          label_name: sourceStage?.name || "",
        },
        targets: mappedTargets,
      };

      // Merge into flow_detail
      const updatedFlowDetail = initialVal
        ? workflow.flow_detail.map((r) =>
            r.action_id === initialVal.action_id ? newRule : r,
          )
        : [...(workflow.flow_detail || []), newRule];

      const payload = { ...workflow, flow_detail: updatedFlowDetail };

      const res = await createWorkFlow(payload);

      if (res?.data?.status) {
        showToast({ message: res.data.message, variant: "success" });
        refreshList();
        handleClose();
      } else {
        showToast({
          message: res?.data?.message || "Save failed",
          variant: "danger",
        });
      }
    } catch (err) {
      showToast({ message: "API call failed", variant: "danger" });
      console.error("CreateRule Save Error:", err);
    } finally {
      setApiLoading(false);
    }
  }, [
    formData,
    isTaskWorkflow,
    targets,
    workspaces,
    findAnyBoard,
    findAnyStage,
    initialVal,
    workflow,
    showToast,
    refreshList,
  ]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleFormDataChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleTempTargetChange = useCallback((field, value) => {
    setTempTarget((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Derived values for form controls
  const isSourceBoardDisabled = useMemo(
    () =>
      isTaskWorkflow
        ? !formData.sourceWorkspaceId || targets.length > 0
        : targets.length > 0,
    [isTaskWorkflow, formData.sourceWorkspaceId, targets.length],
  );

  const isSourceStageDisabled = useMemo(
    () => !formData.sourceBoardId || sourceStages.length === 0,
    [formData.sourceBoardId, sourceStages.length],
  );

  const isTargetBoardDisabled = useMemo(
    () => isTaskWorkflow && !tempTarget.workspaceId,
    [isTaskWorkflow, tempTarget.workspaceId],
  );

  const isTargetStageDisabled = useMemo(
    () => !tempTarget.boardId || availableTargetStages.length === 0,
    [tempTarget.boardId, availableTargetStages.length],
  );

  const isSaveDisabled = useMemo(
    () =>
      showApiLoading ||
      !formData.ruleName ||
      !formData.sourceBoardId ||
      (!isTaskWorkflow && !formData.sourceStageId) ||
      targets.length === 0 ||
      duplicatedName,
    [
      showApiLoading,
      formData.ruleName,
      formData.sourceBoardId,
      formData.sourceStageId,
      targets.length,
      duplicatedName,
      isTaskWorkflow,
    ],
  );

  const saveButtonText = useMemo(() => {
    if (showApiLoading) {
      return t(`common.${initialVal ? "updating" : "creating"}`);
    }
    return t(`common.${initialVal ? "update" : "create"}`);
  }, [showApiLoading, initialVal]);

  return (
    <Fragment>
      <PopupModal
        show={show}
        onClose={handleClose}
        className="bg-white rounded-4 commonForm"
        header
        title={initialVal ? t("settings.updateRule") : t("settings.createRule")}
      >
        <div className="form-Container">
          {/* Action Name */}
          {!isTaskWorkflow && (
            <Row className="mb-4">
              <Col>
                <Form.Group controlId="group-name">
                  <Form.Label className="mb-3">
                    {t("settings.formField.actionName")}{" "}
                    <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    className="fs-14 py-2"
                    placeholder={t("settings.formField.placeholder.actionName")}
                    value={formData.ruleName}
                    maxLength={100}
                    onChange={(e) => handleFormDataChange("ruleName", e.target.value)}
                  />
                  {formData.ruleName && duplicatedName && (
                    <div className="text-danger fs-12 mt-2 mb-0">
                      Action name already exists
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>
          )}

          {/* Source Workspace (Task Workflow Only) */}
          {isTaskWorkflow && (
            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label className="mb-3">
                    {t("settings.formField.sourceWorkspace")}{" "}
                    <span className="text-danger">*</span>
                  </Form.Label>
                  <SelectDropDown
                    options={workspaces}
                    labelField="name"
                    valueField="workspaceId"
                    values={
                      formData.sourceWorkspaceId
                        ? [findWorkspaceById(workspaces, formData.sourceWorkspaceId)]
                        : [findWorkspaceById(workspaces, workflow.workspace_id)]
                    }
                    onChange={(val) => {
                      const workspaceId = val?.[0]?.workspaceId || "";
                      setFormData((p) => ({
                        ...p,
                        sourceWorkspaceId: workspaceId,
                        sourceBoardId: "",
                        sourceStageId: "",
                      }));
                    }}
                    className="filter-select-dropDown p-2"
                    placeholder="Select Workspace"
                    disabled={targets.length > 0 || workflow.workspace_id}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          {/* Source Board & Stage */}
          <Row className="mb-4">
            <Col md={isTaskWorkflow ? 12 : 6}>
              <Form.Group>
                <Form.Label className="mb-3">
                  {t("settings.formField.sourceBoard")}{" "}
                  <span className="text-danger">*</span>
                </Form.Label>
                <SelectDropDown
                  id={formData.sourceBoardId}
                  multi={false}
                  options={sourceBoards}
                  labelField="name"
                  valueField="boardId"
                  searchable={false}
                  values={
                    formData.sourceBoardId
                      ? [findAnyBoard(formData.sourceWorkspaceId, formData.sourceBoardId)]
                      : []
                  }
                  onChange={(val) => {
                    const boardId = val?.[0]?.boardId || "";
                    const workspace = isTaskWorkflow
                      ? findWorkspaceById(workspaces, formData.sourceWorkspaceId)
                      : findWorkspaceByBoardId(workspaces, boardId);

                    setFormData((p) => ({
                      ...p,
                      sourceWorkspaceId: workspace?.workspaceId || "",
                      sourceBoardId: boardId,
                      sourceStageId: "",
                    }));
                  }}
                  placeholder={`${t("common.select")} ${t("common.board")}`}
                  className="filter-select-dropDown p-2"
                  dropdownPosition="auto"
                  disabled={isSourceBoardDisabled}
                />
              </Form.Group>
            </Col>
            {/* Source Stage - Hidden for Task Workflows */}
            {!isTaskWorkflow && (
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="mb-3">
                    {t("settings.formField.sourceStage")}{" "}
                    <span className="text-danger">*</span>
                  </Form.Label>
                  <SelectDropDown
                    id={formData.sourceStageId}
                    multi={false}
                    options={availableSourceStages}
                    labelField="name"
                    valueField="labelId"
                    searchable={false}
                    values={
                      formData.sourceStageId
                        ? [
                            findAnyStage(
                              formData.sourceWorkspaceId,
                              formData.sourceBoardId,
                              formData.sourceStageId,
                            ),
                          ].filter(Boolean)
                        : []
                    }
                    onChange={(val) =>
                      handleFormDataChange("sourceStageId", val?.[0]?.labelId || "")
                    }
                    placeholder={`${t("common.select")} ${t("common.stage")}`}
                    className="filter-select-dropDown p-2"
                    dropdownPosition="auto"
                    disabled={isSourceStageDisabled}
                  />
                </Form.Group>
              </Col>
            )}
          </Row>

          {/* Target Workspace (Task Workflow Only) */}
          {isTaskWorkflow && (
            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label className="mb-3">
                    {t("settings.formField.targetWorkspace")}
                  </Form.Label>
                  <SelectDropDown
                    options={workspaces}
                    labelField="name"
                    valueField="workspaceId"
                    values={
                      tempTarget.workspaceId
                        ? [findWorkspaceById(workspaces, tempTarget.workspaceId)]
                        : []
                    }
                    onChange={(val) => {
                      const workspaceId = val?.[0]?.workspaceId || "";
                      setTempTarget((p) => ({
                        ...p,
                        workspaceId: workspaceId,
                        boardId: "",
                        stageId: "",
                      }));
                    }}
                    className="filter-select-dropDown p-2"
                    placeholder="Select Workspace"
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          {/* Target Board & Stage */}
          <Row className="mb-4">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="mb-3">
                  {t("settings.formField.targetBoard")}
                </Form.Label>
                <SelectDropDown
                  id={tempTarget.boardId}
                  key={tempTarget.boardId || "board"}
                  multi={false}
                  options={targetBoards}
                  labelField="name"
                  valueField="boardId"
                  searchable={false}
                  values={
                    tempTarget.boardId
                      ? [findAnyBoard(tempTarget.workspaceId, tempTarget.boardId)]
                      : []
                  }
                  onChange={(val) => {
                    const boardId = val?.[0]?.boardId || "";
                    const workspace = isTaskWorkflow
                      ? findWorkspaceById(workspaces, tempTarget.workspaceId)
                      : findWorkspaceByBoardId(workspaces, boardId);

                    setTempTarget((p) => ({
                      ...p,
                      workspaceId: workspace?.workspaceId || "",
                      boardId,
                      stageId: "",
                    }));
                  }}
                  placeholder={`${t("common.select")} ${t("common.board")}`}
                  className="filter-select-dropDown p-2"
                  dropdownPosition="auto"
                  disabled={isTargetBoardDisabled}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="mb-3">
                  {t("settings.formField.targetStage")}
                </Form.Label>
                <SelectDropDown
                  id={tempTarget.stageId || "stage"}
                  multi={false}
                  options={availableTargetStages}
                  labelField="name"
                  valueField="labelId"
                  searchable={false}
                  values={
                    tempTarget.stageId
                      ? [
                          findAnyStage(
                            tempTarget.workspaceId,
                            tempTarget.boardId,
                            tempTarget.stageId,
                          ),
                        ].filter(Boolean)
                      : []
                  }
                  onChange={(val) =>
                    handleTempTargetChange("stageId", val?.[0]?.labelId || "")
                  }
                  placeholder={
                    !tempTarget?.boardId || availableTargetStages.length > 0
                      ? `${t("common.select")} ${t("common.stage")}`
                      : "No stages available"
                  }
                  className="filter-select-dropDown p-2"
                  dropdownPosition="auto"
                  disabled={isTargetStageDisabled}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Unassign Checkbox */}
          <Row className="mb-2 small">
            <Col>
              <Form.Check
                id="unassigncheck"
                type="checkbox"
                label="Un-assign user in next stage?"
                checked={tempTarget.unassign}
                onChange={(e) => handleTempTargetChange("unassign", e.target.checked)}
              />
            </Col>
          </Row>

          {/* Email Notify Checkbox */}
          <Row className="mb-4">
            <Col>
              <Form.Check
                id="emailnotify"
                type="checkbox"
                label="Do you need email notification on this stage movement?"
                checked={tempTarget.emailnotify}
                onChange={(e) => handleTempTargetChange("emailnotify", e.target.checked)}
              />
            </Col>
          </Row>

          {/* Add Target Button */}
          <Row>
            <Col>
              <button
                className="btn w-100 py-2 d-flex align-items-center justify-content-center addTarget"
                onClick={handleAddTarget}
                disabled={!tempTarget.boardId || !tempTarget.stageId}
              >
                + Add Target
              </button>
            </Col>
          </Row>

          {/* Target List */}
          {targets.length > 0 && (
            <div className="mt-4 small">
              <h6>Targets ({targets.length})</h6>
              <ul className="target-list-group small d-flex flex-column gap-2 p-0">
                {targets.map((t, idx) => {
                  const workspace = findWorkspaceByBoardId(workspaces, t.boardId);
                  const board = findAnyBoard(t.workspaceId, t.boardId);
                  const stage = findAnyStage(t.workspaceId, t.boardId, t.stageId);

                  return (
                    <li
                      key={idx}
                      className="target-list-group-item d-flex justify-content-between align-items-center"
                    >
                      {isTaskWorkflow && (
                        <span className="target-list-group-item-info-workspace">
                          {workspace?.name}
                        </span>
                      )}
                      <>
                        <span className="target-list-group-item-info">{board?.name}</span>
                        ➝
                        <span className="target-list-group-item-info">{stage?.name}</span>
                      </>
                      {t.unassign && (
                        <span className="ms-auto d-flex gap-2">
                          <img src={UsersGroup} alt="Un-assign" />
                          <span>Un-Assign</span>
                        </span>
                      )}
                      {t.emailnotify && <span className="icon-email-icon fs-4" />}
                      <button
                        aria-label="Close"
                        className="bg-white rounded-pill small btn-close ms-auto"
                        onClick={() => handleRemoveTarget(idx)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <Row className="d-flex mx-auto flex-row align-items-center justify-content-end gap-3 mt-3 action_btn_row">
          <button className="btn w-auto cancel_btn px-3" onClick={handleClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn w-auto create_btn px-3 d-flex flex-row gap-2 align-items-center"
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {saveButtonText}
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

CreateRule.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  workflow: PropTypes.object,
  boards: PropTypes.array,
  workspaces: PropTypes.array,
  initialVal: PropTypes.object,
  refreshList: PropTypes.func.isRequired,
  masterWorkFlowType: PropTypes.array,
};

export default CreateRule;

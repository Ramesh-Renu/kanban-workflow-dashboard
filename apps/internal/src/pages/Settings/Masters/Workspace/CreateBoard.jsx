import React, { useState, useEffect } from "react";
import { Form, Button } from "react-bootstrap";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { crossMarkRed } from "../../../../assets/images";
import { t } from "i18next";
import { createWorkspaceBoard } from "../../../../services";
import { Spinner } from "react-bootstrap";
import { useToast } from "@orion/shared";

const CreateBoard = ({ show, onClose, workspace, board, refreshList }) => {
  const [boardName, setBoardName] = useState("");
  const [labels, setLabels] = useState([]);
  const [showApiLoading, setApiLoading] = useState(false);
  const [deletedLabels, setDeletedLabels] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (show) {
      if (board) {
        setBoardName(board.name || "");
        setLabels(board.labels || []);
      } else {
        resetForm();
      }
    }
  }, [board, show]);

  const resetForm = () => {
    setBoardName("");
    setLabels([]);
    setDeletedLabels([]);
  };

  // Add a new empty stage
  const handleAddStage = () => {
    const newId = Date.now();
    setLabels([
      ...labels,
      {
        labelId: newId,
        name: "",
        color_Code: "",
        position: labels.length + 1,
        isNew: true,
      },
    ]);
  };

  // Update stage name
  const handleStageChange = (index, value) => {
    const updated = [...labels];
    updated[index].name = value;
    setLabels(updated);
  };

  // Update stage color
  const handleStageColorChange = (index, value) => {
    const updated = [...labels];
    updated[index].color_Code = value;
    setLabels(updated);
  };

  // Remove stage
  const handleRemoveStage = (index) => {
    const stageToRemove = labels[index];

    if (!stageToRemove.isNew && stageToRemove.labelId) {
      setDeletedLabels((prev) => [...prev, stageToRemove.labelId]);
    }

    const updated = [...labels];
    updated.splice(index, 1);
    setLabels(updated.map((s, i) => ({ ...s, position: i + 1 })));
  };

  // Drag & drop reorder
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("dragIndex", index);
  };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("dragIndex"), 10);
    if (dragIndex === dropIndex) return;
    const updated = [...labels];
    const [dragged] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, dragged);
    setLabels(updated.map((s, i) => ({ ...s, position: i + 1 })));
  };
  const allowDrop = (e) => e.preventDefault();

  // Submit
  const handleSubmit = () => {
    const updatedLabels = !board?.boardId
      ? labels.map((label) => ({ ...label, labelId: 0 }))
      : labels.map((label) => {
        if (label.isNew) {
          return { ...label, labelId: 0 };
        }
        return label;
      });

    const payload = {
      workSpaceId: workspace.workspaceId,
      boardId: board?.boardId || 0,
      boardName: boardName,
      type: "subtask",
      labels: updatedLabels,
      deletedLabels: deletedLabels,
    };

    setApiLoading(true);

    try {
      const response = createWorkspaceBoard(payload);
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

  const handleClose = () => {
    setApiLoading(false);
    resetForm();
    onClose();
  };

  return (
    <PopupModal
      show={show}
      onClose={handleClose}
      className="bg-white rounded-4 commonForm"
      header
      title={<span>{board ? "Edit Board" : "Create Board"}</span>}
    >
      <Form>
        {/* Board Info */}
        <div className="mb-4">
          <Form.Label className="form-label">
            {t("settings.formField.boardName")}
          </Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter board name"
            value={boardName}
            disabled={board?.boardId === 108}
            onChange={(e) => setBoardName(e.target.value)}
          />
          <sub className="form-label-subtext fs-12">
            {t("settings.formField.boardNameDescription")}
          </sub>
        </div>

        {/* Stages with color picker */}
        {labels?.length > 0 && (
          <div
            className="border rounded bg-light p-2"
            style={{ maxHeight: "220px", overflowY: "auto" }}
          >
            {labels.map((stage, index) => (
              <div
                key={stage.labelId}
                className="d-flex align-items-center mb-2 p-1 bg-white rounded border"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={allowDrop}
                onDrop={(e) => handleDrop(e, index)}
                style={{ cursor: "grab" }}
              >
                <span className="me-2 icon-drag-drop"></span>

                {/* Stage name */}
                <Form.Control
                  type="text"
                  size="sm"
                  value={stage.name}
                  onChange={(e) => handleStageChange(index, e.target.value)}
                  placeholder={`Stage ${index + 1}`}
                  className="me-2"
                  disabled={board?.boardId === 108 && stage.name === "Open"}
                />
                {/* Color Picker */}
                <Form.Control
                  type="color"
                  size="sm"
                  value={stage.color_Code || ""}
                  onChange={(e) =>
                    handleStageColorChange(index, e.target.value)
                  }
                  title="Pick a stage color"
                />
                <button
                  className="btn btn-0 m-0 p-0 border-0"
                  disabled={board?.boardId === 108 && stage.name === "Open"}
                  onClick={() => handleRemoveStage(index)}
                >
                  <img
                    src={crossMarkRed}
                    className="ms-2"
                    style={{ cursor: "pointer" }}
                    alt="delete"
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleAddStage}
          className="mt-2"
        >
          + {t("settings.formField.button.addStage")}
        </Button>
      </Form>

      {/* Footer */}
      <div className="d-flex mx-auto flex-row align-items-center justify-content-end gap-3 mt-3 action_btn_row">
        <button className="btn w-auto cancel_btn  px-3" onClick={handleClose}>
          {t("common.cancel")}
        </button>
        <button
          className="btn w-auto create_btn px-3 d-flex flex-row gap-2 align-items-center"
          onClick={() => handleSubmit()}
          disabled={
            showApiLoading ||
            !boardName.trim() ||
            labels.length === 0 ||
            labels.some((s) => !s.name.trim())
          }
        >
          {t(
            `common.${showApiLoading
              ? board
                ? "updating"
                : "creating"
              : board
                ? "update"
                : "create"
            }`
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
      </div>
    </PopupModal>
  );
};

export default CreateBoard;

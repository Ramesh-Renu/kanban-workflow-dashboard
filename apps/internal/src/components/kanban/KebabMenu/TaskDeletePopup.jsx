import React, { useEffect, useState } from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";
import SelectDropDown from "../../common/SelectDropDown";
import { useGlobalMaster } from "@orion/shared";
import { useToast } from "@orion/shared";
import { deleteOrderedTool } from "../../../services";
import { readActiveKanbanFiltersFromStorage } from "../../../utils/kanbanRoutes";

const TaskDeletePopup = ({
  ticketData,
  toolSelected,
  deleteModal,
  title,
  setDeleteModal,
  setSelectedId,
  reloadTask,
  labelData,
}) => {
  const { deleteTaskReasonList, getDeleteTaskReasonList } = useGlobalMaster();
  const [toolDeleteValues, setToolDeleteValues] = useState({
    type: "",
    description: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (
      deleteTaskReasonList?.data === undefined ||
      deleteTaskReasonList?.data?.length === 0
    ) {
      getDeleteTaskReasonList();
    }
  }, []);
  /** HANDLE DELETE ORDER */
  const handleDeleteTask = async (param) => {
    if (!toolDeleteValues.type) return;
    const toolTicketIds = Array.isArray(toolSelected)
      ? toolSelected
          ?.filter((tool) => tool.selected)
          .map((tool) => tool.toolTicketId)
      : [toolSelected]
          ?.filter((tool) => tool.selected)
          .map((tool) => tool.toolTicketId) || [];
    if (toolTicketIds.length === 0) {
      showToast({
        message: "Task not selected or ID is mising",
        variant: "danger",
      });
      setDeleteModal(false);
      return;
    }
    setIsDeleting(true);
    const paramData = {
      ticket_id: ticketData.orderId,
      tool_ticket_id: toolTicketIds,
      delete_reason_id: toolDeleteValues?.type?.[0]?.status_id,
      description: toolDeleteValues?.description || "",
    };
    setDeleteModal(false);
    try {
      const response = await deleteOrderedTool(paramData);
      if (response?.status) {
        showToast({
          message: response.data.message,
          variant: "success",
        });
        setTimeout(() => {
          const parsed = readActiveKanbanFiltersFromStorage();
          reloadTask(
            {
              ...parsed,
              pageOffSet: 0,
              pageSize:
                parsed.stageScroll !== null &&
                parsed.stageScroll?.includes(labelData?.labelId)
                  ? parsed.pageSize * (parsed.pageOffSet + 1)
                  : 10,
              stageScroll:
                parsed.stageScroll !== null &&
                parsed.stageScroll?.includes(labelData?.labelId)
                  ? parsed.stageScroll
                  : null,
            },
            false,
            null,
            "update",
          );
        }, 1000);
        setIsDeleting(false);
      } else {
        showToast({
          message: response.data.message,
          variant: "danger",
        });

        setDeleteModal(false);
      }
    } catch (error) {
      showToast({
        message: error?.message || "Something went wrong",
        variant: "danger",
      });
      setIsDeleting(false);
      setDeleteModal(false);
    }
  };

  return (
    <PopupModal
      show={deleteModal}
      onClose={() => {
        setDeleteModal(false);
        setToolDeleteValues({
          type: "",
          description: "",
        });
      }}
      header={true}
      title={title}
      className={"addAttachmentModal"}
      key="deleteModal"
    >
      <div className="formContainer">
        <div>
          <label>
            Reason <span className="text-danger">*</span>
          </label>
          <SelectDropDown
            id="reason"
            multi={false}
            searchable={false}
            options={deleteTaskReasonList?.data || []}
            labelField="name"
            valueField="status_id"
            values={toolDeleteValues.type || []}
            onChange={(e) =>
              setToolDeleteValues({ ...toolDeleteValues, type: e })
            }
            placeholder="Reason"
            className="multiple-select mt-2"
            dropdownPosition="auto"
          />
        </div>
        <div className="mt-3 descriptionContainer">
          <label>
            Description
            <span className="text-danger"> *</span>
          </label>
          <textarea
            className="mt-2"
            placeholder="Additional details..."
            value={toolDeleteValues.description}
            onChange={(e) =>
              setToolDeleteValues({
                ...toolDeleteValues,
                description: e.target.value,
              })
            }
            maxLength={1500}
          ></textarea>
        </div>
        <div className="d-flex flex-row align-items-center justify-content-end gap-3 footerContainer mt-4">
          <button
            className="btn btn-0 "
            onClick={() => {
              setDeleteModal(false);
              setSelectedId(null);
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-0 submitBtn px-4 "
            disabled={
              isDeleting ||
              !toolDeleteValues.type?.length ||
              (toolDeleteValues.type?.[0]?.name === "Others" &&
                !toolDeleteValues.description?.trim())
            }
            onClick={() => handleDeleteTask(toolSelected)}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </PopupModal>
  );
};

export default TaskDeletePopup;

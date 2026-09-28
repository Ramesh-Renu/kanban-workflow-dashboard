import React, { Fragment, useState } from "react";
import { pencilSimpleLine, trashFull as trashIcon } from "assets/images";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { emptyToolInfoTable } from "../../../../../../assets/images";
import { delete_tool_info, downloadToolAttachmentFile } from "../../../../../../services";
import { useToast } from "@orion/shared";
import { getFileTypeClassName } from "../../../../../../utils/common";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";

const ToolsInfoListTable = ({
  tableData,
  companyData,
  refreshList,
  tableLoader,
  updateTool,
}) => {
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState();
  const { showToast } = useToast();

  const deleteTool = async () => {
    try {
      const param = {
        tool_ticket_info_id:
          selectedTool?.type === "link"
            ? Number(selectedTool?.toolLinkId)
            : Number(selectedTool?.attachmentId),
        blobName: selectedTool?.type !== "link" ? selectedTool?.blobName : "",
      };
      const response = await delete_tool_info(param);
      if (response?.data?.status) {
        showToast({
          message: response?.data?.message,
          variant: "success",
          showTime: 5000,
        });
        setDeleteModal(false);
        refreshList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const downloadAttachment = async (data) => {
    try {
      const paramData = {
        attachmentId: data?.attachmentId,
        ...data,
      };
      const response = downloadToolAttachmentFile(paramData);
      response.then((res) => {
        if (res?.status) {
          showToast({
            message: res.message,
            variant: "success",
          });
        }
      });
    } catch (error) {
      showToast({
        message: error,
        variant: "danger",
      });
    }
  };

  return (
    <Fragment>
      <div className="w-100">
        {tableLoader ? (
          <div>
            <Spinner />
          </div>
        ) : tableData?.length > 0 ? (
          <div className="tool-info-list">
            {tableData.map((row) => {
              const isLink = row?.type === "link";
              const name = isLink ? row?.linkHeading : row?.attachmentName;
              const itemKey = isLink
                ? row?.toolLinkId || row?.url
                : row?.attachmentId || row?.fileName;
              return (
                <div key={itemKey} className="tool-info-list-item">
                  <button
                    type="button"
                    className="tool-info-list-item__main"
                    onClick={() => {
                      if (isLink) {
                        const href = row.url
                          ? `https://${row.url.replace(/^https?:\/\//, "")}`
                          : "";
                        if (href) window.open(href, "_blank", "noopener,noreferrer");
                        return;
                      }
                      downloadAttachment(row);
                    }}
                    title={name}
                  >
                    <span
                      className={
                        isLink
                          ? "icon-attachment-icon tool-info-list-item__icon"
                          : getFileTypeClassName(row?.fileType)
                      }
                    />
                    <span className="tool-info-list-item__name">{name || "---"}</span>
                  </button>
                  <div className="tool-info-list-item__actions">
                    <button
                      type="button"
                      className="tool-info-list-item__edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTool?.(row?.type, row);
                      }}
                      aria-label={`Edit ${name || row?.type}`}
                      title="Edit"
                    >
                      <img src={pencilSimpleLine} alt="" />
                    </button>
                    <button
                      type="button"
                      className="tool-info-list-item__delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTool(row);
                        setDeleteModal(true);
                      }}
                      aria-label={`Delete ${name || row?.type}`}
                      title="Delete"
                    >
                      <img src={trashIcon} alt="" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="emptyToolDetailTable">
            <img src={emptyToolInfoTable} alt="emptyToolInfoTable" />
            <div className="mt-2 titleText">
              Add this {companyData?.workFlowType === 60 ? "tool" : "task"} information
            </div>
            <div className="mt-2 descText">
              No links or attachments yet. Click the Add button to get started.
            </div>
          </div>
        )}
      </div>

      <PopupModal
        show={deleteModal}
        onClose={() => setDeleteModal(false)}
        className={"popupModal bg-white rounded-4"}
        width={"40vh"}
      >
        <div>
          <h5 className="text-center">
            Do you want to Delete this{" "}
            {selectedTool?.type === "link" ? "Link" : "Attachment"} ?
          </h5>
          <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
            <button
              className="btn btn-0 modalDelete_btn px-3"
              onClick={() => deleteTool()}
            >
              Yes
            </button>
            <button
              className="btn btn-0 modalCancel_btn px-3"
              onClick={() => setDeleteModal(false)}
            >
              No
            </button>
          </div>
        </div>
      </PopupModal>
    </Fragment>
  );
};

export default ToolsInfoListTable;

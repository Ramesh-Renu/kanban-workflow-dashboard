import React from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { Spinner } from "react-bootstrap";
import { trashFull, UploadDark } from "../../../../../../assets/images";
import { getFileTypeClassName } from "../../../../../../utils/common";

const AttachmentModal = ({
    show,
    isUpdated,
    attachmentValues,
    attachmentErrors,
    file,
    apiLoading,
    isUploading,
    fileInputRef,
    handleAttachments,
    handleFileChange,
    addAttachment,
    cancelAttachment,
    setFile,
}) => {
    return (
        <PopupModal
            show={show}
            onClose={cancelAttachment}
            header={true}
            title={isUpdated ? "Update Attachment" : "Add Attachment"}
            className="addAttachmentModal"
        >
            <div className="formContainer">
                <div className="nameContainer">
                    <label>
                        Name <span className="text-danger">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder={"Enter attachment name"}
                        className="nameInput mt-2"
                        value={attachmentValues?.attachmentName}
                        onChange={(e) => {
                            handleAttachments("attachmentName", e.target.value);
                        }}
                    />
                    {attachmentErrors.attachmentName && (
                        <div className="text-danger fs-12 px-2 mt-2">
                            {attachmentErrors.attachmentName}
                        </div>
                    )}
                </div>
                <div className="mt-3">
                    <label className="">
                        Attachment <span className="text-danger">*</span>
                    </label>
                    <div
                        className={`border d-flex justify-content-center gap-2 rounded py-4 text-center align-items-center mt-2  ${isUploading ? "upload-disabled" : " "
                            }`}
                        onClick={() => fileInputRef.current.click()}
                        style={{ cursor: "pointer" }}
                    >
                        {isUploading && (
                            <div className="text-center d-flex justify-content-center w-100">
                                <p className="mt-2 mb-0 text-muted uploadHereHeading pe-4 w-80">
                                    Uploading...
                                </p>
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Uploading...</span>
                                </div>
                            </div>
                        )}
                        {!isUploading && (
                            <>
                                <p className="mb-0 text-muted uploadHereHeading">
                                    Upload Here
                                </p>
                                <img src={UploadDark} alt="UploadDark" />
                                <input
                                    type="file"
                                    multiple={false}
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    style={{ display: "none" }}
                                    disabled={isUploading}
                                />
                            </>
                        )}
                    </div>
                    {file && (
                        <div className={`d-flex flex-row align-items-center gap-2 `}>
                            <span className={getFileTypeClassName(file?.type)}></span>
                            <p
                                className={`m-0 p-0 py-2 text-decoration-underline text-truncate addedAttachmentName`}
                                // onClick={() => downloadAttachment(file)}
                                title={file?.name || file?.fileName}
                            >
                                {file?.name || file?.fileName}
                            </p>

                            <button
                                className="btn btn-0 border-0 removeAttachment"
                                onClick={() => {
                                    handleAttachments("attachment", "");
                                    setFile();
                                }}
                            >
                                <img
                                    className="trashFull-icon"
                                    src={trashFull}
                                    alt="trash"
                                />
                            </button>
                        </div>
                    )}
                    {attachmentErrors.attachment && (
                        <div className="text-danger fs-12 px-2 mt-2">
                            {attachmentErrors.attachment}
                        </div>
                    )}
                </div>
                <div className="mt-3 descriptionContainer">
                    <label>Description</label>
                    <textarea
                        className="mt-2"
                        placeholder="Add optional description..."
                        value={attachmentValues.description}
                        onChange={(e) =>
                            handleAttachments("description", e.target.value)
                        }
                        maxLength={1500}
                    ></textarea>
                </div>
                <div className="d-flex flex-row align-items-center justify-content-end gap-3 footerContainer mt-4">
                    <button className="btn btn-0 " onClick={() => cancelAttachment()}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-0 submitBtn px-4 "
                        onClick={() => addAttachment()}
                        disabled={apiLoading}
                    >
                        {apiLoading && <Spinner size="sm" className="mx-2" />}
                        {isUpdated
                            ? apiLoading
                                ? "Updating"
                                : "Update"
                            : apiLoading
                                ? "Adding"
                                : "Add"}
                    </button>
                </div>
            </div>
        </PopupModal>
    );
};

export default AttachmentModal;

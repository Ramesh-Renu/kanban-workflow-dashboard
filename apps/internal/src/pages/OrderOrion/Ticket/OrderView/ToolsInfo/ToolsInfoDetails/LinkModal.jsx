import React from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { Spinner } from "react-bootstrap";

const LinkModal = ({
    show,
    isUpdated,
    linkValues,
    linkErrors,
    apiLoading,
    handleLinkValues,
    addLinkData,
    cancelLinkModal,
}) => {
    return (
        <PopupModal
            show={show}
            onClose={cancelLinkModal}
            header={true}
            title={isUpdated ? "Update Link" : "Add Link"}
            className={"addAttachmentModal"}
            key="linkModal"
        >
            <div className="formContainer">
                <div className="nameContainer">
                    <label>
                        Heading Name <span className="text-danger">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder={"Enter Heading name"}
                        className="nameInput mt-2"
                        value={linkValues?.linkHeading}
                        onChange={(e) => {
                            handleLinkValues("linkHeading", e.target.value);
                        }}
                    />
                    {linkErrors.linkHeading && (
                        <div className="text-danger fs-12 px-2 mt-2">
                            {linkErrors.linkHeading}
                        </div>
                    )}
                </div>
                <div className="nameContainer mt-3">
                    <label>
                        URL <span className="text-danger">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder={"https://example.com"}
                        className="nameInput mt-2"
                        value={linkValues?.url}
                        onChange={(e) => {
                            handleLinkValues("url", e.target.value);
                        }}
                    />
                    {linkErrors.url && (
                        <div className="text-danger fs-12 px-2 mt-2">
                            {linkErrors.url}
                        </div>
                    )}
                </div>

                <div className="mt-3 descriptionContainer">
                    <label>Description</label>
                    <textarea
                        className="mt-2"
                        placeholder="Enter your description..."
                        value={linkValues.description}
                        onChange={(e) =>
                            handleLinkValues("description", e.target.value)
                        }
                        maxLength={1500}
                    ></textarea>
                </div>
                <div className="d-flex flex-row align-items-center justify-content-end gap-3 footerContainer mt-4">
                    <button className="btn btn-0 " onClick={() => cancelLinkModal()}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-0 submitBtn px-4 "
                        onClick={() => addLinkData()}
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

export default LinkModal;

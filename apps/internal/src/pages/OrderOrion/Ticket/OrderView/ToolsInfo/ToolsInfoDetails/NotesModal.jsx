import React from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { Spinner } from "react-bootstrap";
import RichTextEditor from "../../../../../../components/common/RichTextEditor/Editor";
import { t } from "i18next";
import appConstants from "../../../../../../constant/common";

const NotesModal = ({
  notesState,
  hasToolNotes,
  toolData,
  handleToolNotes,
  handleNotesUpdate,
  setNotesState,
}) => {
  return (
    <PopupModal
      size="lg"
      show={notesState.showNotesModal}
      onClose={() =>
        setNotesState((prev) => ({
          ...prev,
          showNotesModal: false,
          canUpdateNotes: false,
          toolNotesData: toolData?.toolNotes || "",
        }))
      }
      header={true}
      title={hasToolNotes ? "Notes" : "Add Notes"}
      className={"addAttachmentModal"}
      key="notesModal"
    >
      <div className="description_container">
        <div className="mt-2">
          <RichTextEditor
            toolbarId={"tool-notes"}
            headTitle="Notes"
            placeholder={t("order_view.enter_notes_here")}
            value={notesState.toolNotesData}
            handleValueChange={handleToolNotes}
            handleMentionedUsers={() => {
              return null;
            }}
            taggableMembers={[]}
            className={`description_input `}
            isVisible={false}
            enableMention={false}
          />
          <div className="error-msg fs-12 mt-2 text-danger">
            <b>
              {notesState?.enteredCharacter >
              appConstants?.charCountLimit?.brandingNotes
                ? appConstants?.charCountLimit?.brandingNotes
                : notesState?.enteredCharacter}
              /{appConstants?.charCountLimit?.brandingNotes}
            </b>{" "}
            {t("ticket.characters_used")}, <b>{notesState?.balanceCharacter}</b>{" "}
            {t("ticket.remaining")}
          </div>
        </div>
        <div className="d-flex flex-row justify-content-end mt-3 gap-3">
          <button
            className="btn btn-0"
            onClick={() =>
              setNotesState((prev) => ({
                ...prev,
                toolNotesData: toolData?.toolNotes || "",
                canUpdateNotes: false,
                showNotesModal: false,
              }))
            }
          >
            Cancel
          </button>
          <button
            className="btn updateButton px-4 d-flex align-items-center"
            disabled={
              notesState.toolNotesData == toolData?.toolNotes ||
              notesState.notesApiLoading
            }
            onClick={() => handleNotesUpdate()}
          >
            {notesState?.notesApiLoading && <Spinner size="sm" className="mx-2" />}
            {notesState?.notesApiLoading
              ? hasToolNotes
                ? "Updating..."
                : "Saving..."
              : hasToolNotes
                ? "Update"
                : "Save"}
          </button>
        </div>
      </div>
    </PopupModal>
  );
};

export default NotesModal;

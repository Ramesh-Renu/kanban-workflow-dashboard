import { t } from "i18next";
import React, { useEffect, useRef, useState } from "react";
import { Button, Form } from "react-bootstrap";
import dayjs from "dayjs";
import PopupModal from "./PopupModal";

const BrandingSectionFeedback = ({
  show,
  onHide,
  sectionTitle,
  sectionFeedbackList,
  sectionFeedbackDraft,
  onDraftChange,
  onAddNote,
  onEditNote,
  currentUser,
  editIcon,
}) => {
  const scrollRef = useRef(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (scrollRef.current && !editingNoteId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sectionFeedbackList, show, editingNoteId]);

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleStartEdit = (note) => {
    setEditingNoteId(note.id);
    setEditValue(note.message);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditValue("");
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) return;
    await onEditNote(editingNoteId, editValue);
    setEditingNoteId(null);
    setEditValue("");
  };

  return (
    <PopupModal
      show={show}
      onClose={onHide}
      title={sectionTitle}
      header={true}
      size="md"
      centered={true}
      backdrop={true}
      customClassName="branding-comments-v4"
      className="p-0 d-flex flex-column"
    >
      <div style={{ minHeight: "400px", maxHeight: "70vh" }} className="d-flex flex-column">
        <div
          ref={scrollRef}
          className="branding-comments-v4__thread flex-grow-1 p-4 overflow-auto bg-light bg-opacity-25"
        >
          {sectionFeedbackList.length === 0 ? (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center py-5 text-center opacity-50">
              <h6 className="fw-bold mb-1">No feedbacks yet</h6>
              <p className="fs-12 py-3">
                Start a discussion about this section with your team or public users.
              </p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {sectionFeedbackList.map((row) => {
                const isAuthor = row.author === currentUser;
                const isEditing = editingNoteId === row.id;

                return (
                  <div
                    key={row.id}
                    className={`branding-comments-v4__entry ${row.authorType === "public" ? "is-public" : "is-internal"} ${isAuthor ? "is-author" : ""}`}
                  >
                    <div className="d-flex gap-3">
                      <div className="branding-comments-v4__avatar shadow-sm">{getInitials(row.author)}</div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold fs-14 text-dark">{row.author}</span>
                            <span className={`branding-comments-v4__author-type ${row.authorType}`}>
                              {row.authorType === "public"
                                ? t("order_view.branding_section_note_public", "Public")
                                : t("order_view.branding_section_note_internal", "Internal")}
                            </span>
                            {row.updatedAt && <span className="text-muted fs-10 italic">(edited)</span>}
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="text-muted fs-12 fw-medium">
                              {row.createdAt ? dayjs(row.createdAt).format("MMM D, HH:mm") : ""}
                            </span>
                            {isAuthor && !isEditing && editIcon && (
                              <button
                                type="button"
                                className="btn btn-link p-0 border-0 shadow-none opacity-50 hover-opacity-100"
                                onClick={() => handleStartEdit(row)}
                              >
                                <img src={editIcon} alt="edit" width="12" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="branding-comments-v4__bubble shadow-sm position-relative">
                          {isEditing ? (
                            <div className="edit-mode">
                              <Form.Control
                                as="textarea"
                                rows={2}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="branding-comments-v4__textarea shadow-none border rounded-4 p-3 pe-5 fs-14"
                                autoFocus
                              />
                              <div className="d-flex justify-content-end gap-2 mt-3">
                                <Button variant="tertiary" size="sm" className="fs-12" onClick={handleCancelEdit}>
                                  Cancel
                                </Button>
                                <Button variant="tertiary" size="sm" className="fs-12" onClick={handleSaveEdit}>
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mb-0 fs-12 lh-base text-dark-50">{row.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!editingNoteId && (
          <div className="branding-comments-v4__input-area p-4 border-top bg-white">
            <Form.Group className="mb-0">
              <div className="position-relative">
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={sectionFeedbackDraft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  placeholder={t(
                    "order_view.branding_section_feedback_placeholder",
                    "Write feedback for this section…"
                  )}
                  className="branding-comments-v4__textarea shadow-none border rounded-4 p-3 pe-5 fs-14"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && sectionFeedbackDraft.trim()) {
                      e.preventDefault();
                      onAddNote();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="link"
                  disabled={!sectionFeedbackDraft.trim()}
                  className="branding-comments-v4__send-btn position-absolute end-0 bottom-0 mb-2 me-2 p-2 text-decoration-none"
                  onClick={onAddNote}
                >
                  <i className="bi bi-send-fill fs-5" />
                </Button>
              </div>
              <div className="mt-2 d-flex justify-content-between align-items-center">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!sectionFeedbackDraft.trim()}
                  className="px-3 py-1 fs-12 fw-bold rounded-pill"
                  onClick={onAddNote}
                >
                  {t("order_view.branding_section_feedback_add", "Post")}
                </Button>
              </div>
            </Form.Group>
          </div>
        )}
      </div>
    </PopupModal>
  );
};

export default BrandingSectionFeedback;

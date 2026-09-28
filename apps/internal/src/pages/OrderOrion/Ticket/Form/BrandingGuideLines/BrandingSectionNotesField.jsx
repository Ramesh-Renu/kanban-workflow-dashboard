import RichTextEditor from "components/common/RichTextEditor/Editor";
import appConstants from "constant/common";
import { t } from "i18next";
import { useCallback, useState } from "react";
import { Col, Form } from "react-bootstrap";
import { getLimitedHtmlWithNewlineContent, isCharacterLimitExceeded } from "utils/common";

const EMPTY_TAGGABLE_MEMBERS = [];

/** Centralized branding guideline notes (saved as API `guidelineNotes`). */
const BrandingSectionNotesField = ({
  value,
  onChange,
  disabled = false,
  centralized = false,
}) => {
  const handleMentionedUsers = useCallback(() => null, []);
  const [enteredCharacter, setEnteredCharacter] = useState(0);
  const [balanceCharacter, setBalanceCharacter] = useState(null);

  const handleValueChange = (e) => {
    const result = isCharacterLimitExceeded(
      e,
      appConstants?.charCountLimit?.brandingNotes
    );
    setEnteredCharacter(result?.characterCount);
    setBalanceCharacter(result?.remainingCharacters);
    const limitedText = getLimitedHtmlWithNewlineContent(
      e,
      appConstants?.charCountLimit?.brandingNotes
    );
    onChange(limitedText);
  };

  return (
    <Col xs={12} className={`branding-section-notes-field p-0${centralized ? "" : " mt-3"}`}>
      <Form.Group>
        {!centralized ? (
          <Form.Label className="fw-semibold fs-14">
            {t("order_view.branding_field_notes", "Notes")}
          </Form.Label>
        ) : null}
        <RichTextEditor
          toolbarId={
            centralized ? "branding-guideline-notes-toolbar" : "branding-section-notes-toolbar"
          }
          headTitle=""
          hideMediaTools
          placeholder={t(
            centralized
              ? "order_view.branding_guideline_notes_placeholder"
              : "order_view.branding_field_notes_placeholder",
            centralized
              ? "Add notes or instructions for these branding guidelines…"
              : "Add notes or instructions for this section…"
          )}
          value={value ?? ""}
          handleValueChange={handleValueChange}
          handleMentionedUsers={handleMentionedUsers}
          taggableMembers={EMPTY_TAGGABLE_MEMBERS}
          className="description_input focused branding-section-notes-editor"
          isVisible
          enableMention={false}
          readOnly={disabled}
        />
        {(enteredCharacter !== null ||
          enteredCharacter?.length > 0) && (
            <p className="error-msg">
              <b>
                {enteredCharacter >
                  appConstants?.charCountLimit?.brandingNotes
                  ? appConstants?.charCountLimit?.brandingNotes
                  : enteredCharacter}
                /{appConstants?.charCountLimit?.brandingNotes}
              </b>{" "}
              {t("ticket.characters_used")}, <b>{balanceCharacter}</b>{" "}
              {t("ticket.remaining")}
            </p>
          )}
      </Form.Group>
    </Col>
  );
};

export default BrandingSectionNotesField;

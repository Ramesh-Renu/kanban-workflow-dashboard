import { Fragment, useEffect, useState } from "react";
import { Form, Row, Col } from "react-bootstrap";
import { t } from "i18next";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { useToast } from "@orion/shared";
import KbModalActions from "pages/KnowledgeBase/components/KbModalActions";

const CreateKnowledgeBaseModal = ({
  show,
  onClose,
  knowledgeBase = null,
  onSave,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(knowledgeBase?.id);

  useEffect(() => {
    if (show) {
      setName(knowledgeBase?.name || "");
      setDescription(knowledgeBase?.description || "");
      setSaving(false);
    }
  }, [show, knowledgeBase]);

  const handleClose = () => {
    setName("");
    setDescription("");
    setSaving(false);
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName || !trimmedDescription) {
      showToast({
        message: t("settings.master_data.kb_validation_required"),
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave?.({
        name: trimmedName,
        description: trimmedDescription,
        knowledgeBase,
      });
      handleClose();
    } catch (err) {
      showToast({
        message: err?.message || t("settings.master_data.kb_save_failed"),
        variant: "danger",
      });
    } finally {
      setSaving(false);
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
          isEdit
            ? t("settings.master_data.edit_knowledge_base")
            : t("settings.master_data.create_knowledge_base")
        }
      >
        <div className="form-Container">
          <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap small">
            <Col xs={12} className="">
              <Form.Group controlId="kb-name">
                <Form.Label>
                  {t("settings.master_data.kb_name")}{" "}
                  <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t("settings.master_data.kb_name_placeholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="fs-14 py-2"
                  maxLength={100}
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="kb-description">
                <Form.Label>
                  {t("settings.master_data.kb_description")}{" "}
                  <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder={t("settings.master_data.kb_description_placeholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="fs-14 py-2"
                  maxLength={500}
                />
              </Form.Group>
            </Col>
          </Row>
        </div>

        <KbModalActions
          onCancel={handleClose}
          onSubmit={handleSubmit}
          saving={saving}
          disabled={!name.trim() || !description.trim()}
          isEdit={isEdit}
        />
      </PopupModal>
    </Fragment>
  );
};

export default CreateKnowledgeBaseModal;

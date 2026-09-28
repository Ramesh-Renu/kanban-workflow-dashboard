import { Fragment, useEffect, useState } from "react";
import { Form, Row, Col } from "react-bootstrap";
import { t } from "i18next";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { useToast } from "@orion/shared";
import KbModalActions from "./KbModalActions";

const AddLinkModal = ({ show, onClose, link = null, onSave }) => {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(link?.id);

  useEffect(() => {
    if (show) {
      setName(link?.name || "");
      setUrl(link?.url || "");
      setDescription(link?.description || "");
      setSaving(false);
    }
  }, [show, link]);

  const handleClose = () => {
    setName("");
    setUrl("");
    setDescription("");
    setSaving(false);
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) {
      showToast({
        message: t("knowledge_base.link_validation_required"),
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave?.({
        name: trimmedName,
        url: trimmedUrl,
        description: description.trim(),
        link,
      });
      handleClose();
    } catch (err) {
      showToast({
        message: err?.message || t("knowledge_base.save_failed"),
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
          isEdit ? t("knowledge_base.edit_link") : t("knowledge_base.add_link")
        }
      >
        <div className="form-Container">
          <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap small">
            <Col xs={12}>
              <Form.Group controlId="kb-link-name">
                <Form.Label>
                  {t("knowledge_base.link_name")}{" "}
                  <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t("knowledge_base.link_name_placeholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="fs-14 py-2"
                  maxLength={100}
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="kb-link-url">
                <Form.Label>
                  {t("knowledge_base.link_url")}{" "}
                  <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="fs-14 py-2"
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="kb-link-description">
                <Form.Label>{t("knowledge_base.description")}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder={t("knowledge_base.description_placeholder")}
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
          disabled={!name.trim() || !url.trim()}
          isEdit={isEdit}
        />
      </PopupModal>
    </Fragment>
  );
};

export default AddLinkModal;

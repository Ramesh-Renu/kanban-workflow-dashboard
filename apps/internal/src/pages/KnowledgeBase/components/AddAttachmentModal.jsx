import { Fragment, useEffect, useRef, useState } from "react";
import { Form, Row, Col } from "react-bootstrap";
import { t } from "i18next";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { useToast } from "@orion/shared";
import { trashFull } from "assets/images";
import KbModalActions from "./KbModalActions";

const AddAttachmentModal = ({ show, onClose, onSave }) => {
  const { showToast } = useToast();
  const inputRef = useRef(null);
  const [documentName, setDocumentName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setDocumentName("");
      setDescription("");
      setFiles([]);
      setSaving(false);
    }
  }, [show]);

  const handleClose = () => {
    setDocumentName("");
    setDescription("");
    setFiles([]);
    setSaving(false);
    onClose();
  };

  const handleSelectFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    if (inputRef.current) inputRef.current.value = null;
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const trimmedName = documentName.trim();
    if (!trimmedName) {
      showToast({
        message: t("knowledge_base.document_name_required"),
        variant: "warning",
      });
      return;
    }
    if (files.length === 0) {
      showToast({
        message: t("knowledge_base.attachment_required"),
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave?.({
        documentName: trimmedName,
        description: description.trim(),
        files,
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
        title={t("knowledge_base.add_attachment")}
      >
        <div className="form-Container">
          <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap small">
            <Col xs={12}>
              <Form.Group controlId="kb-doc-name">
                <Form.Label>
                  {t("knowledge_base.document_name")}{" "}
                  <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t("knowledge_base.document_name_placeholder")}
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="fs-14 py-2"
                  maxLength={150}
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="kb-doc-file">
                <Form.Label>{t("knowledge_base.choose_file")}</Form.Label>
                <Form.Control
                  ref={inputRef}
                  type="file"
                  multiple
                  onChange={handleSelectFiles}
                  className="fs-14 py-2"
                />
                <Form.Text className="text-muted">
                  {t("knowledge_base.bulk_upload_hint")}
                </Form.Text>
              </Form.Group>
              {files.length > 0 && (
                <ul className="knowledge-base-hub__file-list list-unstyled mt-2 mb-0">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="d-flex align-items-center justify-content-between gap-2 py-1"
                    >
                      <span className="text-truncate small">{file.name}</span>
                      <button
                        type="button"
                        className="btn btn-0 p-1 border-0"
                        onClick={() => removeFile(index)}
                        title={t("common.delete")}
                      >
                        <img src={trashFull} alt="" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Col>
            <Col xs={12}>
              <Form.Group controlId="kb-doc-description">
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
          disabled={!documentName.trim() || files.length === 0}
        />
      </PopupModal>
    </Fragment>
  );
};

export default AddAttachmentModal;

import { Form } from "react-bootstrap";
import { t } from "i18next";
import { trashFull } from "assets/images";
import { KbOutlineButton } from "../../components/KbIdentityHeader";
import { emptyXmlConfig } from "../helpdesk";

const XmlConfigEditor = ({ entries = [], onChange, editable = true }) => {
  const updateRow = (index, field, value) => {
    const next = [...entries];
    next[index] = { ...next[index], [field]: value };
    onChange?.(next);
  };

  const addRow = () => {
    onChange?.([...(entries || []), emptyXmlConfig()]);
  };

  const removeRow = (index) => {
    onChange?.((entries || []).filter((_, i) => i !== index));
  };

  if (!editable) {
    return (
      <div className="knowledge-base-hub__repeat-editor">
        {(entries || []).length === 0 ? (
          <p className="text-muted small mb-0">
            {t("knowledge_base.no_xml_entries")}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm mb-0 knowledge-base-hub__nested-table">
              <thead>
                <tr>
                  <th>{t("knowledge_base.xml_tag_name")}</th>
                  <th>{t("knowledge_base.description")}</th>
                  <th>{t("knowledge_base.xml_example")}</th>
                </tr>
              </thead>
              <tbody>
                {(entries || []).map((row, index) => (
                  <tr key={`xml-read-${index}`}>
                    <td>{row.tagName || "—"}</td>
                    <td>{row.description || "—"}</td>
                    <td>{row.example || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const renderMobileCards = () => {
    if ((entries || []).length === 0) {
      return (
        <p className="text-muted small mb-2 d-md-none">
          {t("knowledge_base.no_xml_entries")}
        </p>
      );
    }

    return (entries || []).map((row, index) => (
      <div
        key={`xml-mobile-${index}`}
        className="knowledge-base-hub__repeat-card d-md-none"
      >
        <Form.Group className="mb-2">
          <Form.Label>{t("knowledge_base.xml_tag_name")}</Form.Label>
          <Form.Control
            type="text"
            value={row.tagName || ""}
            onChange={(e) => updateRow(index, "tagName", e.target.value)}
            disabled={!editable}
            className="fs-14 py-2"
            aria-label={`${t("knowledge_base.xml_tag_name")} ${index + 1}`}
            placeholder={t("knowledge_base.xml_tag_name")}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>{t("knowledge_base.description")}</Form.Label>
          <Form.Control
            type="text"
            value={row.description || ""}
            onChange={(e) => updateRow(index, "description", e.target.value)}
            disabled={!editable}
            className="fs-14 py-2"
            aria-label={`${t("knowledge_base.description")} ${index + 1}`}
            placeholder={t("knowledge_base.description")}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>{t("knowledge_base.xml_example")}</Form.Label>
          <Form.Control
            type="text"
            value={row.example || ""}
            onChange={(e) => updateRow(index, "example", e.target.value)}
            disabled={!editable}
            className="fs-14 py-2"
            aria-label={`${t("knowledge_base.xml_example")} ${index + 1}`}
            placeholder={t("knowledge_base.xml_example")}
          />
        </Form.Group>
        {editable ? (
          <button
            type="button"
            className="btn btn-0 p-1 border-0"
            onClick={() => removeRow(index)}
            title={t("common.delete")}
            aria-label={`${t("common.delete")} ${t("knowledge_base.xml_configuration_reference")} ${index + 1}`}
          >
            <img src={trashFull} alt="" />
          </button>
        ) : null}
      </div>
    ));
  };

  return (
    <div className="knowledge-base-hub__repeat-editor">
      {renderMobileCards()}
      <div className="table-responsive d-none d-md-block">
        <table className="table table-sm mb-2 knowledge-base-hub__nested-table">
          <thead>
            <tr>
              <th>{t("knowledge_base.xml_tag_name")}</th>
              <th>{t("knowledge_base.description")}</th>
              <th>{t("knowledge_base.xml_example")}</th>
              {editable ? <th className="serial_no" /> : null}
            </tr>
          </thead>
          <tbody>
            {(entries || []).length === 0 ? (
              <tr>
                <td colSpan={editable ? 4 : 3} className="text-muted small">
                  {t("knowledge_base.no_xml_entries")}
                </td>
              </tr>
            ) : (
              (entries || []).map((row, index) => (
                <tr key={`xml-${index}`}>
                  <td>
                    <Form.Control
                      type="text"
                      value={row.tagName || ""}
                      onChange={(e) =>
                        updateRow(index, "tagName", e.target.value)
                      }
                      disabled={!editable}
                      className="fs-14 py-2"
                      aria-label={`${t("knowledge_base.xml_tag_name")} ${index + 1}`}
                      placeholder={t("knowledge_base.xml_tag_name")}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="text"
                      value={row.description || ""}
                      onChange={(e) =>
                        updateRow(index, "description", e.target.value)
                      }
                      disabled={!editable}
                      className="fs-14 py-2"
                      aria-label={`${t("knowledge_base.description")} ${index + 1}`}
                      placeholder={t("knowledge_base.description")}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="text"
                      value={row.example || ""}
                      onChange={(e) =>
                        updateRow(index, "example", e.target.value)
                      }
                      disabled={!editable}
                      className="fs-14 py-2"
                      aria-label={`${t("knowledge_base.xml_example")} ${index + 1}`}
                      placeholder={t("knowledge_base.xml_example")}
                    />
                  </td>
                  {editable ? (
                    <td>
                      <button
                        type="button"
                        className="btn btn-0 p-1 border-0"
                        onClick={() => removeRow(index)}
                        title={t("common.delete")}
                        aria-label={`${t("common.delete")} ${t("knowledge_base.xml_configuration_reference")} ${index + 1}`}
                      >
                        <img src={trashFull} alt="" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {editable ? (
        <KbOutlineButton
          className="knowledge-base-hub__outline-btn--sm"
          onClick={addRow}
        >
          {t("knowledge_base.add_xml_entry")}
        </KbOutlineButton>
      ) : null}
    </div>
  );
};

export default XmlConfigEditor;

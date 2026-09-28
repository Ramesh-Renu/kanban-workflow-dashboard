import { Form } from "react-bootstrap";
import { t } from "i18next";
import dayjs from "dayjs";
import { SelectDropDown } from "@orion/shared";
import { trashFull } from "assets/images";
import DateTimeCalendar from "components/common/DateTimeCalendar";
import { KbOutlineButton } from "../../components/KbIdentityHeader";
import { formatDisplayDate } from "../../utils";
import { emptyRelatedTicket, getTicketStatusOptions } from "../helpdesk";

const toSelectValues = (options = [], value = "") => {
  if (!value) return [];
  const match = options.find((opt) => opt.value === value);
  return match ? [match] : [{ value, label: value }];
};

const StatusSelect = ({
  id,
  options = [],
  value = "",
  onChange,
  disabled = false,
}) => (
  <SelectDropDown
    id={id}
    multi={false}
    options={options}
    labelField="label"
    valueField="value"
    values={toSelectValues(options, value)}
    onChange={(vals) => onChange?.(vals?.[0]?.value || "")}
    searchable={false}
    disabled={disabled}
    placeholder={t("knowledge_base.status")}
    className="multiple-select filter-select-dropDown knowledge-base-hub__ticket-status"
    dropdownPosition="auto"
  />
);

const ResolvedDateField = ({ value, onChange, ariaLabel }) => (
  <div
    className="picker-date position-relative knowledge-base-hub__ticket-date"
    aria-label={ariaLabel}
  >
    <DateTimeCalendar
      value={value || ""}
      dateFormat="MMM DD, YYYY"
      placeholder={t("knowledge_base.resolved_date")}
      getDateTime={(date) =>
        onChange(date ? dayjs(date).format("YYYY-MM-DD") : "")
      }
      timeFormat={false}
      calendarPosition="top"
      iconShow
    />
  </div>
);

const RowDeleteButton = ({ onClick, ariaLabel }) => (
  <button
    type="button"
    className="btn btn-0 p-1 border-0"
    onClick={onClick}
    title={t("common.delete")}
    aria-label={ariaLabel}
  >
    <img src={trashFull} alt="" />
  </button>
);

const RelatedTicketsEditor = ({ entries = [], onChange, editable = true }) => {
  const statusOptions = getTicketStatusOptions();

  const updateRow = (index, field, value) => {
    const next = [...entries];
    next[index] = { ...next[index], [field]: value };
    onChange?.(next);
  };

  const addRow = () => {
    onChange?.([...(entries || []), emptyRelatedTicket()]);
  };

  const removeRow = (index) => {
    onChange?.((entries || []).filter((_, i) => i !== index));
  };

  if (!editable) {
    return (
      <div className="knowledge-base-hub__repeat-editor">
        {(entries || []).length === 0 ? (
          <p className="text-muted small mb-0">
            {t("knowledge_base.no_related_tickets")}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm mb-0 knowledge-base-hub__nested-table">
              <thead>
                <tr>
                  <th>{t("knowledge_base.ticket_id")}</th>
                  <th>{t("knowledge_base.resolved_date")}</th>
                  <th>{t("knowledge_base.team")}</th>
                  <th>{t("knowledge_base.status")}</th>
                </tr>
              </thead>
              <tbody>
                {(entries || []).map((row, index) => (
                  <tr key={`ticket-read-${index}`}>
                    <td>{row.ticketId || "—"}</td>
                    <td>{formatDisplayDate(row.resolvedDate)}</td>
                    <td>{row.team || "—"}</td>
                    <td>{row.status || "—"}</td>
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
          {t("knowledge_base.no_related_tickets")}
        </p>
      );
    }

    return (entries || []).map((row, index) => (
      <div
        key={`ticket-mobile-${index}`}
        className="knowledge-base-hub__repeat-card d-md-none"
      >
        <Form.Group className="mb-2">
          <Form.Label>{t("knowledge_base.ticket_id")}</Form.Label>
          <Form.Control
            type="text"
            value={row.ticketId || ""}
            onChange={(e) => updateRow(index, "ticketId", e.target.value)}
            disabled={!editable}
            className="fs-14 py-2"
            aria-label={`${t("knowledge_base.ticket_id")} ${index + 1}`}
            placeholder={t("knowledge_base.ticket_id")}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>{t("knowledge_base.resolved_date")}</Form.Label>
          <ResolvedDateField
            value={row.resolvedDate}
            onChange={(value) => updateRow(index, "resolvedDate", value)}
            ariaLabel={`${t("knowledge_base.resolved_date")} ${index + 1}`}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>{t("knowledge_base.team")}</Form.Label>
          <Form.Control
            type="text"
            value={row.team || ""}
            onChange={(e) => updateRow(index, "team", e.target.value)}
            disabled={!editable}
            className="fs-14 py-2"
            aria-label={`${t("knowledge_base.team")} ${index + 1}`}
            placeholder={t("knowledge_base.team")}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>{t("knowledge_base.status")}</Form.Label>
          <StatusSelect
            id={`kb-ticket-status-mobile-${index}`}
            options={statusOptions}
            value={row.status || statusOptions[0]?.value || ""}
            onChange={(value) => updateRow(index, "status", value)}
            disabled={!editable}
          />
        </Form.Group>
        {editable ? (
          <RowDeleteButton
            onClick={() => removeRow(index)}
            ariaLabel={`${t("common.delete")} ${t("knowledge_base.related_historical_tickets")} ${index + 1}`}
          />
        ) : null}
      </div>
    ));
  };

  return (
    <div className="knowledge-base-hub__repeat-editor">
      {renderMobileCards()}
      <div className="d-none d-md-block">
        <table className="table table-sm mb-2 knowledge-base-hub__nested-table">
          <thead>
            <tr>
              <th>{t("knowledge_base.ticket_id")}</th>
              <th>{t("knowledge_base.resolved_date")}</th>
              <th>{t("knowledge_base.team")}</th>
              <th>{t("knowledge_base.status")}</th>
              {editable ? <th className="serial_no" /> : null}
            </tr>
          </thead>
          <tbody>
            {(entries || []).length === 0 ? (
              <tr>
                <td colSpan={editable ? 5 : 4} className="text-muted small">
                  {t("knowledge_base.no_related_tickets")}
                </td>
              </tr>
            ) : (
              (entries || []).map((row, index) => (
                <tr key={`ticket-${index}`}>
                  <td>
                    <Form.Control
                      type="text"
                      value={row.ticketId || ""}
                      onChange={(e) =>
                        updateRow(index, "ticketId", e.target.value)
                      }
                      disabled={!editable}
                      className="fs-14 py-2"
                      aria-label={`${t("knowledge_base.ticket_id")} ${index + 1}`}
                      placeholder={t("knowledge_base.ticket_id")}
                    />
                  </td>
                  <td>
                    <ResolvedDateField
                      value={row.resolvedDate}
                      onChange={(value) =>
                        updateRow(index, "resolvedDate", value)
                      }
                      ariaLabel={`${t("knowledge_base.resolved_date")} ${index + 1}`}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="text"
                      value={row.team || ""}
                      onChange={(e) => updateRow(index, "team", e.target.value)}
                      disabled={!editable}
                      className="fs-14 py-2"
                      aria-label={`${t("knowledge_base.team")} ${index + 1}`}
                      placeholder={t("knowledge_base.team")}
                    />
                  </td>
                  <td>
                    <StatusSelect
                      id={`kb-ticket-status-${index}`}
                      options={statusOptions}
                      value={row.status || statusOptions[0]?.value || ""}
                      onChange={(value) => updateRow(index, "status", value)}
                      disabled={!editable}
                    />
                  </td>
                  {editable ? (
                    <td>
                      <RowDeleteButton
                        onClick={() => removeRow(index)}
                        ariaLabel={`${t("common.delete")} ${t("knowledge_base.related_historical_tickets")} ${index + 1}`}
                      />
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
          {t("knowledge_base.add_ticket")}
        </KbOutlineButton>
      ) : null}
    </div>
  );
};

export default RelatedTicketsEditor;

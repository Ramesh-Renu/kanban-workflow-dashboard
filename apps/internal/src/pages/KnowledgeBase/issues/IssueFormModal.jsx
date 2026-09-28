import { Fragment, useEffect, useMemo, useState } from "react";
import { Alert, Col, Form, Row, Spinner } from "react-bootstrap";
import { t } from "i18next";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { SelectDropDown, useGlobalMaster, useToast } from "@orion/shared";
import KbModalActions from "../components/KbModalActions";
import { KbOutlineButton } from "../components/KbIdentityHeader";
import ResolutionStepsEditor from "./components/ResolutionStepsEditor";
import XmlConfigEditor from "./components/XmlConfigEditor";
import RelatedTicketsEditor from "./components/RelatedTicketsEditor";
import { buildIssueMasterOptions } from "./issueMasterAdapter";
import { ISSUE_SOURCE, sanitizeIssueForm } from "./helpdesk";
import RichTextEditor from "components/common/RichTextEditor/Editor";

const emptyForm = (toolFolderId = "") => ({
  toolFolderId,
  issueType: "",
  issueSubtype: "",
  issueTitle: "",
  issueTags: [],
  issueDescription: "",
  rootCause: "",
  symptoms: [],
  resolutionSteps: [],
  verification: [],
  processWorkflow: "",
  xmlConfigs: [],
  relatedTickets: [],
});

const formFromIssue = (issue, toolFolderId = "") => ({
  toolFolderId: String(issue?.folderId || toolFolderId || ""),
  issueType: issue?.issueType || "",
  issueSubtype: issue?.issueSubtype || "",
  issueTitle: issue?.issueTitle || "",
  issueTags: Array.isArray(issue?.issueTags) ? [...issue.issueTags] : [],
  issueDescription: issue?.issueDescription || "",
  rootCause: issue?.rootCause || "",
  symptoms: Array.isArray(issue?.symptoms) ? [...issue.symptoms] : [],
  resolutionSteps: issue?.resolutionSteps || [],
  verification: Array.isArray(issue?.verification)
    ? [...issue.verification]
    : [],
  processWorkflow: issue?.processWorkflow || "",
  xmlConfigs: issue?.xmlConfigs || [],
  relatedTickets: issue?.relatedTickets || [],
});

const RequiredMark = () => <span className="text-danger">*</span>;

const FieldError = ({ message }) =>
  message ? (
    <div className="invalid-feedback d-block">{message}</div>
  ) : null;

const toSelectValues = (options = [], value = "") => {
  if (!value) return [];
  const match = options.find((opt) => opt.value === value);
  return match ? [match] : [{ value, label: value }];
};

const toMultiSelectValues = (options = [], values = []) => {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  return list.map((value) => {
    const match = options.find((opt) => opt.value === value);
    return match || { value, label: value };
  });
};

const IssueSelect = ({
  id,
  options = [],
  value = "",
  onChange,
  placeholder,
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
    searchable
    disabled={disabled}
    placeholder={placeholder}
    className="multiple-select filter-select-dropDown"
    dropdownPosition="auto"
  />
);

const IssueMultiSelect = ({
  id,
  options = [],
  values = [],
  onChange,
  placeholder,
  disabled = false,
}) => (
  <SelectDropDown
    id={id}
    multi={true}
    optionType="checkbox"
    options={options}
    labelField="label"
    valueField="value"
    values={toMultiSelectValues(options, values)}
    onChange={(vals) =>
      onChange?.((vals || []).map((item) => item?.value).filter(Boolean))
    }
    searchable
    disabled={disabled}
    placeholder={placeholder}
    className="multiple-select filter-select-dropDown"
    dropdownPosition="auto"
  />
);

const IssueFormModal = ({
  show,
  onClose,
  onSave,
  toolOptions = [],
  defaultToolFolderId = "",
  issue = null,
}) => {
  const { showToast } = useToast();
  const {
    issueTypeList,
    issueSubtypeList,
    issueTagList,
    getIssueTypeList,
    getIssueSubtypeList,
    getIssueTagList,
  } = useGlobalMaster();

  const isEdit = Boolean(issue?.id);
  const identityLocked =
    isEdit && issue?.sourceType === ISSUE_SOURCE.FRESHDESK;
  const hideToolSelect = Boolean(defaultToolFolderId) || isEdit;
  const issueId = issue?.id ?? null;

  const [form, setForm] = useState(() => emptyForm(defaultToolFolderId));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const mastersLoading =
    issueTypeList?.loading ||
    issueSubtypeList?.loading ||
    issueTagList?.loading;
  const mastersError =
    issueTypeList?.error || issueSubtypeList?.error || issueTagList?.error;

  const reloadMasters = () =>
    Promise.all([
      getIssueTypeList({ force: true }),
      getIssueSubtypeList({ force: true }),
      getIssueTagList({ force: true }),
    ]);

  // Reset form only when the modal opens or the edited issue changes — not when
  // master getters/state update (those are new references every render).
  useEffect(() => {
    if (!show) return;
    setForm(
      issue
        ? formFromIssue(issue, defaultToolFolderId)
        : emptyForm(defaultToolFolderId),
    );
    setErrors({});
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot issue on open/id/title change only
  }, [show, issueId, issue?.issueTitle, defaultToolFolderId]);

  useEffect(() => {
    if (!show) return;
    reloadMasters().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open, not per getter identity
  }, [show]);

  const masterOptions = useMemo(
    () =>
      buildIssueMasterOptions({
        issueTypeRows: issueTypeList?.data,
        issueSubtypeRows: issueSubtypeList?.data,
        issueTagRows: issueTagList?.data,
        selectedIssueType: form.issueType,
        legacyIssueType: issue?.issueType,
        legacyIssueSubtype: issue?.issueSubtype,
        legacyTags: issue?.issueTags,
      }),
    [
      issueTagList?.data,
      form.issueType,
      issue?.issueSubtype,
      issue?.issueType,
      issue?.issueTags,
      issueSubtypeList?.data,
      issueTypeList?.data,
    ],
  );

  const handleClose = () => {
    setForm(emptyForm(defaultToolFolderId));
    setErrors({});
    setSaving(false);
    onClose();
  };

  const setField = (field, value) => {
    setForm((prev) => {
      const next = {
        ...prev,
        [field]: typeof value === "function" ? value(prev[field]) : value,
      };
      if (field === "issueType") next.issueSubtype = "";
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!form.toolFolderId && !defaultToolFolderId) {
      nextErrors.toolFolderId = t("knowledge_base.tool_required");
    }
    if (!form.issueTitle.trim()) {
      nextErrors.issueTitle = t("knowledge_base.issue_title_required");
    }
    if (!form.issueType) {
      nextErrors.issueType = t("knowledge_base.issue_type_required");
    }
    if (!form.issueSubtype) {
      nextErrors.issueSubtype = t("knowledge_base.issue_subtype_required");
    }
    if (!(form.issueTags || []).length) {
      nextErrors.issueTags = t("knowledge_base.tags_required");
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    const payload = sanitizeIssueForm({
      ...form,
      toolFolderId: form.toolFolderId || defaultToolFolderId,
    });
    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave?.(payload);
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

  const canSubmit =
    Boolean(form.toolFolderId || defaultToolFolderId) &&
    Boolean(form.issueType) &&
    Boolean(form.issueSubtype) &&
    Boolean(form.issueTitle.trim()) &&
    Boolean((form.issueTags || []).length) &&
    !mastersLoading;

  const renderMasterFeedback = () => {
    if (mastersLoading) {
      return (
        <div className="knowledge-base-hub__issue-master-feedback">
          <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
          <span>{t("knowledge_base.issue_masters_loading")}</span>
        </div>
      );
    }
    if (mastersError) {
      return (
        <Alert variant="warning" className="py-2 px-3 mb-0 small">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <span>{t("knowledge_base.issue_masters_error")}</span>
            <KbOutlineButton
              className="knowledge-base-hub__outline-btn--sm"
              onClick={() => reloadMasters().catch(() => {})}
            >
              {t("common.retry")}
            </KbOutlineButton>
          </div>
        </Alert>
      );
    }
    if (
      !masterOptions.issueTypes.length ||
      !masterOptions.issueTags.length
    ) {
      return (
        <Alert variant="light" className="py-2 px-3 mb-0 small border">
          {t("knowledge_base.issue_masters_empty")}
        </Alert>
      );
    }
    return null;
  };

  return (
    <Fragment>
      <PopupModal
        show={show}
        onClose={handleClose}
        size="xl"
        className="bg-white rounded-4 commonForm p-0"
        customClassName="knowledge-base-hub__issue-modal"
        header
        title={isEdit ? t("common.edit") : t("common.create")}
      >
        <Form
          noValidate
          onSubmit={handleSubmit}
          className="knowledge-base-hub__issue-modal-body"
        >
          <div className="knowledge-base-hub__issue-form-scroll">
            {renderMasterFeedback()}

            {identityLocked ? (
              <Alert variant="light" className="py-2 px-3 mb-0 small border">
                {t("knowledge_base.freshdesk_identity_locked")}
              </Alert>
            ) : null}

            <section className="knowledge-base-hub__issue-form-section">
              <div className="knowledge-base-hub__form-section-heading">
                <div>
                  <h3 className="knowledge-base-hub__form-section-title">
                    {t("knowledge_base.issue_section_identity")}
                  </h3>
                  <p className="knowledge-base-hub__form-section-hint">
                    {t("knowledge_base.required_fields_hint")}
                  </p>
                </div>
              </div>

              <div className="knowledge-base-hub__issue-form-section-body">
                {hideToolSelect ? null : (
                  <Form.Group controlId="kb-issue-tool" className="mb-3">
                    <Form.Label>
                      {t("knowledge_base.tool")} <RequiredMark />
                    </Form.Label>
                    <IssueSelect
                      id="kb-issue-tool"
                      options={toolOptions}
                      value={form.toolFolderId}
                      onChange={(value) => setField("toolFolderId", value)}
                      placeholder={t("knowledge_base.select_tool")}
                    />
                    <FieldError message={errors.toolFolderId} />
                  </Form.Group>
                )}
                <Form.Group controlId="kb-issue-title" className="mb-3">
                  <Form.Label>
                    {t("knowledge_base.issue_title")} <RequiredMark />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={form.issueTitle}
                    onChange={(e) => setField("issueTitle", e.target.value)}
                    className="fs-14 py-2"
                    maxLength={200}
                    disabled={identityLocked}
                    isInvalid={Boolean(errors.issueTitle)}
                    placeholder={t("knowledge_base.issue_title_placeholder")}
                  />
                  <FieldError message={errors.issueTitle} />
                </Form.Group>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group controlId="kb-issue-type">
                      <Form.Label>
                        {t("knowledge_base.issue_type")} <RequiredMark />
                      </Form.Label>
                      <IssueSelect
                        id="kb-issue-type"
                        options={masterOptions.issueTypes}
                        value={form.issueType}
                        onChange={(value) => setField("issueType", value)}
                        placeholder={t("knowledge_base.select_option")}
                        disabled={identityLocked || mastersLoading}
                      />
                      <FieldError message={errors.issueType} />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group controlId="kb-issue-subtype">
                      <Form.Label>
                        {t("knowledge_base.issue_subtype")} <RequiredMark />
                      </Form.Label>
                      <IssueSelect
                        id="kb-issue-subtype"
                        options={masterOptions.issueSubtypes}
                        value={form.issueSubtype}
                        onChange={(value) => setField("issueSubtype", value)}
                        placeholder={
                          form.issueType
                            ? t("knowledge_base.select_option")
                            : t("knowledge_base.select_issue_type_first")
                        }
                        disabled={
                          identityLocked ||
                          mastersLoading ||
                          !form.issueType
                        }
                      />
                      <FieldError message={errors.issueSubtype} />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group controlId="kb-tags">
                      <Form.Label>
                        {t("knowledge_base.tags")} <RequiredMark />
                      </Form.Label>
                      <IssueMultiSelect
                        id="kb-tags"
                        options={masterOptions.issueTags}
                        values={form.issueTags}
                        onChange={(values) => setField("issueTags", values)}
                        placeholder={t("knowledge_base.select_option")}
                        disabled={identityLocked || mastersLoading}
                      />
                      <FieldError message={errors.issueTags} />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </section>

            <section className="knowledge-base-hub__issue-form-section">
              <div className="knowledge-base-hub__form-section-heading">
                <div>
                  <h3 className="knowledge-base-hub__form-section-title">
                    {t("knowledge_base.issue_section_problem")}
                  </h3>
                  <p className="knowledge-base-hub__form-section-hint">
                    {t("knowledge_base.optional_fields_hint")}
                  </p>
                </div>
              </div>
              <div className="knowledge-base-hub__issue-form-section-body">
                <Row className="g-3">
                  <Col xs={12}>
                    <Form.Group controlId="kb-issue-description">
                      <Form.Label>
                        {t("knowledge_base.issue_description")}
                      </Form.Label>
                      <RichTextEditor
                        toolbarId={"kb-issue-description"}
                        headTitle={t("knowledge_base.issue_description")}
                        placeholder={t(
                          "knowledge_base.issue_description_placeholder",
                        )}
                        value={form.issueDescription}
                        handleValueChange={(value) =>
                          setField("issueDescription", value)
                        }
                        handleMentionedUsers={() => {
                          return null;
                        }}
                        taggableMembers={[]}
                        className={`description_input focused`}
                        onFocus={() => {}}
                        isVisible={false}
                        enableMention={false}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group controlId="kb-symptoms">
                      <Form.Label>{t("knowledge_base.symptoms")}</Form.Label>
                      <ResolutionStepsEditor
                        steps={form.symptoms}
                        onChange={(steps) => setField("symptoms", steps)}
                        emptyLabel={t("knowledge_base.no_symptoms")}
                        itemLabel={t("knowledge_base.symptoms")}
                        placeholder={t("knowledge_base.symptoms_placeholder")}
                        addLabel={t("knowledge_base.add_symptom")}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group controlId="kb-issue-root-cause">
                      <Form.Label>{t("knowledge_base.root_cause")}</Form.Label>
                      <RichTextEditor
                        toolbarId={"kb-issue-root-cause"}
                        headTitle={t("knowledge_base.root_cause")}
                        placeholder={t(
                          "knowledge_base.root_cause_placeholder",
                        )}
                        value={form.rootCause}
                        handleValueChange={(value) =>
                          setField("rootCause", value)
                        }
                        handleMentionedUsers={() => {
                          return null;
                        }}
                        taggableMembers={[]}
                        className={`description_input focused`}
                        onFocus={() => {}}
                        isVisible={false}
                        enableMention={false}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </section>

            <section className="knowledge-base-hub__issue-form-section">
              <div className="knowledge-base-hub__form-section-heading">
                <h3 className="knowledge-base-hub__form-section-title">
                  {t("knowledge_base.issue_section_resolution")}
                </h3>
              </div>
              <div className="knowledge-base-hub__issue-form-section-body">
                <Form.Label>{t("knowledge_base.resolution_steps")}</Form.Label>
                <ResolutionStepsEditor
                  steps={form.resolutionSteps}
                  onChange={(steps) => setField("resolutionSteps", steps)}
                />
              </div>
            </section>

            <section className="knowledge-base-hub__issue-form-section">
              <div className="knowledge-base-hub__form-section-heading">
                <h3 className="knowledge-base-hub__form-section-title">
                  {t("knowledge_base.issue_section_verification")}
                </h3>
              </div>
              <div className="knowledge-base-hub__issue-form-section-body">
                <Form.Label>{t("knowledge_base.verification")}</Form.Label>
                <ResolutionStepsEditor
                  steps={form.verification}
                  onChange={(steps) => setField("verification", steps)}
                  emptyLabel={t("knowledge_base.no_verification")}
                  itemLabel={t("knowledge_base.verification")}
                  placeholder={t("knowledge_base.verification_placeholder")}
                  addLabel={t("knowledge_base.add_verification")}
                />
              </div>
            </section>

            <section className="knowledge-base-hub__issue-form-section">
              <div className="knowledge-base-hub__form-section-heading">
                <h3 className="knowledge-base-hub__form-section-title">
                  {t("knowledge_base.process_workflow")}
                </h3>
              </div>
              <div className="knowledge-base-hub__issue-form-section-body">
                <Form.Group controlId="kb-process-workflow">
                  <RichTextEditor
                    toolbarId={"kb-process-workflow"}
                    headTitle={t("knowledge_base.process_workflow")}
                    placeholder={t(
                      "knowledge_base.process_workflow_placeholder",
                    )}
                    value={form.processWorkflow}
                    handleValueChange={(value) =>
                      setField("processWorkflow", value)
                    }
                    handleMentionedUsers={() => {
                      return null;
                    }}
                    taggableMembers={[]}
                    className={`description_input focused`}
                    onFocus={() => {}}
                    isVisible={false}
                    enableMention={false}
                  />
                </Form.Group>
              </div>
            </section>

            <section className="knowledge-base-hub__issue-form-section">
              <div className="knowledge-base-hub__form-section-heading">
                <h3 className="knowledge-base-hub__form-section-title">
                  {t("knowledge_base.issue_section_references")}
                </h3>
              </div>
              <div className="knowledge-base-hub__issue-form-section-body">
                <Form.Label className="mb-2">
                  {t("knowledge_base.xml_configuration_reference")}
                </Form.Label>
                <XmlConfigEditor
                  entries={form.xmlConfigs}
                  onChange={(entries) => setField("xmlConfigs", entries)}
                />
                <Form.Label className="mb-2 mt-3">
                  {t("knowledge_base.related_historical_tickets")}
                </Form.Label>
                <RelatedTicketsEditor
                  entries={form.relatedTickets}
                  onChange={(entries) => setField("relatedTickets", entries)}
                />
              </div>
            </section>
          </div>

          <KbModalActions
            className="knowledge-base-hub__issue-modal-actions"
            onCancel={handleClose}
            onSubmit={handleSubmit}
            submitType="submit"
            saving={saving}
            disabled={!canSubmit || Boolean(mastersError)}
            isEdit={isEdit}
          />
        </Form>
      </PopupModal>
    </Fragment>
  );
};

export default IssueFormModal;

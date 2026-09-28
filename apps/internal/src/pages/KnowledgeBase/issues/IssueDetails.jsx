import { useEffect, useMemo, useState } from "react";
import { Spinner } from "react-bootstrap";
import { t } from "i18next";
import DOMPurify from "dompurify";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@orion/shared";
import useKnowledgeBase from "hooks/useKnowledgeBase";
import AccessRequired from "pages/Unauthorized/AccessRequired";
import KbBreadcrumb from "../components/KbBreadcrumb";
import KbIdentityHeader, {
  KbEditIssueButton,
} from "../components/KbIdentityHeader";
import KbNotFoundState from "../components/KbNotFoundState";
import { renderKbUserCell } from "../components/KbUserCell";
import { useKbSearch } from "../components/KbSearchContext";
import KbSearchResultsPanel from "../components/KbSearchResultsPanel";
import { buildKbBreadcrumbItems, formatDisplayDate, isKbManualContent } from "../utils";
import IssueFormModal from "./IssueFormModal";
import ResolutionStepsEditor from "./components/ResolutionStepsEditor";
import XmlConfigEditor from "./components/XmlConfigEditor";
import RelatedTicketsEditor from "./components/RelatedTicketsEditor";
import {
  isHelpdeskKnowledgeBase,
  isHelpdeskToolFolder,
} from "./helpdesk";

const isEmptyHtml = (value) => {
  if (value == null) return true;
  const raw = String(value).trim();
  if (!raw) return true;
  if (/<img\b/i.test(raw)) return false;
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return !text;
};

const sanitizeIssueHtml = (html) =>
  DOMPurify.sanitize(html || "", {
    ALLOWED_ATTR: ["href", "target", "src", "alt", "class", "style"],
  });

const IssueDetailField = ({ label, children, empty = false, className = "" }) => (
  <section className={`knowledge-base-hub__issue-field ${className}`.trim()}>
    <h3 className="knowledge-base-hub__issue-label">{label}</h3>
    {empty ? (
      <p className="knowledge-base-hub__issue-empty mb-0">{children}</p>
    ) : typeof children === "string" ? (
      <div
        className="knowledge-base-hub__issue-value"
        dangerouslySetInnerHTML={{ __html: sanitizeIssueHtml(children) }}
      />
    ) : (
      children
    )}
  </section>
);


const IssueSummaryItem = ({ label, value }) => (
  <div className="knowledge-base-hub__issue-summary-item">
    <span className="knowledge-base-hub__issue-summary-label">{label}</span>
    <span className="knowledge-base-hub__issue-summary-value">
      {value || "—"}
    </span>
  </div>
);

const IssueDetails = () => {
  const { kbId, folderId, issueId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isSearchActive } = useKbSearch();
  const [
    {
      allRows,
      findById,
      getCanManage,
      canAccessKb,
      getFolderById,
      getFolderPath,
      getIssueById,
      isIssueDetailLoading,
      loading: catalogLoading,
      loaded: catalogLoaded,
    },
    { loadKbFolders, loadIssue, loadFolderItems, updateIssue },
  ] = useKnowledgeBase({ applyPermissions: true });

  const canManage = getCanManage(kbId);
  const knowledgeBase = findById(kbId);
  const accessDenied = catalogLoaded && !canAccessKb(kbId);
  const folder = getFolderById(folderId);
  const folderPath = getFolderPath(folderId);
  const resolvedParentFolder =
    (folder?.parentId && getFolderById(folder.parentId)) ||
    (folderPath.length >= 2 ? folderPath[folderPath.length - 2] : null);
  const storedIssue = getIssueById(issueId);
  const detailLoading = isIssueDetailLoading(issueId);
  const showIssueManagement =
    isHelpdeskToolFolder({
      kb: knowledgeBase,
      folder,
      folderPath,
      parentFolder: resolvedParentFolder,
    }) ||
    (isHelpdeskKnowledgeBase(knowledgeBase) &&
      storedIssue &&
      String(storedIssue.folderId) === String(folderId));

  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    if (kbId && canAccessKb(kbId)) {
      loadKbFolders(kbId).catch(() => {});
    }
  }, [kbId, canAccessKb, loadKbFolders]);

  useEffect(() => {
    if (issueId && canAccessKb(kbId)) {
      loadIssue(issueId, { force: true }).catch(() => {});
    }
  }, [issueId, kbId, canAccessKb, loadIssue]);

  useEffect(() => {
    if (storedIssue?.parentFolderId && canAccessKb(kbId)) {
      loadFolderItems(storedIssue.parentFolderId).catch(() => {});
    }
  }, [kbId, canAccessKb, loadFolderItems, storedIssue?.parentFolderId]);

  useEffect(() => {
    if (catalogLoading || !knowledgeBase) return;
    if (!isHelpdeskKnowledgeBase(knowledgeBase)) {
      navigate(`/knowledge-base/${kbId}/folder/${folderId}`, { replace: true });
      return;
    }
    if (folder && !showIssueManagement) {
      navigate(`/knowledge-base/${kbId}/folder/${folderId}`, { replace: true });
    }
  }, [
    catalogLoading,
    folder,
    folderId,
    kbId,
    knowledgeBase,
    navigate,
    showIssueManagement,
  ]);

  const breadcrumbItems = useMemo(() => {
    const items = buildKbBreadcrumbItems({
      kbCount: allRows.length,
      knowledgeBase,
      folderPath,
      kbId,
      hubLabel: t("knowledge_base.title"),
    });
    if (items.length) {
      const last = items[items.length - 1];
      items[items.length - 1] = {
        ...last,
        to: `/knowledge-base/${kbId}/folder/${folderId}`,
      };
    }
    items.push({
      label: storedIssue?.issueTitle || t("knowledge_base.issue_details"),
    });
    return items;
  }, [allRows.length, folderId, folderPath, kbId, knowledgeBase, storedIssue]);

  const handleSaveIssue = async (values) => {
    if (!storedIssue) return;
    await updateIssue({
      id: storedIssue.id,
      kbId,
      knowledgeBaseId: kbId,
      folderId: storedIssue.folderId || folderId,
      issueType: values.issueType,
      issueSubtype: values.issueSubtype,
      issueTitle: values.issueTitle,
      issueTags: values.issueTags,
      issueDescription: values.issueDescription,
      rootCause: values.rootCause,
      symptoms: values.symptoms,
      resolutionSteps: values.resolutionSteps,
      verification: values.verification,
      processWorkflow: values.processWorkflow,
      xmlConfigs: values.xmlConfigs,
      relatedTickets: values.relatedTickets,
    });
    showToast({
      message: t("knowledge_base.issue_updated"),
      variant: "success",
    });
  };

  if (accessDenied) {
    return (
      <AccessRequired
        title={t("knowledge_base.access_denied_title")}
        message={t("knowledge_base.access_denied_message")}
        help={t("knowledge_base.access_denied_help")}
      />
    );
  }

  if (detailLoading || (catalogLoading && !storedIssue)) {
    return (
      <div className="knowledge-base-hub__issue-loading p-4">
        <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  if (!storedIssue && !detailLoading && !catalogLoading) {
    return <KbNotFoundState />;
  }

  const resolutionSteps = storedIssue?.resolutionSteps || [];
  const symptoms = storedIssue?.symptoms || [];
  const verification = storedIssue?.verification || [];
  const xmlConfigs = storedIssue?.xmlConfigs || [];
  const relatedTickets = storedIssue?.relatedTickets || [];
  const tagsLabel = (storedIssue?.issueTags || []).filter(Boolean).join(", ");

  return (
    <div className="knowledge-base-hub__issue-page">
      {isSearchActive ? (
        <KbSearchResultsPanel />
      ) : (
        <>
          <div className="knowledge-base-hub__issue-page-top">
            <KbBreadcrumb items={breadcrumbItems} />
            <KbIdentityHeader
              kind="Folder"
              title={
                storedIssue?.issueTitle || t("knowledge_base.issue_details")
              }
              actions={
                canManage && storedIssue && isKbManualContent(storedIssue) ? (
                  <KbEditIssueButton onClick={() => setShowIssueModal(true)} />
                ) : null
              }
            />
          </div>

          {storedIssue ? (
            <div className="knowledge-base-hub__issue-layout">
              <aside
                className="knowledge-base-hub__issue-aside"
                aria-label={t("knowledge_base.issue_section_identity")}
              >
                <h3 className="knowledge-base-hub__issue-aside-title">
                  {t("knowledge_base.issue_section_identity")}
                </h3>

                <div className="knowledge-base-hub__issue-aside-group">
                  <IssueSummaryItem
                    label={t("knowledge_base.issue_type")}
                    value={storedIssue.issueType}
                  />
                  <IssueSummaryItem
                    label={t("knowledge_base.issue_subtype")}
                    value={storedIssue.issueSubtype}
                  />
                  <IssueSummaryItem
                    label={t("knowledge_base.tags")}
                    value={tagsLabel}
                  />
                </div>

                <div className="knowledge-base-hub__issue-aside-group">
                  <div className="knowledge-base-hub__issue-summary-item">
                    <span className="knowledge-base-hub__issue-summary-label">
                      {t("knowledge_base.created_by")}
                    </span>
                    <span className="knowledge-base-hub__issue-summary-value">
                      {renderKbUserCell(storedIssue.createdBy, "left")}
                    </span>
                  </div>
                  <IssueSummaryItem
                    label={t("knowledge_base.date")}
                    value={formatDisplayDate(storedIssue.createdDate)}
                  />
                </div>

                {storedIssue.freshdeskTicketId || storedIssue.lastSyncedAt ? (
                  <div className="knowledge-base-hub__issue-aside-group">
                    {storedIssue.freshdeskTicketId ? (
                      <IssueSummaryItem
                        label={t("knowledge_base.freshdesk_ticket")}
                        value={storedIssue.freshdeskTicketId}
                      />
                    ) : null}
                    {storedIssue.lastSyncedAt ? (
                      <IssueSummaryItem
                        label={t("knowledge_base.last_synced")}
                        value={formatDisplayDate(storedIssue.lastSyncedAt)}
                      />
                    ) : null}
                  </div>
                ) : null}
              </aside>

              <div className="knowledge-base-hub__issue-main">
                <IssueDetailField
                  label={t("knowledge_base.issue_description")}
                  empty={isEmptyHtml(storedIssue.issueDescription)}
                >
                  {isEmptyHtml(storedIssue.issueDescription)
                    ? t("knowledge_base.no_issue_description")
                    : storedIssue.issueDescription}
                </IssueDetailField>

                <IssueDetailField label={t("knowledge_base.symptoms")}>
                  <ResolutionStepsEditor
                    steps={symptoms}
                    editable={false}
                    emptyLabel={t("knowledge_base.no_symptoms")}
                  />
                </IssueDetailField>

                <IssueDetailField
                  label={t("knowledge_base.root_cause")}
                  empty={isEmptyHtml(storedIssue.rootCause)}
                >
                  {isEmptyHtml(storedIssue.rootCause)
                    ? t("knowledge_base.no_root_cause")
                    : storedIssue.rootCause}
                </IssueDetailField>

                <IssueDetailField label={t("knowledge_base.resolution_steps")}>
                  <ResolutionStepsEditor
                    steps={resolutionSteps}
                    editable={false}
                  />
                </IssueDetailField>

                <IssueDetailField label={t("knowledge_base.verification")}>
                  <ResolutionStepsEditor
                    steps={verification}
                    editable={false}
                    emptyLabel={t("knowledge_base.no_verification")}
                  />
                </IssueDetailField>

                <IssueDetailField
                  label={t("knowledge_base.process_workflow")}
                  empty={isEmptyHtml(storedIssue.processWorkflow)}
                >
                  {isEmptyHtml(storedIssue.processWorkflow)
                    ? t("knowledge_base.no_process_workflow")
                    : storedIssue.processWorkflow}
                </IssueDetailField>

                <IssueDetailField
                  label={t("knowledge_base.xml_configuration_reference")}
                >
                  <XmlConfigEditor entries={xmlConfigs} editable={false} />
                </IssueDetailField>

                <IssueDetailField
                  label={t("knowledge_base.related_historical_tickets")}
                >
                  <RelatedTicketsEditor
                    entries={relatedTickets}
                    editable={false}
                  />
                </IssueDetailField>
              </div>
            </div>
          ) : null}

          {canManage && storedIssue && isKbManualContent(storedIssue) ? (
            <IssueFormModal
              show={showIssueModal}
              onClose={() => setShowIssueModal(false)}
              onSave={handleSaveIssue}
              issue={storedIssue}
              defaultToolFolderId={storedIssue.folderId || folderId}
            />
          ) : null}
        </>
      )}
    </div>
  );
};

export default IssueDetails;

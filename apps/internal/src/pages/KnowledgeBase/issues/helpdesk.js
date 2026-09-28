export const TICKET_STATUSES = ["Resolved", "Escalated", "Closed"];

export const ISSUE_SOURCE = {
  FRESHDESK: "freshdesk",
  MANUAL: "manual",
};

export const isHelpdeskKnowledgeBase = (kb) => {
  if (!kb) return false;
  if (kb.isHelpdesk === true || kb.is_helpdesk === true) return true;
  const code = String(kb.code || kb.knowledgeBaseCode || "").toUpperCase();
  if (code === "HELPDESK") return true;
  const name = String(kb.name || "").trim().toLowerCase();
  return name === "helpdesk" || name === "helpdesk knowledge base";
};

export const isIssueResolutionFolder = (folder) => {
  const name = String(folder?.name || "").trim().toLowerCase();
  return /issues?\s*(&|and)?\s*resolutions?/.test(name);
};

export const isHelpdeskToolFolder = ({
  kb,
  folder,
  folderPath = [],
  parentFolder = null,
} = {}) => {
  if (!isHelpdeskKnowledgeBase(kb) || !folder) return false;
  if (isIssueResolutionFolder(folder)) return false;
  const path = Array.isArray(folderPath) ? folderPath : [];
  if (
    path.some(
      (item) =>
        String(item?.id) !== String(folder.id) && isIssueResolutionFolder(item),
    )
  ) {
    return true;
  }
  // Fallback when path is incomplete (search deep-link / missing parentId)
  // but the resolved parent is Issues & Resolutions.
  return Boolean(parentFolder && isIssueResolutionFolder(parentFolder));
};

/** Find the Issues & Resolutions folder among a list of folder metas. */
export const findIssueResolutionFolder = (folders = []) =>
  (Array.isArray(folders) ? folders : []).find((folder) =>
    isIssueResolutionFolder(folder),
  ) || null;

export const isHelpdeskIssueResolutionFolder = ({ kb, folder } = {}) =>
  isHelpdeskKnowledgeBase(kb) && isIssueResolutionFolder(folder);

export const toIssueTableRow = (issue = {}) => {
  const issueTags = Array.isArray(issue.issueTags)
    ? issue.issueTags.filter(Boolean)
    : [];
  const tagsLabel = issueTags.join(", ");
  return {
    kind: "Issue",
    id: issue.id,
    name: issue.issueTitle || "",
    description: [issue.issueType, issue.issueSubtype, tagsLabel]
      .filter(Boolean)
      .join(" • "),
    by: issue.createdBy,
    date: issue.createdDate,
    issueType: issue.issueType,
    issueSubtype: issue.issueSubtype,
    issueTags,
    tagsLabel,
    sourceType: issue.sourceType,
    isManual: issue.isManual,
    ref: issue,
  };
};

export const getTicketStatusOptions = () =>
  TICKET_STATUSES.map((name) => ({ value: name, label: name }));

export const emptyXmlConfig = () => ({
  tagName: "",
  description: "",
  example: "",
});

export const emptyRelatedTicket = () => ({
  ticketId: "",
  resolvedDate: "",
  team: "",
  status: TICKET_STATUSES[0],
});

export const buildIssueDetailPath = (kbId, folderId, issueId) =>
  `/knowledge-base/${kbId}/folder/${folderId}/issue/${issueId}`;

const sanitizeStringList = (values = []) =>
  (values || [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

export const sanitizeIssueForm = (form = {}) => ({
  toolFolderId: form.toolFolderId,
  issueType: form.issueType,
  issueSubtype: form.issueSubtype,
  issueTitle: String(form.issueTitle || "").trim(),
  issueTags: sanitizeStringList(form.issueTags ?? form.tags),
  issueDescription: String(form.issueDescription || "").trim(),
  rootCause: String(form.rootCause || "").trim(),
  symptoms: sanitizeStringList(form.symptoms),
  resolutionSteps: sanitizeStringList(form.resolutionSteps),
  verification: sanitizeStringList(form.verification),
  processWorkflow: String(form.processWorkflow || "").trim(),
  xmlConfigs: (form.xmlConfigs || []).filter(
    (row) => row.tagName || row.description || row.example,
  ),
  relatedTickets: (form.relatedTickets || []).filter(
    (row) => row.ticketId || row.team,
  ),
});

/** Explicit add/update body so new form fields always reach the API. */
export const buildIssueWritePayload = (
  payload = {},
  { freshdesk = false } = {},
) => {
  const knowledgeBaseId = payload.knowledgeBaseId || payload.kbId || "";
  const contentFields = {
    issueDescription: String(payload.issueDescription || "").trim(),
    rootCause: String(payload.rootCause || "").trim(),
    symptoms: sanitizeStringList(payload.symptoms),
    resolutionSteps: sanitizeStringList(payload.resolutionSteps),
    verification: sanitizeStringList(payload.verification),
    processWorkflow: String(payload.processWorkflow || "").trim(),
    xmlConfigs: Array.isArray(payload.xmlConfigs) ? payload.xmlConfigs : [],
    relatedTickets: Array.isArray(payload.relatedTickets)
      ? payload.relatedTickets
      : [],
  };

  if (freshdesk) {
    return {
      id: payload.id,
      folderId: payload.folderId,
      knowledgeBaseId,
      sourceType: ISSUE_SOURCE.FRESHDESK,
      ...contentFields,
    };
  }

  return {
    ...(payload.id != null && payload.id !== "" ? { id: payload.id } : {}),
    knowledgeBaseId,
    folderId: payload.folderId,
    ...(payload.parentFolderId != null && payload.parentFolderId !== ""
      ? { parentFolderId: payload.parentFolderId }
      : {}),
    issueType: payload.issueType || "",
    issueSubtype: payload.issueSubtype || "",
    issueTitle: String(payload.issueTitle || "").trim(),
    issueTags: sanitizeStringList(payload.issueTags ?? payload.tags),
    ...contentFields,
    sourceType: payload.sourceType || ISSUE_SOURCE.MANUAL,
  };
};

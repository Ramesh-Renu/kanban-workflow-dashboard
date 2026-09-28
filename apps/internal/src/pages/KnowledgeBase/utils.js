export const todayStr = () => new Date().toISOString().slice(0, 10);

/** Custom event so any KB page can open the shared search dock. */
export const KB_SEARCH_OPEN = "kb-search-open";

export const openKbSearch = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(KB_SEARCH_OPEN));
};

/** Normalize created-by into Workflow-style user object for avatar cell. */
export const toKbUser = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    const name =
      value.name ||
      value.displayName ||
      value.userName ||
      value.email ||
      "";
    if (!name) return null;
    return { ...value, name, displayName: value.displayName || name };
  }
  const name = String(value).trim();
  if (!name || name === "—") return null;
  return { name, displayName: name };
};

export const kbUserSearchText = (value) =>
  toKbUser(value)?.name?.toLowerCase() || "";

export const matchesKbTextFilter = (query, ...fields) => {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => String(field || "").toLowerCase().includes(q));
};

/**
 * Normalize API `isManual` / `is_manual` to boolean | null.
 * null means the API did not send the flag (legacy / non-helpdesk).
 */
export const toKbIsManualFlag = (value) => {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }
  return null;
};

/**
 * Whether edit/delete is allowed for a folder or item.
 * `isManual === false` is user-created and may be mutated when the role permits.
 * `isManual === true` is system-managed and must not be mutated.
 * Missing flag stays editable for backward compatibility.
 */
export const isKbManualContent = (entity) => {
  if (!entity) return true;
  const raw =
    entity.isManual ??
    entity.is_manual ??
    entity.ref?.isManual ??
    entity.ref?.is_manual;
  return toKbIsManualFlag(raw) !== true;
};

const firstUserFromField = (value) => {
  if (Array.isArray(value)) return value[0] || null;
  if (value && typeof value === "object") return value;
  return null;
};

const pickUser = (item, keys) => {
  for (const key of keys) {
    const value = item[key];
    const fromField = firstUserFromField(value);
    if (fromField) {
      const user = toKbUser(fromField);
      if (user) return user;
    }
    if (typeof value === "string") {
      const user = toKbUser(value);
      if (user) return user;
    }
  }
  return null;
};

const pickDate = (item, keys) => {
  for (const key of keys) {
    if (item[key] != null && item[key] !== "") return item[key];
  }
  return todayStr();
};

export const normalizeKnowledgeBase = (item = {}) => ({
  id: item.id ?? item.knowledgeBaseId ?? item.knowledge_base_id,
  name: item.name ?? item.knowledgeBaseName ?? item.knowledge_base_name ?? "",
  description: item.description ?? "",
  isHelpdesk: Boolean(item.isHelpdesk ?? item.is_helpdesk),
  code: item.code ?? item.knowledgeBaseCode ?? item.knowledge_base_code ?? "",
  createdBy:
    pickUser(item, ["createdBy", "created_by", "user_Info", "user_info"]) ||
    toKbUser(item.createdByName ?? null),
  createdDate: pickDate(item, ["createdDate", "created_Date", "created_date"]),
});

/** canEdit: 0 = View, 1 = Edit */
export const toCanEditFlag = (value) => {
  if (value === true || value === 1 || value === "1") return 1;
  return 0;
};

export const canEditLabel = (canEdit) =>
  toCanEditFlag(canEdit) === 1 ? "Edit" : "View";

export const getKbPermissionEntries = (authDetails) => {
  const list =
    authDetails?.knowledgeBasePermissions ??
    authDetails?.knowledge_base_permissions;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (p) => (p?.knowledgeBaseId ?? p?.knowledge_base_id) != null,
  );
};

export const isKnowledgeBaseAdmin = (authDetails) =>
  Boolean(
    authDetails?.isSuperAdmin ||
      authDetails?.user_type_code === "ADM" ||
      authDetails?.user_type_code === "SADM",
  );

/** Menu + route access: admins always; USR only with assigned KB permissions. */
export const canAccessKnowledgeBase = (authDetails) => {
  if (!authDetails) return false;
  if (isKnowledgeBaseAdmin(authDetails)) return true;
  return getKbPermissionEntries(authDetails).length > 0;
};

/** Whether this user may open a specific knowledge base (by id). */
export const hasKbAccess = (authDetails, kbId) => {
  if (kbId == null || kbId === "") return false;
  if (isKnowledgeBaseAdmin(authDetails)) return true;
  return getKbPermissionEntries(authDetails).some(
    (p) => String(p.knowledgeBaseId ?? p.knowledge_base_id) === String(kbId),
  );
};

export const getKbCanEdit = (authDetails, kbId) => {
  if (isKnowledgeBaseAdmin(authDetails)) return true;
  if (kbId == null) return false;
  const match = getKbPermissionEntries(authDetails).find(
    (p) => String(p.knowledgeBaseId ?? p.knowledge_base_id) === String(kbId),
  );
  return toCanEditFlag(match?.canEdit) === 1;
};

/** Admins see the full catalog; everyone else is limited to assigned KB ids. */
export const filterKnowledgeBasesByPermission = (kbs = [], authDetails) => {
  if (isKnowledgeBaseAdmin(authDetails)) return kbs;
  const allowed = new Set(
    getKbPermissionEntries(authDetails).map((p) =>
      String(p.knowledgeBaseId ?? p.knowledge_base_id),
    ),
  );
  if (allowed.size === 0) return [];
  return kbs.filter((kb) => allowed.has(String(kb.id)));
};

/** Overlay getknowledgebase master fields (description, code, …) onto assigned permissions. */
export const mergeKbMasterDetails = (permissionEntries = [], masterRows = []) => {
  const byId = new Map(
    (masterRows || []).map((kb) => [String(kb.id), kb]),
  );
  return permissionEntries.map((entry) => {
    const fromPerm = normalizeKnowledgeBase(entry);
    const fromMaster = byId.get(String(fromPerm.id));
    if (!fromMaster) return fromPerm;
    return {
      ...fromPerm,
      ...fromMaster,
      name: fromMaster.name || fromPerm.name,
      description: fromMaster.description || fromPerm.description,
    };
  });
};

export const formatDisplayDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const fileExtension = (fileName = "") => {
  const parts = String(fileName).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

export const isKbApiSuccess = (response) => {
  if (!response) return false;
  // Mock / unwrapped body: { status: true|false, data, message }
  if (response.status === true) return true;
  if (response.status === false) return false;
  // Axios response: HTTP 200/201 with optional API envelope in .data
  if (response.status === 200 || response.status === 201) {
    const body = response.data;
    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      Object.prototype.hasOwnProperty.call(body, "status")
    ) {
      return body.status === true || body.status === 200 || body.status === 201;
    }
    return true;
  }
  return false;
};

/**
 * Resolve the entity/payload from a KB API call.
 * - Mock helpers return `{ status, data, message }`
 * - plgBaseAPI returns the axios response (`response.data` = API body)
 */
export const getKbResponseData = (response) => {
  if (response == null) return null;

  const isEnvelope = (value) =>
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, "data") &&
    (Object.prototype.hasOwnProperty.call(value, "status") ||
      Object.prototype.hasOwnProperty.call(value, "message"));

  // Mock / already-unwrapped API body
  if (isEnvelope(response) && typeof response.status !== "number") {
    return response.data ?? null;
  }

  const body = response.data;
  if (body == null) return null;
  if (isEnvelope(body)) return body.data ?? null;
  return body;
};

export const normalizeAttachment = (item = {}) => ({
  id: item.id,
  folderId: String(item.folderId ?? item.folder_id ?? ""),
  documentName: item.documentName ?? item.document_name ?? "",
  description: item.description ?? "",
  fileType:
    item.fileType ??
    item.file_type ??
    (fileExtension(item.fileName ?? item.file_name) || "file"),
  fileName: item.fileName ?? item.file_name ?? "",
  fileUrl: item.fileUrl ?? item.file_url ?? "",
  file: item.file ?? null,
  isManual: toKbIsManualFlag(item.isManual ?? item.is_manual),
  uploadedBy: pickUser(item, ["uploadedBy", "uploaded_by"]),
  uploadedDate: pickDate(item, [
    "uploadedDate",
    "uploaded_Date",
    "uploaded_date",
  ]),
});

export const normalizeLink = (item = {}) => ({
  id: item.id,
  folderId: String(item.folderId ?? item.folder_id ?? ""),
  name: item.name ?? "",
  url: item.url ?? "",
  description: item.description ?? "",
  isManual: toKbIsManualFlag(item.isManual ?? item.is_manual),
  createdBy: pickUser(item, ["createdBy", "created_by"]),
  createdDate: pickDate(item, ["createdDate", "created_Date", "created_date"]),
});

const normalizeFolderFields = (item = {}) => ({
  id: item.id,
  kbId: String(item.kbId ?? item.knowledgeBaseId ?? item.knowledge_base_id ?? ""),
  parentId:
    item.parentId == null || item.parentId === ""
      ? null
      : String(item.parentId),
  name: item.name ?? "",
  description: item.description ?? "",
  isManual: toKbIsManualFlag(item.isManual ?? item.is_manual),
  createdBy: pickUser(item, ["createdBy", "created_by"]),
  createdDate: pickDate(item, ["createdDate", "created_Date", "created_date"]),
});

/** Map API mixed recentItems row → table row (preserve API order). */
export const normalizeRecentItem = (item = {}) => {
  const kind = String(item.kind || item.type || "")
    .trim()
    .toLowerCase();
  if (kind === "folder") {
    const folder = normalizeFolder(item);
    return {
      kind: "Folder",
      id: folder.id,
      name: folder.name,
      description: folder.description,
      by: folder.createdBy,
      date: folder.createdDate,
      itemCount: folder.itemCount,
      recentItems: folder.recentItems,
      isManual: folder.isManual,
      ref: folder,
    };
  }
  if (kind === "attachment" || kind === "file" || kind === "document") {
    const attachment = normalizeAttachment(item);
    return {
      kind: "Attachment",
      id: attachment.id,
      name: attachment.documentName || attachment.fileName || item.name || "",
      description: attachment.description,
      by: attachment.uploadedBy,
      date: attachment.uploadedDate,
      isManual: attachment.isManual,
      ref: attachment,
    };
  }
  if (kind === "link") {
    const link = normalizeLink(item);
    return {
      kind: "Link",
      id: link.id,
      name: link.name,
      description: link.description,
      by: link.createdBy,
      date: link.createdDate,
      url: link.url,
      isManual: link.isManual,
      ref: link,
    };
  }
  return null;
};

export const normalizeFolder = (item = {}) => {
  const recentSource = item.recentItems ?? item.recent_items ?? [];
  const recentItems = Array.isArray(recentSource)
    ? recentSource.map(normalizeRecentItem).filter(Boolean)
    : [];
  return {
    ...normalizeFolderFields(item),
    itemCount: Number(item.itemCount ?? item.item_count ?? recentItems.length) || 0,
    recentItems,
  };
};

/**
 * Build lightweight folder records from a search hit path so deep-link
 * navigation can resolve getFolderById without a warm browse cache.
 */
export const buildFolderSeedsFromSearchResult = (result, targetFolderId) => {
  if (!result?.kbId || targetFolderId == null) return [];
  const kbId = String(result.kbId);
  const targetId = String(targetFolderId);
  const path = Array.isArray(result.path) ? result.path : [];
  const segments = path
    .filter((segment) => segment?.id != null && String(segment.id) !== kbId)
    .map((segment) => ({
      id: String(segment.id),
      name: segment.name || segment.title || "",
    }));

  if (!segments.some((segment) => segment.id === targetId)) {
    segments.push({
      id: targetId,
      name: result.title || result.name || "",
    });
  }

  return segments.map((segment, index) =>
    normalizeFolder({
      id: segment.id,
      name: segment.name,
      kbId,
      knowledgeBaseId: kbId,
      parentId: index > 0 ? segments[index - 1].id : null,
    }),
  );
};

const asStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const normalizeXmlConfig = (item = {}) => ({
  tagName: item.tagName ?? item.tag_name ?? "",
  description: item.description ?? "",
  example: item.example ?? item.exampleUsage ?? item.example_usage ?? "",
});

const normalizeRelatedTicket = (item = {}) => ({
  ticketId: item.ticketId ?? item.ticket_id ?? item.id ?? "",
  resolvedDate: item.resolvedDate ?? item.resolved_date ?? "",
  team: item.team ?? "",
  status: item.status ?? "Resolved",
});

export const normalizeIssue = (item = {}) => {
  // Guard: callers sometimes pass the API envelope `{ status, data, message }`
  const source =
    item &&
    typeof item === "object" &&
    item.data &&
    typeof item.data === "object" &&
    !Array.isArray(item.data) &&
    item.issueTitle == null &&
    item.issue_title == null &&
    item.id == null &&
    (Object.prototype.hasOwnProperty.call(item, "status") ||
      Object.prototype.hasOwnProperty.call(item, "message"))
      ? item.data
      : item;

  return {
    id: source.id,
    kbId: String(source.kbId ?? source.knowledgeBaseId ?? source.knowledge_base_id ?? ""),
    folderId: String(source.folderId ?? source.folder_id ?? ""),
    parentFolderId: String(
      source.parentFolderId ?? source.parent_folder_id ?? "",
    ),
    issueType: source.issueType ?? source.issue_type ?? "",
    issueSubtype: source.issueSubtype ?? source.issue_subtype ?? "",
    issueTitle: source.issueTitle ?? source.issue_title ?? source.title ?? "",
    issueTags: (() => {
      const fromIssueTags = asStringArray(
        source.issueTags ?? source.IssueTags ?? source.issue_tags,
      );
      if (fromIssueTags.length) return fromIssueTags;
      const fromLegacyTags = asStringArray(source.tags ?? source.Tags);
      if (fromLegacyTags.length) return fromLegacyTags;
      return asStringArray(
        source.documentType ?? source.document_type ?? source.DocumentType,
      );
    })(),
    issueDescription:
      source.issueDescription ??
      source.issue_description ??
      source.description ??
      "",
    rootCause: source.rootCause ?? source.root_cause ?? "",
    symptoms: asStringArray(source.symptoms ?? source.Symptoms),
    resolutionSteps: asStringArray(
      source.resolutionSteps ?? source.resolution_steps,
    ),
    verification: asStringArray(source.verification ?? source.Verification),
    processWorkflow: String(
      source.processWorkflow ??
        source.process_workflow ??
        source.ProcessWorkflow ??
        "",
    ).trim(),
    xmlConfigs: Array.isArray(source.xmlConfigs ?? source.xml_configs)
      ? (source.xmlConfigs ?? source.xml_configs).map(normalizeXmlConfig)
      : [],
    relatedTickets: Array.isArray(
      source.relatedTickets ?? source.related_tickets ?? source.historicalTickets,
    )
      ? (
          source.relatedTickets ??
          source.related_tickets ??
          source.historicalTickets
        ).map(normalizeRelatedTicket)
      : [],
    sourceType: String(
      source.sourceType ?? source.source_type ?? "manual",
    ).toLowerCase(),
    isManual: toKbIsManualFlag(source.isManual ?? source.is_manual),
    freshdeskTicketId:
      source.freshdeskTicketId ?? source.freshdesk_ticket_id ?? null,
    lastSyncedAt: source.lastSyncedAt ?? source.last_synced_at ?? null,
    createdBy: pickUser(source, ["createdBy", "created_by"]) || toKbUser("AI"),
    createdDate: pickDate(source, [
      "createdDate",
      "created_Date",
      "created_date",
    ]),
    updatedDate:
      source.updatedDate ?? source.updated_date ?? source.updated ?? null,
  };
};

export const normalizeFolderItemsPayload = (data = {}) => {
  const payload = data?.items ? data : data?.data || data;
  const items = payload?.items ?? payload?.recentItems ?? [];
  return {
    folderId: payload?.folderId ?? payload?.folder_id ?? null,
    itemCount: Number(payload?.itemCount ?? payload?.item_count ?? items.length) || 0,
    items: Array.isArray(items)
      ? items.map(normalizeRecentItem).filter(Boolean)
      : [],
  };
};

/**
 * When folder-item APIs omit parentId on nested Folder rows, stamp the
 * containing folder id so path walks / Helpdesk tool detection stay correct.
 */
export const stampFolderItemParentIds = (items = [], parentFolderId) => {
  const parentId =
    parentFolderId == null || parentFolderId === ""
      ? null
      : String(parentFolderId);
  if (!parentId || !Array.isArray(items)) return items || [];
  return items.map((item) => {
    if (item?.kind !== "Folder") return item;
    const ref = item.ref || item;
    if (ref?.parentId != null && ref.parentId !== "") return item;
    const nextRef = { ...ref, parentId };
    return {
      ...item,
      ref: nextRef,
    };
  });
};

export const normalizeKbPermissionRow = (item = {}) => ({
  id:
    item.userKnowledgeBasePermissionId ??
    item.user_knowledgebase_permission_id ??
    item.id,
  userKnowledgeBasePermissionId:
    item.userKnowledgeBasePermissionId ??
    item.user_knowledgebase_permission_id ??
    item.id,
  knowledgeBaseId: item.knowledgeBaseId ?? item.knowledge_base_id,
  knowledgeBaseName:
    item.knowledgeBaseName ?? item.knowledge_base_name ?? "",
  canEdit: toCanEditFlag(item.canEdit ?? item.can_edit),
  permission: canEditLabel(item.canEdit ?? item.can_edit),
  grantedBy:
    typeof item.grantedBy === "object"
      ? toKbUser(item.grantedBy)?.name || "—"
      : item.grantedBy ?? item.granted_by ?? "—",
  grantedOn: item.grantedOn ?? item.granted_on ?? "",
});

/**
 * Build KB hierarchy breadcrumb items (below the static Knowledge Base header).
 * - Multi KB: hub → KB → folder ancestors → current
 * - Single KB: omit hub; KB → folders…
 * - KB root (no folderPath): always show current KB (and hub when multi)
 */
export const buildKbBreadcrumbItems = ({
  kbCount = 0,
  knowledgeBase,
  folderPath = [],
  kbId,
  hubLabel,
} = {}) => {
  const items = [];
  const multiKb = Number(kbCount) > 1;
  const kbLabel = knowledgeBase?.name || "…";
  const kbTo = kbId != null ? `/knowledge-base/${kbId}` : null;
  const path = Array.isArray(folderPath) ? folderPath : [];

  if (multiKb) {
    items.push({
      label: hubLabel || "Knowledge Base",
      to: "/knowledge-base",
    });
  }

  if (path.length === 0) {
    items.push({ label: kbLabel });
    return items;
  }

  items.push({
    label: kbLabel,
    to: kbTo,
  });

  path.forEach((folder, index) => {
    const isLast = index === path.length - 1;
    const id = folder?.id;
    items.push({
      label: folder?.name || "…",
      to:
        !isLast && id != null && kbId != null
          ? `/knowledge-base/${kbId}/folder/${id}`
          : undefined,
    });
  });

  return items;
};

export const KB_PAGE_SIZE = 20;

export const asArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (data && typeof data === "object" && data.id != null) return [data];
  return [];
};

export const assertKbSuccess = (response, fallbackMessage) => {
  if (!isKbApiSuccess(response)) {
    throw new Error(
      response?.data?.message || response?.message || fallbackMessage,
    );
  }
};

export const toPageMeta = (source, fallbackPage, fallbackTotal) => {
  // Pagination may sit on the axios body, API envelope, or nested items payload.
  const candidates = [source, source?.data, source?.data?.data].filter(
    (value) => value && typeof value === "object" && !Array.isArray(value),
  );
  const meta =
    candidates.find(
      (value) =>
        value.hasMore != null ||
        value.page != null ||
        value.pageSize != null ||
        value.total != null,
    ) || {};

  return {
    page: meta.page ?? fallbackPage,
    pageSize: meta.pageSize ?? KB_PAGE_SIZE,
    total: meta.total ?? fallbackTotal,
    hasMore: Boolean(meta.hasMore),
  };
};

export const keyedFlag = (map, id) => Boolean(map?.[String(id)]);

export const runKbWrite = async ({ request, failMessage, refresh, mapResult }) => {
  const response = await request();
  assertKbSuccess(response, failMessage);
  if (refresh) await refresh(response);
  return mapResult ? mapResult(response) : response;
};

export const getNestedFolderItems = (folderOrItem, getMergedItems) => {
  const id = folderOrItem?.ref?.id || folderOrItem?.id;
  if (folderOrItem?.recentItems?.length > 0) {
    return folderOrItem.recentItems;
  }
  return getMergedItems?.(id) || [];
};

export const folderHasChildren = (
  row,
  { getItemCount, getMergedItems } = {},
) => {
  const realId = row?.ref?.id ?? row?.id;
  const recentCount =
    row?.recentItems?.length ||
    row?.ref?.recentItems?.length ||
    getMergedItems?.(realId)?.length ||
    0;
  return (
    recentCount > 0 ||
    (getItemCount?.(realId) ?? 0) > 0 ||
    (row?.ref?.itemCount ?? 0) > 0 ||
    (row?.itemCount ?? 0) > 0
  );
};



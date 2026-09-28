const emptyKbCache = () => ({
  foldersByKb: {},
  foldersLoading: {},
  foldersLoadingMore: {},
  foldersMetaByKb: {},
  itemsByFolder: {},
  itemsLoading: {},
  itemsLoadingMore: {},
  itemsMetaByFolder: {},
  issuesByFolder: {},
  issuesLoading: {},
  issuesLoadingMore: {},
  issuesMetaByFolder: {},
  issueById: {},
  issueDetailLoading: {},
});

export const initialKnowledgeBaseState = {
  data: [],
  loading: false,
  error: null,
  ...emptyKbCache(),
};

const setKeyedFlag = (map, key, value) => ({
  ...map,
  [key]: value,
});

const mergeById = (existing = [], incoming = [], getId) => {
  const ids = new Set(existing.map(getId));
  return [...existing, ...incoming.filter((item) => !ids.has(getId(item)))];
};

export const knowledgeBaseReducer = (state = initialKnowledgeBaseState, action) => {
  switch (action?.type) {
    case "KB_FOLDERS_LOADING": {
      const { key, more = false } = action.payload;
      if (more) {
        return {
          ...state,
          foldersLoadingMore: setKeyedFlag(state.foldersLoadingMore, key, true),
        };
      }
      return {
        ...state,
        foldersLoading: setKeyedFlag(state.foldersLoading, key, true),
        error: null,
      };
    }
    case "KB_FOLDERS_SUCCESS": {
      const { key, folders, meta, append = false } = action.payload;
      const nextFolders = append
        ? mergeById(
            state.foldersByKb[key] || [],
            folders,
            (folder) => String(folder.id),
          )
        : folders;
      return {
        ...state,
        foldersByKb: {
          ...state.foldersByKb,
          [key]: nextFolders,
        },
        foldersLoading: setKeyedFlag(state.foldersLoading, key, false),
        foldersLoadingMore: setKeyedFlag(state.foldersLoadingMore, key, false),
        foldersMetaByKb: {
          ...state.foldersMetaByKb,
          [key]: {
            ...meta,
            total: meta?.total ?? nextFolders.length,
          },
        },
        loading: false,
        error: null,
      };
    }
    case "KB_FOLDERS_ERROR": {
      const { key, more = false } = action.payload;
      return {
        ...state,
        foldersLoading: more
          ? state.foldersLoading
          : setKeyedFlag(state.foldersLoading, key, false),
        foldersLoadingMore: more
          ? setKeyedFlag(state.foldersLoadingMore, key, false)
          : state.foldersLoadingMore,
        error: action.payload.error || null,
      };
    }
    case "KB_FOLDER_SEED": {
      const { key, folders = [] } = action.payload || {};
      if (!key || !folders.length) return state;
      const byId = new Map(
        (state.foldersByKb[key] || []).map((folder) => [
          String(folder.id),
          folder,
        ]),
      );
      folders.forEach((folder) => {
        if (folder?.id == null) return;
        const id = String(folder.id);
        const prev = byId.get(id);
        if (!prev) {
          byId.set(id, folder);
          return;
        }
        byId.set(id, {
          ...folder,
          ...prev,
          name: prev.name || folder.name,
          // Prefer an explicit incoming parentId (e.g. IR→tool after search
          // hydrate) over a prior null/missing parent from a weak path seed.
          parentId: folder.parentId ?? prev.parentId ?? null,
          kbId: prev.kbId || folder.kbId,
        });
      });
      return {
        ...state,
        foldersByKb: {
          ...state.foldersByKb,
          [key]: Array.from(byId.values()),
        },
      };
    }
    case "KB_ITEMS_LOADING": {
      const { key, more = false } = action.payload;
      if (more) {
        return {
          ...state,
          itemsLoadingMore: setKeyedFlag(state.itemsLoadingMore, key, true),
        };
      }
      return {
        ...state,
        itemsLoading: setKeyedFlag(state.itemsLoading, key, true),
        error: null,
      };
    }
    case "KB_ITEMS_SUCCESS": {
      const { key, items, itemCount, meta, append = false } = action.payload;
      const nextItems = append
        ? mergeById(
            state.itemsByFolder[key]?.items || [],
            items,
            (item) => `${item.kind}:${item.id}`,
          )
        : items;
      return {
        ...state,
        itemsByFolder: {
          ...state.itemsByFolder,
          [key]: {
            items: nextItems,
            itemCount,
          },
        },
        itemsLoading: setKeyedFlag(state.itemsLoading, key, false),
        itemsLoadingMore: setKeyedFlag(state.itemsLoadingMore, key, false),
        itemsMetaByFolder: {
          ...state.itemsMetaByFolder,
          [key]: {
            ...meta,
            total: meta?.total ?? nextItems.length,
          },
        },
        loading: false,
        error: null,
      };
    }
    case "KB_ITEMS_ERROR": {
      const { key, more = false } = action.payload;
      return {
        ...state,
        itemsLoading: more
          ? state.itemsLoading
          : setKeyedFlag(state.itemsLoading, key, false),
        itemsLoadingMore: more
          ? setKeyedFlag(state.itemsLoadingMore, key, false)
          : state.itemsLoadingMore,
        error: action.payload.error || null,
      };
    }
    case "KB_ITEMS_REMOVE": {
      const nextItems = { ...state.itemsByFolder };
      delete nextItems[String(action.payload.key)];
      return { ...state, itemsByFolder: nextItems };
    }
    case "KB_ISSUES_LOADING": {
      const { key, more = false } = action.payload;
      if (more) {
        return {
          ...state,
          issuesLoadingMore: setKeyedFlag(state.issuesLoadingMore, key, true),
        };
      }
      return {
        ...state,
        issuesLoading: setKeyedFlag(state.issuesLoading, key, true),
        error: null,
      };
    }
    case "KB_ISSUES_SUCCESS": {
      const { key, issues, meta, append = false } = action.payload;
      const existingIssues = state.issuesByFolder || {};
      const nextIssues = append
        ? mergeById(
            existingIssues[key] || [],
            issues,
            (issue) => String(issue.id),
          )
        : issues;
      const nextIssueById = { ...(state.issueById || {}) };
      const isDetailRich = (issue) =>
        Boolean(
          issue?.issueDescription ||
            issue?.rootCause ||
            (issue?.symptoms || []).length ||
            (issue?.resolutionSteps || []).length ||
            (issue?.verification || []).length ||
            issue?.processWorkflow ||
            (issue?.xmlConfigs || []).length ||
            (issue?.relatedTickets || []).length,
        );
      nextIssues.forEach((issue) => {
        if (issue?.id == null) return;
        const id = String(issue.id);
        const prev = nextIssueById[id];
        // Keep hydrated detail fields when list rows are summary-only
        if (prev && isDetailRich(prev) && !isDetailRich(issue)) {
          nextIssueById[id] = {
            ...prev,
            issueTitle: issue.issueTitle || prev.issueTitle,
            issueType: issue.issueType || prev.issueType,
            issueSubtype: issue.issueSubtype || prev.issueSubtype,
            issueTags:
              Array.isArray(issue.issueTags) && issue.issueTags.length
                ? issue.issueTags
                : prev.issueTags,
            createdBy: issue.createdBy || prev.createdBy,
            createdDate: issue.createdDate || prev.createdDate,
            updatedDate: issue.updatedDate || prev.updatedDate,
            sourceType: issue.sourceType || prev.sourceType,
            freshdeskTicketId:
              issue.freshdeskTicketId ?? prev.freshdeskTicketId,
            lastSyncedAt: issue.lastSyncedAt ?? prev.lastSyncedAt,
          };
        } else {
          nextIssueById[id] = issue;
        }
      });
      return {
        ...state,
        issuesByFolder: {
          ...existingIssues,
          [key]: nextIssues,
        },
        issueById: nextIssueById,
        issuesLoading: setKeyedFlag(state.issuesLoading, key, false),
        issuesLoadingMore: setKeyedFlag(state.issuesLoadingMore, key, false),
        issuesMetaByFolder: {
          ...state.issuesMetaByFolder,
          [key]: {
            ...meta,
            total: meta?.total ?? nextIssues.length,
          },
        },
        loading: false,
        error: null,
      };
    }
    case "KB_ISSUES_ERROR": {
      const { key, more = false } = action.payload;
      return {
        ...state,
        issuesLoading: more
          ? state.issuesLoading
          : setKeyedFlag(state.issuesLoading, key, false),
        issuesLoadingMore: more
          ? setKeyedFlag(state.issuesLoadingMore, key, false)
          : state.issuesLoadingMore,
        error: action.payload.error || null,
      };
    }
    case "KB_ISSUE_DETAIL_LOADING": {
      const { key } = action.payload;
      return {
        ...state,
        issueDetailLoading: setKeyedFlag(state.issueDetailLoading, key, true),
        error: null,
      };
    }
    case "KB_ISSUE_DETAIL_SUCCESS": {
      const { issue } = action.payload;
      const key = String(issue?.id ?? action.payload.key);
      return {
        ...state,
        issueById: {
          ...state.issueById,
          [key]: issue,
        },
        issueDetailLoading: setKeyedFlag(state.issueDetailLoading, key, false),
        error: null,
      };
    }
    case "KB_ISSUE_DETAIL_ERROR": {
      const { key } = action.payload;
      return {
        ...state,
        issueDetailLoading: setKeyedFlag(state.issueDetailLoading, key, false),
        error: action.payload.error || null,
      };
    }
    default:
      return state;
  }
};

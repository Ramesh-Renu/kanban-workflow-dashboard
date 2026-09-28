import { canAccessKnowledgeBase } from "pages/KnowledgeBase/utils";
import { getDashboardHomePath } from "utils/dashboard";

/**
 * Match hub app to userInfo.appPermission entry (appId / appCode).
 * If appPermission is absent on details, do not gate (legacy).
 */
export const userHasHubAppPermission = (details, hubApp) => {
  const list = details?.appPermission;
  if (list == null) return true;
  if (!Array.isArray(list) || list.length === 0) return false;

  return list.some((entry) => {
    const entryId = entry?.appId ?? entry?.app_id ?? entry?.id;
    const entryCode = String(entry?.appCode ?? entry?.app_code ?? "").toUpperCase();
    const entryName = String(entry?.appName ?? entry?.app_name ?? "").toUpperCase();
    if (
      hubApp?.permissionAppId != null &&
      entryId != null &&
      Number(entryId) === Number(hubApp.permissionAppId)
    ) {
      return true;
    }
    if (hubApp?.appCode && entryCode && entryCode === String(hubApp.appCode).toUpperCase()) {
      return true;
    }
    if (hubApp?.title && entryName && entryName === String(hubApp.title).toUpperCase()) {
      return true;
    }
    return false;
  });
};

/** Shared Application Hub apps — used by hub cards and Home sidenav hover. */
export const APPLICATION_HUB_APPS = [
  {
    id: "tasks",
    permissionAppId: 114,
    appCode: "TASKMANAGEMENT",
    title: "Task Management",
    description: "Visualize work, manage tasks, and track progress with Kanban boards.",
    accent: "blue",
    getTo: (details) => getDashboardHomePath(details),
    isAvailable: () => true,
  },
  {
    id: "knowledge",
    permissionAppId: 115,
    appCode: "KNOWLEDGEBASE",
    title: "Knowledge base",
    description: "Access documentation, playbooks, and internal guides in one place.",
    accent: "purple",
    getTo: () => "/knowledge-base",
    isAvailable: () => true,
  },
  {
    id: "kimai",
    permissionAppId: 116,
    appCode: "KIMAI",
    title: "Kimai",
    description: "Streamline chemistry operations, records, and experiment tracking.",
    accent: "green",
    // Link straight into the SAML login route (not the bare homepage), so a
    // user with an active Azure AD session in this browser (from Orion's own
    // MSAL login) is signed into Kimai silently, without seeing Kimai's
    // login-choice page or having to click "Login with Azure AD" themselves.
    getTo: () => "https://in-timetracking.euroland.com/auth/saml/login",
    isAvailable: () => true,
    isExternal: true,
  },
  {
    id: "lms",
    permissionAppId: 117,
    appCode: "LMS",
    title: "LMS",
    description: "Manage employee leave requests, approvals, balances, and leave history with ease.",
    accent: "orange",
    getTo: () => "https://iconnect.euroland.com/",
    isAvailable: () => true,
    isExternal: true,
  },
  {
    id: "infozo",
    permissionAppId: 118,
    appCode: "INFOZO",
    title: "Infozo",
    description: "Centralize company information and important announcements.",
    accent: "teal",
    getTo: () => "https://infozo.euroland.com/home",
    isAvailable: () => true,
    isExternal: true,
  },
  {
    id: "autoiat",
    permissionAppId: 120,
    appCode: "AUTOIAT",
    title: "AutoIAT",
    description: "Automate IAT workflows and accelerate AI-assisted processing.",
    accent: "indigo",
    getTo: () => "https://autoiat-ai.euroland.com/",
    isAvailable: () => true,
    isExternal: true,
  },
  {
    id: "opifex",
    permissionAppId: 119,
    appCode: "OPIFEX",
    title: "Opifex",
    description: "Optimize workflows, automate processes, and drive efficiency.",
    accent: "pink",
    getTo: () => null,
    isExternal: true,
    isAvailable: () => true,
  },
];

export const getHubAppById = (appId) =>
  APPLICATION_HUB_APPS.find((app) => app.id === appId) || null;

/**
 * Hub UI + route gate: requires appPermission match and app.isAvailable.
 * Same source used by Application Hub cards and nav links.
 */
export const canOpenHubApp = (details, appOrId) => {
  const app = typeof appOrId === "string" ? getHubAppById(appOrId) : appOrId;
  if (!app || !details) return false;
  if (!userHasHubAppPermission(details, app)) return false;
  if (typeof app.isAvailable === "function" && !app.isAvailable(details)) {
    return false;
  }
  return true;
};

export const getApplicationHubNavLinks = (details) => {
  const links = [
    { clicked: false, to: "/home", label: "Application Hub", isExternal: false },
  ];

  APPLICATION_HUB_APPS.forEach((app) => {
    if (!canOpenHubApp(details, app)) return;
    const to = app.getTo(details);
    if (!to) return;
    links.push({
      clicked: false,
      to,
      label: app.title,
      appId: app.id,
      isExternal: Boolean(app.isExternal),
    });
  });

  return links;
};

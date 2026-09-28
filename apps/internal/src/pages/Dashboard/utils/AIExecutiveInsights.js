import { COLORS_VALUES, hexToRgba } from "../../../utils/dashboard";

/** Opaque white + theme tint — cards use rgba on a white parent; popups need a solid fill. */
const hexToTintedWhite = (hex, tint = 0.08) => {
  const cleanHex = hex?.replace("#", "");
  const bigint = parseInt(cleanHex ?? "000000", 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const blend = (channel) => Math.round(255 * (1 - tint) + channel * tint);
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
};

const buildToneVars = (prefix, color) => ({
  [`--ai-insight-${prefix}`]: color,
  [`--ai-insight-${prefix}-bg`]: hexToRgba(color, 0.08),
  [`--ai-insight-${prefix}-border`]: hexToRgba(color, 0.18),
  [`--ai-insight-${prefix}-icon-bg`]: hexToRgba(color, 0.14),
  [`--ai-insight-${prefix}-soft-bg`]: hexToRgba(color, 0.05),
  [`--ai-insight-${prefix}-cloud-shadow`]: hexToRgba(color, 0.16),
  [`--ai-insight-${prefix}-cloud-bg`]: hexToTintedWhite(color, 0.08),
});

export const getInsightCloudToneStyle = (themeStyle = {}, tone = "purple") => {
  const toneKey =
    tone === "risk" || tone === "warning" || tone === "success" || tone === "purple"
      ? tone
      : "purple";

  return {
    "--ai-insight-cloud-border": themeStyle[`--ai-insight-${toneKey}-border`],
    "--ai-insight-cloud-shadow": themeStyle[`--ai-insight-${toneKey}-cloud-shadow`],
    "--ai-insight-cloud-bg": themeStyle[`--ai-insight-${toneKey}-cloud-bg`],
    "--ai-insight-cloud-active": themeStyle[`--ai-insight-${toneKey}`],
    "--ai-insight-cloud-soft-bg": hexToTintedWhite(
      themeStyle[`--ai-insight-${toneKey}`],
      0.06,
    ),
    "--ai-insight-cloud-icon-bg": hexToTintedWhite(
      themeStyle[`--ai-insight-${toneKey}`],
      0.12,
    ),
    "--ai-insight-cloud-scrollbar": hexToTintedWhite(
      themeStyle[`--ai-insight-${toneKey}`],
      0.35,
    ),
  };
};

export const buildInsightThemeStyles = (dashboardMaterValue = []) => {
  const theme = COLORS_VALUES(dashboardMaterValue);
  const risk = theme.atRisk || "#e11d48";
  const warning = theme.needsAttention || "#d97706";
  const success = theme.healthy || "#0f9d74";
  const accent = theme.total || "#4F46E5";

  return {
    ...buildToneVars("risk", risk),
    ...buildToneVars("warning", warning),
    ...buildToneVars("success", success),
    ...buildToneVars("purple", accent),
    ...buildToneVars("accent", accent),
    "--ai-insight-cloud-border": hexToRgba(accent, 0.22),
    "--ai-insight-cloud-shadow": hexToRgba(accent, 0.16),
    "--ai-insight-cloud-scrollbar": hexToRgba(accent, 0.35),
    "--ai-insight-btn-border": hexToRgba(accent, 0.28),
    "--ai-insight-btn-bg": hexToRgba(accent, 0.06),
    "--ai-insight-btn-hover-bg": hexToRgba(accent, 0.12),
    "--ai-insight-btn-color": accent,
    "--ai-insight-btn-active-bg": accent,
    "--ai-insight-btn-active-shadow": hexToRgba(accent, 0.28),
    "--ai-insight-sparkle": accent,
    "--ai-insight-sparkle-soft": hexToRgba(accent, 0.55),
    "--ai-insight-section-active-shadow": hexToRgba(accent, 0.14),
  };
};

const mapSectionCard = (id, tone, title, section) => ({
  id,
  type: "section",
  tone,
  title,
  headline: section?.summary?.headline?.trim() || "",
  detail: section?.summary?.detail?.trim() || "",
  boards: section?.boards ?? [],
});

export const getWorkspaceRecommendationContext = (source, workspaceName) => {
  if (!source || !workspaceName) return null;

  const recommendationItem =
    source.recommendation?.items?.find((item) => item.workspace === workspaceName) ??
    null;

  const criticalBoards =
    source.critical_risk?.boards?.filter((board) => board.workspace === workspaceName) ??
    [];

  const bottleneckBoards =
    source.bottleneck?.boards?.filter((board) => board.workspace === workspaceName) ?? [];

  const topPerformerBoards =
    source.top_performer?.boards?.filter((board) => board.workspace === workspaceName) ??
    [];

  return {
    workspaceName,
    recommendationItem,
    criticalBoards,
    bottleneckBoards,
    topPerformerBoards,
  };
};

export const mapAIExecutiveInsightsToCards = (data) => {
  const source = Array.isArray(data) ? data[0] : data;
  if (!source) return [];

  return [
    mapSectionCard("critical-risk", "risk", "Critical Risk", source.critical_risk),
    mapSectionCard("delivery-health", "warning", "Delivery Health", source.bottleneck),
    mapSectionCard(
      "top-performer",
      "success",
      "Top Performing Workspace",
      source.top_performer,
    ),
    {
      id: "executive-recommendation",
      tone: "purple",
      title: "Executive Recommendation",
      type: "recommendation",
      recommendation: source.recommendation ?? { workspace_names: [], items: [] },
    },
  ];
};

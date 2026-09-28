const formatPct = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return `${Math.abs(num).toFixed(num % 1 === 0 ? 0 : 2)}%`;
};

const cardTrend = (card) => {
  const tone = String(card?.trendTone || card?.subTitle || "").toLowerCase();
  if (tone.includes("decreas") || tone.includes("down")) return "down";
  if (tone.includes("increas") || tone.includes("up")) return "up";
  return "flat";
};

const summarizeCards = (cards = []) =>
  cards
    .filter(Boolean)
    .map((card) => {
      const pct = formatPct(card?.percentage ?? card?.change);
      const trendLabel = card?.subTitle || card?.trendLabel || "";
      return `${card.title}: ${card.value ?? 0}${pct ? ` (${trendLabel || pct})` : trendLabel ? ` (${trendLabel})` : ""}`;
    });

export const buildKpiGroupInsight = (cards = [], entityLabel = "Orders") => {
  const list = Array.isArray(cards) ? cards : [];
  const created = list.find((c) => /creat/i.test(c?.id || c?.title || ""));
  const active = list.find((c) => /active/i.test(c?.id || c?.title || ""));
  const completed = list.find((c) => /complet/i.test(c?.id || c?.title || ""));
  const insights = summarizeCards(list);
  const trends = [created, active, completed].filter(Boolean).map(cardTrend);
  const trend =
    trends.includes("down") && !trends.includes("up")
      ? "down"
      : trends.includes("up") && !trends.includes("down")
        ? "up"
        : "flat";

  return {
    label: `${entityLabel} KPI Summary`,
    type: "kpi",
    trend,
    data: {
      exec: `Combined view of Created, Active, and Completed ${entityLabel.toLowerCase()} for the selected period.`,
      insights:
        insights.length > 0
          ? insights
          : [`No KPI values are available for this ${entityLabel.toLowerCase()} summary yet.`],
      trendText:
        trend === "up"
          ? "Overall KPI movement is leaning upward for this period."
          : trend === "down"
            ? "Overall KPI movement is leaning downward for this period."
            : "KPI movement is mixed or flat across the selected period.",
      risks: [
        completed && cardTrend(completed) === "down" && created && cardTrend(created) === "up"
          ? "Rising creation with falling completions can quickly grow backlog and overdue risk."
          : `Watch whether ${entityLabel.toLowerCase()} throughput keeps pace with intake.`,
      ],
      actions: [
        `Review the weakest KPI first, then confirm capacity on boards carrying the heaviest ${entityLabel.toLowerCase()} load.`,
      ],
      impact: `These KPIs drive the status signal for this ${entityLabel.toLowerCase()} dashboard and the boards shown beside them.`,
    },
  };
};

export const buildSectionInsight = ({
  id,
  label,
  type = "chart",
  trend = "flat",
  exec,
  insights = [],
  trendText,
  risks = [],
  actions = [],
  impact,
}) => ({
  id,
  label,
  type,
  trend,
  data: {
    exec:
      exec ||
      `${label} summarizes the selected dashboard period and highlights what stands out right now.`,
    insights:
      insights.length > 0
        ? insights
        : [`Review ${label} against the KPI strip to confirm whether volume and risk are aligned.`],
    trendText:
      trendText ||
      (trend === "up"
        ? "Recent movement is rising."
        : trend === "down"
          ? "Recent movement is declining."
          : "No strong directional move is visible in this view."),
    risks:
      risks.length > 0
        ? risks
        : [`If this view worsens while completions stay flat, escalate owners on the most exposed boards.`],
    actions:
      actions.length > 0
        ? actions
        : [`Use ${label} with the KPI summary to prioritize the next follow-up.`],
    impact:
      impact ||
      `${label} helps explain current delivery health and where attention should go next.`,
  },
});

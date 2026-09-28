import { COLORS_VALUES } from "../../../utils/dashboard";
import HealthySVGImage from "../Widget/Icons/HealthySVGImage";
import AtRiskSVGImage from "../Widget/Icons/AtRiskSVGImage";
import NeedsAttentionSVGImage from "../Widget/Icons/NeedsAttentionSVGImage";
import TotalIcon from "../Widget/Icons/TotalIcon";
import TotalActiveOutline from "../Widget/Icons/TotalActiveOutline";
import CompletedOutline from "../Widget/Icons/CompletedOutline";
import AtriskOutline from "../Widget/Icons/AtriskOutline";
import TotalOutline from "../Widget/Icons/TotalOutline";

export const getCardConfigKeyWord = (title) =>
  title
    ?.toLowerCase()
    ?.replace(/[^a-z0-9\s]/gi, "")
    ?.replace(/\s+/g, "_")
    ?.replace(/^_+|_+$/g, "");

export const getHealthConfig = (dashboardMaterValue) => ({
  total_workspace: {
    Icon: TotalIcon,
    color: COLORS_VALUES(dashboardMaterValue).healthy,
  },
  total_workspaces: {
    Icon: TotalIcon,
    color: COLORS_VALUES(dashboardMaterValue).healthy,
  },
  healthy: {
    Icon: HealthySVGImage,
    color: COLORS_VALUES(dashboardMaterValue).healthy,
  },
  healthy_workspaces: {
    Icon: HealthySVGImage,
    color: COLORS_VALUES(dashboardMaterValue).healthy,
  },
  needs_attention: {
    Icon: NeedsAttentionSVGImage,
    color: COLORS_VALUES(dashboardMaterValue).needsAttention,
  },
  at_risk: {
    Icon: AtRiskSVGImage,
    color: COLORS_VALUES(dashboardMaterValue).atRisk,
  },
});

export const getBoardHealthConfig = (dashboardMaterValue) => ({
  total_tasks_created: {
    Icon: TotalOutline,
    color: COLORS_VALUES(dashboardMaterValue).total,
  },
  total_active_tasks: {
    Icon: TotalActiveOutline,
    color: COLORS_VALUES(dashboardMaterValue).needsAttention,
  },
  total_tasks_completed: {
    Icon: CompletedOutline,
    color: COLORS_VALUES(dashboardMaterValue).healthy,
  },
  over_due: {
    Icon: AtriskOutline,
    color: COLORS_VALUES(dashboardMaterValue).atRisk,
  },
  overdue: {
    Icon: AtriskOutline,
    color: COLORS_VALUES(dashboardMaterValue).atRisk,
  },
  total_main_task: {
    Icon: TotalOutline,
    color: COLORS_VALUES(dashboardMaterValue).total,
  },
  total_sub_task: {
    Icon: TotalActiveOutline,
    color: COLORS_VALUES(dashboardMaterValue).needsAttention,
  },
  completed: {
    Icon: CompletedOutline,
    color: COLORS_VALUES(dashboardMaterValue).healthy,
  },
  at_risk: {
    Icon: AtriskOutline,
    color: COLORS_VALUES(dashboardMaterValue).atRisk,
  },
});

export const getDashboardCountCardMeta = (card, type, dashboardMaterValue) => {
  const keyWord = getCardConfigKeyWord(card?.title);
  const healthConfig = getHealthConfig(dashboardMaterValue);
  const boardHealthConfig = getBoardHealthConfig(dashboardMaterValue);
  const config = type === "worspace" ? healthConfig[keyWord] : boardHealthConfig[keyWord];

  const Icon = config?.Icon;
  const SubIcon = card?.Icon;
  const rawColor = config?.color;
  const color = rawColor
    ? rawColor.startsWith("#")
      ? rawColor
      : `#${rawColor}`
    : COLORS_VALUES(dashboardMaterValue).total;
  const hasSubTitle = card.subTitle !== null && card.subTitle !== undefined;
  const isOverdueCard = card.healthLabel === "Overdue";
  const trendColorMap = isOverdueCard
    ? {
        Increase: COLORS_VALUES(dashboardMaterValue).atRisk,
        Decrease: COLORS_VALUES(dashboardMaterValue).healthy,
      }
    : {
        Increase: COLORS_VALUES(dashboardMaterValue).healthy,
        Decrease: COLORS_VALUES(dashboardMaterValue).atRisk,
      };
  const subTitleColor = trendColorMap[card?.progressDirection] || "#4a5565";
  const cardTitle = card.healthLabel || card.title;
  const cardLabel = `${cardTitle}: ${card.value}`;

  return {
    Icon,
    SubIcon,
    color,
    hasSubTitle,
    subTitleColor,
    cardTitle,
    cardLabel,
  };
};

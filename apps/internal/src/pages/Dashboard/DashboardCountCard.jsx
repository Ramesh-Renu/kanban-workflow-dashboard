import React, { isValidElement, memo } from "react";
import AnimatedCounter from "../../components/common/AnimatedCounter";
import { hexToRgba } from "../../utils/dashboard";
import { getDashboardCountCardMeta } from "./utils/dashboardCountCardConfig";

const TrendSubIcon = ({ SubIcon, subTitleColor, size = "default" }) => {
  if (isValidElement(SubIcon)) return SubIcon;
  if (typeof SubIcon !== "function") return null;

  const isChart = size === "chart";
  return (
    <SubIcon
      color={subTitleColor}
      isTransparent={true}
      bgColor="transparent"
      needDivElement={false}
      style={
        isChart
          ? { verticalAlign: "-2px", width: "12px", height: "14px" }
          : { verticalAlign: "-2px", width: "13px", height: "15px" }
      }
    />
  );
};

const DashboardCountCardIcon = ({ Icon, card, color }) => {
  if (Icon) {
    return (
      <Icon
        color={color}
        isTransparent={true}
        bgColor="transparent"
        needDivElement={false}
      />
    );
  }
  if (card?.icon) {
    return <img src={card.icon} alt={`${card.title} icon`} />;
  }
  return null;
};

const DashboardCountCard = ({
  card,
  type,
  dashboardMaterValue,
  variant = "default",
  className = "",
  animationKey,
}) => {
  const { Icon, SubIcon, color, hasSubTitle, subTitleColor, cardTitle, cardLabel } =
    getDashboardCountCardMeta(card, type, dashboardMaterValue);

  if (variant === "chart") {
    return (
      <div className={`board-overdue-health-chart__count-card ${className}`.trim()}>
        <div
          className={`dashboard-count__dot dashboard-count__dot--${card.labelTone || "default"}`}
          style={{ backgroundColor: `${hexToRgba(color, 0.04)}` }}
        >
          <DashboardCountCardIcon Icon={Icon} card={card} color={color} />
        </div>
        <p className="board-overdue-health-chart__count-card-value">
          <span className="board-overdue-health-chart__count-card-value-value">
            {card.value}
          </span>
          <span className="board-overdue-health-chart__count-card-value-label">
            {card.healthLabel}
          </span>{" "}
        </p>
        <p
          className="board-overdue-health-chart__count-card-sub-title"
          style={{ color: subTitleColor }}
        >
          <TrendSubIcon SubIcon={SubIcon} subTitleColor={subTitleColor} size="chart" />{" "}
          <span>{card.subTitle}</span>
        </p>
      </div>
    );
  }
  const getFilteredSum = (key) => {
    return data?.[0]?.orderInfo?.[key] || "0";
  };

  return (
    <article
      key={card.id}
      className={`dashboard-count__card ${className}`.trim()}
      role="listitem"
      aria-label={cardLabel}
    >
      <div className="dashboard-count__card-head">
        <p className="dashboard-count__value">
          <AnimatedCounter
            targetValue={card.value}
            duration={3000}
            interval={10}
            animationKey={animationKey}
          />
        </p>
        <div
          className={`dashboard-count__dot dashboard-count__dot--${card.labelTone || "default"}`}
          style={{ backgroundColor: `${hexToRgba(color, 0.04)}` }}
        >
          <DashboardCountCardIcon Icon={Icon} card={card} color={color} />
        </div>
      </div>
      <p className="dashboard-count__title">{cardTitle}</p>
      {hasSubTitle && (
        <p className="dashboard-count__sub-title" style={{ color: subTitleColor }}>
          <TrendSubIcon SubIcon={SubIcon} subTitleColor={subTitleColor} />{" "}
          <span>{card.subTitle}</span>
        </p>
      )}
    </article>
  );
};

export default memo(DashboardCountCard);

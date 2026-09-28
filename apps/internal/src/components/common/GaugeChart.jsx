import React, { memo, useMemo } from "react";
import GaugeComponent from "react-gauge-component";

/**
 * Common reusable gauge built on react-gauge-component.
 * Supports a soft color-shadow layer behind a thin segmented rim (screenshot style).
 */
const GaugeChart = ({
  value = 0,
  minValue = 0,
  maxValue = 100,
  subArcs = [],
  type = "semicircle",
  pointerType = "arrow",
  pointerColor = "#0F172A",
  animationDuration = 2400,
  animate = true,
  hideTicks = true,
  renderValue,
  className = "",
  id,
  arcProps = {},
  pointerProps = {},
  labelsProps = {},
  style,
  emptyColor = "#E8EEF2",
  /** Soft gradient glow behind the thin colored rim */
  colorShadow = false,
  shadowColors = [],
  shadowWidth = 0.34,
}) => {
  const safeValue = Number.isFinite(value) ? value : 0;

  const rimArc = useMemo(
    () => ({
      width: 0.055,
      padding: 0.018,
      cornerRadius: 1,
      emptyColor,
      subArcs: Array.isArray(subArcs) ? subArcs : [],
      ...arcProps,
    }),
    [subArcs, emptyColor, arcProps],
  );

  const shadowArc = useMemo(() => {
    const colors =
      (shadowColors.length && shadowColors) ||
      (Array.isArray(subArcs) ? subArcs.map((a) => a.color).filter(Boolean) : []);

    return {
      width: shadowWidth,
      padding: 0,
      cornerRadius: 0,
      gradient: true,
      colorArray: colors.length ? colors : ["#FECACA", "#FDE68A", "#A7F3D0"],
      emptyColor: "transparent",
      subArcs: [],
      effects: {
        glow: true,
        glowBlur: 22,
        glowSpread: 10,
      },
    };
  }, [shadowColors, subArcs, shadowWidth]);

  const pointer = useMemo(
    () => ({
      type: pointerType,
      color: pointerColor,
      animate,
      elastic: false,
      animationDuration,
      animationDelay: 100,
      // Small triangle sitting on the inner edge of the thin rim
      width: 9,
      length: 0.28,
      arrowOffset: 0.62,
      strokeWidth: 0,
      hideGrabHandle: false,
      ...pointerProps,
    }),
    [pointerType, pointerColor, animate, animationDuration, pointerProps],
  );

  const hiddenPointer = useMemo(
    () => ({
      hide: true,
      animate: false,
    }),
    [],
  );

  const labels = useMemo(
    () => ({
      valueLabel: {
        hide: !renderValue,
        matchColorWithArc: false,
        contentWidth: 160,
        contentHeight: 88,
        offsetY: 6,
        ...(renderValue
          ? {
              renderContent: (currentValue, arcColor) =>
                renderValue(currentValue, arcColor),
            }
          : {}),
        ...(labelsProps.valueLabel || {}),
      },
      tickLabels: {
        hideMinMax: true,
        type: "outer",
        defaultTickLineConfig: { hide: hideTicks },
        defaultTickValueConfig: { hide: hideTicks },
        ticks: hideTicks ? [] : undefined,
        ...(labelsProps.tickLabels || {}),
      },
      ...labelsProps,
    }),
    [renderValue, hideTicks, labelsProps],
  );

  const hiddenLabels = useMemo(
    () => ({
      valueLabel: { hide: true },
      tickLabels: {
        hideMinMax: true,
        defaultTickLineConfig: { hide: true },
        defaultTickValueConfig: { hide: true },
        ticks: [],
      },
    }),
    [],
  );

  return (
    <div
      className={`orion-gauge-chart${colorShadow ? " orion-gauge-chart--shadow" : ""} ${className}`.trim()}
      style={style}
    >
      {colorShadow ? (
        <div className="orion-gauge-chart__shadow" aria-hidden="true">
          <GaugeComponent
            id={id ? `${id}-shadow` : undefined}
            type={type}
            value={safeValue}
            minValue={minValue}
            maxValue={maxValue}
            arc={shadowArc}
            pointer={hiddenPointer}
            labels={hiddenLabels}
            style={{ width: "100%" }}
          />
        </div>
      ) : null}

      <div className="orion-gauge-chart__rim">
        <GaugeComponent
          id={id}
          type={type}
          value={safeValue}
          minValue={minValue}
          maxValue={maxValue}
          arc={rimArc}
          pointer={pointer}
          labels={labels}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
};

export default memo(GaugeChart);

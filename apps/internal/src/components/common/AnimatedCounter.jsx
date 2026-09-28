import React, { useEffect, useMemo, useRef, useState } from "react";

const DIGIT_SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SPIN_CYCLES = 2;

const ODOMETER_STYLES = `
.animated-counter {
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.animated-counter__digits {
  display: inline-flex;
  align-items: baseline;
}
.animated-counter__digit {
  display: inline-block;
  height: 1em;
  overflow: hidden;
  position: relative;
  line-height: 1;
  vertical-align: bottom;
  min-width: 1ch;
  text-align: center;
}
.animated-counter__digit-strip {
  display: flex;
  flex-direction: column;
  will-change: transform;
}
.animated-counter__digit-num {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1em;
  line-height: 1;
}
`;

let stylesInjected = false;
const injectOdometerStyles = () => {
  if (stylesInjected || typeof document === "undefined") return;
  const existing = document.getElementById("animated-counter-odometer-styles");
  if (existing) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement("style");
  style.id = "animated-counter-odometer-styles";
  style.textContent = ODOMETER_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
};

const toSafeNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
};

const RollingDigit = ({ fromDigit, toDigit, duration, delay, spinKey }) => {
  const [offset, setOffset] = useState(fromDigit);
  const [animate, setAnimate] = useState(false);

  const stripItems = useMemo(() => {
    const items = [];
    for (let cycle = 0; cycle <= SPIN_CYCLES; cycle += 1) {
      items.push(...DIGIT_SEQUENCE);
    }
    return items;
  }, []);

  useEffect(() => {
    setAnimate(false);
    setOffset(fromDigit);

    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        // Roll upward through full cycles, then land on the target digit
        setOffset(SPIN_CYCLES * 10 + toDigit);
        setAnimate(true);
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [fromDigit, toDigit, spinKey]);

  return (
    <span className="animated-counter__digit" aria-hidden="true">
      <span
        className="animated-counter__digit-strip"
        style={{
          transform: `translate3d(0, -${offset}em, 0)`,
          transition: animate
            ? `transform ${duration}ms cubic-bezier(0.16, 0.84, 0.22, 1) ${delay}ms`
            : "none",
        }}
      >
        {stripItems.map((n, i) => (
          <span className="animated-counter__digit-num" key={`${spinKey}-${i}`}>
            {n}
          </span>
        ))}
      </span>
    </span>
  );
};

const AnimatedCounter = ({
  targetValue,
  prefix = "",
  suffix = "",
  duration = 2000,
  interval = 10,
  animationKey,
}) => {
  const [spinKey, setSpinKey] = useState(0);
  const [fromValue, setFromValue] = useState(0);
  const [toValue, setToValue] = useState(() => toSafeNumber(targetValue));
  const previousValueRef = useRef(0);
  const isFirstRenderRef = useRef(true);

  const safeTarget = useMemo(() => toSafeNumber(targetValue), [targetValue]);

  const digitPairs = useMemo(() => {
    const maxLen = Math.max(String(fromValue).length, String(toValue).length, 1);
    const fromDigits = String(fromValue).padStart(maxLen, "0").split("").map(Number);
    const toDigits = String(toValue).padStart(maxLen, "0").split("").map(Number);
    return fromDigits.map((fromDigit, index) => ({
      fromDigit,
      toDigit: toDigits[index],
    }));
  }, [fromValue, toValue]);

  useEffect(() => {
    injectOdometerStyles();
  }, []);

  useEffect(() => {
    const previous = previousValueRef.current;
    setFromValue(isFirstRenderRef.current ? 0 : previous);
    setToValue(safeTarget);
    setSpinKey((key) => key + 1);
    previousValueRef.current = safeTarget;
    isFirstRenderRef.current = false;
  }, [safeTarget, animationKey]);

  // Keep `interval` in the API: use it as a per-digit stagger (scaled so small values still cascade).
  const staggerMs = Math.max(interval, 1) * 12;

  return (
    <span
      className="animated-counter"
      aria-label={`${prefix}${safeTarget}${suffix}`}
    >
      {prefix}
      <span className="animated-counter__digits" aria-hidden="true">
        {digitPairs.map(({ fromDigit, toDigit }, index) => (
          <RollingDigit
            key={`${spinKey}-${index}-${digitPairs.length}`}
            fromDigit={fromDigit}
            toDigit={toDigit}
            duration={duration}
            delay={index * staggerMs}
            spinKey={spinKey}
          />
        ))}
      </span>
      {suffix}
    </span>
  );
};

export default AnimatedCounter;

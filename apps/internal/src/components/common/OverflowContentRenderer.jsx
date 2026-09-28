import { useEffect, useState } from "react";

const OverflowContentRenderer = ({
  multi,
  labelField = "name",
  values = [],
  containerRef, // Receive ref from parent
}) => {
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (containerRef?.current) {
      const hasOverflow =
        containerRef.current.scrollWidth > containerRef.current.clientWidth;
      setIsOverflowing(hasOverflow);
    }
  }, [values, containerRef]);

  if (!multi || values.length === 0 || !containerRef?.current) return null;

  const selectedLabels = values
    .map((item) => item?.[labelField] ?? "")
    .filter(Boolean);
  const displayText = selectedLabels.join(", ");
  return (
    <>
      {isOverflowing && (
        <div className="custom-tooltip-box">
          {displayText}
          <span className="css-arrow"></span>
        </div>
      )}
    </>
  );
};
export default OverflowContentRenderer;

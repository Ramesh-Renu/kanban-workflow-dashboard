const SkeletonBone = ({
  className = "",
  style,
  width,
  height,
  borderRadius,
}) => {
  const boneStyles = {
    ...(width ? { width } : null),
    ...(height ? { height } : null),
    ...(borderRadius ? { borderRadius } : null),
    ...style,
  };

  return (
    <div
      className={`loading-skeleton loading-skeleton--bone${className ? ` ${className}` : ""}`}
      style={boneStyles}
      aria-hidden
    />
  );
};

const SkeletonLoading = ({
  justifyContent = "flex-start",
  alignItems = "center",
  flexDirection = "column",
  flexWrap = "nowrap",
  count = 1,
  height,
  width,
  borderRadius,
  margin,
  gap,
}) => {
  const containerStyles = {
    width: "100%",
    height: "100%",
    borderRadius: "8px",
    display: "flex",
    justifyContent,
    alignItems,
    flexDirection,
    gap: gap ? gap : "10px",
    flexWrap,
    margin: margin ? margin : "0 auto 10px",
  };

  const skeletonStyles = {
    ...(height ? { height } : null),
    ...(width ? { width } : null),
    ...(borderRadius ? { borderRadius } : null),
  };

  return (
    <div className="loading-skeleton-container" style={containerStyles}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="loading-skeleton" style={skeletonStyles} />
      ))}
    </div>
  );
};

export { SkeletonBone };
export default SkeletonLoading;

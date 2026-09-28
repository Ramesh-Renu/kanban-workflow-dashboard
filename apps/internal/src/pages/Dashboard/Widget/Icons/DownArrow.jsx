import React from "react";

const DownArrow = ({
  color,
  style,
  commonPlaceIconsStyle,
  bgColor = "white",
  needDivElement = false,
}) => {
  const svgString = `
<svg width="8" height="10" viewBox="0 0 8 10" fill="${bgColor}" xmlns="http://www.w3.org/2000/svg">
<path d="M4.8877 4.64941H7.58496L3.79297 10L0 4.64941H2.69434V0H4.8877V4.64941Z" fill="${color}"/>
</svg>
  `.trim();
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  return (
    <>
      {needDivElement ? (
        <div className="trend-item__icon" style={commonPlaceIconsStyle}>
          <img src={svgDataUrl} style={style} alt="svg icon" />
        </div>
      ) : (
        <img src={svgDataUrl} style={style} alt="svg icon" />
      )}
    </>
  );
};
export default DownArrow;

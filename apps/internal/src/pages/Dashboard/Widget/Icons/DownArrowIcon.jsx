import React from "react";

const DownArrowIcon = ({
  color,
  style,
  commonPlaceIconsStyle,
  bgColor = "white",
  needDivElement = true,
}) => {
  const svgString =`<svg width="13" height="7" viewBox="0 0 13 7" fill="${bgColor}" xmlns="http://www.w3.org/2000/svg">
<path d="M0.871094 0.871094L6.09837 6.09837L11.3256 0.871094" stroke="${color}" stroke-width="1.74242" stroke-linecap="round" stroke-linejoin="round"/>
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
export default DownArrowIcon;

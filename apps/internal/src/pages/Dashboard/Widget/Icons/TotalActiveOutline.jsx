import React from "react";

const TotalActiveOutline = ({
  color,
  style,
  commonPlaceIconsStyle,
  bgColor = "white",
  needDivElement = true,
}) => {
  const svgString = `<svg width="20" height="20" viewBox="0 0 20 20" fill="${bgColor}" xmlns="http://www.w3.org/2000/svg">
<path d="M7.49935 1.66797H12.4993C12.9596 1.66797 13.3327 2.04106 13.3327 2.5013V4.16797C13.3327 4.62821 12.9596 5.0013 12.4993 5.0013H7.49935C7.03911 5.0013 6.66602 4.62821 6.66602 4.16797V2.5013C6.66602 2.04106 7.03911 1.66797 7.49935 1.66797V1.66797" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.334 3.33203H15.0007C15.9211 3.33203 16.6673 4.07822 16.6673 4.9987V16.6654C16.6673 17.5858 15.9211 18.332 15.0007 18.332H5.00065C4.08018 18.332 3.33398 17.5858 3.33398 16.6654V4.9987C3.33398 4.07822 4.08018 3.33203 5.00065 3.33203H6.66732" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.5 11.6667L9.16667 13.3333L12.5 10" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
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
export default TotalActiveOutline;

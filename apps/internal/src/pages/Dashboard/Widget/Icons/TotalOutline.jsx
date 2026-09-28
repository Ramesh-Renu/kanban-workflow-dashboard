import React from "react";

const TotalOutline = ({
  color,
  style,
  commonPlaceIconsStyle,
  bgColor = "white",
  needDivElement = true,
}) => {
  const svgString = `
<svg width="20" height="20" viewBox="0 0 20 20" fill="${bgColor}" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_6613_19586)">
<path d="M10.692 1.81827C10.2527 1.61787 9.74805 1.61787 9.30871 1.81827L2.16704 5.06827C1.8649 5.20149 1.66992 5.50055 1.66992 5.83077C1.66992 6.16098 1.8649 6.46004 2.16704 6.59327L9.31704 9.8516C9.75638 10.052 10.261 10.052 10.7004 9.8516L17.8504 6.6016C18.1525 6.46837 18.3475 6.16931 18.3475 5.8391C18.3475 5.50889 18.1525 5.20982 17.8504 5.0766L10.692 1.81827" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1.66602 10C1.66521 10.3255 1.85397 10.6216 2.14935 10.7583L9.31602 14.0167C9.753 14.2145 10.254 14.2145 10.691 14.0167L17.841 10.7667C18.1424 10.6312 18.3353 10.3304 18.3327 10" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1.66602 14.168C1.66521 14.4934 1.85397 14.7896 2.14935 14.9263L9.31602 18.1846C9.753 18.3825 10.254 18.3825 10.691 18.1846L17.841 14.9346C18.1424 14.7992 18.3353 14.4984 18.3327 14.168" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_6613_19586">
<rect width="20" height="20" fill="${color}"/>
</clipPath>
</defs>
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
export default TotalOutline;

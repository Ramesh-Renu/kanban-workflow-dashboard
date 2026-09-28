import React from "react";

const TotalTaskSubTastk = ({
  color,
  style,
  commonPlaceIconsStyle,
  bgColor = "white",
  needDivElement = true,
}) => {
  const svgString = `
<svg width="20" height="20" viewBox="0 0 20 20" fill="${bgColor}" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_5936_44787)">
<path d="M18.3337 10.0013H16.267C15.9028 10.0005 15.5484 10.1191 15.2579 10.3388C14.9675 10.5585 14.757 10.8673 14.6587 11.218L12.7003 18.1846C12.6877 18.2279 12.6614 18.2659 12.6253 18.293C12.5893 18.32 12.5454 18.3346 12.5003 18.3346C12.4552 18.3346 12.4114 18.32 12.3753 18.293C12.3393 18.2659 12.3129 18.2279 12.3003 18.1846L7.70033 1.81797C7.6877 1.77469 7.66139 1.73668 7.62533 1.70964C7.58926 1.68259 7.5454 1.66797 7.50033 1.66797C7.45525 1.66797 7.41139 1.68259 7.37533 1.70964C7.33926 1.73668 7.31295 1.77469 7.30033 1.81797L5.34199 8.78464C5.24405 9.13393 5.03481 9.44173 4.74605 9.66131C4.45728 9.88089 4.10476 10.0003 3.74199 10.0013H1.66699" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_5936_44787">
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
export default TotalTaskSubTastk;

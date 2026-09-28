import React from "react";

const AtriskOutline = ({
  color,
  style,
  commonPlaceIconsStyle,
  bgColor = "white",
  needDivElement = true,
}) => {
  const svgString =
`<svg width="20" height="20" viewBox="0 0 20 20" fill="${bgColor}" xmlns="http://www.w3.org/2000/svg">
<path d="M18.109 14.9999L11.4423 3.3332C11.1464 2.81101 10.5926 2.48828 9.99234 2.48828C9.39213 2.48828 8.83828 2.81101 8.54234 3.3332L1.87567 14.9999C1.57658 15.5178 1.578 16.1564 1.87938 16.673C2.18076 17.1897 2.73589 17.5052 3.33401 17.4999H16.6673C17.2625 17.4993 17.8121 17.1813 18.1094 16.6658C18.4067 16.1502 18.4066 15.5153 18.109 14.9999" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 7.5V10.8333" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 14.168H10.0083" stroke="${color}" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
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
export default AtriskOutline;

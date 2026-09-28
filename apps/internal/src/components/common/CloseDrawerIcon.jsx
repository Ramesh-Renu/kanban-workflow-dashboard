import React from "react";

const CloseDrawerIcon = ({
  color,
  style,
  commonPlaceIconsStyle,
  bgColor = "white",
  needDivElement = false,
}) => {
  const svgString =
    `<svg width="72" height="300" viewBox="0 0 72 300" fill="${bgColor}" xmlns="http://www.w3.org/2000/svg">
<path d="M69.7929 300V255.437C69.7929 235.875 62.3845 217.039 49.0582 202.718C21.412 173.01 21.412 126.99 49.0582 97.2816C62.3845 82.9611 69.7929 64.1251 69.7929 44.5632V0H72L72 300H69.7929Z" fill="${bgColor}"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M52.3798 141.548C52.6727 141.255 53.1476 141.255 53.4405 141.548L59.9605 148.068C61.0234 149.131 61.0234 150.866 59.9605 151.928L53.4405 158.448C53.1476 158.741 52.6727 158.741 52.3798 158.448C52.0869 158.156 52.0869 157.681 52.3798 157.388L58.8998 150.868C59.3769 150.391 59.3769 149.606 58.8998 149.128L52.3798 142.608C52.0869 142.316 52.0869 141.841 52.3798 141.548Z" fill="${color}"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M45.3798 141.548C45.6727 141.255 46.1476 141.255 46.4405 141.548L52.9605 148.068C54.0234 149.131 54.0234 150.866 52.9605 151.928L46.4405 158.448C46.1476 158.741 45.6727 158.741 45.3798 158.448C45.0869 158.156 45.0869 157.681 45.3798 157.388L51.8998 150.868C52.3769 150.391 52.3769 149.606 51.8998 149.128L45.3798 142.608C45.0869 142.316 45.0869 141.841 45.3798 141.548Z" fill="${color}"/>
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
export default CloseDrawerIcon;

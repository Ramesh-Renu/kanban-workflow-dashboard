import React, { useEffect, useRef, useState, Fragment } from "react";

const ShowMoreLessElement = ({
  initialDivHeight,
  gettingElements,
  customClass,
  buttonAlign,
}) => {
  const divRef = useRef(null);
  const [divHeight, setDivHeight] = useState();
  const [showLess, setShowLess] = useState(false);
  const [showMorebtn, setShowMorebtn] = useState(false);

  // Set initial height
  useEffect(() => {
    setDivHeight(initialDivHeight ? initialDivHeight + "px" : "70px");
  }, [initialDivHeight]);

  // ResizeObserver for dynamic content height detection
  useEffect(() => {
    const checkHeight = () => {
      if (divRef?.current?.scrollHeight > parseInt(initialDivHeight)) {
        setShowMorebtn(true);
      } else {
        setShowMorebtn(false);
      }
    };

    const observer = new ResizeObserver(() => {
      checkHeight();
    });

    if (divRef?.current) {
      observer.observe(divRef.current);
    }

    // Fallback initial check with slight delay
    const timeout = setTimeout(checkHeight, 100);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [gettingElements, initialDivHeight]);

  // Style when content is collapsed or expanded
  const descripDivStyle = {
    maxHeight: `${divHeight}`,
    overflow: "hidden",
    transition: "max-height 0.4s ease-in-out",
  };

  // Toggle expand/collapse
  const showMoreLess = () => {
    const isExpanded = !showLess;
    setShowLess(isExpanded);
    setDivHeight(
      isExpanded
        ? `${divRef?.current?.scrollHeight}px`
        : `${initialDivHeight}px`
    );
  };

  return (
    <Fragment>
      {gettingElements && (
        <div
          className={`showMoreLess-content ${customClass || ""}`}
          style={descripDivStyle}
          ref={divRef}
        >
          {gettingElements}
        </div>
      )}
      {showMorebtn && (
        <button
          className={`showMoreButton ${buttonAlign || "left"}`}
          onClick={showMoreLess}
        >
          {showLess ? "Show Less" : "Show More"}
        </button>
      )}
    </Fragment>
  );
};

export default ShowMoreLessElement;

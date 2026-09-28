import React from "react";

export const BellIcons = () => {
  return (
    <div className="bell-wrapper">
      <div className="bell-cover">
        <div className="bell-icon">
          <div className="bell-top"></div>
          <div className="bell-middle">
            <div className="bell-curve bell-left-curve"></div>
            <div className="bell-curve bell-right-curve"></div>
          </div>
          <div className="bell-bottom"></div>
          <div className="bell-clapper"></div>
        </div>
      </div>
    </div>
  );
};
export const SwitchingWorkspace = ({ onClick }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e); // Call the prop if provided
  };

  return (
    <div
      className="switching_box"
      title="Switching Workspace"
      onClick={handleClick}
    >
      <div className="switching_workspace">
        <div className="bars">
          <span className="bar-circle"></span>
        </div>
        <div className="bars">
          <span className="bar-circle right"></span>
        </div>
      </div>
    </div>
  );
};

export const ArrowToggle = ({ onClick, type = "right" }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e); // Call the prop if provided
  };
  return (
    <div
      className={`arrow ${type}`}
      title={`${type}`}
      onClick={handleClick}
    ></div>
  );
};

export const ClockDueDate = ({ onClick, customClass, customColor }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e); // Call the prop if provided
  };
  return (
    <div
      className={`clock_duedate ${customClass}`}
      style={{ borderColor: customColor }}
      onClick={handleClick}
    >
      <p className="clock_needle"></p>
      <p className="clock_button"></p>
    </div>
  );
};

export const CommentsIcon = ({ onClick }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e); // Call the prop if provided
  };
  return (
    <div className="comments-icon-content" onClick={handleClick}>
      <span className="comments-lines"></span>
      <span className="comments-lines"></span>
      <span className="arrow-after"></span>
    </div>
  );
};

export const ToolListIcon = ({ onClick, customClass }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e);
  };
  return (
    <div className="tool_list_icon" onClick={handleClick}>
      <p className={`tool_list_box ${customClass}`}></p>
      <p className={`tool_list_box ${customClass}`}></p>
    </div>
  );
};

export const TimerClockIcon = ({ onClick }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e);
  };
  return (
    <div className="timer_clock">
      <p className="timer_needle_one"></p>
      <p className="timer_needle_two"></p>
    </div>
  );
};

export const PaperClipIcon = ({ onClick }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e);
  };
  return (
    <div className="paperclip" onClick={handleClick}>
      <p className="paperclip-before"></p>
      <p className="paperclip-inner"></p>
      <p className="paperclip-after"></p>
    </div>
  );
};

export const DescriptionIcon = ({ onClick }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e);
  };
  return (
    <div className="description-icon-content" onClick={handleClick}>
      <span className="description-lines"></span>
      <span className="description-lines"></span>
      <span className="description-lines-short"></span>
      <span className="tick-mark"></span>
    </div>
  );
};

export const PauseIcon = ({ onClick }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e);
  };
  return (
    <div className="pause-icon-content" onClick={handleClick}>
      <span className="pause-lines"></span>
      <span className="pause-lines"></span>
    </div>
  );
};

export const VersionStackedIcon = ({ onClick }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e);
  };
  return (
    <div className="version-stacked-icon" onClick={handleClick}>
      <span className="version-lines"></span>
      <span className="version-lines"></span>
    </div>
  );
};

export const CloseHtmlIcon = ({ onClick, tabIndex, id, }) => {
  const handleClick = (e) => {
    if (onClick) onClick(e);
  };
  return (
    <span className="icon-close" id={id} tabIndex={tabIndex} onClick={handleClick} onKeyDown={handleClick}>
      {/* <span className="line-1"></span>
      <span className="line-2"></span> */}
    </span>
  );
};

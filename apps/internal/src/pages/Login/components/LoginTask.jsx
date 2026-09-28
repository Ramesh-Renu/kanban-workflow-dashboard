import React from "react";
import "./loginSlide4.scss";

import {
  slide4TopRight,
  slide2BottomLeft,
} from "../../../assets/images/loginpage";

//isActive is the slide is shown or not
//isPaused is animation is pause or not
//aria-hidden is used for screen readers 
function LoginSlide4({ isActive, isPaused }) {
  return (
    <div
      className={`page ${isActive ? "is-active" : ""} ${
        isPaused ? "is-paused" : ""
      }`}
      aria-hidden={!isActive}
    >
      <div className="dashboard">

        {/* Top floating tasks */}
        <div className="task task1">
          <span className="check">✓</span>
          <span>Boost top-performing post</span>
        </div>

        <div className="task task2">
          <div className="diamond"/>
          <span className="check">✓</span>
          <span>Export assets for dev handoff</span>
        </div>

        <div className="task task3">
          <span className="check">✓</span>
          <span>Schedule X posts</span>
        </div>

        {/* Clock */}
        <div className="clock">
          <img src={slide4TopRight} alt="Clock" />
        </div>

        {/* Main box */}
        <div className="main-box">
          <button type="button" className="plus">
            +
          </button>
          <h1>Today's Task</h1>

          <div className="progress-info">
            <span>Progress</span>
            <span className="percentage">70%</span>
          </div>

          <div className="progress">
            {Array.from({ length: 60 }).map((_, index) => (
              <span
                key={index}
                className={index < 35 ? "active" : ""}
              />
            ))}
          </div>
        </div>

        {/* Bottom notification */}
        <div className="notification">
          <div className="user-info">
            <img src={slide2BottomLeft} alt="Kimai" />
            <strong>Kimai</strong>
            <small>Time sheet</small>
          </div>
          <span className="new">New</span>
        </div>
      </div>
    </div>
  );
}

export default LoginSlide4;


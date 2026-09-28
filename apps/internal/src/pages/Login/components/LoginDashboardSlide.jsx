import React from "react";
import { tinyIcon, slide2BottomLeft } from "../../../assets/images/loginpage";

const DASHBOARD_BARS = [
  { label: "Mon", value: 186, height: 54, growClass: "dashboard-bar-grow-at-30", valueClass: "dashboard-bar-value-at-30" },
  { label: "Tue", value: 305, height: 92, growClass: "dashboard-bar-grow-at-36", valueClass: "dashboard-bar-value-at-36" },
  { label: "Wed", value: 237, height: 72, growClass: "dashboard-bar-grow-at-42", valueClass: "dashboard-bar-value-at-42" },
  { label: "Thu", value: 73, height: 25, growClass: "dashboard-bar-grow-at-48", valueClass: "dashboard-bar-value-at-48" },
  { label: "Fri", value: 209, height: 63, growClass: "dashboard-bar-grow-at-54", valueClass: "dashboard-bar-value-at-54" },
  { label: "Sat", value: 214, height: 66, growClass: "dashboard-bar-grow-at-60", valueClass: "dashboard-bar-value-at-60" },
];

export default function LoginDashboardSlide({
  isActive,
  isPaused,
  animationsEnabled = true,
}) {
  return (
    <div
      className={`login-dashboard-slide${isActive ? " is-active" : ""}${
        isPaused ? " is-paused" : ""
      }${animationsEnabled ? "" : " is-static"}`}
      aria-hidden={!isActive}
    >
      <div className="login-dashboard-slide__card">
        <div className="login-dashboard-slide__header dashboard-stagger-item dashboard-reveal-at-18">
          <div className="login-dashboard-slide__header-copy">
            <span className="login-dashboard-slide__header-icon" aria-hidden="true" />
            <span>Same-date month-to-date comparison</span>
          </div>
          <span className="login-dashboard-slide__header-pill">Last Month</span>
        </div>
        <div className="login-dashboard-slide__title-block dashboard-stagger-item dashboard-reveal-at-24">
          <h3 className="login-dashboard-slide__title">Workspace Health Overview</h3>
          <p className="login-dashboard-slide__subtitle">Monday - Friday</p>
        </div>
        <div className="login-dashboard-slide__chart dashboard-stagger-item dashboard-reveal-at-24">
          {DASHBOARD_BARS.map((bar) => (
            <div key={bar.label} className="login-dashboard-slide__bar">
              <span className={`login-dashboard-slide__bar-value ${bar.valueClass}`}>
                {bar.value}
              </span>
              <div className="login-dashboard-slide__bar-track">
                <div
                  className={`login-dashboard-slide__bar-fill ${bar.growClass}`}
                  style={{ "--bar-height": `${bar.height}px` }}
                />
              </div>
              <span className="login-dashboard-slide__bar-label">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="login-dashboard-slide__float login-dashboard-slide__float--left dashboard-stagger-item dashboard-float-left">
        <img src={tinyIcon} alt="" className="login-dashboard-slide__float-icon" />
      </div>
      <div className="login-dashboard-slide__float login-dashboard-slide__float--right dashboard-stagger-item dashboard-float-right">
        <img
          src={slide2BottomLeft}
          alt=""
          className="login-dashboard-slide__float-icon"
        />
        <div className="login-dashboard-slide__float-copy">
          <strong>Dashboard</strong>
          <span>IR Tool · Website</span>
        </div>
        <span className="login-dashboard-slide__float-status">Healthy</span>
      </div>
    </div>
  );
}

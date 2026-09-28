import React from "react";
import { slide2BottomLeft } from "../../../assets/images/loginpage";

const TOP_TASKS = [
  { className: "task-3", label: "Schedule X posts.", revealAt: 32 },
  { className: "task-2", label: "Export assets for dev handoff.", revealAt: 42 },
  { className: "task-1", label: "Boost top-performing post", revealAt: 54 },
];

const PROGRESS_SEGMENT_COUNT = 48;
const PROGRESS_COMPLETE_COUNT = 34;

function TaskCheckIcon() {
  return (
    <span className="task-check" aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false">
        <path
          d="M4.2 8.2L6.7 10.7L11.8 5.4"
          fill="none"
          stroke="white"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ClockIcon() {
  return (
    <svg
      className="clock-button__icon"
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="7.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M12 8.2V12.2L15.1 14.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginTaskSlide({ isActive, isPaused, animationsEnabled = true }) {
  return (
    <div
      className={`login-task-slide${isActive ? " is-active" : ""}${
        isPaused ? " is-paused" : ""
      }${animationsEnabled ? "" : " is-static"}`}
      aria-hidden={!isActive}
    >
      <div className="login-task-slide__frame">
        <div className="task-widget">
          <div className="task-widget-bg" />
          <div
            className="gradient-box gradient-box--left task-stagger-item task-reveal-from-top task-reveal-at-16"
            aria-hidden="true"
          />
          <div
            className="gradient-box gradient-box--right task-stagger-item task-reveal-from-top task-reveal-at-16"
            aria-hidden="true"
          />

          {TOP_TASKS.map((task) => (
            <div
              key={task.className}
              className={`top-task ${task.className} task-stagger-item task-from-box task-reveal-at-${task.revealAt}`}
            >
              <TaskCheckIcon />
              <span className="top-task-label">{task.label}</span>
            </div>
          ))}

          <div className="today-task-clip">
            <div className="today-task-card task-stagger-item task-reveal-from-top task-reveal-at-24">
              <div className="today-task-header">
                <h3 className="today-task-title">Today&apos;s Task</h3>
                <button
                  type="button"
                  className="plus-button"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  +
                </button>
              </div>

              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">Progress</span>
                  <span className="progress-value">70%</span>
                </div>
                <div className="progress-bar">
                  {Array.from({ length: PROGRESS_SEGMENT_COUNT }, (_, index) => (
                    <span
                      key={`progress-segment-${index}`}
                      className={`progress-segment${
                        index < PROGRESS_COMPLETE_COUNT ? " is-complete" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="clock-button task-stagger-item task-reveal-from-top task-reveal-at-16"
            tabIndex={-1}
            aria-hidden="true"
          >
            <ClockIcon />
          </button>

          <div className="timesheet-card task-stagger-item task-reveal-from-left-bottom task-reveal-at-52">
            <img
              src={slide2BottomLeft}
              alt=""
              className="login-workspace-slide__globe-icon"
              aria-hidden="true"
            />
            <div className="timesheet-copy">
              <span className="timesheet-brand">Kimai</span>
              <span className="timesheet-label">Time sheet</span>
            </div>
            <span className="new-badge">New</span>
          </div>
        </div>
      </div>
    </div>
  );
}

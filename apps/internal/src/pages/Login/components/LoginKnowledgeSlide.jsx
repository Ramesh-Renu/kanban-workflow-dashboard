import React from "react";
import {
  financialCalendar,
  shareAnalysis,
  announcementsandEvents,
  knowledgeBase,
  keyFigures,
  boardOfDirectors,
  dividendsOverview,
  slide3TopRight,
} from "../../../assets/images/loginpage";

export default function LoginKnowledgeSlide({
  isActive,
  isPaused,
  animationsEnabled = true,
}) {
  return (
    <div
      className={`login-knowledge-slide${isActive ? " is-active" : ""}${
        isPaused ? " is-paused" : ""
      }${animationsEnabled ? "" : " is-static"}`}
      aria-hidden={!isActive}
    >
    
      <div className="login-knowledge-slide__frame">
        <div className="slide-3-top-right-container kb-stagger-item kb-reveal-at-28">
          <img src={slide3TopRight} alt="" className="slide-3-top-right" />
        </div>
        <div className="knowledge-base">
          <div className="knowledge-card top card-calendar kb-stagger-item kb-reveal-at-16">
            <div className="card-icon">
              <img src={financialCalendar} alt="" />
            </div>
            <div className="card-title">Financial Calendar</div>
          </div>

          <div className="knowledge-card top card-share kb-stagger-item kb-reveal-at-40">
            <div className="card-icon">
              <img src={shareAnalysis} alt="" />
            </div>
            <div className="card-title">Share Analysis</div>
          </div>

          <div className="knowledge-card top card-announcements kb-stagger-item kb-reveal-at-52">
            <div className="card-icon">
              <img src={announcementsandEvents} alt="" />
            </div>
            <div className="card-title">Announcements and E...</div>
          </div>

          <div className="knowledge-card card-knowledge kb-stagger-item kb-reveal-at-64">
            <div className="card-icon">
              <img src={knowledgeBase} alt="" />
            </div>
            <div className="card-title">Knowledge Base</div>
            <button type="button" className="tools-button" tabIndex={-1}>
              All tools
            </button>
          </div>

          <div className="knowledge-card bottom card-figures kb-stagger-item kb-reveal-at-52">
            <div className="card-icon">
              <img src={keyFigures} alt="" />
            </div>
            <div className="card-title">Key Figures</div>
          </div>

          <div className="knowledge-card bottom card-directors kb-stagger-item kb-reveal-at-40">
            <div className="card-icon">
              <img src={boardOfDirectors} alt="" />
            </div>
            <div className="card-title">Board of Directors</div>
          </div>

          <div className="knowledge-card bottom card-dividends kb-stagger-item kb-reveal-at-28">
            <div className="card-icon">
              <img src={dividendsOverview} alt="" />
            </div>
            <div className="card-title">
              Dividends
              <br />
              Overview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import {
  slide2LeftTop,
  slide2BottomLeft,
  slide2Middle,
  slide3TopRight,
  slide4TopRight,
} from "../../../assets/images/loginpage";

const SLIDE_CONFIG = {
  workspace: {
    floatLeft: true,

    top: {
      icon: "calendar",

      title: "Workspace",

      meta: "IR Tool · Website",
    },

    bottom: {
      icon: "globe",

      title: "Knowledge",

      action: "Explore",
    },
  },

  learning: {
    floatBadge: true,

    top: {
      icon: "learning",

      title: "Learning",

      meta: "Courses · Progress",
    },

    bottom: {
      icon: "badge",

      title: "Certification",

      action: "View path",
    },

    reveals: [
      { className: "login-carousel-slide__reveal--learning-1", delay: 0.95 },

      { className: "login-carousel-slide__reveal--learning-2", delay: 1.25 },

      { className: "login-carousel-slide__reveal--learning-3", delay: 1.55 },
    ],
  },

  directory: {
    top: {
      icon: "directory",

      title: "Directory",

      meta: "People · Contacts",
    },

    reveals: [
      { className: "login-carousel-slide__reveal--directory-1", delay: 1.15 },

      { className: "login-carousel-slide__reveal--directory-2", delay: 1.4 },

      { className: "login-carousel-slide__reveal--directory-3", delay: 1.65 },
    ],

    floatBadge: true,
  },
};

function SlideLabelIcon({ type }) {
  if (type === "globe") {
    return (
      <span
        className="login-carousel-slide__label-icon login-carousel-slide__label-icon--globe"
        aria-hidden="true"
      />
    );
  }

  if (type === "learning") {
    return (
      <span
        className="login-carousel-slide__label-icon login-carousel-slide__label-icon--learning"
        aria-hidden="true"
      />
    );
  }

  if (type === "badge") {
    return (
      <span
        className="login-carousel-slide__label-icon login-carousel-slide__label-icon--badge"
        aria-hidden="true"
      />
    );
  }

  if (type === "directory") {
    return (
      <span
        className="login-carousel-slide__label-icon login-carousel-slide__label-icon--directory"
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className="login-carousel-slide__label-icon login-carousel-slide__label-icon--calendar"
      aria-hidden="true"
    />
  );
}

export default function LoginCarouselAnimatedSlide({
  imageSrc,
  variant,
  isActive,
  isPaused,
}) {
  const config = SLIDE_CONFIG[variant];

  return (
    <div
      className={`login-carousel-slide login-carousel-slide--${variant}${
        isActive ? " is-active" : ""
      }${isPaused ? " is-paused" : ""}`}
      aria-hidden={!isActive}
    >
      <div className="login-carousel-slide__frame">
        <img src={imageSrc} alt="" className="login-carousel-slide__image" />

        {config?.reveals?.map((reveal) => (
          <div
            key={reveal.className}
            className={`login-carousel-slide__reveal ${reveal.className}`}
            style={{ "--reveal-delay": `${reveal.delay}s` }}
            aria-hidden="true"
          />
        ))}

        {config?.floatLeft && (
          <div className="login-carousel-slide__float login-carousel-slide__float--left">
            <img src={slide2LeftTop} alt="" className="login-carousel-slide__image" />
          </div>
        )}

        {config?.floatBadge && (
          <div
            className={`login-carousel-slide__float login-carousel-slide__float--badge login-carousel-slide__float--badge-${variant}`}
          >
            <span className="login-carousel-slide__float-icon" aria-hidden="true" />
          </div>
        )}

        {config?.top && (
          <div className="login-carousel-slide__label login-carousel-slide__label--top">
            <div className="login-carousel-slide__label-content">
              <img src={slide2Middle} alt="" className="login-carousel-slide__image" />
            </div>
          </div>
        )}

        {config?.bottom && (
          <div className="login-carousel-slide__label login-carousel-slide__label--bottom">
            <div className="login-carousel-slide__label-content">
              <img
                src={slide2BottomLeft}
                alt=""
                className="login-carousel-slide__image"
                style={{ width: "30px", height: "30px", objectFit: "contain" }}
              />

              <div className="login-carousel-slide__label-copy">
                <strong>{config.bottom.title}</strong>
              </div>

              <span className="login-carousel-slide__label-action">
                {config.bottom.action}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

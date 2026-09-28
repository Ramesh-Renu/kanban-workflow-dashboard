import React from "react";
import {
  slide2BottomLeft,
  slide2LeftTop,
  slide2Middle,
} from "../../../assets/images/loginpage";

const DAY_PILLS = [
  { color: "#d8dde5" },
  { color: "#29a7ef" },
  { color: "#f6bd3b" },
  { color: "#4cba6e" },
];

const AVATAR_COLORS = ["#5f748b", "#f5c8c1", "#efaaa7"];

export default function LoginWorkspaceSlide({
  isActive,
  isPaused,
  animationsEnabled = true,
}) {
  return (
    <div
      className={`login-workspace-slide${isActive ? " is-active" : ""}${
        isPaused ? " is-paused" : ""
      }${animationsEnabled ? "" : " is-static"}`}
      aria-hidden={!isActive}
    >
      <div className="login-workspace-slide__float login-workspace-slide__float--left">
        <img
          src={slide2LeftTop}
          alt="stage icon"
          className="login-workspace-slide__float-icon"
          aria-hidden="true"
        />
      </div>
      <div className="login-workspace-slide__card">
        <div className="board-viewport">
          {/* <!-- COLUMN 1 --> */}
          <section className="board-column board-column--open">
            <header className="column-header board-stagger-item board-reveal-at-30">
              <h2>Open</h2>
              <div className="column-actions">
                <button>+</button>
                <button>•••</button>
              </div>
            </header>

            <article className="task-card board-stagger-item board-reveal-at-32">
              <div className="task-top">
                <span>▣ &nbsp; Jan 31</span>
                <span>•••</span>
              </div>
              <h3>Persona Research</h3>
              <div className="labels">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="task-meta">
                <span>⌕ 3</span>
                <span>⌕ 8</span>
                <div className="avatars">
                  <b>J</b>
                  <b>R</b>
                  <b>P</b>
                </div>
              </div>
            </article>

            <article className="task-card muted-card board-stagger-item board-reveal-at-34">
              <div className="task-top">
                <span>▣ &nbsp; Jan 31</span>
              </div>
              <h3>Persona Research</h3>
              <div className="labels">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="preview">
                <div className="preview-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-numbers">
                  <em>20+</em>
                  <em>199</em>
                  <em>300+</em>
                </div>
                <button>View page</button>
              </div>
              <div className="task-meta">
                <span>⌕ 3</span>
                <span>⌕ 8</span>
                <div className="avatars">
                  <b>J</b>
                  <b>R</b>
                  <b>P</b>
                </div>
              </div>
            </article>

            <article className="task-card board-stagger-item board-reveal-at-37">
              <div className="task-top">
                <span>▣ &nbsp; Jan 31</span>
                <span>•••</span>
              </div>
              <h3>Persona Research</h3>
              <div className="labels">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="task-meta">
                <span>⌕ 3</span>
                <span>⌕ 8</span>
                <div className="avatars">
                  <b className="only-p">P</b>
                </div>
              </div>
            </article>

            <article className="task-card board-stagger-item board-reveal-at-39">
              <div className="task-top">
                <span>▣ &nbsp; Jan 31</span>
                <span>•••</span>
              </div>
              <h3>Persona Research</h3>
              <div className="labels">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="preview">
                <div className="preview-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-numbers">
                  <em>20+</em>
                  <em>199</em>
                  <em>300+</em>
                </div>
                <button>View page</button>
              </div>
            </article>
          </section>

          {/* <!-- COLUMN 2 --> */}
          <section className="board-column board-column--todo">
            <header className="column-header board-stagger-item board-reveal-at-41">
              <h2>Todo</h2>
              <div className="column-actions">
                <button>+</button>
                <button>•••</button>
              </div>
            </header>

            <article className="task-card board-stagger-item board-reveal-at-43">
              <div className="task-top">
                <span>▣ &nbsp; Jan 31</span>
                <span>•••</span>
              </div>
              <h3>Persona Research</h3>
              <div className="labels">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="check-row">
                <span className="check">✓</span>
              </div>
              <div className="preview">
                <div className="preview-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-numbers">
                  <em>20+</em>
                  <em>199</em>
                  <em>300+</em>
                </div>
                <button>View page</button>
              </div>
              <div className="task-meta">
                <span>⌕ 3</span>
                <span>⌕ 8</span>
                <div className="avatars">
                  <b>J</b>
                  <b>R</b>
                  <b>P</b>
                </div>
              </div>
            </article>

            <article className="task-card board-stagger-item board-reveal-at-45">
              <div className="task-top">
                <span>▣ &nbsp; Jan 31</span>
                <span>•••</span>
              </div>
              <h3>Landing Page</h3>
              <div className="labels">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="progress-row">
                <span className="progress-ring"></span>
                <span>30%</span>
              </div>
              <ul className="check-list">
                <li>Landing Page</li>
                <li>Design</li>
                <li>Html</li>
              </ul>
              <div className="task-meta">
                <span>⌕ 3</span>
                <span>⌕ 8</span>
                <div className="avatars">
                  <b>J</b>
                  <b>R</b>
                  <b>P</b>
                </div>
              </div>
            </article>

            <article className="task-card board-stagger-item board-reveal-at-47">
              <div className="task-top">
                <span>▣ &nbsp; Jan 31</span>
                <span>•••</span>
              </div>
              <h3>Web development</h3>
              <div className="labels">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="task-meta">
                <span>⌕ 3</span>
                <span>⌕ 8</span>
                <div className="avatars">
                  <b className="only-r">R</b>
                </div>
              </div>
            </article>

            <button className="add-card board-stagger-item board-reveal-at-49">
              ＋ &nbsp; Add another card
            </button>
          </section>
        </div>

        <div className="login-workspace-slide__featured-stack" aria-hidden="true">
          <div className="board-featured-card board-featured-card--reveal board-reveal-at-52">
            <img src={slide2Middle} alt="board featured card icon" />
          </div>
        </div>

      </div>
      
      <div className="login-workspace-slide__bottom-card">
          <img
            src={slide2BottomLeft}
            alt=""
            className="login-workspace-slide__globe-icon"
            aria-hidden="true"
          />
          <div className="login-workspace-slide__bottom-copy">
            <strong>Kanban</strong>
            <span>Onboarding</span>
          </div>
          <span className="login-workspace-slide__bottom-action">New Workspace</span>
        </div>
    </div>
  );
}

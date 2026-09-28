import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";
import SubToolLabels from "components/kanban/SubToolLabels";

dayjs.extend(utc);

const formatUtcToLocal = (value, format) =>
  value ? dayjs.utc(value).local().format(format) : "";

export const CalendarMiniIcon = ({ color = "#fff", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="5" width="16" height="15" rx="2" stroke={color} strokeWidth="1.8" />
    <path d="M4 10h16M8 3v4M16 3v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const TagMiniIcon = ({ color = "#fff", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 13.2L12.8 20.4a2 2 0 0 1-2.8 0L4 14.4V4h10.4l5.6 5.6a2 2 0 0 1 0 2.8z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="9" r="1.2" fill={color} />
  </svg>
);

const BoardGridIcon = ({ color = "#A855F7", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="5" cy="5" r="1.7" fill={color} />
    <circle cx="11" cy="5" r="1.7" fill={color} />
    <circle cx="5" cy="11" r="1.7" fill={color} />
    <circle cx="11" cy="11" r="1.7" fill={color} />
  </svg>
);

const getPersonName = (person) =>
  person?.displayName || person?.name || person?.fullName || person?.givenName || "";

const getPersonRole = (person) =>
  person?.teamName || person?.roleName || person?.role || person?.designation || "";

export const renderToolsStageBadge = (stage) => {
  if (!stage?.stage?.name) return <span className="text-muted fs-12">---</span>;
  const stageColor = stage?.stage?.colorCode || "var(--color-primary)";
  return (
    <div
      className="tools-info-stage-pill"
      style={{
        color: stageColor,
        border: `1px solid ${stageColor}`,
        backgroundColor: `${stageColor}14`,
      }}
      title={stage?.stage?.name}
    >
      <span className="tools-info-stage-pill__label">{stage.stage.name}</span>
    </div>
  );
};

const renderOtherBoardAssignees = (stage) => {
  if (!stage?.assignee?.length) {
    return <span className="tools-info-other-boards__na">N/A</span>;
  }
  return (
    <div className="tools-info-other-boards__avatar-stack">
      {stage.assignee.map((assignee, idx) => {
        const name = getPersonName(assignee);
        const role = getPersonRole(assignee);
        return (
          <div className="tools-info-other-boards__person" key={assignee?.regId || idx}>
            <div className="avatars" title={name}>
              <LogoAvatarShowLetter
                genaralData={assignee}
                profileName="displayName"
                outerClassName="avatars__item"
                innerClassName="avatars__img"
              />
            </div>
            <div className="tools-info-other-boards__person-meta">
              <p className="tools-info-other-boards__person-name" title={name}>
                {name || "---"}
              </p>
              {role ? (
                <p className="tools-info-other-boards__person-role">{role}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ToolsMoreDetailsPanel = ({
  createdDate,
  isProcessWorkflow,
  row,
  selectedLabels,
  freeFlowLabelList,
  otherStages = [],
  actions = null,
}) => {
  return (
    <div className="tools-info-expanded tools-info-expanded--table">
      <div className="tools-info-expanded__main">
        <div className="tools-info-expanded__fields">
          <div className="tools-info-expanded__item">
            <span className="tools-info-expanded__icon-wrap tools-info-expanded__icon-wrap--created">
              <CalendarMiniIcon />
            </span>
            <div className="tools-info-expanded__item-body">
              <p className="tools-info-expanded__label">Created date</p>
              <p className="tools-info-expanded__value">
                {createdDate ? formatUtcToLocal(createdDate, "MMM DD, YYYY") : "---"}
              </p>
              {createdDate ? (
                <p className="tools-info-expanded__subvalue">
                  {formatUtcToLocal(createdDate, "hh:mm A")}
                </p>
              ) : null}
            </div>
          </div>
          {!isProcessWorkflow && (
            <div className="tools-info-expanded__item">
              <span className="tools-info-expanded__icon-wrap tools-info-expanded__icon-wrap--labels">
                <TagMiniIcon />
              </span>
              <div className="tools-info-expanded__item-body">
                <p className="tools-info-expanded__label">Labels</p>
                <div className="tools-info-label-cell">
                  {selectedLabels?.length > 0 ? (
                    <SubToolLabels
                      card={row}
                      labelList={freeFlowLabelList?.data}
                      className="tools-info-sub-tool-labels"
                    />
                  ) : (
                    <span className="text-muted fs-12">---</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {actions}
      </div>
      {otherStages.length > 0 && (
        <div className="tools-info-other-boards">
          <h4 className="tools-info-other-boards__title">Other Boards</h4>
          <div className="tools-info-other-boards__table">
            <div className="tools-info-other-boards__head">
              <span>Board</span>
              <span>Stage</span>
              <span>Assignee</span>
              <span>Workspace</span>
            </div>
            {otherStages.map((stage) => (
              <div
                key={stage?.boardId || stage?.boardName}
                className="tools-info-other-boards__row"
              >
                <div className="tools-info-other-boards__board">
                  <span className="tools-info-other-boards__board-icon">
                    <BoardGridIcon />
                  </span>
                  <span
                    className="tools-info-other-boards__board-name"
                    title={stage?.boardName}
                  >
                    {stage?.boardName || "---"}
                  </span>
                </div>
                <div className="tools-info-other-boards__stage">
                  {renderToolsStageBadge(stage)}
                </div>
                <div className="tools-info-other-boards__assignee">
                  {renderOtherBoardAssignees(stage)}
                </div>
                <div className="tools-info-other-boards__workspace-cell">
                  {stage?.workspaceName ? (
                    <span
                      className="tools-info-other-boards__workspace"
                      title={stage.workspaceName}
                    >
                      {stage.workspaceName}
                    </span>
                  ) : (
                    <span className="text-muted fs-12">---</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsMoreDetailsPanel;

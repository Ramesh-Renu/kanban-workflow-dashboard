import React, { memo, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { calendarBlank, syncIcon, FilterPrimaryIcon } from "assets/images";
import {
  BOARD_FILTER_OPTIONS,
  safeParseLocalStorage,
  BOARD_MAIN_SUB_TASK_TABS,
  BOARD_ORDER_TOOL_TASK_TABS,
  hexToRgba,
  DASHBOARD_ROUTES,
  isTaskDashboardPath,
  buildAISummaryRequestParams,
  isDashboardAdmin,
  getDashboardBreadcrumbHomePath,
  getDashboardHomeBreadcrumbLabel,
  prepareDashboardHomeNavigation,
  isIodDashboardWorkspace,
} from "utils/dashboard";
import SelectDropDown from "@orion/shared/src/components/SelectDropDown";
import CustomDatePicker from "components/common/CustomDatePicker";
import ToolTipPopup from "components/common/ToolTipPopup";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";
import AIModeButton from "../aiMode/AIModeButton";
import AISummaryButton from "../aiMode/AISummaryButton";
import { useDashboardAIModeOptional } from "../aiMode/DashboardAIModeContext";
import AdminWorkspaceScopeToggle from "../Widget/AdminWorkspaceScopeToggle";

/** Home crumb uses list-level path — never the board page (single-board shortcut). */
const buildDashboardBreadcrumbs = (details) => {
  const homePath = getDashboardBreadcrumbHomePath(details);
  const homeLabel = getDashboardHomeBreadcrumbLabel(details);
  const isHomeWorkspace = homePath === DASHBOARD_ROUTES.workspace;

  // Always show Workspace between home and Board. When home is already the boards
  // list, Workspace uses isHome so single-board users aren't bounced back to Board.
  const workspaceCrumb = {
    label: "Workspace",
    to: DASHBOARD_ROUTES.workspace,
    ...(isHomeWorkspace ? { isHome: true } : {}),
  };

  return {
    workspace: [
      { label: homeLabel, to: homePath, isHome: true },
      { label: "Workspace", to: null },
    ],
    task: [
      { label: homeLabel, to: homePath, isHome: true },
      workspaceCrumb,
      { label: "Board", to: null },
    ],
    board: [
      { label: homeLabel, to: homePath, isHome: true },
      workspaceCrumb,
      { label: "Board", to: null },
    ],
  };
};

const DashboardBreadcrumb = ({ boardType, authDetails }) => {
  const crumbs =
    buildDashboardBreadcrumbs(authDetails)[boardType] ??
    buildDashboardBreadcrumbs(authDetails).workspace;

  const handleCrumbClick = (crumb) => {
    if (crumb.isHome) {
      prepareDashboardHomeNavigation(authDetails);
    }
  };

  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li
              key={`${crumb.label}-${crumb.to ?? "current"}-${index}`}
              className={`breadcrumb-item${isLast ? " active" : ""}`}
              aria-current={isLast ? "page" : undefined}
              title={crumb.label}
            >
              {crumb.to ? (
                <Link to={crumb.to} onClick={() => handleCrumbClick(crumb)}>
                  {crumb.label}
                </Link>
              ) : (
                crumb.label
              )}
              {!isLast && (
                <span className="breadcrumb-item-divider">
                  <span className="icon-chevron-thin-right"></span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

const BoardDashboardHeader = ({
  boardType,
  boardFilter,
  selectedRange,
  showCalendar,
  dateTimeRef,
  getSelectedDate,
  filterResetToken,
  filterDatas,
  auth,
  getColor,
  onBoardTaskChanged,
  onSelectedCustomMonthRange,
  onCancelCustomMonthApply,
  onCustomMonthApply,
  onDashboardSync,
  onFilterBoard,
  onShowTourGuide,
  onCloseCalendar,
  activeTabId,
  leadUserData,
}) => {
  const location = useLocation();
  const isTaskDashboard = isTaskDashboardPath(location.pathname);
  const breadcrumbType = boardType;
  const aiModeCtx = useDashboardAIModeOptional();
  const aiModeAvailable = Boolean(aiModeCtx);
  // Regular users: hide workspace title here — it appears on each Active Board card.
  const showWorkspaceTitle =
    boardType === "task" || isDashboardAdmin(auth?.details);

  const aiSummaryScope =
    boardType === "workspace" && !isTaskDashboard ? "workspace" : "board";
 
    const aiSummaryParams = useMemo(() => {
      if (
        selectedRange?.[0]?.value === "CUSTOM_RANGE" &&
        getSelectedDate
      ) {
        return buildAISummaryRequestParams({
          scope: aiSummaryScope,
          auth,
          rangeType: selectedRange?.[0]?.value,
          getSelectedDate,
        });
      } else if(selectedRange?.[0]?.value !== "CUSTOM_RANGE") {
        return buildAISummaryRequestParams({
          scope: aiSummaryScope,
          auth,
          rangeType: selectedRange?.[0]?.value,
          getSelectedDate,
        });
      }
    
      return null;
    }, [auth, selectedRange, getSelectedDate]);

  const titleBadgeStyle = {
    backgroundColor: getColor?.color
      ? `${hexToRgba(getColor?.color, 0.05)}`
      : `${hexToRgba("#ffffff", 0.05)}`,
    color: getColor?.color ? hexToRgba(getColor?.color, 1) : `${hexToRgba("#000000", 1)}`,
  };
  const titleBadgeBorderStyle = {
    border: `1px solid ${getColor?.color ? hexToRgba(getColor?.color, 0.1) : `${hexToRgba("#000000", 0.1)}`}`,
  };

  return (
    <header className="dashboard-page__header" aria-label="Board dashboard header">
      <div className="dashboard-page__title">
        <div className="dashboard-page__title-wrap">
          <DashboardBreadcrumb
            boardType={breadcrumbType}
            authDetails={auth?.details}
          />
        </div>
        
        {showWorkspaceTitle && (
          <div className="dashboard-page__title-wrap">
            <h3
              className="dashboard-page__title-wrap--workspace-name"
              id={
                boardType === "task"
                  ? "board-dashboard-task-title"
                  : "board-dashboard-workspace-title"
              }
            >
              {boardType === "task"
                ? safeParseLocalStorage("selectBoardDashboard")?.name
                : safeParseLocalStorage("selectWorkspaceDashboard")?.name}
              {(boardType === "task"
                ? safeParseLocalStorage("selectBoardDashboard")?.status
                : safeParseLocalStorage("selectWorkspaceDashboard")?.status) && (
                <span
                  className="dashboard-page__title-badge dashboard-page__title-badge--status"
                  aria-label={`${boardType === "task" ? "Task" : "Workspace"} status: ${
                    isTaskDashboard
                      ? safeParseLocalStorage("selectBoardDashboard")?.status || "Unknown"
                      : safeParseLocalStorage("selectWorkspaceDashboard")?.status ||
                        "Unknown"
                  }`}
                  style={{
                    ...titleBadgeStyle,
                    ...titleBadgeBorderStyle,
                  }}
                >
                  {boardType === "task"
                    ? safeParseLocalStorage("selectBoardDashboard")?.status
                    : safeParseLocalStorage("selectWorkspaceDashboard")?.status}
                </span>
              )}
              {leadUserData !== undefined && leadUserData !== null && (
                <div className="avatars">
                  <span className="avatars__title">Lead by:&#160;</span>
                  <LogoAvatarShowLetter
                    genaralData={
                      leadUserData !== undefined && leadUserData !== null
                        ? leadUserData[0]
                        : {}
                    }
                    profilePhotoName="photo"
                    profileName="name"
                    outerClassName="avatars__item"
                    innerClassName="avatars__img"
                  />
                  <span className="avatars__name">
                    {leadUserData !== undefined && leadUserData !== null
                      ? leadUserData[0].name
                      : "Unknown"}
                  </span>
                </div>
              )}
            </h3>
          </div>
        )}
      </div>
      <div
        className="dashboard-page__actions"
        role="toolbar"
        aria-label="Board filters, date range, refresh, and tour"
      >
        <div className="dashboard-page__actions-row">
          {/* {aiModeAvailable ? <AIModeButton /> : null} */}
          <AISummaryButton
            params={aiSummaryParams}
            userName={auth?.details?.displayName || "Admin"}
            scope={aiSummaryScope}
            contextLabel={
              aiSummaryScope === "board"
                ? `${safeParseLocalStorage("selectBoardDashboard")?.name || "selected"} board`
                : `${safeParseLocalStorage("selectWorkspaceDashboard")?.name || "selected"} workspace`
            }
          />
          {boardType === "task" &&
            isIodDashboardWorkspace() &&
            safeParseLocalStorage("selectBoardDashboard")?.id === 108 && (
              <SelectDropDown
                key="board-filter"
                multi={false}
                options={
                  isIodDashboardWorkspace()
                    ? BOARD_ORDER_TOOL_TASK_TABS
                    : BOARD_MAIN_SUB_TASK_TABS
                }
                labelField="name"
                valueField="key"
                searchable={false}
                clearable={false}
                values={boardFilter}
                onChange={onBoardTaskChanged}
                placeholder="Orders"
                className="filter-select-dropDown p-2 workspace-widget__filter-select"
                dropdownPosition="auto"
              />
            )}
          {(!isIodDashboardWorkspace() ||
            boardFilter[0]?.key !== "mainTask" ||
            ((activeTabId !== 22 || boardType === "task") &&
              isIodDashboardWorkspace())) && (
            <div style={{ minWidth: "fit-content", position: "relative" }}>
              {BOARD_ORDER_TOOL_TASK_TABS && filterDatas && (
                <ToolTipPopup
                  toolTipDatas={filterDatas}
                  labelField="name"
                  valueField="filter_id"
                  isSingleEntry={false}
                  customClass="filter-board"
                  getSeletedVal={onFilterBoard}
                  isCustomFieldswithFilter={true}
                  everySelectApiCall={false}
                  searchToolTip={false}
                  auth={auth}
                  searchPlaceholder="Select Board"
                  customIcon={
                    <span className="filter-icon">
                      <img src={FilterPrimaryIcon} alt="filterIcon" /> Filters
                    </span>
                  }
                  canEdit={true}
                  collapseButton={false}
                  filterHeaderTitle="Apply Filter"
                  showFilterFooter={true}
                  filterListPreviewLimit={5}
                  setClearFilter={filterResetToken}
                />
              )}
            </div>
          )}

          <div style={{ minWidth: "180px", position: "relative" }}>
            <img
              src={calendarBlank}
              alt=""
              aria-hidden="true"
              style={{
                width: "20px",
                position: "absolute",
                left: "12px",
                top: "10px",
                zIndex: "500",
              }}
            />
            <SelectDropDown
              options={BOARD_FILTER_OPTIONS}
              values={selectedRange}
              onChange={onSelectedCustomMonthRange}
              labelField="label"
              valueField="value"
              multi={false}
              searchable={false}
              clearable={false}
              optionType="radio"
              className="filter-select-dropDown dashboard-page__action-btn p-2 dashboard-page__action-btn--ghost"
            />
            {showCalendar && (
              <div className="dashboard-page__custom-month" ref={dateTimeRef}>
                <CustomDatePicker
                  defaultDate={getSelectedDate}
                  onSelect={onCustomMonthApply}
                  oncancel={onCancelCustomMonthApply}
                  isOrderDate={true}
                  isDueDate={false}
                  isRangeSelect={true}
                  twoSide={true}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            className="dashboard-page__action-btn sync"
            onClick={() => onDashboardSync(boardFilter)}
            aria-label="Refresh board dashboard data"
          >
            <img src={syncIcon} alt="" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};

export { DashboardBreadcrumb };
export default memo(BoardDashboardHeader);

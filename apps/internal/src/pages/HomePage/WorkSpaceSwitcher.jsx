import React, { useEffect, useMemo, useState } from "react";
import { SelectDropDown } from "@orion/shared";
import { useGlobalMaster } from "@orion/shared";
import { Col, Row } from "react-bootstrap";
import {
  ActiveFilters,
  FilterPrimaryIcon,
  createNewTaskIcon,
  SideNavUser1,
  SideNavUsers,
} from "../../assets/images";
import useAuth from "../../hooks/useAuth";
import { t } from "i18next";
import { useGlobalContext } from "store/context/GlobalProvider";
import { Fragment } from "react";
import * as animate from "../../assets/images/index";
import ToolTipPopup from "../../components/common/ToolTipPopup";
import CreateTaskModal from "../../components/common/CreateTaskModal";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getKanbanBasePath,
  isKanbanPathname,
  replaceKanbanBaseInPath,
} from "../../utils/kanbanRoutes";
import {
  ADMIN_DASHBOARD_SCOPE,
  getAdminKanbanScope,
  getAdminKanbanWorkspaceList,
  hasAdminMyWorkspaceRoles,
  setAdminKanbanScope,
} from "../../utils/dashboard";

const KANBAN_SCOPE_OPTIONS = [
  {
    value: ADMIN_DASHBOARD_SCOPE.MINE,
    label: "My Workspace",
    icon: SideNavUser1,
  },
  {
    value: ADMIN_DASHBOARD_SCOPE.ALL,
    label: "All Workspace",
    icon: SideNavUsers,
  },
];
const WorkSpaceSwitcher = ({
  userData,
  isKanban,
  getTaskName,
  showFilter,
  getShowFilter,
  filtersShow,
  getBoard,
  showDrawer,
  setShowDrawer,
  scoreBoardData,
  userRole,
  handlePermissionChange,
  callGetApi,
}) => {
  const selectOrders = [
    { id: 0, name: "My Orders" },
    { id: 1, name: "All Orders" },
  ];
  const location = useLocation();
  const navigate = useNavigate();
  const {
    boardList,
    getBoardList,
    taskPriority,
    getTaskPriority,
    freeFlowLabelList,
    getFreeFlowLabelList,
  } = useGlobalMaster();
  const [selectedWorkSpace, setSelectedWorkSpace] = useState([]);
  const [selectedWorkSpaceBoard, setSelectedWorkSpaceBoard] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [{ data: auth }] = useAuth();
  const { filterState, orderListState, dispatch } = useGlobalContext();
  const saved = localStorage.getItem("order_filters");
  const { isSuperAdmin = false, user_type_code, workspaceDTO } = auth?.details || {};
  const [defaultShowOrders, setDefaultShowOrders] = useState([]);
  const [createNewTask, setCreateNewTask] = useState(false);
  const getfilterCount = localStorage.getItem("filterCount");
  const showAdminKanbanScope = hasAdminMyWorkspaceRoles(auth?.details);
  const [kanbanScope, setKanbanScope] = useState(() => getAdminKanbanScope());

  const workspaceOptions = useMemo(() => {
    if (showAdminKanbanScope) {
      return getAdminKanbanWorkspaceList(auth?.details) || [];
    }
    return userData?.workspaceDTO || workspaceDTO || [];
  }, [
    showAdminKanbanScope,
    auth?.details,
    userData?.workspaceDTO,
    workspaceDTO,
    kanbanScope,
  ]);

  const getWorkspaceBoard = (boardId, workspaces) => {
    if (!workspaces?.length) return {};

    for (const ws of workspaces) {
      const matchedBoard = ws.boardList?.find(
        (b) => Number(b.boardID ?? b.boardId) === Number(boardId),
      );
      if (matchedBoard) {
        return { workspace: ws, board: matchedBoard };
      }
    }

    // 🔁 fallback → first default board
    const defaultWorkspace = workspaces.find((ws) => ws.isDefault) || workspaces[0];
    const defaultBoard =
      defaultWorkspace?.boardList?.find((b) => b.isDefault) ||
      defaultWorkspace?.boardList?.[0];

    return { workspace: defaultWorkspace, board: defaultBoard };
  };

  const getWorkflowTabs = (workflowType) => {
    // Workflow 60: Main Task toggle removed — always Sub Task (subtask board ids).
    if (Number(workflowType) === 60) {
      return [{ id: 2, code: "SubTask", name: "Sub Task", isActive: true }];
    }
    return [{ id: 1, code: "Task", name: "Task", isActive: true }];
  };

  const resolveBoardFromList = (boardList = [], activeBoard = []) => {
    const activeId = activeBoard?.[0]?.boardID ?? activeBoard?.[0]?.boardId;
    if (activeId != null) {
      const matched = boardList.find(
        (board) => Number(board?.boardID ?? board?.boardId) === Number(activeId),
      );
      if (matched) return [matched];
    }
    return boardList?.[0] ? [boardList[0]] : [];
  };

  useEffect(() => {
    if (!workspaceOptions?.length || location?.state?.boardId === undefined) return;

    const id = Number(location?.state?.boardId); // fallback if param missing

    const parsed = safeParse("workspaceState");
    const { workspace, board } = getWorkspaceBoard(id, workspaceOptions);

    if (workspace && board) {
      setSelectedWorkSpace([workspace]);
      setSelectedWorkSpaceBoard(workspace.boardList);
      setSelectedBoard([board]);
      const tabs = getWorkflowTabs(workspace?.workflowType);
      const activeTab = tabs.find((t) => t.isActive) || tabs[0];
      setTabs(tabs);

      localStorage.setItem("isActiveTab", JSON.stringify({ tabs }));
      localStorage.setItem(
        "workspaceState",
        JSON.stringify({
          ...parsed,
          activeBoard: [board],
          activeWorkSpace: [workspace],
        }),
      );
      getBoard([board], activeTab?.code, "location");
      getTaskName(activeTab);
    }
  }, [workspaceOptions, location?.state?.boardId]);

  const safeParse = (key, fallback = {}) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  };

  const priority = taskPriority?.data?.map((item) => ({
    name: (
      <>
        <span
          style={{
            backgroundColor: item.colour_code,
            padding: "4px 8px",
            borderRadius: "4px",
            height: "18px",
            width: "19px",
            display: "inline-block",
          }}
        >
          &#160;
        </span>
        &#160; {item.name}
      </>
    ),
    status_id: item.status_id,
    colorCode: item.colour_code,
  }));

  const freeFlowLabel = freeFlowLabelList?.data?.map((item) => ({
    name: (
      <>
        <span
          style={{
            backgroundColor: item.back_ground_colour || item.colour_code,
            padding: "4px 8px",
            borderRadius: "4px",
            height: "18px",
            width: "19px",
            display: "inline-block",
          }}
        >
          &#160;
        </span>
        {item.name}
      </>
    ),
    status_id: item.status_id,
    colorCode: item.colour_code,
  }));

  useEffect(() => {
    if (boardList?.data?.length === 0) {
      getBoardList();
    }
    const parsed = JSON.parse(saved);
    if (parsed && auth?.details) {
      setDefaultShowOrders(
        isSuperAdmin || user_type_code === "ADM"
          ? [selectOrders[1]]
          : [selectOrders[parsed.allUser]],
      );
    } else if (auth?.details) {
      setDefaultShowOrders(
        isSuperAdmin || user_type_code === "ADM" ? [selectOrders[1]] : [selectOrders[0]],
      );
    }
    if (taskPriority?.data?.length === 0 || !taskPriority) {
      getTaskPriority();
    }
    if (freeFlowLabelList?.data?.length === 0 || !freeFlowLabelList) {
      getFreeFlowLabelList();
    }
  }, []);

  const switchForm = [
    {
      label: workspaceOptions?.length > 1 ? "Switch workspace" : "Workspace",
      iconPlacement: 1,
      value: selectedWorkSpace,
      options: workspaceOptions || [],
      typeof: "dropDown",
      key: "workspace",
      labelField: "name",
      valueField: "work_space_id",
      disabled: workspaceOptions?.length === 1 || workspaceOptions?.length === 0,
      placeHolder: workspaceOptions?.length === 0 ? "NO Workspace" : "Choose Workspace",
      enableDropdown: workspaceOptions?.length > 1 ? true : false,
    },
    {
      label: selectedWorkSpaceBoard?.length > 1 ? "Switch board" : "Board",
      iconPlacement: 1,
      value: selectedBoard,
      options: selectedWorkSpaceBoard || [],
      typeof: "dropDown",
      key: "board",
      labelField: "name",
      valueField: "boardID",
      placeHolder: selectedWorkSpaceBoard?.length === 0 ? "NO Board" : "Choose Board",
      disabled:
        selectedWorkSpaceBoard?.length === 0 || selectedWorkSpaceBoard?.length === 1,
      enableDropdown: selectedWorkSpaceBoard?.length > 1 ? true : false,
    },
  ];

  const handleUserInfoForm = (e, fieldName) => {
    if (!e) return;

    const parsed = safeParse("workspaceState");
    const { activeWorkSpace, activeBoard } = parsed;

    switch (fieldName) {
      case "workspace": {
        const selectedWorkspace = e?.[0];
        if (selectedWorkspace === undefined) return;
        const boardList = selectedWorkspace?.boardList || [];
        const validBoard = resolveBoardFromList(boardList, activeBoard);

        setSelectedBoard(validBoard);
        setSelectedWorkSpace(e);
        setSelectedWorkSpaceBoard(boardList);

        const tabs = getWorkflowTabs(selectedWorkspace?.workflowType);
        const activeTab = tabs.find((t) => t.isActive) || tabs[0];
        setTabs(tabs);
        getBoard(validBoard, activeTab?.code, "workspace");
        localStorage.setItem("isActiveTab", JSON.stringify({ tabs }));
        localStorage.setItem(
          "workspaceState",
          JSON.stringify({
            ...parsed,
            activeBoard: validBoard,
            activeWorkSpace: e,
          }),
        );

        if (isKanbanPathname(location.pathname)) {
          const nextBase = getKanbanBasePath(selectedWorkspace?.work_space_id);
          const nextPath = replaceKanbanBaseInPath(location.pathname, nextBase);
          if (nextPath !== location.pathname) {
            navigate(`${nextPath}${location.search}`, {
              replace: true,
              state: location.state,
            });
          }
        }

        break;
      }

      case "board": {
        // Always use the option object from current boardList (keeps mainBoardID)
        const selected = resolveBoardFromList(selectedWorkSpaceBoard, e);
        setSelectedBoard(selected);
        const tabs = getWorkflowTabs(
          selectedWorkSpace?.[0]?.workflowType ?? activeWorkSpace?.[0]?.workflowType,
        );
        const activeTab = tabs.find((t) => t.isActive) || tabs[0];
        setTabs(tabs);

        getBoard(selected, activeTab?.code, "board");

        localStorage.setItem("isActiveTab", JSON.stringify({ tabs }));
        localStorage.setItem(
          "workspaceState",
          JSON.stringify({
            ...parsed,
            activeBoard: selected,
            activeWorkSpace: selectedWorkSpace?.length
              ? selectedWorkSpace
              : activeWorkSpace,
          }),
        );

        break;
      }

      default:
        console.warn("Unknown fieldName:", fieldName);
    }
  };

  const handleFilter = () => {
    getShowFilter(!filtersShow);
  };

  useEffect(() => {
    if (!workspaceOptions?.length) {
      return; // wait until workspace options are available
    }
    const saved = localStorage.getItem("workspaceState");
    const parsed = saved ? JSON.parse(saved) : null;

    const resolveFromOptions = (workSpaceId) =>
      workspaceOptions.find((work) => Number(work.work_space_id) === Number(workSpaceId));

    if (parsed?.activeWorkSpace?.[0]) {
      const { activeWorkSpace, activeBoard } = parsed;
      const matchedWorkSpace =
        resolveFromOptions(activeWorkSpace[0]?.work_space_id) || workspaceOptions[0];

      if (!matchedWorkSpace) return;

      // Always take board from current options so mainBoardID / code stay intact
      const matchedBoard = resolveBoardFromList(
        matchedWorkSpace.boardList || [],
        activeBoard,
      );
      const tabs = getWorkflowTabs(matchedWorkSpace?.workflowType);
      const activeTab = tabs.find((t) => t.isActive) || tabs[0];

      setTabs(tabs);
      setSelectedBoard(matchedBoard);
      setSelectedWorkSpace([matchedWorkSpace]);
      setSelectedWorkSpaceBoard(matchedWorkSpace.boardList || []);
      getBoard(matchedBoard, activeTab?.code, "saved");

      localStorage.setItem("isActiveTab", JSON.stringify({ tabs }));
      localStorage.setItem(
        "workspaceState",
        JSON.stringify({
          ...parsed,
          activeWorkSpace: [matchedWorkSpace],
          activeBoard: matchedBoard,
        }),
      );
    } else {
      const firstWorkSpace = workspaceOptions[0];
      if (firstWorkSpace) {
        const defaultBoard = firstWorkSpace?.boardList?.[0]
          ? [firstWorkSpace.boardList[0]]
          : [];
        const tabs = getWorkflowTabs(firstWorkSpace?.workflowType);
        const activeTab = tabs.find((t) => t.isActive) || tabs[0];

        setTabs(tabs);
        setSelectedWorkSpace([firstWorkSpace]);
        setSelectedBoard(defaultBoard);
        setSelectedWorkSpaceBoard(firstWorkSpace?.boardList || []);
        getBoard(defaultBoard, activeTab?.code, "default");
        localStorage.setItem("isActiveTab", JSON.stringify({ tabs }));
        localStorage.setItem(
          "workspaceState",
          JSON.stringify({
            activeWorkSpace: [firstWorkSpace],
            activeBoard: defaultBoard,
          }),
        );
      }
    }
  }, [workspaceOptions]);

  const handleKanbanScopeChange = (nextScope) => {
    if (nextScope === kanbanScope) return;
    setAdminKanbanScope(nextScope);
    setKanbanScope(nextScope);
  };

  const handleChangedOrders = (e) => {
    setDefaultShowOrders([e]);
  };

  useEffect(() => {
    handlePermissionChange(defaultShowOrders);
  }, [defaultShowOrders]);

  const fetchGetCreatedTaskAPI = async () => {
    callGetApi(true);
  };
  const handleShowCreateNewTask = () => {
    setCreateNewTask(!createNewTask);
  };

  return (
    <div className="workspaceSwitch d-flex flex-row justify-content-between m-0 align-items-end flex-wrap">
      <div className="workspaceSwitch__left d-flex flex-column gap-2">
        {showAdminKanbanScope && (
          <div
            className="workspaceSwitch__scope"
            role="group"
            aria-label="Workspace scope"
          >
            {KANBAN_SCOPE_OPTIONS.map((option) => {
              const isActive = kanbanScope === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`workspaceSwitch__scope-btn${isActive ? " is-active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => handleKanbanScopeChange(option.value)}
                >
                  <img
                    src={option.icon}
                    alt=""
                    aria-hidden="true"
                    className={`${option.label === "My Workspace" ? "icon-my-workspace" : "icon-all-workspace"}`}
                  />
                  {option.label}
                  {isActive ? (
                    <span className="workspaceSwitch__scope-arrow" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
        <Row className="d-flex flex-row align-items-end row-gap-3 my-0 p-0 flex-wrap">
          {switchForm?.map((val, index) => (
            <Col key={index} className="my-0 py-0">
              <label className="dropdownLabel">{val.label}</label>

              {val.enableDropdown ? (
                <SelectDropDown
                  id={val.key}
                  multi={false}
                  options={val.options}
                  labelField={val.labelField}
                  valueField={val.valueField}
                  searchable={true}
                  values={val.value}
                  onChange={(e) => handleUserInfoForm(e, val.key)}
                  placeholder={val.placeHolder}
                  className="filter-select-dropDown"
                  optionType={"radio"}
                  disabled={val.disabled}
                  dropdownPosition="auto"
                />
              ) : (
                <div className="singleDropdown">{val?.options[0]?.name}</div>
              )}
            </Col>
          ))}
        </Row>
      </div>
      {isKanban && tabs && (
        <div className="d-flex filterButton-container align-items-end">
          {Number(selectedWorkSpace[0]?.workflowType) === 61 && (
            <button
              className={`filterButton btn btn-0 position-relative`}
              onClick={() => handleShowCreateNewTask()}
            >
              <img src={createNewTaskIcon} alt="FilterPrimaryIcon" />
              Create new task
            </button>
          )}
          {showFilter && (
            <button
              className={`filterButton ${
                filtersShow ? "activeButton" : "inActiveButton"
              } btn btn-0 position-relative`}
              onClick={() => handleFilter()}
            >
              <img
                src={filtersShow ? ActiveFilters : FilterPrimaryIcon}
                alt="FilterPrimaryIcon"
                className={filtersShow ? "ActiveFilters" : "FilterPrimaryIcon"}
              />
              Filters
              {JSON.parse(getfilterCount)?.enabledCount && (
                <span>({JSON.parse(getfilterCount)?.enabledCount})</span>
              )}
            </button>
          )}
        </div>
      )}
      {!isKanban && (
        <Fragment>
          {/* {!isSuperAdmin && user_type_code !== "ADM" && ( */}
          <Row className="p-0 m-0 d-flex flex-row justify-content-between align-items-start greetings_container">
            <Col className="orderSection d-flex justify-content-end p-0 m-0">
              <button className="btn activeButton" onClick={() => setShowDrawer(true)}>
                {t("order_create.create_order_")}
              </button>
            </Col>
          </Row>
          {/* )} */}
          <div className="scoreBoard_container">
            {scoreBoardData.length > 0 && (
              <>
                {scoreBoardData.map((board, index) => {
                  return (
                    <Fragment key={board.matchingName || index}>
                      <div className={`scoreCol flex-row`} key={index}>
                        <div className={`scoreflex-column`}>
                          <img
                            width={"50"}
                            className={"animate-" + board.matchingName}
                            src={animate[board.matchingName]}
                            alt={board.matchingName}
                          />
                        </div>
                        <div className={`scoreflex-column`}>
                          <p className="scoreboard_name m-0">
                            {t(`order_orion_v2.${board.matchingName}`)}
                          </p>
                          <h4 className="board_count m-0">{board.value}</h4>
                        </div>
                      </div>
                      {index + 1 !== scoreBoardData?.length && (
                        <p className="scoreCol-divider m-0 p-0">&#160;</p>
                      )}
                    </Fragment>
                  );
                })}
                {filterState?.filterValues &&
                  user_type_code === "USR" &&
                  userRole?.roleCode === "MAN" &&
                  filterState.filterValues && (
                    <div className="scoreCol flex-row last-col">
                      <ToolTipPopup
                        toolTipDatas={selectOrders}
                        customTop={"45px"}
                        labelField="name"
                        valueField="id"
                        defaultValue={defaultShowOrders}
                        customWidth={"100%"}
                        getSeletedVal={handleChangedOrders}
                        canEdit={true}
                        isCustomFieldswithFilter={false}
                        arrow={false}
                        customIcon={
                          <SendCustomUserIcon
                            placeholderText={selectOrders.filter(
                              (n) => n.name === defaultShowOrders[0]?.name,
                            )}
                            iconShow={selectOrders?.length >= 0}
                          />
                        }
                      />
                    </div>
                  )}
              </>
            )}
            {scoreBoardData?.length === 0 && (
              <div
                className={`page-loading`}
                style={{
                  height: "130px",
                  borderRadius: "8px",
                }}
              ></div>
            )}
          </div>
        </Fragment>
      )}
      <CreateTaskModal
        createNewTask={createNewTask}
        isNewTask={true}
        cancelLinkModal={() => setCreateNewTask(false)}
        selectedBoard={selectedBoard}
        priority={priority}
        freeFlowLabelList={freeFlowLabel}
        callGetApi={fetchGetCreatedTaskAPI}
      ></CreateTaskModal>
    </div>
  );
};

export default WorkSpaceSwitcher;

export const SendCustomUserIcon = ({ placeholderText, iconShow }) => {
  return (
    <Fragment>
      {placeholderText ? placeholderText[0]?.name : "My Orders"}{" "}
      {iconShow ? <span className={`icon-chevron-thin-down`}></span> : ""}
    </Fragment>
  );
};

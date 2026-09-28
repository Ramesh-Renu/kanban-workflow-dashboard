import {
  UpArrow,
  ArrowDown,
  checkedBlueIcon,
  unCheckedBlueIcon,
  TimerIcon,
  UserAddPrimary,
  blueBorderUnchecked,
} from "../../../assets/images";
import LogoAvatarShowLetter from "../../../components/common/LogoAvatarShowLetter";
import { Collapse } from "react-bootstrap";
import KebabMenu from "../KebabMenu";
import { Fragment } from "react";
import { getDueDateColor, renderTaskListPriority } from "../../../utils/common";
import dayjs from "dayjs";
import { createPortal } from "react-dom";
import ToolAssignMember from "../KebabMenu/ToolAssignMember";
import { taskList, timerEmpty } from "../../../assets/images/index";
import SubToolLabels from "../SubToolLabels";
import { isOrdersWorkspace } from "../../../utils/kanbanRoutes";
import {
  ToolRowHoverShell,
  ViewTaskIconButton,
} from "../ToolRowViewMenu";

const TasklListView = ({
  ui,
  cardData,
  selection,
  handlers,
  refs,
  assignee,
  resize,
}) => {
  return (
    <div
      className={`${ui.isMainTask ? "no-hover" : ""
        } toolsContainer rounded mt-1 flex-wrap`}
    // style={{ borderLeftColor: ui.borderColor || "#646464ff" }}
    >
      <div
        className={`toolsTextContainer ${ui.open ? "taskhead" : ""} cursor-pointer d-flex justify-content-between flex-wrap w-100 m-0 p-0 align-items-center`}
        onClick={(e) => {
          if (e.target === e.currentTarget && ui.isTask) {
            handlers.scrollCardToCenter(e);
            ui.setOpen((prev) => !prev); // only toggle if clicked directly on parent
          }
        }}
      >
        <div className="taskList-toolsText">
          <img className={"taskList-image"} src={taskList} alt="taskList" />
          &#160;&#160;
          {/* {cardData.card.totalToolCount} */}
          {Array.isArray(cardData.card.toolList)
            ? cardData.card.toolList
              ?.map((e) => e.listOfTools?.length)
              .reduce((a, b) => a + b, 0)
            : 0} {"SUBTASK"}
        </div>
        <div className="d-flex align-items-center gap-2">
          {ui.isTask && Array.isArray(cardData.card.toolList) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                ui.setOpen(!ui.open);
              }}
              className="btn border-0 arrowDown"
            >
              <img src={ui.open ? UpArrow : ArrowDown} alt="ArrowDown" />
            </button>
          )}
        </div>
      </div>

      {ui.isTask &&
        cardData.card.toolList !== undefined &&
        cardData.card.toolList?.length > 0 && (
          <Collapse in={ui.open}>
            <div className="flow-group-main-container">
              <div className="tool-count-container">
                <h6 className="seleted-tool-count">
                  {cardData.card?.toolList?.reduce(
                    (count, t) =>
                      count +
                      t.listOfTools?.filter((item) => item.selected).length,
                    0,
                  ) || 0}
                  /
                  {cardData.card?.toolList?.reduce(
                    (sum, item) => sum + item?.listOfTools?.length,
                    0,
                  )}
                </h6>
                <div className="tool-count-col2">
                  {cardData.card?.toolList &&
                    cardData.card?.toolList[0]?.listOfTools?.length > 1 && (
                      <>
                        <div
                          className="flex-name-checkbox"
                          onClick={() => {
                            handlers.handleSelectAllFlowTools(
                              cardData.card.orderId,
                            );
                          }}
                        >
                          <img
                            className="checkbox-img"
                            src={
                              cardData.card?.toolList?.every((flow) =>
                                flow.listOfTools?.every(
                                  (tool) => tool.selected,
                                ),
                              )
                                ? checkedBlueIcon
                                : blueBorderUnchecked
                            }
                            alt="checkbox-img"
                          />
                          <span className="selectAllHead">{"Select All"}</span>
                        </div>
                        {cardData.card?.toolList?.every((flow) =>
                          flow.listOfTools?.every((tool) => tool.selected),
                        ) && (
                            <KebabMenu
                              isAllFlowSelected={true}
                              isSelected={true}
                              defaultToolAssignee={[]}
                              isGrouped={true}
                              getData={cardData.card?.toolList[0]}
                              reloadTask={(data, flag1, flag2, flag3) => {
                                handlers.reloadTask(data, flag1, flag2, flag3);
                                handlers.setSelectAllFlowTools(false);
                              }}
                              labelData={cardData.stage}
                              boardData={cardData.boardData}
                              toolSelected={cardData.card?.toolList
                                ?.map(
                                  (flow) =>
                                    flow.listOfTools?.filter(
                                      (tool) => tool.selected,
                                    ) || [],
                                )
                                .flat()}
                              ticketData={cardData.card}
                              isTask={ui.isTask}
                            />
                          )}
                      </>
                    )}
                </div>
              </div>
              <div
                className="flow-group-container"
                ref={refs.containerRef}
                style={{
                  maxHeight: `${ui.toolBoxheight}px`,
                  position: "relative",
                }}
              >
                {cardData.card?.toolList &&
                  cardData.card?.toolList.map((flow, i) => {
                    const multipleFlows = cardData.card.toolList.length > 1;

                    // consider any flow OR tool selection across flows
                    const anyFlowOrToolSelected = cardData.card.toolList.some(
                      (f) =>
                        f.selected === true ||
                        f.listOfTools?.some((t) => t.selected === true),
                    );

                    // THIS is the important change:
                    // a flow is *active* if flow.selected === true OR any tool in it is selected
                    const isFlowActive =
                      flow.selected === true ||
                      flow.listOfTools?.some((t) => t.selected) === true;
                    // disable flow when there are multiple flows, any selection exists,
                    // and this flow is NOT the active one
                    const isDisabled =
                      multipleFlows && anyFlowOrToolSelected && !isFlowActive;
                    return (
                      <Fragment
                        key={`${cardData.card.orderId}_${flow.flowId}_${i}`}
                      >
                        <ul className="flow-group">
                          {flow?.listOfTools?.map((flowTool) => (
                            <li
                              key={`${cardData.card.orderId}_${flow.flowId}_${flowTool.toolTicketId}`}
                              className={`tool-name ${isDisabled ? "disabled" : ""
                                }`}
                              data-card-id={cardData.card.orderId}
                              data-tool-ticket-id={flowTool.toolTicketId}
                              draggable={ui.isDraggable && !isDisabled}
                              onDragStart={(e) => {
                                if (isDisabled || !ui.isDraggable) return;
                                handlers.onDragStartTool?.(
                                  e,
                                  cardData.card,
                                  flowTool,
                                  cardData.stage,
                                  e.currentTarget,
                                );
                              }}
                              onDragEnd={(e) => {
                                e.currentTarget.classList.remove("is-dragging");
                              }}
                            >
                              <ToolRowHoverShell
                                disabled={isDisabled}
                                selected={flowTool.selected}
                                onActionActivate={() => {
                                  if (!isDisabled)
                                    handlers.ensureToolSelected?.(flow, flowTool);
                                }}
                              >
                                {({ showRowActions }) => {
                                  const showSingleToolActions =
                                    showRowActions &&
                                    flow?.listOfTools?.length === 1;
                                  const showMultiToolActions =
                                    showRowActions &&
                                    !cardData.card?.toolList?.every((f) =>
                                      f.listOfTools?.every((tool) => tool.selected),
                                    ) &&
                                    flow.listOfTools.length > 0 &&
                                    flow?.listOfTools?.length !== 1;

                                  return (
                                    <>
                                <div className="first-col-name-duedate">
                                  <div
                                    className={`flex-name-checkbox${showRowActions ? " is-row-active" : ""}`}
                                    onClick={() => {
                                      if (!isDisabled)
                                        handlers.selectToolChange(
                                          flow,
                                          flowTool,
                                        );
                                    }}
                                  >
                                    <img
                                      className="checkbox-img"
                                      // use the tool's selected state for tool checkbox image
                                      src={
                                        flowTool.selected
                                          ? checkedBlueIcon
                                          : unCheckedBlueIcon
                                      }
                                      alt=""
                                    />
                                    <span
                                      className="toolName"
                                      title={flowTool.toolName}
                                    >
                                      {flowTool.toolName}
                                    </span>
                                  </div>
                                  <div className="d-flex gap-2 task-list-meta-row">
                                    {/* {flowTool?.dueDate && ( */}
                                    <div
                                      className="flex-dueDate"
                                      style={{
                                        color: getDueDateColor(
                                          flowTool?.dueDate,
                                          ui.isLastStage,
                                        ),
                                      }}
                                    >
                                      {/* {flowTool?.dueDate && ( */}
                                      <img
                                        src={TimerIcon}
                                        className="timerIcon"
                                        alt="TimerIcon"
                                      />
                                      {/* )} */}
                                      <span className="dueDate">
                                        {flowTool?.dueDate ?
                                          dayjs(flowTool?.dueDate).format(
                                            "DD MMM YYYY",
                                          ) : "--"}
                                      </span>
                                    </div>
                                    {/* )} */}
                                    {renderTaskListPriority(
                                      flowTool,
                                      ui?.taskPriority?.data,
                                      "task-priority-list",
                                    )}
                                    {!isOrdersWorkspace() && (
                                      <SubToolLabels
                                        card={flowTool}
                                        labelList={ui?.freeFlowLabelList?.data}
                                        labelIds={flowTool?.freeFlowLabelId}
                                        className="task-list-sub-tool-labels"
                                      />
                                    )}
                                  </div>
                                </div>

                                <div className="second-col-assigne-menu">
                                  {flowTool?.assignee?.length > 0 ? (
                                    <div
                                      className="avatars"
                                      title={
                                        flowTool?.assignee[0].name ||
                                        "User Name"
                                      }
                                      onClick={(event) => {
                                        handlers.handleChangeAssignee(
                                          flowTool?.toolTicketId,
                                          event,
                                        );
                                        handlers.setSelectedUser(
                                          flowTool?.assignee,
                                        );
                                      }}
                                    >
                                      <LogoAvatarShowLetter
                                        genaralData={
                                          flowTool?.assignee[0] || null
                                        }
                                        profileName={"name"}
                                        outerClassName={"avatars__item"}
                                        innerClassName={"avatars__img"}
                                        showTitle={flowTool?.assignee[0]?.name}
                                      ></LogoAvatarShowLetter>
                                    </div>
                                  ) : (
                                    showRowActions && (
                                      <div className="kebab-notassignee-btn">
                                        <button
                                          className="kebab-assignee-btn"
                                          onClick={(event) => {
                                            handlers.handleChangeAssignee(
                                              flowTool?.toolTicketId,
                                              event,
                                            );
                                            handlers.setSelectedUser([]);
                                          }}
                                        >
                                          <img
                                            src={UserAddPrimary}
                                            alt="UserAddPrimary"
                                          />
                                        </button>
                                      </div>
                                    )
                                  )}
                                  <ViewTaskIconButton
                                    isTask={ui.isTask}
                                    boardData={cardData.boardData}
                                    ticketData={cardData.card}
                                    flowTool={flowTool}
                                    visible={showRowActions}
                                  />
                                  {showSingleToolActions && (
                                        <KebabMenu
                                          isSelected={true}
                                          defaultToolAssignee={
                                            flowTool.assignee
                                          }
                                          isGrouped={false}
                                          getData={flow}
                                          reloadTask={(
                                            data,
                                            flag1,
                                            flag2,
                                            flag3,
                                          ) => {
                                            handlers.reloadTask(
                                              data,
                                              flag1,
                                              flag2,
                                              flag3,
                                            );
                                            handlers.setSelectAllFlowTools(
                                              false,
                                            );
                                          }}
                                          labelData={cardData.stage}
                                          boardData={cardData.boardData}
                                          toolSelected={flowTool}
                                          ticketData={cardData.card}
                                          isTask={ui.isTask}
                                        />
                                    )}

                                  {showMultiToolActions && (
                                        <KebabMenu
                                          isSelected={true}
                                          defaultToolAssignee={
                                            flowTool.assignee
                                          }
                                          isGrouped={false}
                                          getData={flow}
                                          reloadTask={(
                                            data,
                                            flag1,
                                            flag2,
                                            flag3,
                                          ) => {
                                            handlers.reloadTask(
                                              data,
                                              flag1,
                                              flag2,
                                              flag3,
                                            );
                                            handlers.setSelectAllFlowTools(
                                              false,
                                            );
                                          }}
                                          labelData={cardData.stage}
                                          boardData={cardData.boardData}
                                          toolSelected={flowTool}
                                          ticketData={cardData.card}
                                          isTask={ui.isTask}
                                        />
                                    )}
                                  {assignee.openAssignee &&
                                    assignee.getToolTicketId ===
                                    flowTool?.toolTicketId &&
                                    !selection.selectAllFlowTools &&
                                    createPortal(
                                      <div
                                        className="kebabDropDown shadow p-3"
                                        style={{
                                          position: "absolute",
                                          ...assignee.position,
                                        }}
                                        ref={refs.popupRef}
                                      >
                                        <ToolAssignMember
                                          apiLoading={assignee.apiLoading}
                                          flowData={flow}
                                          toolSelected={flowTool}
                                          assigneeList={selection.AssigneeList}
                                          selectedUser={selection.selectedUser}
                                          updateTool={handlers.updateTool}
                                          setApiLoading={handlers.setApiLoading}
                                          setOpenAssignee={
                                            handlers.setOpenAssignee
                                          }
                                        />
                                      </div>,
                                      document.body,
                                    )}
                                </div>
                                    </>
                                  );
                                }}
                              </ToolRowHoverShell>
                            </li>
                          ))}
                        </ul>
                      </Fragment>
                    );
                  })}
              </div>
              {/* Resize Controls */}
              {assignee.card?.toolList?.reduce(
                (sum, item) => sum + item?.listOfTools?.length,
                0,
              ) > 5 && (
                  <div className="position-relative">
                    <div
                      onMouseDown={resize.startResizing}
                      onContextMenu={(e) => e.preventDefault()} // no menu on right-click
                      title="Left-click & drag to resize"
                      className="resizingButton"
                    >
                      ↕
                    </div>
                  </div>
                )}
            </div>
          </Collapse>
        )}
    </div>
  );
};

export default TasklListView;

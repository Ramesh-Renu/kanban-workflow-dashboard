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
import { getDueDateColor } from "../../../utils/common";
import dayjs from "dayjs";
import { createPortal } from "react-dom";
import ToolAssignMember from "../KebabMenu/ToolAssignMember";
import {
  ToolRowHoverShell,
  ViewTaskIconButton,
} from "../ToolRowViewMenu";

const ToolListView = ({
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
      style={{ border: " 2px solid", borderColor: "var(--color-white) var(--color-white) var(--color-white) #0099ff", borderLeftColor: ui.borderColor || "#646464ff" }}
    >
      <div
        className="toolsTextContainer cursor-pointer d-flex justify-content-between flex-wrap w-100 m-0 p-0 align-items-center"
        onClick={(e) => {
          if (e.target === e.currentTarget && ui.isSubTask) {
            handlers.scrollCardToCenter(e);
            ui.setOpen((prev) => !prev); // only toggle if clicked directly on parent
          }
        }}
      >
        <div className="toolsText">
          {"Tools"} :{" "}
          {ui.isMainTask
            ? cardData.card?.totalToolCount
            : Array.isArray(cardData.card.toolList)
              ? cardData.card.toolList
                ?.map((e) => e.listOfTools?.length)
                .reduce((a, b) => a + b, 0)
              : 0}
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="avatars">
            {ui.isMainTask &&
              cardData.boardData[0]?.code === "OB" &&
              (cardData.card?.assignee?.length > 0 ? (
                <LogoAvatarShowLetter
                  genaralData={cardData.card?.assignee?.[0]}
                  profileName={"name"}
                  outerClassName={"avatars__item"}
                  innerClassName={"avatars__img"}
                  index={"teammeber-"}
                  key={"teammeber-"}
                  showTitle={cardData.card?.assignee?.[0]?.name}
                />
              ) : (
                <div className="circle-badge">
                  <span>N/A</span>
                </div>
              ))}
          </div>
          {ui.isSubTask && Array.isArray(cardData.card.toolList) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                ui?.setOpen(!ui.open);
              }}
              className="btn border-0 arrowDown"
            >
              <img src={ui.open ? UpArrow : ArrowDown} alt="ArrowDown" />
            </button>
          )}
        </div>
      </div>

      {ui.isSubTask &&
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
                  {cardData.card?.toolList.length > 1 && (
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
                              flow.listOfTools?.every((tool) => tool.selected),
                            )
                              ? checkedBlueIcon
                              : blueBorderUnchecked
                          }
                          alt="checkbox-img"
                        />
                        <span className="selectAllHead">{"Select All"}</span>
                      </div>

                      {selection.selectAllFlowTools &&
                        cardData.card.orderId === selection.getTicketId &&
                        cardData.card?.toolList?.every((flow) =>
                          flow.listOfTools?.every((tool) => tool.selected),
                        ) && (
                          <KebabMenu
                            isAllFlowSelected={true}
                            isSelected={true}
                            defaultToolAssignee={[]}
                            isGrouped={false}
                            getData={[]}
                            reloadTask={(data, flag1, flag2, flag3) => {
                              handlers.reloadTask(data, flag1, flag2, flag3);
                              handlers.setSelectAllFlowTools(false);
                            }}
                            labelData={cardData.stage}
                            boardData={cardData.boardData}
                            toolSelected={{}}
                            ticketData={cardData.card}
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
                        {ui.isSubTask && (
                          <div className="d-flex algin-center justify-content-between">
                            <h5
                              className={`subTask-subTool-checkbox flow-heading ${isDisabled ? "disabled" : ""
                                }`}
                              onClick={() => {
                                if (!isDisabled)
                                  handlers.selectFlowChange(flow);
                              }}
                            >
                              <img
                                className="checkbox-img"
                                // use flow.selected for the flow-checkbox image
                                src={
                                  flow.selected
                                    ? checkedBlueIcon
                                    : unCheckedBlueIcon
                                }
                                alt=""
                              />
                              <span
                                className="flowName"
                                title={flow.flowName}
                              >
                                {flow.flowName}
                              </span>
                            </h5>
                            {flow.selected && !selection.selectAllFlowTools && (
                              <KebabMenu
                                show={true}
                                isSelected={flow.selected}
                                defaultToolAssignee={flow?.listOfTools?.length === 1 ? flow.listOfTools[0].assignee : []}
                                isGrouped={true}
                                getData={flow}
                                reloadTask={(data, flag1, flag2, flag3) => {
                                  handlers.reloadTask(
                                    data,
                                    flag1,
                                    flag2,
                                    flag3,
                                  );
                                  handlers.setSelectAllFlowTools(false);
                                }}
                                labelData={cardData.stage}
                                boardData={cardData.boardData}
                                toolSelected={null}
                                ticketData={cardData.card}
                              />
                            )}
                          </div>
                        )}

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
                                  {flowTool?.dueDate && (
                                    <div
                                      className="flex-dueDate"
                                      style={{
                                        color: getDueDateColor(
                                          flowTool?.dueDate,
                                          ui.isLastStage,
                                        ),
                                      }}
                                    >
                                      {flowTool?.dueDate && (
                                        <img
                                          src={TimerIcon}
                                          className="timerIcon"
                                          alt="TimerIcon"
                                        />
                                      )}
                                      <span className="dueDate">
                                        {flowTool?.dueDate &&
                                          dayjs(flowTool?.dueDate).format(
                                            "DD MMM YYYY",
                                          )}
                                      </span>
                                    </div>
                                  )}
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
                                        genaralData={flowTool?.assignee[0]}
                                        profileName={"name"}
                                        outerClassName={"avatars__item"}
                                        innerClassName={"avatars__img"}
                                        showTitle={flowTool?.assignee[0]?.name}
                                      ></LogoAvatarShowLetter>
                                    </div>
                                  ) : (
                                    showRowActions &&
                                    !flow.selected && (
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
                                    isTask={false}
                                    boardData={cardData.boardData}
                                    ticketData={cardData.card}
                                    flowTool={flowTool}
                                    visible={showRowActions}
                                  />
                                  {showRowActions &&
                                    !flow.selected &&
                                    !selection.selectAllFlowTools && (
                                      <KebabMenu
                                        isSelected={true}
                                        defaultToolAssignee={flowTool.assignee}
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
                                          handlers.setSelectAllFlowTools(false);
                                        }}
                                        labelData={cardData.stage}
                                        boardData={cardData.boardData}
                                        toolSelected={flowTool}
                                        ticketData={cardData.card}
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
                                          assigneeList={selection?.AssigneeList}
                                          selectedUser={selection?.selectedUser}
                                          updateTool={handlers?.updateTool}
                                          setApiLoading={
                                            handlers?.setApiLoading
                                          }
                                          setOpenAssignee={
                                            handlers?.setOpenAssignee
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

export default ToolListView;

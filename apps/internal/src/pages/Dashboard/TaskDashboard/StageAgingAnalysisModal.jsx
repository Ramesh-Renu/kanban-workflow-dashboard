import React, { memo, useMemo } from "react";
import { PopupModal } from "@orion/shared";
import dayjs from "dayjs";
import { closeIcon } from "assets/images";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";
import { resolveStageDistributionColor } from "utils/dashboard";
import { getDueDateColor } from "utils/common";
const DEFAULT_AGING_BUCKETS = [
  { key: "age0To3", label: "0–3 days", color: "#84CC16", ageNames: ["0-3d", "0–3d"] },
  { key: "age4To7", label: "4–7 days", color: "#F59E0B", ageNames: ["4-7d", "4–7d"] },
  { key: "age8Plus", label: "8+ days", color: "#EF4444", ageNames: ["8+d", "8+d"] },
];

const normalizeStageSummary = (response, selectedStageRow) => {
  if (!response) return null;

  if (Array.isArray(response)) {
    if (!response.length) return null;
    const selectedId = selectedStageRow?.id;
    if (selectedId != null) {
      return (
        response.find((item) => String(item.stageId ?? item.id) === String(selectedId)) ??
        response[0]
      );
    }
    return response[0];
  }

  return response;
};

const buildTicketGroups = (stageSummary, selectWorkspaceDashboard) =>
  (stageSummary?.listOfTickets ?? [])
    .map((ticket) => ({
      orderId: ticket.orderId,
      ticketName: ticket.ticketName ?? "—",
      tools: (ticket.listOfTools ?? []).map((tool) => ({
        id: `${ticket.orderId}-${tool.toolTicketId ?? tool.toolId}`,
        toolName:
          selectWorkspaceDashboard === 1 ? tool.toolName : (tool.toolTicketName ?? "—"),
        assignee: tool.assignee ?? [],
        stageDays: tool.stageDays,
        enteredDate: tool.enteredDate,
        dueDate: tool?.dueDate,
      })),
    }))
    .filter((group) => group.tools.length > 0);

const flattenTools = (groups) => groups.flatMap((group) => group.tools);

const buildAgingBuckets = (stageRow, stageSummary) => {
  const ageList = stageSummary?.ageList;
  if (Array.isArray(ageList) && ageList.length) {
    const counts = { age0To3: 0, age4To7: 0, age8Plus: 0 };
    const colors = { age0To3: null, age4To7: null, age8Plus: null };

    ageList.forEach((item) => {
      const ageName = item?.ageName ?? "";
      const count = Number(item?.ageCount ?? item?.count ?? 0);
      const bucket = DEFAULT_AGING_BUCKETS.find((def) =>
        def.ageNames.some((name) => name === ageName),
      );
      if (!bucket) return;
      counts[bucket.key] = count;
      colors[bucket.key] =
        item?.colorCode ?? item?.color_code ?? item?.color_Code ?? null;
    });

    return DEFAULT_AGING_BUCKETS.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      count: counts[bucket.key] ?? 0,
      color: colors[bucket.key] ?? bucket.color,
    }));
  }

  return DEFAULT_AGING_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: Number(stageRow?.[bucket.key] ?? 0),
    color: bucket.color,
  }));
};

const buildSummaryMeta = (stageRow, stageSummary, agingBuckets, toolRows) => {
  const bucketTotal = agingBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const totalTasks =
    Number(stageSummary?.totalTicketCount ?? stageSummary?.totalTaskCount) ||
    toolRows.length ||
    bucketTotal ||
    Number(stageRow?.total ?? 0);

  const stageDaysValues = toolRows
    .map((row) => Number(row.stageDays))
    .filter((value) => Number.isFinite(value));

  const apiAvgAge =
    stageSummary?.avgAge ?? stageSummary?.averageAge ?? stageSummary?.avgDaysInStage;
  const avgAge =
    apiAvgAge != null && apiAvgAge !== ""
      ? Number(apiAvgAge).toFixed(1)
      : stageDaysValues.length > 0
        ? (
            stageDaysValues.reduce((sum, value) => sum + value, 0) /
            stageDaysValues.length
          ).toFixed(1)
        : bucketTotal > 0
          ? (
              (agingBuckets[0].count * 2 +
                agingBuckets[1].count * 5.5 +
                agingBuckets[2].count * 10) /
              bucketTotal
            ).toFixed(1)
          : "—";

  const apiOverdue =
    stageSummary?.overduePercent ??
    stageSummary?.overduePercentage ??
    stageSummary?.overduePopPercent;
  const overduePercent =
    apiOverdue != null && apiOverdue !== ""
      ? Math.round(Number(apiOverdue))
      : bucketTotal > 0
        ? Math.round(((agingBuckets[2]?.count ?? 0) / bucketTotal) * 100)
        : 0;

  return { totalTasks, avgAge, overduePercent };
};

const getAssigneeName = (tool) => (
  <>
    {tool?.assignee?.length > 0 ? (
      tool.assignee.map((assignee, idx) => (
        <div key={idx} className="py-1 tools_info_board_stage d-flex avatars">
          <LogoAvatarShowLetter
            genaralData={assignee}
            profileName="displayName"
            outerClassName="avatars__item stage_Badge"
            innerClassName="avatars__img"
          />
        </div>
      ))
    ) : (
      <div className="py-1 tools_info_board_stage d-flex avatars">
        <span className="circle-badge stage_Badge">N/A</span>
      </div>
    )}
  </>
);

const formatStageEntered = (date) => (date ? dayjs(date).format("DD MMM, YYYY") : "—");
const formatDate = (date) => (date ? dayjs(date).format("DD MMM, YYYY") : "—");
const formatDaysInStage = (days) => (days != null && days !== "" ? days : "—");

const StageAgeSidebarRow = ({ row, ageLegend, isActive, onSelect }) => {
  const bucketTotal = row.age0To3 + row.age4To7 + row.age8Plus;
  const total = bucketTotal > 0 ? bucketTotal : Number(row.total ?? 0);
  const segments = ageLegend.map((bucket) => ({
    ...bucket,
    count: row[bucket.key] ?? 0,
    width: total > 0 ? `${Math.max(0, (row[bucket.key] / total) * 100)}%` : "0%",
  }));

  return (
    <button
      type="button"
      className={`task-stage-distribution__age-row stage-aging-analysis-modal__stage-row${
        isActive ? " stage-aging-analysis-modal__stage-row--active" : ""
      }`}
      onClick={() => {
        if (!isActive) onSelect(row);
      }}
    >
      <div className="task-stage-distribution__age-row-head">
        <span className="task-stage-distribution__age-row-title">
          <span
            className="task-stage-distribution__legend-dot"
            style={{ backgroundColor: resolveStageDistributionColor(row.color) }}
          />
          {row.name}
        </span>
        <span className="task-stage-distribution__age-row-total">
          {total}
          <span className="task-stage-distribution__age-row-chevron" aria-hidden>
            ›
          </span>
        </span>
      </div>
      <div className="task-stage-distribution__age-bar" aria-hidden>
        {segments.map((segment) =>
          segment.count > 0 ? (
            <span
              key={segment.key}
              className="task-stage-distribution__age-bar-segment"
              style={{
                width: segment.width,
                backgroundColor: resolveStageDistributionColor(segment.color),
              }}
            />
          ) : null,
        )}
      </div>
      <div className="task-stage-distribution__age-breakdown">
        {segments.map((segment) => (
          <span key={segment.key} className="task-stage-distribution__age-breakdown-item">
            <span
              className="task-stage-distribution__legend-dot task-stage-distribution__legend-dot--sm"
              style={{
                backgroundColor: resolveStageDistributionColor(segment.color),
              }}
            />
            <strong>{segment.count}</strong>
            <span
              className="task-stage-distribution__age-breakdown-separator"
              aria-hidden
            >
              ᛫
            </span>
            {segment.label}
          </span>
        ))}
      </div>
    </button>
  );
};

const StageAgingGroupedTable = ({ groups, isOrderWorkspace }) => {
  const ticketColumnLabel = isOrderWorkspace ? "Order Name" : "Main Task";
  const taskColumnLabel = isOrderWorkspace ? "Tools" : "Task";

  return (
    <div className="products__body-table dashboard_table stage-aging-analysis-modal__table">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="ticketName">
                <span className="order_orion_header">{ticketColumnLabel}</span>
              </th>
              <th className="toolName">
                <span className="order_orion_header">{taskColumnLabel}</span>
              </th>
              <th className="currentAssignee">
                <span className="order_orion_header">Assignee</span>
              </th>
              <th className="stageEntered">
                <span className="order_orion_header">Due Date</span>
              </th>
              <th className="stageEntered">
                <span className="order_orion_header">Entered Date</span>
              </th>
              <th className="daysInStage">
                <span className="order_orion_header">Days in stage</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group?.tools?.map((tool, toolIndex) => (
                <tr key={tool?.id}>
                  {toolIndex === 0 && (
                    <td rowSpan={group?.tools?.length} className="ticketName">
                      <span
                        className="truncate-2-lines board-dashboard-widget__table-company-name-link"
                        title={group?.ticketName}
                      >
                        {group.ticketName}
                      </span>
                    </td>
                  )}
                  <td className="toolName">
                    <span className="truncate-2-lines" title={tool?.toolName}>
                      {tool?.toolName}
                    </span>
                  </td>
                  <td className="currentAssignee">{getAssigneeName(tool)}</td>
                  <td className="stageEntered" id="dueDate" title={tool?.dueDate}>
                    <span style={{ color: getDueDateColor(tool?.dueDate) }}>
                      {formatDate(tool?.dueDate)}
                    </span>
                  </td>
                  <td className="stageEntered" id="enteredDate">
                    {formatStageEntered(tool?.enteredDate)}
                  </td>
                  <td className="daysInStage">{formatDaysInStage(tool?.stageDays)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StageAgingAnalysisModal = ({
  show,
  onClose,
  loading = false,
  stageRow,
  stageRows = [],
  ageLegend = [],
  onStageSelect,
  summaryResponse,
  selectWorkspaceDashboard,
}) => {
  const stageSummary = useMemo(
    () => normalizeStageSummary(summaryResponse, stageRow),
    [summaryResponse, stageRow],
  );

  const ticketGroups = useMemo(
    () => buildTicketGroups(stageSummary, selectWorkspaceDashboard),
    [stageSummary, selectWorkspaceDashboard],
  );
  const toolRows = useMemo(() => flattenTools(ticketGroups), [ticketGroups]);

  const agingBuckets = useMemo(
    () => buildAgingBuckets(stageRow, stageSummary),
    [stageRow, stageSummary],
  );

  const distributionBuckets = useMemo(() => {
    const legendByKey = new Map(ageLegend.map((item) => [item.key, item]));
    return agingBuckets.map((bucket) => {
      const legendItem = legendByKey.get(bucket.key);
      return {
        ...bucket,
        label: legendItem?.label ?? bucket.label,
        color: legendItem?.color ?? bucket.color,
      };
    });
  }, [agingBuckets, ageLegend]);

  const maxAgingCount = useMemo(
    () => distributionBuckets.reduce((max, bucket) => Math.max(max, bucket.count), 0),
    [distributionBuckets],
  );

  const { totalTasks, avgAge, overduePercent } = useMemo(
    () => buildSummaryMeta(stageRow, stageSummary, agingBuckets, toolRows),
    [stageRow, stageSummary, agingBuckets, toolRows],
  );

  const stageTitle = stageSummary?.stageName || stageRow?.name || "Stage";
  const isOrderWorkspace = Number(selectWorkspaceDashboard) === 1;
  const selectedStageId = stageRow?.id != null ? String(stageRow.id) : null;

  return (
    <PopupModal
      show={show}
      onClose={onClose}
      header={false}
      title=""
      size="xl"
      centered
      backdrop
      customClassName="stage-aging-analysis-modal"
      className="stage-aging-analysis-modal__body"
    >
      <button
        type="button"
        className="stage-aging-analysis-modal__close"
        onClick={onClose}
        aria-label="Close aging analysis"
      >
        <img src={closeIcon} alt="" aria-hidden />
      </button>

      <div className="stage-aging-analysis-modal__header">
        <div className="stage-aging-analysis-modal__header-left">
          <div className="stage-aging-analysis-modal__title-row">
            <h2 className="stage-aging-analysis-modal__title">
              {stageTitle} — Aging Analysis
            </h2>
            <span className="stage-aging-analysis-modal__badge">{totalTasks} Tasks</span>
          </div>
          <p className="stage-aging-analysis-modal__subtitle">
            Avg age <strong>{avgAge}d</strong> ·{" "}
            <strong>{overduePercent}% overdue</strong> · Workflow stage drilldown
          </p>
        </div>
        <ul className="stage-aging-analysis-modal__distribution-list">
          {distributionBuckets.map((bucket, index) => (
            <li
              key={bucket.key}
              className="stage-aging-analysis-modal__distribution-item"
            >
              <div className="stage-aging-analysis-modal__distribution-row">
                <span className="stage-aging-analysis-modal__distribution-label">
                  <span
                    className="stage-aging-analysis-modal__distribution-dot"
                    style={{
                      backgroundColor: resolveStageDistributionColor(bucket.color, index),
                    }}
                  />
                  {bucket.label}
                </span>
                <span className="stage-aging-analysis-modal__distribution-count">
                  {bucket.count} tasks
                </span>
              </div>
              <div className="stage-aging-analysis-modal__distribution-track" aria-hidden>
                <span
                  className="stage-aging-analysis-modal__distribution-fill"
                  style={{
                    width: `${maxAgingCount > 0 ? (bucket.count / maxAgingCount) * 100 : 0}%`,
                    backgroundColor:
                      bucket.count > 0
                        ? resolveStageDistributionColor(bucket.color, index)
                        : "#eef2f7",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="stage-aging-analysis-modal__content">
        <aside className="stage-aging-analysis-modal__stage-sidebar">
          <h3 className="stage-aging-analysis-modal__distribution-title">Stages</h3>
          {ageLegend.length > 0 && (
            <div className="task-stage-distribution__age-legend stage-aging-analysis-modal__age-legend">
              {ageLegend.map((item, index) => (
                <span key={item.key} className="task-stage-distribution__age-legend-item">
                  <span
                    className="task-stage-distribution__legend-dot task-stage-distribution__legend-dot--sm"
                    style={{
                      backgroundColor: resolveStageDistributionColor(item.color, index),
                    }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          )}
          <div className="stage-aging-analysis-modal__stage-list">
            {stageRows.map((row) => (
              <StageAgeSidebarRow
                key={row.id}
                row={row}
                ageLegend={ageLegend}
                isActive={selectedStageId === String(row.id)}
                onSelect={onStageSelect}
              />
            ))}
          </div>
        </aside>

        <section className="stage-aging-analysis-modal__table-wrap">
          {loading ? (
            <div className="stage-aging-analysis-modal__loading" aria-busy="true">
              <div className="loading-skeleton stage-aging-analysis-modal__loading-skeleton" />
            </div>
          ) : ticketGroups.length > 0 ? (
            <StageAgingGroupedTable
              groups={ticketGroups}
              isOrderWorkspace={isOrderWorkspace}
            />
          ) : (
            <div className="stage-aging-analysis-modal__empty">
              <p className="workspace-widget__no-data-found w-100">No Data Found</p>
            </div>
          )}
        </section>
      </div>
    </PopupModal>
  );
};

export default memo(StageAgingAnalysisModal);

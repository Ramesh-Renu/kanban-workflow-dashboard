import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SelectDropDown from "@orion/shared/src/components/SelectDropDown";
import { Fragment } from "react";

/** Stacked bar tooltip — avoids empty/wrong label from default tooltip */
function StageStackTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="task-dashboard-charts__stage-tooltip">
      <div className="task-dashboard-charts__stage-tooltip__title">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="task-dashboard-charts__stage-tooltip__row">
          <span className="task-dashboard-charts__stage-tooltip__name">{entry.name}</span>
          <span
            className="task-dashboard-charts__stage-tooltip__value"
            style={{ color: entry.color }}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Demo data — replace with API when available (order = top → bottom on Y-axis) */
const STAGE_DISTRIBUTION_DATA = [
  { stage: "Final QC", bucket1: 35, bucket2: 0, bucket3: 0 },
  { stage: "Live", bucket1: 23, bucket2: 0, bucket3: 0 },
  { stage: "Client Testing", bucket1: 1, bucket2: 0, bucket3: 0 },
  { stage: "First Level QC", bucket1: 12, bucket2: 0, bucket3: 0 },
  { stage: "Open", bucket1: 10, bucket2: 0, bucket3: 0 },
  { stage: "Completed", bucket1: 8, bucket2: 0, bucket3: 0 },
  { stage: "In-progress", bucket1: 3, bucket2: 0, bucket3: 0 },
];

const TASK_DISTRIBUTION_DATA = [
  { stage: "0-2 Days (New)", bucket1: 10, bucket2: 0, bucket3: 0 },
  { stage: "3-5 Days (Early)", bucket1: 23, bucket2: 0, bucket3: 0 },
  { stage: "6-10 Days (Aging)", bucket1: 12, bucket2: 0, bucket3: 0 },
  { stage: "11-20 Days (Dealyed)", bucket1: 0, bucket2: 0, bucket3: 0 },
  { stage: "21+ Days (Critical)", bucket1: 0, bucket2: 0, bucket3: 0 },
];

const STAGE_AND_TASK_DISTRIBUTION_DATA = [
  { stage: "Final QC", bucket1: 2, bucket2: 2, bucket3: 1 },
  { stage: "Live", bucket1: 0, bucket2: 2, bucket3: 4 },
  { stage: "Client Testing", bucket1: 1, bucket2: 2, bucket3: 4 },
  { stage: "First Level QC", bucket1: 2, bucket2: 3, bucket3: 10 },
  { stage: "Open", bucket1: 2, bucket2: 8, bucket3: 12 },
  { stage: "Completed", bucket1: 3, bucket2: 9, bucket3: 18 },
  { stage: "In-progress", bucket1: 3, bucket2: 13, bucket3: 19 },
];

const STAGE_AGING_ANALYSIS = [
  { stage: "Final QC", bucket1: 2, bucket2: 2, bucket3: 1 },
  { stage: "Live", bucket1: 23, bucket2: 2, bucket3: 4 },
  { stage: "Client Testing", bucket1: 1, bucket2: 2, bucket3: 4 },
  { stage: "First Level QC", bucket1: 12, bucket2: 3, bucket3: 10 },
  { stage: "Open", bucket1: 10, bucket2: 8, bucket3: 12 },
  { stage: "Completed", bucket1: 8, bucket2: 9, bucket3: 18 },
  { stage: "In-progress", bucket1: 3, bucket2: 13, bucket3: 19 },
];

const VIEW_OPTIONS = [
  { id: "stage", name: "Stage" },
  { id: "task-age", name: "Task by Age" },
  { id: "stage-age", name: "Stage x Age(stacked)" },
  { id: "stage-aging-analys", name: "Stage Aging Analysis" },
];

const AGE_BASIS_OPTIONS = [
  { id: "stage-entered", name: "Stage Entered Date" },
  { id: "created", name: "Task Created Date" },
];

const ASSIGNEE_BASE = [
  { name: "Barath", workload: 32, performance: 38, smart: 28 },
  { name: "Priya", workload: 24, performance: 30, smart: 22 },
  { name: "Sowmiya", workload: 18, performance: 22, smart: 20 },
  { name: "Dinesh", workload: 28, performance: 35, smart: 26 },
  { name: "Naveen", workload: 14, performance: 18, smart: 16 },
];

/** Stage stack series colors */
const CHART_BLUE = "#56CCF2";
const CHART_GREEN = "#27AE60";
const CHART_ORANGE = "#F2994A";
const WORKLOAD_BAR = "#3b82f6";

const STAGE_SOLID_BAR_COLORS = [
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
  "#f97316", // orange
  "#22c55e", // green
  "#eab308", // yellow
  "#ef4444", // red
];

const axisProps = {
  stroke: "#94a3b8",
  tick: { fill: "#cbd5e1", fontSize: 11 },
};

const TaskDashboardCharts = () => {
  const [viewOption, setViewOption] = useState([VIEW_OPTIONS[0]]);
  const [ageBasis, setAgeBasis] = useState([AGE_BASIS_OPTIONS[0]]);
  const [assigneeMode, setAssigneeMode] = useState("performance");
  const [chartData, setChartData] = useState(STAGE_DISTRIBUTION_DATA);

  const viewId = viewOption?.[0]?.id;
  // Figma "Stage Aging Analysis" shows grouped bars (not stacked).
  const isStageAgingAnalysis = viewId === "stage-aging-analys";
  const isSolidSingleBarView = viewId === "stage" || viewId === "task-age";
  const isStacked = !isStageAgingAnalysis;

  const solidBarData = useMemo(() => {
    if (!isSolidSingleBarView) return [];
    return chartData.map((row) => ({
      stage: row.stage,
      value: (row.bucket1 ?? 0) + (row.bucket2 ?? 0) + (row.bucket3 ?? 0),
    }));
  }, [chartData, isSolidSingleBarView]);

  const stageStackMax = useMemo(() => {
    if (isSolidSingleBarView) {
      if (!solidBarData.length) return 0;
      return Math.max(...solidBarData.map((d) => d.value ?? 0));
    }
    if (!chartData.length) return 0;
    return Math.max(
      ...chartData.map((d) => {
        if (isStacked) return d.bucket1 + d.bucket2 + d.bucket3;
        return Math.max(d.bucket1, d.bucket2, d.bucket3);
      }),
    );
  }, [chartData, isStacked, isSolidSingleBarView, solidBarData]);

  const stageXDomain = useMemo(() => {
    const cap = Math.max(10, Math.ceil((stageStackMax + 5) / 5) * 5);
    return [0, cap];
  }, [stageStackMax]);

  const workloadData = useMemo(() => {
    const key =
      assigneeMode === "workload"
        ? "workload"
        : assigneeMode === "performance"
          ? "performance"
          : "smart";
    return ASSIGNEE_BASE.map((row) => ({
      name: row.name,
      value: row[key],
    }));
  }, [assigneeMode]);
  const handleChangeViewOption = (v) => {
    // react-dropdown-select passes selected rows as an array, not a single object
    const selected = Array.isArray(v) ? v[0] : v;
    const nextView = selected?.id ? [selected] : [VIEW_OPTIONS[0]];
    setViewOption(nextView);
    const id = nextView[0]?.id;
    if (id === "stage") {
      setChartData(STAGE_DISTRIBUTION_DATA);
    } else if (id === "task-age") {
      setChartData(TASK_DISTRIBUTION_DATA);
    } else if (id === "stage-age") {
      setChartData(STAGE_AND_TASK_DISTRIBUTION_DATA);
    } else if (id === "stage-aging-analys") {
      setChartData(STAGE_AGING_ANALYSIS);
    }
  };

  return (
    <Fragment>
      <section
        className="task-dashboard-charts__panel"
        aria-label="Task stage distribution"
      >
        <div className="task-dashboard-charts__panel-head">
          <h3 className="task-dashboard-charts__title">Task stage distribution</h3>
          <div className="task-dashboard-charts__toolbar">
            <div className="task-dashboard-charts__field">
              <span className="task-dashboard-charts__label">VIEW</span>
              <SelectDropDown
                options={VIEW_OPTIONS}
                values={viewOption}
                onChange={(v) => handleChangeViewOption(v)}
                labelField="name"
                valueField="id"
                multi={false}
                searchable={false}
                clearable={false}
                optionType="radio"
                className="filter-select-dropDown dashboard-page__action-btn p-2 dashboard-page__action-btn--ghost task-dashboard-charts__select"
              />
            </div>
            <div className="task-dashboard-charts__field">
              <span className="task-dashboard-charts__label">AGE BASIS</span>
              <SelectDropDown
                options={AGE_BASIS_OPTIONS}
                values={ageBasis}
                onChange={(v) => setAgeBasis(v?.length ? v : [AGE_BASIS_OPTIONS[0]])}
                labelField="name"
                valueField="id"
                multi={false}
                searchable={false}
                clearable={false}
                optionType="radio"
                className="filter-select-dropDown dashboard-page__action-btn p-2 dashboard-page__action-btn--ghost task-dashboard-charts__select"
              />
            </div>
          </div>
        </div>
        <div className="task-dashboard-charts__chart task-dashboard-charts__chart--stage-stack">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              layout="vertical"
              data={isSolidSingleBarView ? solidBarData : chartData}
              margin={{ top: 12, right: 20, left: 4, bottom: 36 }}
              barCategoryGap={isSolidSingleBarView ? "6%" : "14%"}
              barGap={isSolidSingleBarView ? 0 : 2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
              <XAxis
                type="number"
                domain={stageXDomain}
                tick={{ fill: "#334155", fontSize: 11 }}
                stroke="#64748b"
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="stage"
                width={128}
                tickLine={false}
                tick={{ fill: "#0f172a", fontSize: 11 }}
                stroke="#64748b"
              />
              {isSolidSingleBarView ? (
                <Tooltip
                  cursor={{ fill: "rgba(15, 23, 42, 0.06)" }}
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    color: "#ffffff",
                  }}
                  labelStyle={{ color: "#ffffff" }}
                  itemStyle={{ color: "#ffffff" }}
                />
              ) : (
                <Tooltip
                  content={<StageStackTooltip />}
                  cursor={{ fill: "rgba(15, 23, 42, 0.06)" }}
                />
              )}
              {!isSolidSingleBarView && (
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  layout="horizontal"
                  wrapperStyle={{ paddingTop: 12 }}
                  formatter={(value) => (
                    <span style={{ color: "#334155", fontSize: 12 }}>{value}</span>
                  )}
                />
              )}
              {isSolidSingleBarView ? (
                <Bar dataKey="value" name="Tasks" radius={[0, 0, 0, 0]} maxBarSize={20}>
                  {solidBarData.map((_, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={STAGE_SOLID_BAR_COLORS[idx % STAGE_SOLID_BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              ) : (
                <>
                  <Bar
                    dataKey="bucket1"
                    name="0-2 days"
                    stackId={isStacked ? "stage-aging" : undefined}
                    fill={CHART_BLUE}
                    radius={[0, 0, 0, 0]}
                    barSize={isStageAgingAnalysis ? 6 : undefined}
                  />
                  <Bar
                    dataKey="bucket2"
                    name="3-5 days"
                    stackId={isStacked ? "stage-aging" : undefined}
                    fill={CHART_GREEN}
                    radius={[0, 0, 0, 0]}
                    barSize={isStageAgingAnalysis ? 6 : undefined}
                  />
                  <Bar
                    dataKey="bucket3"
                    name="6-10 days"
                    stackId={isStacked ? "stage-aging" : undefined}
                    fill={CHART_ORANGE}
                    radius={[0, 0, 0, 0]}
                    barSize={isStageAgingAnalysis ? 6 : undefined}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="task-dashboard-charts__panel" aria-label="Workload by assignee">
        <h3 className="task-dashboard-charts__title">Workload by Assignee</h3>
        <div
          className="task-dashboard-charts__radio-row"
          role="radiogroup"
          aria-label="Assignee view mode"
        >
          {[
            { id: "workload", label: "View by Workload" },
            { id: "performance", label: "View by Performance" },
            { id: "smart", label: "Smart Distribution" },
          ].map((opt) => (
            <label key={opt.id} className="task-dashboard-charts__radio">
              <input
                type="radio"
                name="assignee-mode"
                value={opt.id}
                checked={assigneeMode === opt.id}
                onChange={() => setAssigneeMode(opt.id)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <div className="task-dashboard-charts__chart">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={workloadData}
              margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
              <XAxis
                dataKey="name"
                {...axisProps}
                tick={{ fill: "#334155", fontSize: 12 }}
              />
              <YAxis
                type="number"
                domain={[0, 45]}
                {...axisProps}
                tickLine={false}
                tick={{ fill: "#0f172a", fontSize: 11 }}
                stroke="#64748b"
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: 8,
                  color: "#f8fafc",
                }}
              />
              <Bar
                dataKey="value"
                name="Tasks"
                fill={WORKLOAD_BAR}
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </Fragment>
  );
};

export default TaskDashboardCharts;

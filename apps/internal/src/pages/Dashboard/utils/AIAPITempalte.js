export const MetricAPIResponseTemplate = {
  caption: "Jun 17 → Jun 23",
  kpis: [
    {
      label: "Active tasks",
      count: 43,
      previousCount: 43,
      changePercent: 0,
      trend: "Ideal",
      polarity: "neutral",
    },
    {
      label: "Created tasks",
      count: 0,
      previousCount: 0,
      changePercent: 0,
      trend: "Ideal",
      polarity: "good",
    },
    {
      label: "Completed tasks",
      count: 0,
      previousCount: 0,
      changePercent: 0,
      trend: "Ideal",
      polarity: "good",
    },
    {
      label: "Overdue tasks",
      count: 37,
      previousCount: 34,
      changePercent: 8.8,
      trend: "Increase",
      polarity: "bad",
    },
  ],
  explain:
    "Overdue tasks climbed from 34 to 37 across the week while completions stayed at zero every day, so the backlog is aging rather than growing from new volume.",
  findings: [
    "Overdue count rose across three separate days before plateauing at 37",
    "Zero completed tasks were logged for all 7 days",
    "Active tasks stayed fixed at 43 all week, ruling out new-task volume as the cause",
  ],
  actions: [
    "Run a backlog review on the 37 overdue items to identify blockers",
    "Reassign or re-prioritize overdue tasks that have stalled for multiple days",
    "Set a daily minimum completion target",
  ],
  impact:
    "Even 3-5 completions a day would start reversing the overdue trend within days.",
  priority: "High",
};
export const SummarizationAPIResponseTemplate = {
  boardSummary: { totalBoards: 7, healthy: 4, atRisk: 3, needsAttention: 0 },
  orders: { created: 7, createdChangePercent: -12.5, active: 23, completed: 0 },
  subtasks: {
    created: 29,
    createdChangePercent: -21.6,
    active: 100,
    completed: 0,
    overdue: 32,
  },
  boards: [
    { name: "On Boarding", health: "At Risk", overdue: 32 },
    { name: "Production", health: "At Risk", overdue: 6 },
    { name: "Updates", health: "Healthy", overdue: 0 },
    { name: "Dividends", health: "Healthy", overdue: 0 },
    { name: "Analyst", health: "Healthy", overdue: 0 },
    { name: "PDA", health: "Healthy", overdue: 0 },
    { name: "IRAPPV3", health: "At Risk", overdue: 1 },
  ],
  summary: "Internal Order Delivery · rising volume, zero throughput",
  insights: [
    "Active volume is climbing at both layers (+43.8% orders, +40.9% sub-tasks) while completions sit at zero — work is piling up, not draining",
    "Nearly all backlog risk is concentrated in 2 of 7 boards: On Boarding (100 active, 32 overdue) and Production (14 active, 6 overdue)",
    "Daily velocity (Jun 18-24) shows the same pattern day by day — active tasks rose from 17 to 23 while completions stayed at 0 every day",
  ],
  risks: [
    "Zero completions for 7 consecutive days across orders and sub-tasks — a sustained stall, not a one-off dip",
    "On Boarding is simultaneously the busiest board and the most overdue — volume and risk concentrated in one place",
    "IRAPPV3 has 1 overdue task out of only 2 active (50% overdue rate) with zero new creation — work going stale, not overload",
  ],
  bottlenecks: [
    "On Boarding board — 100 active sub-tasks, 32 overdue, 0 completed; the single largest driver of volume and risk",
    "Platform-wide completion stall — every board with active work shows 0 completions, pointing to a process issue, not a team issue",
  ],
  actions: [
    "Run a backlog clearance sprint on On Boarding — it holds 100 active sub-tasks and all 32 overdue",
    "Audit Production and IRAPPV3 for blockers preventing completions despite active work being logged",
    "Investigate why daily velocity tracking shows null overdue every day when board-level reporting shows 32 — a monitoring gap",
  ],
  impact:
    "Clearing even a portion of the 32 overdue sub-tasks and restarting completions on the two at-risk boards would move the portfolio from 3-at-risk toward mostly healthy, closing the gap between rising volume and flat throughput.",
};
export const ActionPointsAPIResponseTemplate = {
  actions: [
    {
      priority: "P1",
      title: "Audit blockers on all active tasks",
      reason: "0 completions for 7 straight days despite active tasks climbing 17 to 23",
      result: "Turns an unexplained stall into specific, fixable blockers",
    },
    {
      priority: "P2",
      title: "Set a daily completion target",
      reason: "No threshold currently triggers escalation when output hits zero",
      result: "Even 2-3 completions a day restarts visible progress",
    },
    {
      priority: "P3",
      title: "Re-validate task statuses with assignees",
      reason: "A full week at zero may mean work is done but unmarked",
      result: "Confirms a real throughput issue versus a tracking issue",
    },
  ],
  risks: [
    "Active backlog keeps growing with no outflow this week",
    "Zero completions risks becoming normal and going unnoticed",
    "Stakeholders may assume progress that isn't actually happening",
  ],
  recommendation:
    "Treat this as an active incident this week — audit blockers and revalidate statuses before the backlog grows further.",
};
export const PerformanceVelocityAPIResponseTemplate = {
  status: "At Risk",
  statusNote: "100 tasks tracked across 8 assignees",
  top: [
    {
      name: "Prem Prasanna",
      photo:
        "https://easupportservicefs.blob.core.windows.net/profilephotos-dev/0ede4036-51f2-4629-9cd8-78691e57b4e1_photo.png",
      workload: 33,
      unit: "tasks",
      reason:
        "Carrying 33 of the 100 total tasks — a third of all tracked work. Strong output, but a single point of failure if unavailable.",
    },
    {
      name: "Jothikrishna Purushothaman",
      photo:
        "https://easupportservicefs.blob.core.windows.net/profilephotos-dev/c37d3fe5-5d3a-4e7a-9e0e-33157d93d507_photo.png",
      workload: 9,
      unit: "tasks",
      reason:
        "A sustainable load of 9 tasks, clearly absorbing real work without the concentration risk that comes with Prem's volume.",
    },
  ],
  attention: [
    {
      name: "Thangarasu Karuppasamy",
      photo:
        "https://easupportservicefs.blob.core.windows.net/profilephotos-dev/9af06fa7-f8ef-49e1-85ae-3d947e4eddce_photo.png",
      workload: 1,
      unit: "task",
      reason:
        "Just 1 task — unusually low next to teammates like Hema Rajasekar and Mageswari Thangasamy, who hold 6 each.",
    },
    {
      name: "Thinh Trinh Duc",
      photo:
        "https://easupportservicefs.blob.core.windows.net/profilephotos-dev/15bd06ef-fe7a-41b7-b983-a9870cc946b8_photo.png",
      workload: 1,
      unit: "task",
      reason:
        "Same pattern as Thangarasu — 1 task, creating the same imbalance against the rest of the team.",
    },
  ],
  footer:
    "40 of the 100 tasks (40%) are unassigned — the single largest bucket of work, bigger than any individual's load.",
};

export const ORION_QUESTION_TAGS = [
  {
    id: "summarization",
    label: "Executive summary",
    template: SummarizationAPIResponseTemplate,
  },
  {
    id: "metric",
    label: "Metric overview",
    template: MetricAPIResponseTemplate,
  },
  {
    id: "actions",
    label: "Recommended actions",
    template: ActionPointsAPIResponseTemplate,
  },
  {
    id: "performance",
    label: "Team performance",
    template: PerformanceVelocityAPIResponseTemplate,
  },
];

export const resolveOrionQuestionType = (text = "") => {
  const query = text.trim().toLowerCase();
  if (!query) return null;
  if (/executive|summary|summar/.test(query)) return "summarization";
  if (/metric|kpi|overview/.test(query)) return "metric";
  if (/action|recommend|next step/.test(query)) return "actions";
  if (/performance|team|assignee|workload|velocity/.test(query)) return "performance";
  return null;
};

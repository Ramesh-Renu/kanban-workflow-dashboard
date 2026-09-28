import {
  workspaceKpiCounts,
  workspaceHealthFormula,
  workspacePerformanceChart,
  workspaceMonthFilter,
} from "../../../assets/images";
export const WORKSPACE_TOUR_TOTAL_STEPS = 4;
const WorkspaceTourSteps = ({ currentStep = 0, dashboardFormulaData }) => {
  const healthyColor = dashboardFormulaData?.find(
    (item) => item.label === "Healthy",
  )?.color;

  const atRiskColor = dashboardFormulaData?.find(
    (item) => item.label === "At Risk",
  )?.color;

  const needsAttentionColor = dashboardFormulaData?.find(
    (item) => item.label === "Needs Attention",
  )?.color;
  return (
    <div className="workspace-tour-steps">
      <div
        className="workspace-tour-steps__content"
        id="1"
        style={{ display: currentStep === 0 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">KPI</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={workspaceKpiCounts}
                alt="Workspace KPI Counts"
                style={{ width: "100%", height: "auto" }}
              />
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <h4 className="workspace-tour-steps__title">KPI Count Logic:</h4>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: healthyColor }}>Healthy Workspaces Count</span> of
              workspaces where Overdue % ≤ 10%
            </p>

            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: needsAttentionColor }}>Needs Attention Count</span> of
              workspaces where Overdue % {`>`} 15% and ≤ 25%
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: atRiskColor }}>At Risk Count</span> of workspaces
              where Overdue % {`>`} 30%
            </p>

            <h4 className="workspace-tour-steps__title">
              Percentage must be calculated using the formula:
            </h4>
            <p className="workspace-tour-steps__box-content-item">
              Percentage = (Category Count(Healthy, Needs Attention, At Risk) / Total
              Workspaces) × 100
            </p>
          </div>
        </div>
      </div>
      <div
        className="workspace-tour-steps__content"
        id="2"
        style={{ display: currentStep === 1 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Workspace Health</h3>

        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={workspaceHealthFormula}
                alt="Workspace Health Formula"
                style={{ width: "300px", height: "auto" }}
              />
            </p>
          </div>
          <h4 className="workspace-tour-steps__title">Workspace Health Formula</h4>
          <p className="workspace-tour-steps__box-content-item">
            Workspace Overdue % = (Total Overdue Tasks Across All Boards in Workspace /
            Total Tasks Across All Boards in Workspace) × 100.
          </p>
          <div className="workspace-tour-steps__box-content">
            <h4 className="workspace-tour-steps__title">Example:</h4>
            <p className="workspace-tour-steps__box-content-item">Workspace has:</p>
            <div
              className="workspace-tour-steps__box-content"
              style={{ marginLeft: "100px" }}
            >
              <p className="workspace-tour-steps__box-content-item">
                <strong>Board A</strong> → 2 overdue / 5
              </p>
              <p className="workspace-tour-steps__box-content-item">
                <strong>Board B</strong> → 1 overdue / 10
              </p>
              <p className="workspace-tour-steps__box-content-item">
                <strong>Workspace Overdue %</strong> = (3 / 15) × 100 ={" "}
                <strong style={{ color: atRiskColor }}>20%</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className="workspace-tour-steps__content"
        id="3"
        style={{ display: currentStep === 2 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Month Filter Behavior</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              Use month filters at the top (Current, Last, Last 3, Last 6, Custom up to 6
              months). Selecting a range refreshes KPI values and charts.
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={workspaceMonthFilter}
                alt="Workspace Month Filter"
                style={{ width: "200px", height: "auto" }}
              />
            </p>{" "}
          </div>
          <div className="workspace-tour-steps__box-content">
            <h4 className="workspace-tour-steps__title">
              The filter support the following options:
            </h4>
            <div className="workspace-tour-steps__box-content">
              <p className="workspace-tour-steps__box-content-item">
                When we click the <strong>current month</strong> filter. The filter will
                show the current month.
              </p>
              <p className="workspace-tour-steps__box-content-item">
                When we click the <strong>last month</strong> filter. The filter will show
                the last month.
              </p>
              <p className="workspace-tour-steps__box-content-item">
                When we click the <strong>last 3 month</strong> filter. The filter will
                show the last 3 month.
              </p>
              <p className="workspace-tour-steps__box-content-item">
                When we click the <strong>last 6 month</strong> filter. The filter will
                show the last 6 month.
              </p>
              <p className="workspace-tour-steps__box-content-item">
                When we click the <strong>custom month</strong> (
                <small>
                  filter. The filter will show the date range selection followed by month
                  & year selection.
                </small>{" "}
                )
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className="workspace-tour-steps__content"
        id="4"
        style={{ display: currentStep === 3 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Performance Chart Rules</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              Bar chart uses a percentage scale (0-100). The selected month is highlighted
              with stacked Healthy / Needs Attention / At Risk colors, while previous
              months stay neutral.
            </p>
            <div className="workspace-tour-steps__box-content">
              <p className="workspace-tour-steps__box-content-item">
                <img
                  src={workspacePerformanceChart}
                  alt="Workspace Performance Chart"
                  style={{ width: "300px", height: "auto" }}
                />
              </p>
            </div>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <strong>X-Axis</strong> → Fixed 6-month timeline (based on selected filter)
              except the <strong>custom month</strong> filter.
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <strong>Y-Axis</strong> → Percentage scale from 0% to 100%
            </p>
          </div>
          <p className="workspace-tour-steps__box-content-item">
            <strong>The highlighted month</strong> must be shown as a stacked bar divided
            into 3 colour segments:
          </p>
          <div
            className="workspace-tour-steps__box-content"
            style={{ marginLeft: "100px" }}
          >
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: healthyColor }}>Green</span> → Healthy
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: needsAttentionColor }}>Yellow/Orange</span> → Needs
              Attention
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: atRiskColor }}>Red</span> → At Risk
            </p>
          </div>
          <p className="workspace-tour-steps__box-content-item">
            Previous months must be displayed in grey (non-highlighted).
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceTourSteps;

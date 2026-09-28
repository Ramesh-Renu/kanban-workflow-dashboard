import {
  boardHealthFormula,
  boardHealthThresholds,
  boardKpiCounts,
  boardCardPopIndicator,
  boardTrendArrowAndColor1,
  boardTrendArrowAndColor2,
  boardPerformanceTrendFilters,
  boardOverdueSummary,
  taskFlowOverTime
} from "../../../assets/images";
export const BOARD_TOUR_TOTAL_STEPS = 8;
const BoardTourSteps = ({ currentStep = 0, dashboardFormulaData }) => {
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
        <h3 className="workspace-tour-steps__heading-title">Board Health Thresholds</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              Board status uses configurable bands: Healthy (0-10%), Needs Attention (
              {`>`}
              15 and ≤ 25%), and At Risk ({`>`}30%).
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={boardHealthThresholds}
                alt="Board Health Thresholds"
                style={{ width: "100%", height: "auto" }}
              />
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <h4 className="workspace-tour-steps__title">KPI Count Logic</h4>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: healthyColor }}>Healthy Board Count</span> of boards
              where Overdue % ≤ 10%
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: needsAttentionColor }}>Needs Attention Count</span> of
              boards where Overdue % {`>`} 15% and ≤ 25%
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: atRiskColor }}>At Risk Count</span> of boards where
              Overdue % {`>`} 30%
            </p>
            <h4 className="workspace-tour-steps__title">
              Percentage must be calculated using the formula:
            </h4>
            <p className="workspace-tour-steps__box-content-item">
              Percentage = (Category Count(Healthy, Needs Attention, At Risk) / Total
              Boards) × 100
            </p>
          </div>
        </div>
      </div>
      <div
        className="workspace-tour-steps__content"
        id="2"
        style={{ display: currentStep === 1 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Trend Arrow and Color</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              If current {`>`} previous, indicator shows up arrow and positive trend; if
              current {`<`} previous, it shows down arrow and negative trend; if equal, it
              shows 0%.
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={boardTrendArrowAndColor1}
                alt="Board Trend Arrow and Color"
                style={{ width: "250px", height: "auto" }}
              />
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={boardTrendArrowAndColor2}
                alt="Board Trend Arrow and Color"
                style={{ width: "250px", height: "auto" }}
              />
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              If current {`>`} previous, indicator shows up arrow and positive trend; if
              current {`<`} previous, it shows down arrow and negative trend; if equal, it
              shows 0%.
            </p>
          </div>
        </div>
      </div>
      <div
        className="workspace-tour-steps__content"
        id="3"
        style={{ display: currentStep === 2 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Board KPI Counts</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              Summary counts the number of boards in each health category for the selected
              date range.
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={boardKpiCounts}
                alt="Board KPI Counts"
                style={{ maxWidth: "500px", height: "auto" }}
              />
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <h4 className="workspace-tour-steps__title">Formula:</h4>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: healthyColor }}>Healthy Board Count</span> of boards
              where Overdue % ≤ 10%
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: needsAttentionColor }}>
                Needs Attention Board Count
              </span>{" "}
              of boards where Overdue % {`>`} 15% and ≤ 25%
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: atRiskColor }}>At Risk Board Count</span> of boards
              where Overdue % {`>`} 30%
            </p>
          </div>
        </div>
      </div>
      <div
        className="workspace-tour-steps__content"
        id="4"
        style={{ display: currentStep === 3 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Board Health Formula</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              Board Overdue % = (Total Overdue Tasks in Board / Total Tasks in Board) ×
              100.
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={boardHealthFormula}
                alt="Board Health Formula"
                style={{ width: "100%", height: "auto" }}
              />
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <h4 className="workspace-tour-steps__title">Example:</h4>
            <p className="workspace-tour-steps__box-content-item">Board has:</p>
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
                <strong>Board Overdue %</strong> = (3 / 15) × 100 ={" "}
                <strong style={{ color: atRiskColor }}>20%</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className="workspace-tour-steps__content"
        id="5"
        style={{ display: currentStep === 4 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Board Card PoP Indicator</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              Card trend compares current month overdue percentage with previous month:
              ((current - previous) / current) x 100.
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={boardCardPopIndicator}
                alt="Board Card PoP Indicator"
                style={{ width: "100px", height: "auto", margin: "10px auto 0" }}
              />
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              If current {`>`} previous, indicator shows up arrow and positive trend; if
              current {`<`} previous, it shows down arrow and negative trend; if equal, it
              shows 0%.
            </p>
          </div>
        </div>
      </div>
      <div
        className="workspace-tour-steps__content"
        id="6"
        style={{ display: currentStep === 5 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Performance Trend Filters</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              Trend chart supports Last 7, 30, 60, 90 days and Custom ranges. Aggregation
              switches between daily and weekly based on selected duration.
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={boardPerformanceTrendFilters}
                alt="Board Performance Trend Filters"
                style={{ width: "200px", height: "auto" }}
              />
            </p>
          </div>
        </div>
      </div>
      <div
        className="workspace-tour-steps__content"
        id="7"
        style={{ display: currentStep === 6 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Board: Overdue Summary</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              Line view shows three trend lines with fixed mapping: Green (Healthy),
              Yellow/Orange (Needs Attention), Red (At Risk). Legend stays visible.
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={boardOverdueSummary}
                alt="Workspace Line Trend View"
                style={{ width: "450px", height: "auto" }}
              />
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <strong>X-Axis</strong> → Fixed 6-month timeline (based on selected filter)
              except the custom month filter.
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <strong>Y-Axis</strong> → Percentage scale from 0% to 100%
            </p>
          </div>
          <p className="workspace-tour-steps__box-content-item">
            The trend lines must be displayed as follows:
          </p>
          <div
            className="workspace-tour-steps__box-content"
            style={{ marginLeft: "100px" }}
          >
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: healthyColor }}>Green</span> → Healthy
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: needsAttentionColor }}>Yellow</span> → Needs Attention
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
      <div
        className="workspace-tour-steps__content"
        id="8"
        style={{ display: currentStep === 7 ? "block" : "none" }}
      >
        <h3 className="workspace-tour-steps__heading-title">Task Flow Over Time</h3>
        <div className="workspace-tour-steps__box">
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              Line view shows three trend lines with fixed mapping: Green (Healthy),
              Yellow/Orange (Needs Attention), Red (At Risk). Legend stays visible.
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <img
                src={taskFlowOverTime}
                alt="Workspace Line Trend View"
                style={{ width: "450px", height: "auto" }}
              />
            </p>
          </div>
          <div className="workspace-tour-steps__box-content">
            <p className="workspace-tour-steps__box-content-item">
              <strong>X-Axis</strong> → Fixed 6-month timeline (based on selected filter)
              except the custom month filter.
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <strong>Y-Axis</strong> → Percentage scale from 0% to 100%
            </p>
          </div>
          <p className="workspace-tour-steps__box-content-item">
            The trend lines must be displayed as follows:
          </p>
          <div
            className="workspace-tour-steps__box-content"
            style={{ marginLeft: "100px" }}
          >
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: "#3B82F6" }}>Created</span> → Created
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: "#F59E0B" }}>Active</span> → Active
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: "#16A34A" }}>Completed</span> → Completed
            </p>
            <p className="workspace-tour-steps__box-content-item">
              <span style={{ color: "#EF4444" }}>Overdue</span> → Overdue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardTourSteps;

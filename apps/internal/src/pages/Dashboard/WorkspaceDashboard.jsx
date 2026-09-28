import React, { useEffect, useMemo, useRef, useState, lazy } from "react";
import { useLocation } from "react-router-dom";
import DashboardCount from "./count";
import WorkspaceWidget from "./Widget/Workspace";
import {
  allStageIcon,
  calenderActive,
  calendarBlank,
  syncIcon,
} from "../../assets/images";
import {
  getWorkspaceHealth,
  performanceHealthSummary,
  getVelocityComparison,
  getOrionAiInsights,
} from "../../services";
import { useToast } from "@orion/shared";
import TopProgressBar from "@orion/shared/src/components/TopProgressBar";
import {
  customMonthDashboardDates,
  getWorkspaceHealthParams,
  getVelocityRangeParams,
  getPerformanceHealthParams,
  getOrionAiInsightsParams,
  buildAISummaryRequestParams,
  HEALTH_CONFIG,
  STATUS_CONFIG,
  getTrendTone,
  WORKSPACE_FILTER_OPTIONS,
  formatRangeDate,
  getWorkspaceDtoIds,
  isAdminMyWorkspaceMode,
  isDashboardAdmin,
} from "../../utils/dashboard";
import { SelectDropDown } from "@orion/shared";
import useAuth from "../../hooks/useAuth";
import { useGlobalMaster } from "@orion/shared";
import CustomDatePicker from "../../components/common/CustomDatePicker";
import DashboardTourGuide from "./Widget/DashboardTourGuide";
import WorkspaceTourSteps, {
  WORKSPACE_TOUR_TOTAL_STEPS,
} from "./Widget/WorkspaceTourSteps";
import WorkspaceAIExecutiveInsights from "./Widget/WorkspaceAIExecutiveInsights";
import AdminWorkspaceScopeToggle from "./Widget/AdminWorkspaceScopeToggle";
import AIModeButton from "./aiMode/AIModeButton";
import AISummaryButton from "./aiMode/AISummaryButton";
import withDashboardAIMode from "./aiMode/withDashboardAIMode";
import DashboardAIHotspot from "./aiMode/DashboardAIHotspot";
import {
  buildKpiGroupInsight,
  buildSectionInsight,
} from "./aiMode/buildAIHotspotInsight";
const VelocityWidget = lazy(() => import("./Widget/Velocity"));
import HealthGauge from "./Widget/HealthGauge";
import BoardOverdueHealthChart from "./BoardDashboard/BoardOverdueHealthChart";
import SkeletonLoading from "components/common/SkeletonLoading";
import { useDashboardAIModeOptional } from "./aiMode/DashboardAIModeContext";
const WorkspaceDashboard = () => {
  const { showToast } = useToast();
  const location = useLocation();
  const aiModeAvailable = Boolean(useDashboardAIModeOptional());
  const [workspaceResponse, setWorkspaceResponse] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTourGuide, setShowTourGuide] = useState(false);
  const [getSelectedDate, setGetSelectedDate] = useState(null);
  const [velocityResponse, setVelocityResponse] = useState({
    velocity: [],
    summary: {},
  });
  const [barHighlightMonth, setBarHighlightMonth] = useState(null);
  const dateTimeRef = useRef(null);

  const [selectedRange, setSelectedRange] = useState([
    WORKSPACE_FILTER_OPTIONS[0], // default: Current Month
  ]);

  const [selectedTempRange, setSelectedTempRange] = useState([
    WORKSPACE_FILTER_OPTIONS[0], // default: Current Month
  ]);

  const [loading, setLoading] = useState(false);
  const [healthSummaryloading, setHealthSummaryLoading] = useState(false);
  const [orionAiInsightsResponse, setOrionAiInsightsResponse] = useState([]);
  const [orionAiInsightsLoading, setOrionAiInsightsLoading] = useState(false);

  const [{ data: auth }] = useAuth();
  const isMyWorkspaceMode = useMemo(
    () => isAdminMyWorkspaceMode(auth?.details),
    [auth?.details, location.key, location.state?.adminDashboardScope],
  );
  const myWorkspaceIds = useMemo(
    () => (isMyWorkspaceMode ? getWorkspaceDtoIds(auth?.details) : null),
    [auth?.details, isMyWorkspaceMode],
  );
  /** Admin All Workspace → null; Admin My Workspace / USR → regId */
  const workspacePageRegId = useMemo(() => {
    if (isDashboardAdmin(auth?.details) && !isMyWorkspaceMode) return null;
    return auth?.details?.regId ?? null;
  }, [auth?.details, isMyWorkspaceMode]);
  const { roleList, getRoleList, dashboardFormula, getDashboardFormulaData } =
    useGlobalMaster();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dateTimeRef.current) return;

      const clickedOutside = !dateTimeRef.current.contains(event.target);

      if (clickedOutside) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (dashboardFormula?.data?.length === 0) {
      getDashboardFormulaData();
    }
  }, []);

  const getWorkspaceHealthSummary = async (dateParams, hardRefresh) => {
    try {
      if (hardRefresh) {
        setHealthSummaryLoading(true);
      }
      if (dateParams) {
        const response = await getWorkspaceHealth({
          ...dateParams,
          userTypeId: auth?.details?.user_type,
          regId: workspacePageRegId,
        });
        if (response?.status) {
          setWorkspaceResponse(response.data);
        }
      }
    } catch (error) {
      showToast({
        message: error?.message || "Something went wrong",
        variant: "danger",
      });
    } finally {
      if (hardRefresh) {
        setHealthSummaryLoading(false);
      }
    }
  };

  const handleGetOrionAiInsights = async (dateParams, hardRefresh) => {
    try {
      if (hardRefresh) {
        setOrionAiInsightsLoading(true);
      }
      if (dateParams) {
        const response = await getOrionAiInsights({
          ...dateParams,
          reg_id: auth?.details?.regId,
          user_type_id: auth?.details?.user_type,
        });
        if (response?.status) {
          setOrionAiInsightsResponse(response.data);
          setOrionAiInsightsLoading(false);
        }
      }
    } catch (error) {
      showToast({
        message: error?.message || "Something went wrong",
        variant: "danger",
      });
    } finally {
      if (hardRefresh) {
        setOrionAiInsightsLoading(false);
      }
    }
  };

  const aiSummaryParams = useMemo(() => {
    if (
      selectedRange?.[0]?.value === "CUSTOM_RANGE" &&
      getSelectedDate
    ) {
      return buildAISummaryRequestParams({
        scope: "all",
        auth,
        rangeType: selectedRange?.[0]?.value,
        getSelectedDate,
      });
    } else if(selectedRange?.[0]?.value !== "CUSTOM_RANGE") {
      return buildAISummaryRequestParams({
        scope: "all",
        auth,
        rangeType: selectedRange?.[0]?.value,
        getSelectedDate,
      });
    }
  
    return null;
  }, [auth, selectedRange, getSelectedDate]);

  const getPerformanceVelocityData = async (dateParams) => {
    try {
      setLoading(true);
      if (!dateParams) return;
      const response = await performanceHealthSummary({
        ...dateParams,
        userTypeId: auth?.details?.user_type,
        regId: workspacePageRegId,
      });
      if (response?.status) {
        setVelocityResponse((prev) => ({
          ...prev,
          velocity: response?.data?.velocity || [],
          type: response?.data?.type || "month",
        }));
      }
    } catch (error) {
      showToast({
        message: error?.message || "Failed to load velocity data",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRange.length > 0) {
      const rangeType = selectedRange[0].value;
      if (rangeType !== "CUSTOM_RANGE") {
        const workspaceDateParams = getWorkspaceHealthParams(rangeType);
        getWorkspaceHealthSummary(workspaceDateParams, true);
        const velocityDateParams = getPerformanceHealthParams(rangeType);
        getPerformanceVelocityData(velocityDateParams);
        const orionAiInsightsDateParams = getOrionAiInsightsParams(rangeType, "graph");
        // handleGetOrionAiInsights(orionAiInsightsDateParams, true);
        setGetSelectedDate(null);
        setShowCalendar(false);
      } else {
        return;
      }
    }
  }, [selectedRange, auth?.details?.user_type, isMyWorkspaceMode, workspacePageRegId]);

  useEffect(() => {
    if (!roleList?.loading && !roleList?.error && roleList?.data?.length === 0) {
      getRoleList();
    }
  }, []);

  const workspaceCards = useMemo(() => {
    let items = workspaceResponse?.healthSummaryItem?.workSpaceHealthSummary || [];

    if (isMyWorkspaceMode && myWorkspaceIds?.length) {
      const myIds = new Set(myWorkspaceIds.map(Number));
      items = items.filter((workspace) => myIds.has(Number(workspace.workspaceId)));
    }

    return items.map((workspace) => {
      const label = workspace.healthLabel || "Healthy";
      const config = STATUS_CONFIG()[label] || STATUS_CONFIG()["Healthy"];

      const progressPct = Number(workspace?.progress?.percentage || 0);
      return {
        id: workspace.workspaceId,
        name: workspace.name,
        department: workspace.name,
        status: label,
        statusTone: config?.tone,
        activeBoards: workspace.activeBoards,
        allTask: workspace.allSubTasks,
        progress: Math.abs(progressPct),
        progressDirection:
          workspace?.progress?.compareStatus === "Increase"
            ? "up"
            : workspace?.progress?.compareStatus === "Decrease"
              ? "down"
              : null,
        footer:
          workspace?.progress?.overdueCount > 0
            ? `${workspace.progress.overdueCount} overdue`
            : "On Track",
        cta: config?.cta?.label,
        ctaTone: config?.cta?.tone,
        trendTone: getTrendTone(
          workspace?.progress?.compareStatus,
          workspace?.healthLabel,
        ),
        compareStatus: workspace?.progress?.compareStatus,
        createdDate: workspace?.createdDate,
        healthLabel: label,
        graphData:
          workspace?.graph ??
          workspace?.graphData ??
          workspace?.progress?.graph ??
          workspace?.progress?.trendGraph ??
          workspace?.progress?.graphData,
      };
    });
  }, [workspaceResponse, isMyWorkspaceMode, myWorkspaceIds]);

  const countCards = useMemo(() => {
    if (isMyWorkspaceMode) {
      const healthy = workspaceCards.filter((c) => c.healthLabel === "Healthy").length;
      const needsAttention = workspaceCards.filter(
        (c) => c.healthLabel === "Needs Attention",
      ).length;
      const atRisk = workspaceCards.filter((c) => c.healthLabel === "At Risk").length;
      return [
        {
          id: `health-${1}`,
          title: "Total Workspaces",
          healthLabel: "Total Workspaces",
          value: workspaceCards.length,
        },
        {
          id: `health-${2}`,
          title: "Healthy Workspaces",
          healthLabel: "Healthy Workspaces",
          value: healthy,
        },
        {
          id: `health-${3}`,
          title: "Needs Attention",
          healthLabel: "Needs Attention",
          value: needsAttention,
        },
        {
          id: `health-${4}`,
          title: "At Risk",
          healthLabel: "At Risk",
          value: atRisk,
        },
      ];
    }

    const kpis = workspaceResponse?.healthSummaryItem?.WorkspaceGridCount || {};

    return [
      {
        id: `health-${1}`,
        title: "Total Workspaces",
        healthLabel: "Total Workspaces",
        value: kpis.totalWorkspaces || 0,
      },
      {
        id: `health-${2}`,
        title: "Healthy Workspaces",
        healthLabel: "Healthy Workspaces",
        value: kpis.healthyCount || 0,
      },
      {
        id: `health-${3}`,
        title: "Needs Attention",
        healthLabel: "Needs Attention",
        value: kpis.needAttentionCount || 0,
      },
      {
        id: `health-${4}`,
        title: "At Risk",
        healthLabel: "At Risk",
        value: kpis.atRiskCount || 0,
      },
    ];
  }, [workspaceResponse, workspaceCards, isMyWorkspaceMode]);

  const kpiInsight = useMemo(
    () => buildKpiGroupInsight(countCards, "Workspace"),
    [countCards],
  );
  const healthGaugeInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "workspace-health",
        label: "Workspace Health",
        type: "chart",
        exec: "Shows the current month's overall workspace health mix.",
      }),
    [],
  );
  const healthTrendInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "workspace-health-trend",
        label: "Workspace Health Overview",
        type: "chart",
        exec: "Compares current workspace health with previous months.",
      }),
    [],
  );
  const workspaceListInsight = useMemo(
    () =>
      buildSectionInsight({
        id: "workspace-list",
        label: "Workspaces",
        type: "table",
        exec: "Lists workspaces with health, overdue, and completion signals.",
        insights: [
          `${workspaceCards?.length || 0} workspace card(s) are currently visible.`,
        ],
      }),
    [workspaceCards?.length],
  );

  const velocityDefaultRangeType = useMemo(() => {
    const globalRangeType = selectedRange?.[0]?.value;
    return globalRangeType;
  }, [selectedRange]);

  const latestVelocityDistribution = useMemo(() => {
    const velocity = velocityResponse?.velocity;
    if (!Array.isArray(velocity) || !velocity.length) return null;

    for (let index = velocity.length - 1; index >= 0; index -= 1) {
      const point = velocity[index];
      const total =
        Number(point?.healthy ?? 0) +
        Number(point?.needsAttention ?? 0) +
        Number(point?.atRisk ?? 0);
      if (total > 0) return point;
    }

    return velocity[velocity.length - 1];
  }, [velocityResponse?.velocity]);

  /** Map workspace health velocity → BoardOverdueHealthChart task-flow shape */
  const healthStatusChartData = useMemo(() => {
    const velocity = velocityResponse?.velocity;
    if (!Array.isArray(velocity) || !velocity.length) return [];

    return velocity.map((point) => {
      const healthy = Number(point?.healthy ?? 0);
      const needsAttention = Number(point?.needsAttention ?? 0);
      const atRisk = Number(point?.atRisk ?? 0);
      return {
        key: point.key,
        dateFrom: point.dateFrom,
        dateTo: point.dateTo,
        // Chart series: completed=Healthy, active=Needs Attention, overdue=At Risk
        completedTasks: { percentage: healthy, count: healthy },
        activeTasks: { percentage: needsAttention, count: needsAttention },
        overdueTasks: { percentage: atRisk, count: atRisk },
        createdTasks: { percentage: 0, count: 0 },
      };
    });
  }, [velocityResponse?.velocity]);

  const workspaceHealthMasterValue = useMemo(
    () =>
      dashboardFormula?.data?.find((item) => item.name === "HealthStatus")?.value || [],
    [dashboardFormula?.data],
  );

  const handleVelocityRangeSelected = async (dateParams) => {
    try {
      setLoading(true);

      const response = await getVelocityComparison(dateParams);

      if (response?.status) {
        setBarHighlightMonth(dateParams);
        setVelocityResponse((prev) => ({
          ...prev,
          summary: response?.data?.summary,
        }));
      }

      return response; // ✅ important
    } catch (error) {
      showToast({
        message: error?.message || "Failed to fetch comparison",
        variant: "danger",
      });

      throw error; // optional
    } finally {
      setLoading(false);
    }
  };

  const handleCustomMonthApply = async (date) => {
    setGetSelectedDate(date);
    const fromValue = date?.from || date?.start;
    const toValue = date?.to || date?.end;
    setSelectedRange([
      {
        label: `${formatRangeDate(fromValue)} To ${formatRangeDate(toValue)}`,
        value: "CUSTOM_RANGE",
      },
    ]);
    const result = customMonthDashboardDates(date, "workspace");

    await Promise.all([
      getWorkspaceHealthSummary(result.workspacehealthsummary, false),
      getPerformanceVelocityData(result.performancehealthsummary),
      // handleGetOrionAiInsights(result.orionaiinsights, true),
    ]);
  };

  const handleDashboardSync = async () => {
    const rangeValue = selectedRange?.[0]?.value;

    const params =
      rangeValue !== "CUSTOM_RANGE"
        ? {
            velocity: getVelocityRangeParams(rangeValue),
            workspace: getWorkspaceHealthParams(rangeValue),
            performance: getPerformanceHealthParams(rangeValue),
            orionaiinsights: getOrionAiInsightsParams(rangeValue, "graph"),
          }
        : customMonthDashboardDates(getSelectedDate).orionaiinsights;

    await Promise.all([
      handleVelocityRangeSelected(params.velocity || params.velocitycomparison),
      getWorkspaceHealthSummary(params.workspace || params.workspacehealthsummary, false),
      getPerformanceVelocityData(params.performance || params.performancehealthsummary),
      // handleGetOrionAiInsights(params.orionaiinsights, false),
    ]);
  };

  const handleSelectedCustomMonthRange = (values) => {
    if (values.length === 0) return;
    setSelectedRange(values);
    if (values[0].value !== "CUSTOM_RANGE") {
      setShowCalendar(false);
      setSelectedTempRange(values);
    } else {
      setShowCalendar(!showCalendar);
    }
  };

  const handleCancelCustomMonthApply = () => {
    setShowCalendar(false);
    setSelectedRange(selectedTempRange);
  };
  const handleRefreshOrionAiInsights = async () => {
    const rangeValue = selectedRange?.[0]?.value;
    const orionAiInsightsDateParams = getOrionAiInsightsParams(rangeValue, "graph");
    // await Promise.all([handleGetOrionAiInsights(orionAiInsightsDateParams, true)]);
  };

  return (
    <div className="dashboard-page">
      <TopProgressBar loading={loading || healthSummaryloading} />
      <header
        className="dashboard-page__header"
        aria-labelledby="dashboard-welcome-heading"
      >
        <div className="dashboard-page__title">
          <div className="dashboard-page__title-wrap">
            <h1 className="dashboard-page__title-section" id="dashboard-welcome-heading">
              Welcome Back !
            </h1>
            <span className="dashboard-page__title-badge">
              {roleList?.data?.filter(
                (userType) => userType.status_id === auth?.details?.user_type,
              )[0]?.name || "Guest"}
            </span>
          </div>
          <span className="dashboard-page__title-username">
            {auth?.details?.displayName}
          </span>
          <AdminWorkspaceScopeToggle authDetails={auth?.details} />
        </div>
        <div
          className="dashboard-page__actions"
          role="toolbar"
          aria-label="Date range, refresh, and tour"
        >
          <div className="dashboard-page__actions-row">
            {/* {aiModeAvailable ? <AIModeButton /> : null} */}
            <AISummaryButton
              params={aiSummaryParams}
              userName={auth?.details?.displayName || "Admin"}
              contextLabel={
                isMyWorkspaceMode
                  ? "My Workspaces dashboard"
                  : "All Workspaces dashboard"
              }
              scope="all"
            />
            <div style={{ minWidth: "120px", position: "relative" }}>
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
                options={WORKSPACE_FILTER_OPTIONS}
                values={selectedRange}
                onChange={(values) => handleSelectedCustomMonthRange(values)}
                labelField="label"
                valueField="value"
                multi={false}
                searchable={false}
                clearable={false}
                optionType="radio"
                className="filter-select-dropDown dashboard-page__action-btn dashboard-page__action-btn--ghost"
              />

              {showCalendar && (
                <div className="dashboard-page__custom-month" ref={dateTimeRef}>
                  <CustomDatePicker
                    defaultDate={getSelectedDate}
                    onSelect={(date) => handleCustomMonthApply(date)}
                    oncancel={() => handleCancelCustomMonthApply()}
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
              onClick={() => handleDashboardSync()}
              aria-label="Refresh dashboard data"
            >
              <img src={syncIcon} alt="" aria-hidden="true" />
            </button>
          </div>
         
        </div>
      </header>

      {/* New layout */}
      <section
        className="dashboard-workspace-page__content"
        aria-label="Workspace overview"
      >
        <div
          className="dashboard-page__content-left"
          role="region"
          aria-label="Workspaces and KPIs"
        >
          <DashboardAIHotspot id="kpi-summary" insight={kpiInsight}>
            <DashboardCount
              cards={countCards}
              dashboardMaterValue={
                dashboardFormula?.data?.filter((item) => item.name === "HealthStatus")[0]
                  ?.value || []
              }
              type={"worspace"}
              gridCount={4}
              loading={loading}
            />
          </DashboardAIHotspot>
          <div className="dashboard-page__content-left-container">
            <aside className="dashboard-page__content-left-donut-chart">
              {loading ? (
                <SkeletonLoading
                  variant="donut"
                  expanded={false}
                  legendCount={3}
                  height={360}
                  className="workspace-health-gauge__skeleton"
                  margin="0 0 0 0"
                />
              ) : (
                <DashboardAIHotspot id="workspace-health" insight={healthGaugeInsight}>
                  <HealthGauge
                    title="Workspace Health Distribution"
                    subTitle=""
                    data={latestVelocityDistribution}
                    loading={loading}
                    dashboardMaterValue={workspaceHealthMasterValue}
                  />
                </DashboardAIHotspot>
              )}
            </aside>
            <aside
              className="dashboard-page__content-right-velocity"
              aria-label="Velocity and performance"
            >
              {/* {dashboardFormula?.data && ( */}
              {loading ? (
                <SkeletonLoading
                  variant="bar"
                  expanded={false}
                  height={360}
                  margin="0 0 0 0"
                  className="board-overdue-health-chart__chart-skeleton"
                />
              ) : (
                <DashboardAIHotspot
                  id="workspace-health-trend"
                  insight={healthTrendInsight}
                >
                  <BoardOverdueHealthChart
                    data={healthStatusChartData}
                    type={[
                      {
                        filter_id: 23,
                        name: "Orders",
                        key: "orderAndTools",
                        value: "OrderAndTools",
                      },
                    ]}
                    taskFlowMode={true}
                    healthStatusMode={true}
                    healthLabel={"Workspace Health Overview"}
                    subTitle="Same-date month-to-date comparison with last month."
                    boardType={[
                      {
                        filter_id: 2026,
                        name: "Tools",
                        key: "subTask",
                        value: "Subtask",
                      },
                    ]}
                    apiLoading={false}
                    dashboardMaterValue={workspaceHealthMasterValue}
                    selectedRange={selectedRange}
                    getSelectedDate={getSelectedDate}
                    countCards={countCards}
                    getChartHeight={250}
                  />
                </DashboardAIHotspot>
              )}
              {/* )} */}
            </aside>
          </div>
          {loading || healthSummaryloading ? (
            <SkeletonLoading
              variant="bar"
              expanded={false}
              height={360}
              className="workspace-widget__skeleton"
              count={1}
              gap={16}
            />
          ) : (
            <DashboardAIHotspot id="workspace-list" insight={workspaceListInsight}>
              <WorkspaceWidget
                workspaces={workspaceCards}
                dashboardMaterValue={
                  dashboardFormula?.data?.filter(
                    (item) => item.name === "HealthStatus",
                  )[0]?.value || []
                }
                apiLoading={loading}
                placeholder={"Search by workspace"}
                fromPage={"workspace"}
                layout={"new"}
              />
            </DashboardAIHotspot>
          )}
        </div>
        {/* <div className="dashboard-page__content-right ai-insights">
            <WorkspaceAIExecutiveInsights
              data={orionAiInsightsResponse?.insights || []}
              loading={orionAiInsightsLoading}
              dashboardMaterValue={workspaceHealthMasterValue}
              handleRefresh={handleRefreshOrionAiInsights}
            />
          </div> */}
      </section>
      <DashboardTourGuide
        show={showTourGuide}
        onClose={() => setShowTourGuide(false)}
        title="Workspace Dashboard Tour Guide"
        StepsComponent={WorkspaceTourSteps}
        totalSteps={WORKSPACE_TOUR_TOTAL_STEPS}
        dashboardFormulaData={
          dashboardFormula?.data?.filter((item) => item.name === "HealthStatus")[0]
            ?.value || []
        }
      />
    </div>
  );
};

export default withDashboardAIMode(WorkspaceDashboard);

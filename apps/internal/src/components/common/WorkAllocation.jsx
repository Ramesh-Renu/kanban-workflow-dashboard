import React, { useEffect, useState, useMemo } from "react";
import { Nav, Tab } from "react-bootstrap";
import SideDrawer from "./SideDrawer";
import { leftArrowIcon } from "../../assets/images";
import SelectDropDown from "./SelectDropDown";
import { createColumnHelper } from "@tanstack/react-table";
import { classNames } from "@euroland/libs";
import Table from "./Table";
import LogoAvatarShowLetter from "./LogoAvatarShowLetter";
import useWorkspace from "../../hooks/useWorkspace";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import useAuth from "../../hooks/useAuth";
import UtcClock from "./UtcClock";
import { use } from "react";

// Summary Card
const SummaryCard = ({ title, count, showDot }) => (
  <div className="p-3 position-relative flex-fill summary-card d-flex flex-column">
    {showDot && <span className="dot" />}
    <div className="title">{title}</div>
    <div className="count">{count}</div>
  </div>
);

// Stage Label Section
const StageLabels = ({ stages }) => (
  <div className="d-flex flex-wrap gap-2 mb-3 stages">
    {stages.map((stage) => (
      <label
        key={stage.labelId}
        className="stages-btn"
      // style={{ backgroundColor: stage.colorCode, color: stage.colorCode ? "#FFFFFF" : "#000" }}
      >
        {stage.name}
        {stage.count > 0 && (
          <span
            className="badge ms-2"
            style={{
              backgroundColor: stage.colorCode ? stage.colorCode : "#F4F4F4",
              color: stage.colorCode ? "#FFF" : "#000",
            }}
          >
            {stage.count}
          </span>
        )}
      </label>
    ))}
  </div>
);

// Country Filter
const CountryFilter = ({
  stage,
  countries,
  selected,
  onChange,
  userRole,
  orderView,
  setOrderView,
  userCount,
  isSubTask,
}) => {
  return (
    <div className="d-flex mb-3 justify-content-between align-items-end filterSection">
      <div className="d-flex filter gap-2">
        <SelectDropDown
          key={stage}
          multi={false}
          options={countries}
          labelField="label"
          valueField="value"
          searchable={false}
          values={selected ? [selected] : []}
          onChange={(value) => onChange(value[0] || null)}
          placeholder="Select Country"
          className="filter-select-dropDown"
          dropdownPosition="auto"
        />

        {userRole?.length === 0 ||
          (userRole?.roleCode !== "MEM" && (
            <SelectDropDown
              key={"myorder"}
              multi={false}
              options={
                isSubTask
                  ? [
                    { label: "My Task", value: "my" },
                    { label: "All Task", value: "all" },
                  ]
                  : [
                    { label: "My Orders", value: "my" },
                    { label: "All Orders", value: "all" },
                  ]
              }
              labelField="label"
              valueField="value"
              searchable={false}
              values={
                isSubTask
                  ? [
                    {
                      label: orderView === "my" ? "My Task" : "All Task",
                      value: orderView,
                    },
                  ]
                  : [
                    {
                      label: orderView === "my" ? "My Orders" : "All Orders",
                      value: orderView,
                    },
                  ]
              }
              onChange={(val) => setOrderView(val[0]?.value || "all")}
              className="filter-select-dropDown"
              dropdownPosition="auto"
            />
          ))}
      </div>
      <p className="fw-bold m-0 p-0 fs-14 ">
        Total User Count: <span className="count">{userCount}</span>
      </p>
    </div>
  );
};

// User Table
const UserTable = ({ users, columns }) => (
  <div className="user-table">
    {/* <p className="fw-bold">“{users.length}” Users</p> */}
    <div className="tableSection">
      <Table
        columns={columns}
        columnData={users}
        className={classNames("products__body-table customTable")}
        tableName="Order_list"
        bgColor="#FFF"
        tdActionFn={false}
      />
    </div>
  </div>
);

// Main Component
const WorkAllocation = ({ userRole, boardData, activeTask, isTask, showDrawer, handleCloseDrawer }) => {

  const [summary, setSummary] = useState(null);
  const [mainTaskStages, setMainTaskStages] = useState([]);
  const [subTaskStages, setSubTaskStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [selectedCountryMain, setSelectedCountryMain] = useState(null);
  const [selectedCountrySub, setSelectedCountrySub] = useState(null);
  const { getWorkAllocation, workAllocation } = useWorkspace();
  const columnHelper = createColumnHelper();
  const [drawerWidth, setDrawerWidth] = useState("fit-content");
  const [orderViewMain, setOrderViewMain] = useState("all");
  const [orderViewSub, setOrderViewSub] = useState("all");
  const [{ data: auth }] = useAuth();
  useEffect(() => {
    if (activeTask) {
      setActiveTab(activeTask === "MainTask" ? "MainTask" : "SubTask");
    } else {
      setActiveTab(null);
    }
  }, [activeTask, isTask, showDrawer]);

  useEffect(() => {
    if (showDrawer) {
      const isSA = boardData?.some((board) => board?.code === "SA");
      if (isSA) return;

      const workAllocationParams = {
        board_id: boardData[0].boardID,
        ...(userRole && userRole?.roleCode === "MEM" && auth?.details?.regId !== "undefined" && {
          reg_id: auth?.details?.regId,
        }),
      };
      getWorkAllocation(workAllocationParams);
    } else {
      setSummary(null);
      setMainTaskStages([]);
      setSubTaskStages([]);
      setUsers([]);
    }
  }, [showDrawer, boardData]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = workAllocation?.data;
        if (data) {
          setSummary(data.board_detail_counts);
          setMainTaskStages(data.main_task_details || []);
          setSubTaskStages(data.sub_task_details || []);
          setUsers(data.board_user_details?.users || []);
        }
      } catch (error) {
        console.error("Failed to fetch work allocation data:", error);
      }
    };

    if (showDrawer && workAllocation?.data) fetchData();
  }, [showDrawer, workAllocation?.data]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setDrawerWidth("80%"); // Mobile/Tablet size
      } else if (width > 768 && width <= 1289) {
        setDrawerWidth("fit-content"); // Laptop/Medium screens
      } else {
        setDrawerWidth("50%"); // Default for large screens (If placed as fit-content, it exceed screen width when many labels are present)
      }
    };

    // Call resize handler initially and on window resize
    handleResize();
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Unique Countries
  const uniqueCountries = useMemo(() => {
    const countrySet = new Set(users.map((u) => u.country_name));
    return [
      { label: "All Countries", value: "all" },
      ...[...countrySet].map((c) => ({ label: c, value: c })),
    ];
  }, [users]);

  // Filtered Users Per Tab
  // const filteredUsersMain = useMemo(() => {
  //   if (!selectedCountryMain || selectedCountryMain.value === "all") return users;
  //   return users.filter((u) => u.country_name === selectedCountryMain.value);
  // }, [users, selectedCountryMain]);

  // const filteredUsersSub = useMemo(() => {
  //   if (!selectedCountrySub || selectedCountrySub.value === "all") return users;
  //   return users.filter((u) => u.country_name === selectedCountrySub.value);
  // }, [users, selectedCountrySub]);

  const filteredUsersMain = useMemo(() => {
    let result = users;

    if (selectedCountryMain && selectedCountryMain.value !== "all") {
      result = result.filter(
        (u) => u.country_name === selectedCountryMain.value,
      );
    }

    if (
      (userRole?.length === 0 || userRole?.roleCode !== "MEM") &&
      orderViewMain === "my" &&
      auth?.details?.regId
    ) {
      result = result.filter((u) => u.reg_id === auth?.details?.regId);
    }

    return result;
  }, [
    users,
    selectedCountryMain,
    orderViewMain,
    userRole,
    auth?.details?.regId,
  ]);

  const filteredUsersSub = useMemo(() => {
    let result = users;

    if (selectedCountrySub && selectedCountrySub.value !== "all") {
      result = result.filter(
        (u) => u.country_name === selectedCountrySub.value,
      );
    }

    if (
      (userRole?.length === 0 || userRole?.roleCode !== "MEM") &&
      orderViewSub === "my" &&
      auth?.details?.regId
    ) {
      result = result.filter((u) => u.reg_id === auth?.details?.regId);
    }

    return result;
  }, [users, selectedCountrySub, orderViewSub, userRole, auth?.details?.regId]);

  // Table Columns
  const columns = useMemo(() => {
    return [
      columnHelper.accessor("display_name", {
        header: () => <span className="customHeader">Employee Name</span>,
        cell: ({ row }) => (
          <div className="d-flex align-items-center text-small avatars gap-2">
            <LogoAvatarShowLetter
              genaralData={row.original}
              profilePhotoName="photo_url"
              profileName="display_name"
              innerClassName="avatars__img rounded-circle profile_pic"
              outerClassName={"avatars__item"}
            />
            <div className="d-flex flex-column gap-1 avatars__name">
              {row.original.display_name}
              <span className="fs-12">{row.original.role_name}</span>
            </div>
          </div>
        ),
      }),
      // columnHelper.accessor("role_name", {
      //   header: () => <span className="customHeader">Role</span>,
      // }),
      columnHelper.accessor("country_name", {
        header: () => <span className="customHeader">Country</span>,
      }),
      columnHelper.accessor("shift_time", {
        header: () => <span className="customHeader">Shift Time</span>,
        cell: (info) => {
          const value = info?.getValue();
          return <span>{value ? value : "-"}</span>;
        },
      }),
      ...(boardData[0]?.code === "OB"
        ? [
          columnHelper.accessor("ticket_count", {
            header: () => <span className="customHeader">Order Count</span>,
            cell: (info) => <div className="">{info?.getValue()}</div>,
          }),
        ]
        : []),
      columnHelper.accessor("tool_count", {
        header: () => (
          <span className="customHeader">{isTask ? "Task" : "Tools"}</span>
        ),
      }),

      columnHelper.accessor("is_active", {
        header: () => <span className="customHeader">Status</span>,
        cell: (info) => (
          <span
            className="customAction"
            style={{
              // backgroundColor:
              //   info.getValue() === true ? "##02A759" : "#AFAFAF33",
              color: info.getValue() === true ? "#02A759" : "#D3253A",
            }}
          >
            <span
              className="dot"
              style={{
                backgroundColor:
                  info.getValue() === true ? "#02A759" : "#D3253A",
              }}
            />{" "}
            {info.getValue() === true ? "Online" : "Offline"}
          </span>
        ),
      }),
    ];
  }, [boardData, columnHelper]);

  return (
    <>
      <SideDrawer
        show={showDrawer}
        onHide={() => { handleCloseDrawer(); setActiveTab(activeTask === "MainTask" ? "MainTask" : "SubTask"); }}
        title="Work Allocation"
        customWidth={drawerWidth}
      >
        <div className="mb-3">
          {workAllocation?.loading ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : (
            <>
              <UtcClock />
              {/* Summary */}
              {summary && (
                <div className="d-flex justify-content-between gap-2 mb-4 work-allocation-cards">
                  {boardData[0]?.code === "OB" && (
                    <SummaryCard
                      title="Total Order"
                      count={summary.total_orders}
                    />
                  )}
                  <SummaryCard
                    title={`Total ${isTask ? "Task" : "Tools"}`}
                    count={summary.total_tools}
                  />
                  <SummaryCard
                    title={`Assigned ${isTask ? "Task" : "Tools"}`}
                    count={summary.assigned_tools}
                  />
                  <SummaryCard
                    title={`Un-Assigned ${isTask ? "Task" : "Tools"}`}
                    count={summary.unassigned_tools}
                    showDot
                  />
                </div>
              )}

              {/* Tab Section */}
              <Tab.Container
                activeKey={activeTab}
                onSelect={(selectedKey) => {
                  setActiveTab(selectedKey);
                  if (selectedKey === "MainTask") {
                    setSelectedCountryMain(null); // Reset main filter
                  } else if (selectedKey === "SubTask") {
                    setSelectedCountrySub(null); // Reset sub filter
                  }
                }}
              >
                <Nav variant="tabs" className="work-allocation-tab-nav">
                  {!isTask && (
                    <Nav.Item>
                      <Nav.Link eventKey="MainTask">Main Task</Nav.Link>
                    </Nav.Item>
                  )}
                  <Nav.Item>
                    <Nav.Link eventKey="SubTask">
                      {isTask ? "Task" : "Sub Task"}
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                <Tab.Content>
                  {/* Main Task */}
                  {!isTask && (
                    <Tab.Pane
                      eventKey="MainTask"
                      className="work-allocation-tab-nav-panel"
                    >
                      <StageLabels stages={mainTaskStages} />
                      <CountryFilter
                        key={`main-country-filter-${activeTab}`}
                        stage="main"
                        countries={uniqueCountries}
                        selected={selectedCountryMain}
                        onChange={setSelectedCountryMain}
                        userRole={userRole}
                        orderView={orderViewMain}
                        setOrderView={setOrderViewMain}
                        userCount={filteredUsersMain?.length}
                      />
                      <UserTable users={filteredUsersMain} columns={columns} />
                    </Tab.Pane>
                  )}

                  {/* Sub Task */}
                  <Tab.Pane
                    eventKey="SubTask"
                    className="work-allocation-tab-nav-panel"
                  >
                    <StageLabels stages={subTaskStages} />
                    <CountryFilter
                      key={`sub-country-filter-${activeTab}`}
                      stage="sub"
                      countries={uniqueCountries}
                      selected={selectedCountrySub}
                      onChange={setSelectedCountrySub}
                      userRole={userRole}
                      orderView={orderViewSub}
                      setOrderView={setOrderViewSub}
                      userCount={filteredUsersSub?.length}
                      isSubTask={isTask}
                    />
                    <UserTable users={filteredUsersSub} columns={columns} />
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
            </>
          )}
        </div>
      </SideDrawer>
    </>
  );
};

export default WorkAllocation;

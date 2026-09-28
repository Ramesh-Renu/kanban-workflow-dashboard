import { t } from "i18next";
import React, { Fragment, useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import WorkSpaceFilter from "../Filter";
import UserListing from "../UserListing";
import UserView from "../UserView";
import CreateUser from "../CreateUser";
import { useLocation } from "react-router-dom";
import { getWorkSpaceUserList } from "../../../../services";
import { useGlobalMaster } from "@orion/shared";
import useAuth from "../../../../hooks/useAuth";
import { useGlobalContext } from "store/context/GlobalProvider";

const WorkSpaceUser = () => {
  const {
    countryList,
    getCountryList,
    allTeamList,
    getAllTeamList,
    allWorkspaceList,
    getAllWorkSpaceList,
    boardList,
    getBoardList,
    designationList,
    getDesignationList,
    roleList,
  } = useGlobalMaster();
  const [{ data }, { setAuth, getUserInfoData }] = useAuth();
  const { workSpaceUserList, dispatch } = useGlobalContext();
  const [showUserInfo, setShowUserInfo] = useState();
  const [showModal, setShowModal] = useState(false);
  const [userDetails, setUserDetails] = useState([]);
  const [pageOffset, setPageOffset] = useState(0);
  const [hasMoreRecords, setHasMoreRecords] = useState(true);
  const [loading, setLoading] = useState(false);

  const [filteredData, setFilteredData] = useState({
    searchTxt: null,
    team: [],
    country: [],
    workspace: [],
    board: [],
    userType: 46,
    designation: [],
    pageOffset: 0,
    pageSize: 10,
    sortBy: "team",
    sortOrder: "desc",
  });

  const [filtersReset, setFiltersReset] = useState(false);
  const [userListData, setUserListData] = useState();
  const [masterApiData, setMasterApiData] = useState({
    team: [],
    country: [],
    workspace: [],
    board: [],
    designation: [],
  });
  const route = useLocation();
  const getUseInfo = (data) => {
    if (!data) {
      setShowUserInfo(false);
      setUserDetails([]);
      return;
    }
    setUserDetails([data]);
    setShowUserInfo(true);
  };

  useEffect(() => {
    if (!countryList?.loading && countryList?.data?.length === 0) {
      getCountryList();
    }
    if (!allTeamList?.loading && allTeamList?.data?.length === 0) {
      getAllTeamList();
    }
    if (!allWorkspaceList?.loading && allWorkspaceList?.data?.length === 0) {
      getAllWorkSpaceList();
    }
    if (!boardList?.loading && boardList?.data?.length === 0) {
      getBoardList();
    }
    if (!designationList?.loading && designationList?.data?.length === 0) {
      getDesignationList();
    }
  }, []);

  useEffect(() => {
    const UpdatedMasters = {
      team: allTeamList?.data,
      country: countryList?.data,
      workspace: allWorkspaceList?.data,
      board: boardList?.data,
      designation: designationList?.data,
    };
    setMasterApiData(UpdatedMasters);
  }, [countryList, allTeamList, allWorkspaceList, boardList, designationList]);

  useEffect(() => {
    if (route.state !== null) {
      setShowUserInfo(route.showUserListTable);
      reloadTable();
    }
  }, [route]);

  const getUserList = async (filteredParams, type) => {
    let defaultParams = {
      searchTxt: null,
      team: [],
      country: [],
      workspace: [],
      board: [],
      userType: 46,
      designation: [],
      pageOffset: 0,
      pageSize: 10,
      sortBy: "team",
      sortOrder: "desc",
    };
    const finalParams = {
      ...defaultParams,
      ...(filteredParams || {}),
      pageOffset: type === "initialAPICall" ? 0 : pageOffset,
    };

    if (pageOffset > 0 && !hasMoreRecords && type === undefined) return;
    setLoading(true);
    try {
      const response = await getWorkSpaceUserList(finalParams);
      if (response?.data?.status) {
        if (
          pageOffset > 0 &&
          response?.data?.userItems?.length === 0 &&
          type === undefined
        ) {
          setHasMoreRecords(false);
          return;
        }
        if (pageOffset > 0 && type === undefined) {
          const updatedResult = {
            ...workSpaceUserList,
            userItems: [
              ...(workSpaceUserList?.userList || []),
              ...response?.data?.userItems,
            ],
          };
          setUserListData(updatedResult);
          dispatch({
            type: "SET_USERLIST_DATA",
            payload: updatedResult,
          });
        } else {
          setUserListData(response?.data);
          dispatch({
            type: "SET_USERLIST_DATA",
            payload: response?.data,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const arrayIDs = (arr, key) => {
      let value = Array.isArray(arr) ? arr.map((item) => item[key]) : null;
      return value.length > 0 ? value : null;
    };
    const userTypeID = roleList?.data?.find((item) => item.code === "USR");
    const filteredParams = {
      searchTxt: filteredData?.searchTxt,
      team: arrayIDs(filteredData?.team, "team_id"),
      country: arrayIDs(filteredData?.country, "country_id"),
      workspace: arrayIDs(filteredData?.workspace, "work_space_id"),
      board: arrayIDs(filteredData?.board, "boardID"),
      userType: userTypeID?.status_id || 46,
      designation: null,
      pageOffset: pageOffset || 0,
      pageSize: 10,
      sortBy: "team",
      sortOrder: "desc",
    };
    getUserList(filteredParams);
  }, [filteredData]);

  /** HANDLE SCROLL END */
  const handleScrollEnd = () => {
    if (!hasMoreRecords || loading) return; // Avoid multiple calls
    const nextOffset = pageOffset + 1;
    setPageOffset(nextOffset);
    setFilteredData((prev) => ({
      ...prev,
      pageOffset: nextOffset,
    }));
  };

  const reloadTable = (type) => {
    setHasMoreRecords(true);
    setPageOffset(0);
    setFilteredData((prev) => ({ ...prev, pageOffset: 0 }));
  };

  return (
    <Fragment>
      {!showUserInfo ? (
        <div className="settings-workspace-user userOverViewContainer bg-transparent">
          {/* ADD USER CONTAINER  */}

          <Row className="w-100 d-flex flex-row align-items-center justify-content-between border border-1 rounded mx-auto p-4 eu-header-bg">
            <Col>
              <span className="settings-workspace-user-title ">
                {t("settings.workspace_users")}
              </span>
              <p className="m-0 mt-2 settings-workspace-user-subtitle">
                {t(
                  "settings.view_and_manage_all_workspace_level_users_and_their_role_assignments",
                )}
              </p>
            </Col>
            {(roleList?.data?.filter(
              (user) => user.status_id === data?.details?.user_type,
            )[0]?.code === "ADM" ||
              data?.details?.isSuperAdmin === true) && (
              <Col className="d-flex justify-content-end">
                <button
                  className="btn add_user_btn"
                  onClick={() => setShowModal(!showModal)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowModal(!showModal);
                    }
                  }}
                >
                  {" "}
                  + Add User{" "}
                </button>
              </Col>
            )}
          </Row>
          {/* FILTER AND TABLE CONTAINER */}
          <Row className="w-100 d-flex flex-row align-items-center justify-content-between bg-white border border-1 shadow-sm rounded mx-auto p-2 mt-3">
            <div className="sectionTwo">
              {workSpaceUserList && (
                <WorkSpaceFilter
                  selectedFilters={filteredData}
                  setSelectedFilters={setFilteredData}
                  dropdownMaster={[]}
                  filtersReset={filtersReset}
                  setFiltersReset={setFiltersReset}
                  userList={workSpaceUserList}
                  masterApiData={masterApiData}
                  setPageOffset={setPageOffset}
                  setHasMoreRecords={setHasMoreRecords}
                />
              )}
            </div>
            {workSpaceUserList && <hr className="mt-3 text-dark" />}
            <div className="userListTable_Section">
              {workSpaceUserList && (
                <UserListing
                  userList={workSpaceUserList?.userList}
                  gotoUserInfo={getUseInfo}
                  tableHeight={"70vh"}
                  addUser={() => setShowModal(!showModal)}
                  masterApiData={masterApiData}
                  reloadTable={() => reloadTable()}
                  selectedFilters={filteredData}
                  tableType={"user"}
                  onScrollEnd={handleScrollEnd}
                  loading={loading}
                />
              )}
            </div>
          </Row>
        </div>
      ) : (
        userDetails && (
          <UserView
            userData={userDetails}
            selectedFilters={filteredData}
            showUserListTable={() => getUseInfo(null)}
            listLabel={t("settings.workspace_users")}
          />
        )
      )}

      <CreateUser
        show={showModal}
        onClose={setShowModal}
        reloadTable={() => reloadTable()}
        // reloadTable={() => {
        //   getUserList({}, "initialAPICall");
        //   setPageOffset(0);
        // }}
      />
    </Fragment>
  );
};

export default WorkSpaceUser;

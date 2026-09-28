import { t } from "i18next";
import React, { Fragment, useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import CreateUser from "../CreateUser";
import UserListing from "../UserListing";
import UserView from "../UserView";
import { getWorkSpaceUserList } from "../../../../services";
import { useGlobalMaster } from "@orion/shared";
import useAuth from "../../../../hooks/useAuth";
import SettingsSvg from "../../SettingsSvg";
import variables from "@orion/shared/src/styles/variables-style.json";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";

const WorkspaceAdmin = () => {
  const [{ data }] = useAuth();
  const {
    countryList,
    allTeamList,
    allWorkspaceList,
    getAllWorkSpaceList,
    boardList,
    getBoardList,
    designationList,
  } = useGlobalMaster();
  const [showModal, setShowModal] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [userDetails, setUserDetails] = useState([]);
  const [pageOffset, setPageOffset] = useState(0);
  const [hasMoreRecords, setHasMoreRecords] = useState(true);
  const [loading, setLoading] = useState(false);
  const [userListData, setUserListData] = useState();
  const [getImageleft, setImageleft] = useState(30);
  const [getImageHeight, setImageHeight] = useState(20);
  const [masterApiData, setMasterApiData] = useState({
    team: [],
    country: [],
    workspace: [],
    board: [],
    designation: [],
  });

  const getUseInfo = (rowData) => {
    if (!rowData) {
      setShowUserInfo(false);
      setUserDetails([]);
      return;
    }
    setUserDetails([rowData]);
    setShowUserInfo(true);
  };

  // initial Api hit to get UserList
  useEffect(() => {
    getUserList();
    if (!allWorkspaceList?.loading && allWorkspaceList?.data?.length === 0) {
      getAllWorkSpaceList();
    }
    if (!boardList?.loading && boardList?.data?.length === 0) {
      getBoardList();
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

  const getUserList = async (pageOffSet) => {
    setLoading(true);
    let params = {
      searchTxt: null,
      team: null,
      country: null,
      workspace: null,
      board: null,
      userType: 45,
      designation: null,
      pageOffset: pageOffSet || 0,
      pageSize: 10,
      sortBy: "team",
      sortOrder: "desc",
    };
    const response = await getWorkSpaceUserList(params);
    if (response?.data?.status) {
      setUserListData(response?.data);
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  const commonPlaceIconsStyle = {
    width: "24px",
    height: "24px",
    left: "4px",
    top: "4px",
  };

  /** SET IMAGE POSITION */
  useEffect(() => {
    const getWith = 450 / 15;
    setImageleft(getWith);
    setImageHeight(30);
  }, []);

  /** HANDLE SCROLL END */
  const handleScrollEnd = () => {
    if (!hasMoreRecords || loading) return; // Avoid multiple calls
    const nextOffset = pageOffset + 1;
    setPageOffset(nextOffset);
  };

  return (
    <Fragment>
      {showUserInfo && userDetails.length > 0 ? (
        <UserView
          userData={userDetails}
          selectedFilters={null}
          showUserListTable={() => getUseInfo(null)}
          listLabel={t("settings.admin_users")}
          isAdminUser={true}
        />
      ) : (
    <div className="settings-workspace-user userOverViewContainer bg-transparent">
      {/* ADD ADMIN CONTAINER  */}
      <Row className="w-100 d-flex flex-row align-items-center justify-content-between border border-1 rounded mx-auto p-4 eu-header-bg">
        <Col>
          <span className="settings-workspace-user-title ">
            {t("settings.admin_users")}
          </span>
          <p className="m-0 mt-2 settings-workspace-user-subtitle">
            View and manage all Admin-level users and their role assignments
          </p>
        </Col>
        {data?.details?.isSuperAdmin !== null &&
          data?.details?.isSuperAdmin === true && (
            <Col className="d-flex justify-content-end">
              <button
                className="btn border-0 add_user_btn"
                onClick={() => setShowModal(!showModal)}
              >
                {" "}
                + Add Admin{" "}
              </button>
            </Col>
          )}
      </Row>
      <Row className="d-flex flex-row flex-wrap justify-content-end  align-items-center">
        <Col
          lg={12}
          md={12}
          className="d-flex flex-column align-items-end justify-content-end"
        >
          <div className="">
            <div className="results_text m-0 p-0 text-end mt-3 fs-14 position-relative">
              <SettingsSvg
                color={variables.common["--color-primary"]}
                style={{
                  position: "absolute",
                  left: `-${getImageleft * 5 + 10}px`,
                  height: getImageHeight,
                  // backgroundColor: variables.common["--color-btn-filter-gray"],
                }}
                commonPlaceIconsStyle={{
                  ...commonPlaceIconsStyle,
                  right: null,
                  width: "20px",
                  height: "25px",
                  left: "-23px",
                  top: "-7px",
                }}
                isTransparent={true}
                // bgColor={variables.common["--color-btn-filter-gray"]}
              />
              Total Admin user count :
              <span className="mx-2">
                {userListData?.userItems?.length || "0"}
              </span>
            </div>
          </div>
        </Col>
      </Row>
      <Row className="w-100 m-0 p-0 d-flex flex-row align-items-center justify-content-between  mt-3 userListTable_Section ">
        <div className="userListTable_Section p-0">
          {loading && userListData?.userItems?.length === 0 ? (
            <div className="border rounded bg-white shadow-sm">
              <Spinner />
            </div>
          ) : (
            <UserListing
              userList={userListData?.userItems}
              gotoUserInfo={getUseInfo}
              tableType={"admin"}
              tableHeight={"73vh"}
              addUser={() => setShowModal(!showModal)}
              masterApiData={masterApiData}
              reloadTable={() => getUserList()}
              onScrollEnd={handleScrollEnd}
              loading={loading}
            />
          )}
        </div>
      </Row>

      <CreateUser
        show={showModal}
        onClose={setShowModal}
        type={"admin"}
        reloadTable={() => getUserList()}
      />
    </div>
      )}
    </Fragment>
  );
};

export default WorkspaceAdmin;

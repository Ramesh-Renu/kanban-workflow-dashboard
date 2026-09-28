import { t } from "i18next";
import React, { useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import UserListing from "../UserListing";
import { getWorkSpaceUserList, updateUserType } from "../../../../services";
import { useGlobalMaster } from "@orion/shared";
import { useToast } from "@orion/shared";
import SettingsSvg from "../../SettingsSvg";
import variables from "@orion/shared/src/styles/variables-style.json";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";

const InActiveUser = () => {
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
  } = useGlobalMaster();
  const { showToast } = useToast();
  const [userListData, setUserListData] = useState();
  const [loading, setLoading] = useState(false);
  const [masterApiData, setMasterApiData] = useState({
    team: [],
    country: [],
    workspace: [],
    board: [],
    designation: [],
  });
  const [getImageleft, setImageleft] = useState(30);
  const [getImageHeight, setImageHeight] = useState(20);

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

  // initial Api hit to get UserList
  useEffect(() => {
    getUserList();
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

  const getUserList = async () => {
    setLoading(true);
    let params = {
      searchTxt: null,
      team: null,
      country: null,
      workspace: null,
      board: null,
      userType: 47,
      designation: null,
      pageOffset: 0,
      pageSize: 10,
      sortBy: "team",
      sortOrder: "desc",
    };
    const response = await getWorkSpaceUserList(params);
    setUserListData(response?.data);
    setLoading(false);
  };

  const retrieveUser = async (props) => {
    const moveUserTypeId = props.key === "admin" ? 45 : 46;
    if (props) {
      const params = {
        userId: props?.userInfo?.regId,
        userTypeId: moveUserTypeId,
        previousUserTypeId: 47,
      };

      try {
        const response = updateUserType(params);
        response.then((res) => {
          if (res?.data?.status) {
            showToast({
              message: res?.data?.message,
              variant: "success",
            });
            getUserList();
          }
        });
      } catch (error) {
        console.log("error", error);
        // showToast({
        //   message: error?.message,
        //   variant: "danger",
        // });
      }
    }
  };
  return (
    <div className="settings-workspace-user userOverViewContainer bg-transparent">
      <Row className="w-100 d-flex flex-row align-items-center justify-content-between border border-1 rounded mx-auto p-4 eu-header-bg">
        <Col>
          <span className="settings-workspace-user-title ">
            {t("settings.in_active_users")}
          </span>
          <p className="m-0 mt-2 settings-workspace-user-subtitle">
            {t(
              "settings.view_and_manage_users_who_have_been_deactivated_from_the_workspace"
            )}
          </p>
        </Col>
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
              Total In-Active user count :
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
              gotoUserInfo={() => null}
              tableType={"in-Active"}
              tableHeight={"73vh"}
              masterApiData={masterApiData}
              updateUserData={(props) => retrieveUser(props)}
              reloadTable={() => getUserList()}
            />
          )}
        </div>
      </Row>
    </div>
  );
};

export default InActiveUser;

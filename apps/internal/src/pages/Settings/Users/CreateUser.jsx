// import { add_userWhite } from "../../../assets/images";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { t } from "i18next";
import React, { Fragment, useEffect, useState, useRef } from "react";
import { Col, Row, Spinner } from "react-bootstrap";
import SearchableInput from "../../../components/common/Dynamic/SearchableInput";
import { SelectDropDown } from "@orion/shared";
// import SettingsSvg from "../SettingsSvg";
import { useGlobalMaster } from "@orion/shared";
import { createWorkspaceUser } from "../../../services";
import { useToast } from "@orion/shared";

const CreateUser = ({ show, onClose, type, reloadTable, editUserData }) => {
  const dropdownRef = useRef(null); // For click outside
  const { roleList, getRoleList } = useGlobalMaster();
  const { showToast } = useToast();
  const {
    designationList,
    getDesignationList,
    countryList,
    getCountryList,
    allTeamList,
    getAllTeamList,
    adUsersList,
    getAdUsersList,
    getAllWorkSpaceList,
    getBoardList,
  } = useGlobalMaster();

  const [userData, setUserData] = useState({
    userInfo: {
      regId: "",
      name: "",
    },
    team: [],
    designation: [],
    country: [],
    userType: [],
    shiftTime: { from: "", to: "" },
  });
  const [userPrevData, setUserPrevData] = useState({
    userInfo: {
      regId: "",
      name: "",
    },
    team: [],
    designation: [],
    country: [],
    userType: [],
    shiftTime: { from: "", to: "" },
  });
  const [errorText, setErrorText] = useState({
    userInfo: false,
    team: false,
    designation: false,
    country: false,
  });
  const [getImageleft, setImageleft] = useState(30);
  const [getImageHeight, setImageHeight] = useState(20);
  const [isConfirmToClose, setConfirmToClose] = useState(false);
  const [designationData, setDesignationData] = useState([]);
  const [userListArr, setUserListArr] = useState([]);
  const [showDropDown, setShowDropDown] = useState(false);
  const [showApiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    if (editUserData?.length > 0) {
      const data = {
        userInfo: editUserData[0]?.userInfo,
        team: allTeamList?.data?.filter(
          (my) => my.team_id === editUserData[0]?.team
        ),
        designation: designationList?.data
          ?.filter((my) => my?.id === editUserData[0]?.team)[0]
          ?.designationList?.filter(
            (desg) => desg.id === editUserData[0]?.designation
          ),
        country: countryList?.data?.filter(
          (my) => my.country_id === editUserData[0]?.country
        ),
        userType: roleList?.data?.filter(
          (my) => my.status_id === editUserData[0]?.userType
        ),
        shiftTime: editUserData[0]?.shiftTime,
      };
      setUserPrevData(data);
      setUserData(data);
    }
  }, [show]);

  useEffect(() => {
    if (!roleList?.loading && roleList?.data?.length === 0) {
      getRoleList();
    }
    if (!designationList?.loading && designationList?.data?.length === 0) {
      getDesignationList();
    }
    if (!countryList?.loading && countryList?.data?.length === 0) {
      getCountryList();
    }
    if (allTeamList?.data?.length === 0) {
      getAllTeamList();
    }
    if (adUsersList.data?.length === 0) {
      getAdUsersList();
    }
    // getAdUsersList();
    if (!show) {
      resetForm();
    }
  }, [show]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropDown(false); // close dropdown
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /** SET IMAGE POSITION */
  useEffect(() => {
    const getWith = 450 / 15;
    setImageleft(getWith);
    setImageHeight(30);
  }, []);

  function isDifferent(obj1, obj2) {
    return JSON.stringify(obj1) !== JSON.stringify(obj2);
  }
  const formLabels = [
    {
      label: t("settings.user_name"),
      iconPlacement: 5,
      value: userData.userInfo.name,
      typeof: "search",
      key: "userInfo",
      error: "User name is required",
      placeholder: `Enter or Search User Name`,
      isMandatory: true,
    },
    {
      label: t("settings.team"),
      iconPlacement: 4,
      value: userData.team,
      options: allTeamList.data || [],
      typeof: "dropDown",
      key: "team",
      labelField: "name",
      valueField: "team_id",
      error: "Team is required",
      isCanAddNew: true,
      placeholder: `Choose Team`,
      isMandatory: true,
    },
    {
      label: t("settings.designation"),
      iconPlacement: 6,
      value: userData.designation,
      options: designationData || [],
      typeof: "dropDown",
      key: "designation",
      labelField: "name",
      valueField: "id",
      error: "Designation is required",
      disabled: userData?.team?.length === 0,
      isCanAddNew: true,
      placeholder:
        userData?.team?.length > 0 && designationData.length === 0
          ? `Add New Designation`
          : `Choose Designation`,
      isMandatory: true,
    },
    {
      label: t("settings.country"),
      iconPlacement: 7,
      value: userData.country,
      options: countryList?.data,
      typeof: "dropDown",
      key: "country",
      labelField: "country_name",
      valueField: "country_code",
      error: "Country is required",
      placeholder: `Choose Country`,
      isMandatory: true,
    },
    {
      label: t("settings.shiftTime"),
      iconPlacement: 8,
      value: userData.shiftTime,
      typeof: "timeRange", // custom type for your component
      key: "shiftTime",
      error: "",
      placeholder: "Select Shift Time",
      isMandatory: false,
    },
  ];

  useEffect(() => {
    if (userData?.team && Array.isArray(designationList?.data)) {
      const designationDataList = designationList?.data.filter(
        (item) => item?.name === userData?.team[0]?.name
      );
      if (designationDataList.length > 0) {
        setDesignationData(designationDataList[0].designationList || []);
      } else {
        setDesignationData([]);
      }
    } else {
      setDesignationData([]);
    }
  }, [userData, designationList]);

  const handleChange = (value, key) => {
    const result = { ...userData, [key]: value };
    setUserData(result);

    if (key === "team") {
      setUserData((prev) => ({
        ...prev,
        designation: [],
      }));
    }
    // Only update the changed field's error
    // setErrorText((prev) => ({
    //   ...prev,
    //   [key]:
    //     key === "userInfo"
    //       ? !result?.userInfo?.regId
    //       : key === "team"
    //       ? result?.team?.length === 0
    //       : key === "designation"
    //       ? result?.team?.length > 0 && result?.designation?.length === 0
    //       : key === "country"
    //       ? result?.country?.length === 0
    //       : prev[key], // fallback, keep old value
    // }));
  };

  const formValidation = () => {
    const newErrors = {
      userInfo: !userData?.userInfo?.regId?.trim(), // true if empty
      team: userData?.team?.length === 0,
      designation: userData?.designation?.length === 0,
      country: userData?.country?.length === 0,
    };
    setErrorText(newErrors);
    const hasNoErrors = Object.values(newErrors).every(
      (error) => error === false
    );
    if (hasNoErrors) {
      createUserApi();
    }
  };

  const resetForm = () => {
    setUserData({
      userInfo: {
        regId: "",
        name: "",
      },
      team: [],
      designation: [],
      country: [],
      userType: [],
    });
    setApiLoading(false);
  };

  const handleClose = () => {
    if (editUserData?.length > 0 && isDifferent(userPrevData, userData)) {
      setConfirmToClose(true);
    } else if (
      editUserData?.length > 0 &&
      !isDifferent(userPrevData, userData)
    ) {
      resetForm();
      onClose();
      setErrorText({
        userInfo: false,
        team: false,
        designation: false,
        country: false,
      });
    } else if (editUserData === undefined) {
      if (
        userData.userInfo.regId ||
        userData.team.length > 0 ||
        userData.designation.length > 0 ||
        userData.country.length > 0
      ) {
        setConfirmToClose(true);
      } else {
        resetForm();
        onClose();
        setErrorText({
          userInfo: false,
          team: false,
          designation: false,
          country: false,
        });
      }
    }
  };

  const confirmCancel = () => {
    setConfirmToClose(false);
    resetForm();
    onClose();
    setErrorText({
      userInfo: false,
      team: false,
      designation: false,
      country: false,
    });
  };

  const handleUserSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    // update input value in state
    setUserData((prev) => ({
      ...prev,
      userInfo: { ...prev.userInfo, displayName: e.target.value },
    }));

    // filter list
    if (searchTerm) {
      const filteredData = adUsersList?.data.filter((item) =>
        item?.displayName?.toLowerCase().includes(searchTerm)
      );
      setUserListArr(filteredData);
      setShowDropDown(true);
    } else {
      setUserListArr([]);
    }
  };

  const handleSelectUser = (user) => {
    handleChange(user, "userInfo");
    setShowDropDown(false);
  };

  const createUserApi = async () => {
    const createFrom = type === "admin" ? "Admin" : "User";
    let UserType = roleList?.data?.filter((item) => item.name === createFrom);

    const params = {
      userProfileId:
        editUserData?.length > 0 ? editUserData[0]?.userProfileId : 0,
      userId: userData?.userInfo?.regId,
      teamId: userData?.team[0]?.team_id,
      teamName: userData?.team[0]?.name,
      // teamName: userData?.team[0]?.team_id === 0 ? userData?.team[0]?.name : "",
      isNewTeam: userData?.team[0]?.team_id === 0,
      designationId: userData?.designation[0]?.id,
      designationName: userData?.designation[0]?.name,
      isNewDesignation: userData?.designation[0]?.id === 0,
      countryId: userData?.country[0]?.country_id,
      userTypeId: UserType[0]?.status_id || 46,
      shiftTime: {
        from: userData?.shiftTime?.from || "",
        to: userData?.shiftTime?.to || "",
      },
    };
    setApiLoading(true);
    try {
      const response = createWorkspaceUser(params);
      response.then((res) => {
        if (res?.data?.status) {
          showToast({
            message: res?.data?.message,
            variant: "success",
          });
          setApiLoading(false);
          resetForm();
          onClose();
          reloadTable(params);
          reloadMaster();
        } else {
          showToast({
            message: res?.data?.message,
            variant: "danger",
          });
          setApiLoading(false);
          resetForm();
          onClose();
        }
      });
    } catch (error) {
      showToast({
        message: "Creation Failed",
        variant: "danger",
      });
      setApiLoading(false);
      resetForm();
      onClose();
    }
  };

  const reloadMaster = () => {
    getCountryList();
    getAllTeamList();
    getAllWorkSpaceList();
    getBoardList();
    getDesignationList();
    getAdUsersList();
  };

  const buttonValidation = () => {
    const newErrors = {
      userInfo: !userData?.userInfo?.regId, // true if empty
      team: userData?.team?.length === 0,
      designation: userData?.designation?.length === 0,
      country: userData?.country?.length === 0,
    };
    const isFormFilled = Object.values(newErrors).some((val) => val === false);
    return isFormFilled;
  };

  return (
    <Fragment>
      <PopupModal
        show={show}
        onClose={() => handleClose()}
        className={"bg-white rounded-4  commonForm"}
        width={"45vh"}
        size="lg"
        header={true}
        title={
          <div className="w-auto d-flex createUserTitle gap-3">
            {/* <div className="title-img-container rounded">
              <img src={add_userWhite} alt="addUser" />
            </div> */}
            <span>
              {" "}
              {type !== "admin"
                ? editUserData?.length > 0
                  ? t("settings.edit_user")
                  : t("settings.create_new_user")
                : t("settings.create_new_admin")}
            </span>
          </div>
        }
      >
        <div className="form-Container">
          <Row className="d-flex flex-row align-items-start row-gap-3 flex-wrap">
            {formLabels &&
              formLabels.map((val, index) => {
                return (
                  <Col xs={6} className="" key={index}>
                    <div className="position-relative">
                      {/* <SettingsSvg
                        color={"#000000"}
                        style={{
                          position: "absolute",
                          left: -(getImageleft * val.iconPlacement + 10) + "px",
                          height: getImageHeight,
                          top: "-2px",
                        }}
                        commonPlaceIconsStyle={commonPlaceIconsStyle}
                      /> */}
                      <label className="labelText">
                        {val?.label}{" "}
                        {val?.isMandatory && (
                          <span className="text-danger">*</span>
                        )}{" "}
                      </label>
                    </div>

                    {val.typeof === "timeRange" ? (
                      <div className="d-flex gap-2 mt-2 align-items-center">
                        <label className="labelText">From</label>
                        <input
                          type="time"
                          value={userData?.shiftTime?.from}
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevent losing focus
                            e.target.showPicker(); // opens the native time picker
                          }}
                          onChange={(e) =>
                            handleChange(
                              { ...userData.shiftTime, from: e.target.value },
                              "shiftTime"
                            )
                          }
                          className="form-control fs-14 p-2"
                          placeholder="From"
                        />
                        <label className="labelText">To</label>
                        <input
                          type="time"
                          value={userData?.shiftTime?.to}
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevent losing focus
                            e.target.showPicker(); // opens the native time picker
                          }}
                          onChange={(e) =>
                            handleChange(
                              { ...userData.shiftTime, to: e.target.value },
                              "shiftTime"
                            )
                          }
                          className="form-control fs-14 p-2"
                          placeholder="To"
                        />
                      </div>
                    ) : val.typeof === "search" ? (
                      <div className="position-relative" ref={dropdownRef}>
                        <SearchableInput
                          id="userName"
                          placeholder="Enter or Search User Name"
                          value={userData.userInfo?.displayName}
                          onChange={(e) => handleUserSearch(e)}
                          // isLoading={showLoading}
                          // isDropdownVisible={isDropdownVisible}
                          // suggestions={suggestedValues}
                          // onSelectSuggestion={(suggestion) => {
                          //   handleCompanyInfoForm(
                          //     suggestion?.customer_name,
                          //     "companyName"
                          //   );
                          //   handleCompanyInfoForm(
                          //     suggestion?.company_code,
                          //     "companyCode"
                          //   );
                          //   setIsDropdownVisible(false);
                          // }}
                          // setIsDropdownVisible={(e) => setIsDropdownVisible(e)}
                          // errorMsg={errorMsg.companyName}
                          className="fs-14 searchableInput mt-2"
                          ismandatory={true}
                          disabled={editUserData?.length > 0 ? true : false}
                        />

                        {showDropDown &&
                          userData?.userInfo?.displayName?.trim().length > 0 ? (
                          <div className="custom-Search_value">
                            {userListArr?.length > 0 ? (
                              userListArr.map((item, index) => (
                                <div
                                  className="value_field py-1"
                                  onClick={() => handleSelectUser(item)}
                                  key={index}
                                >
                                  <p className="m-0">{item?.displayName}</p>
                                  <span>{item.email}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-center fs-12 text-danger">
                                No results found
                              </div>
                            )}
                          </div>
                        ) : (
                          ""
                        )}
                      </div>
                    ) : (
                      <SelectDropDown
                        id={val.key}
                        multi={false}
                        options={val.options}
                        labelField={val.labelField}
                        valueField={val.valueField}
                        searchable={true}
                        values={val?.value}
                        onChange={(e) => handleChange(e, val.key)}
                        placeholder={val.placeholder}
                        className="multiple-select mt-2 filter-select-dropDown"
                        // optionType={item.optionType}
                        // nestedList={item.nestedList}
                        disabled={val.disabled}
                        dropdownPosition="auto"
                        labelValue={val?.label}
                        keyValue={val?.labelField}
                        isCanAddNew={val?.isCanAddNew}
                        notFoundText={"Not Found"}
                      // isInvalid={!!errorMsg?.[item.fieldName]}
                      />
                    )}
                    <div className="text-danger fs-12 mx-1 mt-1">
                      {errorText[val.key] && val.error}
                    </div>
                  </Col>
                );
              })}
          </Row>
        </div>
        <Row className="d-flex mx-auto flex-row align-items-center justify-content-end gap-3 mt-3 action_btn_row">
          <button
            className="btn w-auto cancel_btn px-3"
            onClick={() => handleClose()}
          >
            Cancel
          </button>
          <button
            className="btn w-auto create_btn px-3 d-flex flex-row gap-2 align-items-center"
            onClick={() => formValidation()}
            disabled={
              !buttonValidation() ||
              showApiLoading ||
              (editUserData?.length > 0 && !isDifferent(userPrevData, userData))
            }
          >
            {editUserData === undefined &&
              (showApiLoading ? "Creating" : "Create")}
            {editUserData?.length > 0 &&
              (showApiLoading ? "Updating" : "Update")}
            {showApiLoading && (
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="mt-1"
              />
            )}
          </button>
        </Row>
      </PopupModal>
      <PopupModal
        show={isConfirmToClose}
        onClose={setConfirmToClose}
        header={false}
      >
        <div className="">
          <div className="text-center popuptext">
            Do you want to Cancel this
            {type === "admin" ? " add admin User" : " add Workspace User"}?
          </div>
          <div className="d-flex flex-row justify-content-center gap-3 mt-3">
            <button
              className="btn btn-danger px-4"
              onClick={() => confirmCancel()}
            >
              Yes
            </button>
            <button
              className="btn btn-secondary px-4"
              onClick={() => setConfirmToClose(false)}
            >
              No
            </button>
          </div>
        </div>
      </PopupModal>
    </Fragment>
  );
};

export default CreateUser;

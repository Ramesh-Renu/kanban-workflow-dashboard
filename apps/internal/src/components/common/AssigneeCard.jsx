/** This component created by Stephen S ***/
import React, { Fragment, forwardRef, useEffect } from "react";
import { classNames } from "@euroland/libs";
import { useState } from "react";
import checked from "../../assets/images/checked.png";
import unChecked from "../../assets/images/unchecked.png";
import radioChecked from "../../assets/images/radio-checked.svg";
import radioUnChecked from "../../assets/images/radio-uncheck.svg";
import searchIcon from "../../assets/images/search.png";
import useClickAway from "../../hooks/useClickAway";
import usePopper from "../../hooks/usePopper";
import LogoAvatarShowLetter from "./LogoAvatarShowLetter";
import { useTranslation } from "react-i18next";
import { addUser } from "../../assets/images";
import { Col, Row } from "react-bootstrap";
import PopupModal from "@orion/shared/src/components/PopupModal";

const AssigneeCard = forwardRef(
  (
    {
      assignedUser,
      userList,
      onChange,
      authDeptId,
      multiSelect,
      errorInfo,
      placeHolder,
      ...props
    },
    ref,
  ) => {
    const [userLists, setUserLists] = useState([]);
    const [search, setSearch] = useState("");
    const [searchList, setSearchList] = useState([]);
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);
    const { reference, popper, referenceRef, popperRef } = usePopper({
      placement: "bottom-end",
      enable: assigneeDialogOpen,
    });
    const { t } = useTranslation();
    const [selectedItem, setSelectedItem] = useState(multiSelect ? [] : null);

    const filterSuggestedMembers = (suggestedMembers, assignedUsers) => {
      if (!suggestedMembers || suggestedMembers.length === 0) return [];
      const assignedRegIds = new Set(assignedUsers?.map((user) => user?.regId));

      // Otherwise, map over suggestedMembers to add a checked property
      return suggestedMembers.map((user) => ({
        ...user,
        checked: assignedRegIds.has(user?.regId),
      }));
    };

    useEffect(() => {
      const validUsers = Array.isArray(assignedUser)
        ? assignedUser.filter((user) => user !== null)
        : assignedUser
          ? [assignedUser]
          : [];
      setAssignedUsers(validUsers.map((user) => ({ ...user, checked: true })));

      if (userList.length > 0) {
        const updatedSuggestedMembers = filterSuggestedMembers(
          userList,
          validUsers,
        );

        setUserLists(updatedSuggestedMembers);
      }
    }, [assignedUser, userList]);

    useEffect(() => {
      if (userLists?.length > 0) {
        setSearchList(userLists);
        const setListItems = userLists?.filter((item) => item.checked);
        if (multiSelect) {
          setSelectedItem(setListItems);
        } else {
          setSelectedItem(setListItems[0]);
        }
      }
    }, [userLists]);

    const reset = () => {
      setSearch("");
      setSelectedItem(multiSelect ? [] : null);
      onSearch();
      const updatedSuggestedMembers = filterSuggestedMembers(
        userList,
        Array.isArray(assignedUser) ? assignedUser : [assignedUser],
      );
      setUserLists(updatedSuggestedMembers);
    };

    useClickAway([reference, popper], () => {
      setAssigneeDialogOpen(false);
      reset();
    });

    const UserListUI = ({
      data,
      className,
      onClick,
      isActive,
      clickable,
      multiSelect,
    }) => {
      const getData = Array.isArray(data) ? data[0] : data;
      const isActiveCheck = Array.isArray(data)
        ? data[0]?.checked === true
        : data?.checked === true || isActive;

      return (
        <Fragment>
          {getData?.displayName !== undefined && (
            <>
              {clickable == true && (
                <button
                  onClick={(e) => onClick(e, getData)}
                  onKeyDown={(e) => onClick(e, getData)}
                  tabIndex={0}
                  name="assignee list"
                  className="need-assignee bg-white border-0 w-100 d-flex"
                >
                  <div
                    className={classNames(className, "list", {
                      active: isActiveCheck,
                    })}
                  >
                    <div className="d-flex gap-3 align-items-center">
                      {getData?.displayName && (
                        <LogoAvatarShowLetter
                          genaralData={getData}
                          profileName={"displayName"}
                          outerClassName={"list__image"}
                          innerClassName={"no-image"}
                        ></LogoAvatarShowLetter>
                      )}
                      <div className="list__details">
                        <p
                          className="list__details__name"
                          name={getData?.displayName}
                        >
                          {getData?.displayName}
                        </p>
                        <p
                          className="list__details__role"
                          name={getData?.teamName}
                        >
                          {getData?.teamName}
                        </p>
                        <p
                          className="list__details__role"
                          name={props?.userRole?.data
                            ?.filter((role) => role?.roleId === getData?.roleId)
                            .map((role) => role.roleName)
                            .toString()}
                        >
                          {props?.userRole?.data
                            ?.filter((role) => role?.roleId === getData?.roleId)
                            .map((role) => role.roleName)
                            .toString()}
                        </p>
                      </div>
                    </div>

                    <div className="list__checkbox">
                      {isActiveCheck ? (
                        <img
                          src={multiSelect ? checked : radioChecked}
                          alt="checked"
                        />
                      ) : (
                        <img
                          src={multiSelect ? unChecked : radioUnChecked}
                          alt="unchecked"
                        />
                      )}
                    </div>
                  </div>
                </button>
              )}
              {clickable == false && (
                <button
                  className="assigned"
                  disabled={isActiveCheck || !isActiveCheck}
                >
                  <div
                    className={classNames(className, "list", {
                      active: isActiveCheck,
                    })}
                  >
                    <div className="list__checkbox">
                      {isActiveCheck ? (
                        <img
                          src={multiSelect ? checked : radioChecked}
                          alt="checked"
                        />
                      ) : (
                        <img
                          src={multiSelect ? unChecked : radioUnChecked}
                          alt="unchecked"
                        />
                      )}
                    </div>

                    {getData?.displayName && (
                      <LogoAvatarShowLetter
                        genaralData={getData}
                        profileName={"displayName"}
                        outerClassName={"list__image"}
                        innerClassName={"no-image"}
                      ></LogoAvatarShowLetter>
                    )}
                    <div className="list__details">
                      <p
                        className="list__details__name"
                        name={getData?.displayName}
                      >
                        {getData?.displayName}
                      </p>
                      <p
                        className="list__details__role"
                        name={getData?.teamName}
                      >
                        {getData?.teamName}
                      </p>
                      <p
                        className="list__details__role"
                        name={props?.userRole?.data
                          ?.filter((role) => role?.roleId === getData?.roleId)
                          .map((role) => role.roleName)
                          .toString()}
                      >
                        {props?.userRole?.data
                          ?.filter((role) => role?.roleId === getData?.roleId)
                          .map((role) => role.roleName)
                          .toString()}
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </>
          )}
        </Fragment>
      );
    };

    const onSearch = (val) => {
      const setVal = val?.trim();
      if (!setVal) {
        setSearchList(userLists);
        return;
      }
      setSearchList(
        userLists !== null
          ? userLists?.filter((opt) =>
            opt?.displayName
              .toLocaleLowerCase()
              .includes(setVal?.toLocaleLowerCase()),
          )
          : [],
      );
    };

    const changeUser = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click" || e.key === "Enter") {
        const isMatchingAssignedUsers = (assignedUser, setListItems) => {
          if (assignedUser.length !== setListItems.length) {
            return false;
          }

          const assignedRegIds = new Set(
            assignedUser.map((user) => user.regId),
          );
          return setListItems.every((item) => assignedRegIds.has(item.regId));
        };
        // Example usage:
        const result = isMatchingAssignedUsers(assignedUser, selectedItem);
        if (result) {
          errorInfo("No new assignee has been selected currently!");
          setAssigneeDialogOpen(false);
          return;
        }
        onChange(
          selectedItem !== undefined &&
            assignedUser[0]?.regId === selectedItem?.regId
            ? null
            : selectedItem,
        );
        setAssignedUsers(result ? assignedUsers : [selectedItem]);
        reset();
        setAssigneeDialogOpen(false);
      }
    };

    // Function to handle cancel button click
    const cancelUserAssign = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click" || e.key === "Enter") {
        setAssigneeDialogOpen(false);
        reset();
      }
      reset();
    };
    // Function to handle search input change and trigger search
    const changeSearch = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click" || e.key === "Enter") {
        onSearch(search);
      }
    };

    // Function to handle item click
    const handleItemClick = (e, data) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click" || e.key === "Enter") {
        if (multiSelect) {
          const setItems = userLists?.map((item) => {
            if (item.regId === data.regId) {
              return { ...item, checked: item.checked ? false : true };
            }
            return item;
          });
          const setListItems = setItems?.filter((item) => item.checked);
          setUserLists(setItems);
          setSelectedItem(setListItems);
        } else {
          const updatedSuggestedMembers = filterSuggestedMembers(userList, [
            data,
          ]);
          const setListItems = updatedSuggestedMembers?.filter(
            (item) => item.checked,
          );
          setUserLists(search ? setListItems : updatedSuggestedMembers);
          setSelectedItem((prevSelectedItem) => {
            return prevSelectedItem === data ? null : data;
          });
        }
      }
    };

    const isCanSave = () => {
      if (multiSelect) {
        return !Array.isArray(selectedItem) || selectedItem.length === 0;
      } else {
        return (
          selectedItem === null ||
          Object.keys(selectedItem || {}).length === 0 ||
          selectedItem?.regId === assignedUser?.regId
        );
      }
    };

    return (
      <>
        <div className="data_section_update position-relative " ref={ref}>
          <Row
            ref={referenceRef}
            className="rounded mx-auto mt-2 assigneeContainer shadow-sm  align-items-center justify-content-between"
            style={{
              backgroundColor: assignedUsers?.length > 0 && "#F3FCFF80",
              border: assignedUsers?.length > 0 ? "1px solid #00ADF080" : "",
            }}
          >
            <Col
              xs={11}
              className="d-flex flex-row align-items-center gap-2 p-0 "
            >
              {assignedUsers?.length > 0 ? (
                assignedUsers?.map((user) => {
                  return (
                    <div className="avatars" key={`assignee-${user.regId}`}>
                      <LogoAvatarShowLetter
                        genaralData={user}
                        profileName={"displayName"}
                        outerClassName={"avatars__item"}
                        innerClassName={"avatars__img"}
                        index={"teammeber-"}
                        key={"teammeber-"}
                      />
                      <div className="userDataContainer px-2">
                        <p className="userName">{user?.displayName}</p>
                        <p className="userRole mt-1">{user?.teamName}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="avatars">
                  <div className="userDataContainer px-2">
                    <div className="noUser mt-1 fs-14">Add {placeHolder}</div>
                  </div>
                </div>
              )}
            </Col>
            <Col className="p-0 m-0 d-flex justify-content-end">
              {props.assigneeAddChange && (
                <img
                  src={addUser}
                  alt="addUser"
                  role="button"
                  onClick={(e) => setAssigneeDialogOpen(!assigneeDialogOpen)}
                  onKeyDown={(e) => setAssigneeDialogOpen(!assigneeDialogOpen)}
                  tabIndex={0}
                />
              )}
            </Col>
          </Row>

          <PopupModal
            show={assigneeDialogOpen}
            onClose={() => setAssigneeDialogOpen(false)}
            header={true}
            title={props?.rowInfo?.header + " Assignee"}
            customClassName={"assignee-container commonForm"}
          >
            <div className="assignee-container__input-area">
              <input
                type="text"
                placeholder={t("common.search") + " " + t("common.members")}
                className="assignee-container__input-area__input"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  onSearch(e.target.value);
                }}
              />
              <div
                className="assignee-container__input-area__search"
                tabIndex={0}
                onClick={(e) => changeSearch(e)}
                onKeyDown={(e) => changeSearch(e)}
                name={t("common.search") + " " + t("common.members")}
              >
                {" "}
                <img src={searchIcon} alt="searchIcon" />
              </div>
            </div>
            <div className="assignee-container__tab">
              <div className="assignee-container__tab__list">
                {(assigneeDialogOpen && searchList?.length > 0 && (
                  <div className="assignee-container__members">
                    {searchList?.map((user, i) => {
                      return (
                        <UserListUI
                          data={user}
                          onClick={handleItemClick}
                          className="members"
                          key={`search-user-${user.regId}`}
                          isActive={
                            multiSelect
                              ? selectedItem?.length > 0
                                ? selectedItem?.includes(user)
                                : false
                              : user === selectedItem
                          }
                          clickable={true}
                          multiSelect={multiSelect}
                        />
                      );
                    })}
                  </div>
                )) || (
                    <p className="assignee-container__nomembers">
                      {"No Search Found"}
                    </p>
                  )}
              </div>
              {assigneeDialogOpen && searchList?.length > 0 && (
                <div className="d-flex mx-auto flex-row align-items-center justify-content-end gap-3 mt-3 action_btn_row">
                  <button
                    className="btn w-auto cancel-btn px-3"
                    onClick={(e) => cancelUserAssign(e)}
                    tabIndex={0}
                  >
                    {" "}
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn w-auto create_btn px-3 d-flex flex-row gap-2 align-items-center"
                    onClick={(e) => changeUser(e)}
                    onKeyDown={(e) => changeUser(e)}
                    tabIndex={0}
                    disabled={isCanSave()}
                  >
                    {!props.apiLoading &&
                      selectedItem !== undefined &&
                      assignedUser[0]?.regId === selectedItem?.regId
                      ? "Unassign"
                      : "Assign"}
                  </button>
                </div>
              )}
            </div>
          </PopupModal>
        </div>
      </>
    );
  },
);

export default AssigneeCard;

import { classNames } from "@euroland/libs";
import { searchIcon } from "../../../assets/images";
import React, { Fragment, useEffect, useState } from "react";
import LogoAvatarShowLetter from "../../common/LogoAvatarShowLetter";
import { checkedIcon, unChecked, radioChecked, radioUnChecked } from "../../../assets/images/index";
import { t } from "i18next";

const AssignMember = ({
  userList,
  multiSelect,
  assignedUser,
  onChange,
  cancel,
  apiLoading,
}) => {
  /** VARIABLE DECLARATIONS */
  const [userLists, setUserLists] = useState([]);
  const [search, setSearch] = useState("");
  const [searchList, setSearchList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(multiSelect ? [] : null);

  useEffect(() => {
    if (userList?.length > 0) {
      const updatedSuggestedMembers = filterSuggestedMembers(
        userList,
        Array.isArray(assignedUser) ? assignedUser : [assignedUser],
      );
      setUserLists(updatedSuggestedMembers); // Update state as needed
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

  const onSearch = (val) => {
    const setVal = val?.trim();
    if (!setVal) {
      setSearchList(userList);
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

  const changeSearch = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "click" || e.key === "Enter") {
      onSearch(search);
    }
  };

  const cancelUserAssign = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "click" || e.key === "Enter") {
      reset();
    }
    reset();
    cancel();
  };

  const filterSuggestedMembers = (suggestedMembers, assignedUsers) => {
    if (!suggestedMembers || suggestedMembers.length === 0) return [];
    const assignedRegIds = new Set(assignedUsers?.map((user) => user?.regId));

    // Otherwise, map over suggestedMembers to add a checked property
    return suggestedMembers.map((user) => ({
      ...user,
      checked: assignedRegIds.has(user.regId),
    }));
  };

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

  const changeUser = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "click" || e.key === "Enter") {
      const isMatchingAssignedUsers = (assignedUser, setListItems) => {
        if (assignedUser.length !== setListItems.length) {
          return false;
        }

        const assignedRegIds = new Set(assignedUser.map((user) => user.regId));
        return setListItems.every((item) => assignedRegIds.has(item.regId));
      };
      // Example usage:
      onChange(selectedItem !== undefined &&
        assignedUser[0]?.regId === selectedItem?.regId ? null : selectedItem);
      reset();
    }
  };

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
            {clickable === true && (
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
                      {/* <p
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
                      </p> */}
                    </div>
                  </div>

                  <div className="list__checkbox">
                    {isActiveCheck ? (
                      <img
                        src={multiSelect ? checkedIcon : radioChecked}
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
                        src={multiSelect ? checkedIcon : radioChecked}
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
                    <p className="list__details__role" name={getData?.teamName}>
                      {getData?.teamName}
                    </p>
                    {/* <p
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
                    </p> */}
                  </div>
                </div>
              </button>
            )}
          </>
        )}
      </Fragment>
    );
  };

  const isDisabled = multiSelect
    ? !selectedItem || selectedItem.length === 0
    : !selectedItem;

  return (
    <div className="assignee-container" tabIndex={0}>
      <div className="assignee-container__input-area">
        <input
          type="text"
          placeholder={"Search the member..."}
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
          name={"Search the member..."}
        >
          {" "}
          <img src={searchIcon} alt="searchIcon" />
        </div>
      </div>
      <div className="assignee-container__tab">
        <div className="assignee-container__tab__list">
          {(searchList?.length > 0 && (
            <div className="assignee-container__members">
              {searchList?.map((user, i) => {
                return (
                  <UserListUI
                    data={user}
                    onClick={handleItemClick}
                    className="members"
                    key={i}
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
              <p className="assignee-container__nomembers">{"No Search Found"}</p>
            )}
        </div>
        {searchList?.length > 0 && (
          <div className="w-100 d-flex flex-row justify-content-end gap-3 mt-2">
            <button
              className="cancel-btn btn rounded-pill "
              onClick={(e) => cancelUserAssign(e)}
              onKeyDown={(e) => cancelUserAssign(e)}
              tabIndex={0}
            >
              {" "}
              {t("common.cancel")}
            </button>
            <button
              className={`save-btn btn rounded-pill ${apiLoading ? "loading" : ""
                }`}
              onClick={(e) => changeUser(e)}
              onKeyDown={(e) => changeUser(e)}
              tabIndex={0}
              disabled={isDisabled}
            >
              {!apiLoading && selectedItem !== undefined &&
                assignedUser[0]?.regId === selectedItem?.regId
                ? "Unassign"
                : "Assign"}

            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignMember;

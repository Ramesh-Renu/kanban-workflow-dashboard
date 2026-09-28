import Table from "../../../components/common/Table";
import { classNames } from "@euroland/libs";
import React, { useEffect, useState } from "react";
import variables from "@orion/shared/src/styles/variables-style.json";
import { createColumnHelper } from "@tanstack/react-table";
import { t } from "i18next";
import SettingsSvg from "../SettingsSvg";
import LogoAvatarShowLetter from "../../../components/common/LogoAvatarShowLetter";
import trashIcon from "../../../assets/images/trash_full.svg";
import pencilSimpleLine from "../../../assets/images/pencil_simple_line.svg";
import ToolTipPopup from "../../../components/common/ToolTipPopup";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import {
  ActiveProjects,
  EmptyOrder,
  NoResultsFound,
  projectsIcon,
  userAction,
} from "../../../assets/images";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { updateUserType } from "../../../services";
import { useToast } from "@orion/shared";
import { useGlobalMaster } from "@orion/shared";
import useAuth from "../../../hooks/useAuth";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import { useGlobalContext } from "store/context/GlobalProvider";
import TopProgressBar from "@orion/shared/src/components/TopProgressBar";

const UserListing = ({
  userList,
  gotoUserInfo,
  tableType,
  tableHeight,
  addUser,
  masterApiData,
  updateUserData,
  reloadTable,
  selectedFilters,
  ...props
}) => {
  const { showToast } = useToast();
  const { roleList, getRoleList, getAllWorkSpaceList, allWorkspaceList } =
    useGlobalMaster();
  const { workSpaceUserList } = useGlobalContext();
  const [{ data: auth }, { setAuth, getUserInfoData }] = useAuth();
  const columnHelper = createColumnHelper();
  const [initialData, setInitialData] = useState([]);
  const [getImageLeft, setImageLeft] = useState(0);
  const [getImageHeight, setImageHeight] = useState(20);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [zoom, setZoom] = useState(window.devicePixelRatio * 100);
  const [getTableHeight, setGetTableHeight] = useState(tableHeight);

  /** EFFECT TO SET INITIAL DATA */
  useEffect(() => {
    if (userList && userList.length > 0) {
      setInitialData(userList);
    } else {
      setInitialData([]);
    }
  }, [userList]);

  //get Roles master

  useEffect(() => {
    if (!roleList?.loading && roleList?.data?.length === 0) {
      getRoleList();
    }
  }, []);

  /** EFFECT TO SET IMAGE LEFT AND HEIGHT */
  useEffect(() => {
    const getWith = 500 / 20;
    setImageLeft(getWith);
    setImageHeight(30);
  }, []);

  const commonPlaceIconsStyle = {
    width: "24px",
    height: "24px",
    left: "-25px",
    top: "-8px",
  };

  /** ICON RENDERER COMPONENT */
  const IconRenderer = ({ placement, color, customPlacement, background }) => {
    return (
      <SettingsSvg
        color={color || variables.common["--color-gray"]}
        style={{
          position: "absolute",
          left: -(getImageLeft * placement + 6) + "px",
          height: getImageHeight,
          top: "0px",
          background: background || "transparent",
        }}
        commonPlaceIconsStyle={customPlacement || commonPlaceIconsStyle}
        bgColor={"transparent"}
      />
    );
  };
  /** RENDER ICON HEADER FUNCTION */
  const renderIconHeader = (
    placement,
    color,
    text,
    customPlacement,
    customClass = "mr-1",
  ) => (
    <span className="position-relative order_orion_header">
      <IconRenderer
        placement={placement}
        color={color}
        customPlacement={customPlacement}
      />
      <span className={customClass} />
      {text}
    </span>
  );

  // NAME  PROFILE IMAGE RENDER CONTAINER
  const renderProfile = (data) => {
    return (
      <div className="d-flex flex-row align-items-center justify-content-start gap-2">
        <div className="avatars m-0">
          <LogoAvatarShowLetter
            genaralData={data?.userInfo}
            profileName={"displayName"}
            outerClassName={"avatars__item"}
            innerClassName={"avatars__img"}
          ></LogoAvatarShowLetter>
        </div>
        <div className="d-flex flex-column truncate-2-lines align-items-baseline nameContainer">
          <span>{data?.userInfo?.displayName}</span>
          <span className="email_text mt-1">{data?.userInfo?.mail}</span>
        </div>
      </div>
    );
  };

  //RENDER BOARDS CONTAINER

  const renderBoards = (props, board) => {
    const matchedBoards = masterApiData?.board.filter((ws) =>
      board?.includes(ws.boardID),
    );
    return (
      <Tooltip id="order-type-tooltip" className="custom-tooltip" {...props}>
        {matchedBoards?.map((row, i) => (
          <div
            className="fs-12 w-100 text-start py-1 "
            key={i}
            style={{
              color: "#828282",
              fontWeight: 500,
            }}
          >
            {row.name}
          </div>
        ))}
      </Tooltip>
    );
  };

  const getRowRoleCode = (rowData) =>
    roleList?.data?.find((item) => item.status_id === rowData?.userType)?.code;

  const canOpenUserDetails = (rowData) => {
    if (!rowData) return false;
    if (tableType === "admin") {
      if (rowData?.userInfo?.isSuperAdmin || getRowRoleCode(rowData) === "SADM") {
        return false;
      }
      return getRowRoleCode(rowData) === "ADM";
    }
    return typeof gotoUserInfo === "function";
  };

  //RENDER ROLE

  const renderRole = (role) => {
    const roleObj = roleList?.data?.find((item) => item.status_id === role?.userType);
    const roleName = roleObj?.name || "---";
    return (
      <div
        className="py-2 px-3 position-relative rounded-pill"
        style={{
          background: variables.common["--color-bg-board"],
          zIndex: 0,
          width: "fit-content",
          margin: "auto",
        }}
      >
        <SettingsSvg
          color={variables.common["--color-primary"]}
          style={{
            position: "absolute",
            left: -(getImageLeft * 6 + 6) + "px",
            height: getImageHeight,
            top: "0px",
          }}
          commonPlaceIconsStyle={{
            ...commonPlaceIconsStyle,
            left: "5px",
            top: "2px",
          }}
          bgColor={variables.common["--color-bg-board"]}
        />
        {/* <img src={ActiveProjects} alt="projectsIcon" /> */}
        <span
          style={{
            display: "block",
            color: variables.common["--color-primary"],
            paddingLeft: "17px",
          }}
          className="mx-2"
        >
          {roleName}
        </span>
      </div>
    );
  };

  // Delete Confirmation and store selected Row
  const handleDeleteConfirm = (data) => {
    setSelectedRow(data);
    setShowDeleteModal(true);
  };

  // delete user after confirmation
  const deleteUser = async () => {
    const previousId = tableType === "admin" ? 45 : 46;
    if (selectedRow) {
      const params = {
        userId: selectedRow?.userInfo?.regId,
        userTypeId: 47,
        previousUserTypeId: previousId,
      };
      try {
        const response = updateUserType(params);
        response.then((res) => {
          if (res?.data?.status) {
            showToast({
              message: res?.data?.message,
              variant: "success",
            });
            setShowDeleteModal(false);
            setSelectedRow(null);
            reloadTable();
          }
        });
      } catch (error) {
        showToast({
          message: error?.message,
          variant: "danger",
        });
      }

      // hit api
    }
  };

  /** RENDER EMPTY CONTENT */
  const renderEmptyContent = (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 createOrderContainer">
      <img src={EmptyOrder} alt="Empty Order" />
      <h5 className="mt-4 text-center">{`Add New ${
        tableType === "admin" ? "Admin" : "User"
      } here`}</h5>
      <p className="text-center w-25">
        {`Add new ${
          tableType === "admin" ? "admin" : "user"
        } to centralize your company’s tasks. Quickly scan, sort, and manage everything from one place.`}
      </p>
      <div className="orderSection mt-3">
        <button className="btn  activeButton" onClick={() => addUser()}>
          + {tableType === "admin" ? "Add Admin" : "Add User"}
        </button>
      </div>
    </div>
  );

  /** RENDER NO RESULTS FOUND */
  const renderNoResultsFound = (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 createOrderContainer">
      <img src={NoResultsFound} alt="Empty Order" />
      <h5 className="mt-4 text-center">{t("order_orion_v2.no_result_found")}</h5>
      {/* <p className="text-center w-25">
        {t(
          "order_create.manage_and_sort_all_your_company_orders_work_into_a_single_list_that_can_be_easily_scanned_and_sorted_by_category"
        )}
      </p> */}
    </div>
  );

  // RENDER TEAM
  const renderTeam = (data) => {
    const teamData = masterApiData?.team.filter((item) => item.team_id === data?.team);
    return <span>{teamData[0]?.name}</span>;
  };
  // RENDER DESIGNATION
  const renderDesignation = (data) => {
    const teamData = masterApiData?.team.filter((item) => item.team_id === data?.team);
    let designationList = masterApiData?.designation.find(
      (item) => item.name === teamData[0]?.name,
    );
    designationList = designationList?.designationList?.find(
      (item) => item.id === data?.designation,
    );
    return <span>{designationList?.name || "---"}</span>;
  };

  // renderCountry
  const renderCountry = (data) => {
    const countryNameData = masterApiData?.country?.find(
      (item) => item.country_id === data?.country,
    );
    return <span>{countryNameData?.country_name}</span>;
  };

  // render Previous Access
  const renderPreviousRole = (data) => {
    const result = roleList?.data?.find(
      (item) => item?.status_id === data.previousUserType,
    );
    return (
      <div
        className={`${result?.name === "User" ? "user-background" : "admin-background"}`}
      >
        {result?.name === "User" ? "Workspace User" : "Admin User"}
      </div>
    );
  };

  const getColor = (id) => {
    let bgColor = "";
    let textColor = "";
    if (id === 1) {
      bgColor = "#DBEAFE";
      textColor = "#193CB8";
    } else if (id === 2) {
      bgColor = "#DBFCE7";
      textColor = "#56914D";
    } else {
      // if (id === 3)
      bgColor = "#DBFCE7";
      textColor = "#56914D";
    }
    return { bgColor, textColor };
  };

  // renderWorkSpaceToolTip //
  const renderWorkSpaceToolTip = (props, workSpace) => {
    return (
      <Tooltip id="order-type-tooltip" className="custom-tooltip" {...props}>
        <div>
          {workSpace?.map((row, i) => {
            return (
              <div
                className="py-1 fs-14 d-flex align-items-center"
                style={{
                  color: getColor(row.work_space_id).textColor,
                  fontWeight: "500",
                }}
                key={i}
              >
                {row?.name}
              </div>
            );
          })}
        </div>
      </Tooltip>
    );
  };

  // render workspace
  const renderWorkSpace = (data) => {
    const workspaceList = masterApiData?.workspace || [];
    const matchedWorkspaces = workspaceList.filter((ws) =>
      data?.includes(ws.work_space_id),
    );

    return (
      <>
        {matchedWorkspaces?.slice(0, 2)?.map((row, i) => {
          return (
            <div
              className="rounded-pill px-3 py-1 fs-14 d-flex align-items-center"
              style={{
                backgroundColor: getColor(row.work_space_id).bgColor,
                color: getColor(row.work_space_id).textColor,
                fontWeight: "500",
              }}
              key={i}
            >
              {row?.work_space_id === 1 ? "IOD" : row?.name}
            </div>
          );
        })}
        {matchedWorkspaces.length > 2 && (
          <OverlayTrigger
            placement="left"
            overlay={(tooltipProps) =>
              renderWorkSpaceToolTip(tooltipProps, matchedWorkspaces)
            }
          >
            <div
              className="border rounded-pill px-3 py-1 border-2 fs-14 d-flex align-items-center"
              style={{ borderStyle: "dashed" }}
            >
              +{matchedWorkspaces.length}
            </div>
          </OverlayTrigger>
        )}
      </>
    );
  };

  const CustomColumns = [
    columnHelper.accessor("s_no", {
      header: () => (
        <span className="order_orion_header serial_no">{t("order_orion_v2.s_no")}</span>
      ),
      cell: (info) => {
        const rowIndex = info.row.index; // index on current page
        return rowIndex + 1; // 1-based serial number
      },
      canSort: false,
    }),
    columnHelper.accessor("userinfo", {
      header: () =>
        renderIconHeader(
          6,
          variables.common["--color-icon-primary"],
          t("settings.name"),
          {
            ...commonPlaceIconsStyle,
            left: "-5px",
            top: "-6px",
          },
          "p-2",
        ),
      cell: (info) => {
        const rowData = info.row.original;
        const canOpen = canOpenUserDetails(rowData);
        return (
          <div
            tabIndex={canOpen ? 0 : -1}
            title={rowData?.userInfo?.displayName + "," + rowData?.userInfo?.mail}
            onClick={() => {
              if (canOpen) gotoUserInfo(rowData);
            }}
            onKeyDown={(e) => {
              if (canOpen && e.key === "Enter") gotoUserInfo(rowData);
            }}
            className={`user-info${canOpen ? " user-info--clickable" : ""}`}
          >
            {renderProfile(rowData)}
          </div>
        );
      },
      canSort: false,
    }),
    columnHelper.accessor("team", {
      header: () =>
        renderIconHeader(
          4.8,
          variables.common["--color-icon-primary"],
          t("settings.team"),
          {
            ...commonPlaceIconsStyle,
            left: "-5px",
            top: "-6px",
          },
          "p-2",
        ),
      cell: (info) => {
        const rowData = info.row.original;
        return renderTeam(rowData);
      },
    }),
    columnHelper.accessor("designation", {
      header: () =>
        renderIconHeader(
          7.3,
          variables.common["--color-icon-primary"],
          t("settings.designation"),
          {
            ...commonPlaceIconsStyle,
            left: "-5px",
            top: "-6px",
          },
          "p-2",
        ),
      cell: (info) => {
        const rowData = info.row.original;
        return renderDesignation(rowData);
      },
    }),

    tableType === "admin" || tableType === "user"
      ? columnHelper.accessor("Role", {
          header: () =>
            renderIconHeader(
              2.5,
              variables.common["--color-icon-primary"],
              t("settings.role"),
              {
                ...commonPlaceIconsStyle,
                left: "-5px",
                top: "-6px",
              },
              "p-2",
            ),
          cell: (info) => {
            const rowData = info.row.original;
            return renderRole(rowData);
          },
          canSort: false,
          //   cell:
        })
      : null,
    tableType === "in-Active"
      ? columnHelper.accessor("previousId", {
          header: () =>
            renderIconHeader(
              2.6,
              variables.common["--color-icon-primary"],
              t("settings.previous_access"),
              {
                ...commonPlaceIconsStyle,
                left: "-5px",
                top: "-6px",
              },
              "p-2",
            ),
          cell: (info) => {
            const rowData = info.row.original;
            return renderPreviousRole(rowData);
          },
        })
      : null,

    columnHelper.accessor("country", {
      header: () =>
        renderIconHeader(
          8.6,
          variables.common["--color-icon-primary"],
          t("settings.country"),
          {
            ...commonPlaceIconsStyle,
            left: "-5px",
            top: "-6px",
          },
          "p-2",
        ),
      cell: (info) => {
        const rowData = info.row.original;
        return renderCountry(rowData);
      },
    }),
    tableType !== "admin" &&
      tableType !== "in-Active" &&
      columnHelper.accessor("workspace", {
        header: () =>
          renderIconHeader(
            9.8,
            variables.common["--color-icon-primary"],
            t("settings.workspace"),
            {
              ...commonPlaceIconsStyle,
              left: "-5px",
              top: "-6px",
            },
            "p-2",
          ),
        cell: (info) => {
          const rowData = info.row.original;
          return (
            <div className="d-flex flex-row gap-2 justify-content-center align-items-center">
              {rowData?.workspace?.length > 0
                ? renderWorkSpace(rowData?.workspace)
                : "---"}
            </div>
          );
        },
      }),
    tableType !== "admin" &&
      tableType !== "in-Active" &&
      columnHelper.accessor("board", {
        header: () =>
          renderIconHeader(
            11,
            variables.common["--color-icon-primary"],
            t("settings.board_permissions"),
            {
              ...commonPlaceIconsStyle,
              left: "-5px",
              top: "-6px",
            },
            "p-2",
          ),
        cell: (info) => {
          const rowData = info.row.original;
          const hasBoards = rowData?.board?.length > 0;

          const boardContent = (
            <div
              className="board_container p-2"
              style={{
                background: hasBoards && variables.common["--color-bg-board"],
              }}
            >
              <img
                src={rowData?.board === null ? projectsIcon : ActiveProjects}
                alt="projectsIcon"
              />
              <span
                style={{
                  color: hasBoards && variables.common["--color-primary"],
                }}
              >
                {rowData?.board?.length || 0} Boards
              </span>
            </div>
          );
          return (
            <div>
              {hasBoards ? (
                <OverlayTrigger
                  placement="left"
                  overlay={(tooltipProps) => renderBoards(tooltipProps, info.getValue())}
                >
                  {boardContent}
                </OverlayTrigger>
              ) : (
                boardContent
              )}
            </div>
          );
        },
      }),
    (tableType === "in-Active" ||
      auth?.details?.isSuperAdmin ||
      (roleList?.data?.filter((user) => user.status_id === auth?.details?.user_type)[0]
        ?.code === "ADM" &&
        tableType !== "admin")) &&
      columnHelper.accessor("action", {
        header: () => (
          <span className="order_orion_header serial_no">
            {t("order_orion_v2.action")}
          </span>
        ),
        cell: (info) => {
          const rowData = info.row.original;
          return (
            <div className="mx-auto w-100">
              {tableType === "in-Active" ? (
                <ToolTipPopup
                  customRender={
                    <div className="p-2 mx-auto in_active_actions d-flex flex-row align-items-center justify-content-center gap-3">
                      <p className="m-0">Retrieve user as :</p>
                      <button
                        className="btn"
                        onClick={() => updateUserData({ ...rowData, key: "workSpace" })}
                      >
                        Workspace User
                      </button>
                      {auth?.details?.isSuperAdmin && (
                        <button
                          className="btn"
                          onClick={() => updateUserData({ ...rowData, key: "admin" })}
                        >
                          Admin User
                        </button>
                      )}
                    </div>
                  }
                  customTop={"-19px"}
                  labelField="name"
                  valueField="id"
                  customWidth={"45vh"}
                  //   getSeletedVal={(e) =>
                  //     handleEditDeleteValue(e, info.getValue(), rowData)
                  //   }
                  canEdit={true}
                  isCustomFieldswithFilter={false}
                  arrow={true}
                  customIcon={<img src={userAction} alt="a  ction-img" />}
                />
              ) : tableType !== "admin" ? (
                <ToolTipPopup
                  toolTipDatas={[
                    {
                      name: (
                        <button
                          className="btn btn-0 p-0 border-0 m-0 w-100 d-flex justify-content-between"
                          onClick={() => gotoUserInfo(rowData)}
                        >
                          {t("order_view.edit")}{" "}
                          <img src={pencilSimpleLine} alt="pencilSimpleLine" />
                        </button>
                      ),
                      id: 1,
                    },
                    {
                      name: (
                        <button
                          className="btn btn-0 p-0 m-0 w-100 border-0 text-danger d-flex justify-content-between"
                          onClick={() => handleDeleteConfirm(rowData)}
                        >
                          {t("common.delete")}{" "}
                          <img src={trashIcon} alt="Remove User" className="mx-3" />
                        </button>
                      ),
                      id: 2,
                    },
                  ]}
                  labelField="name"
                  valueField="id"
                  //   getSeletedVal={(e) =>
                  //     handleEditDeleteValue(e, info.getValue(), rowData)
                  //   }
                  canEdit={true}
                  isCustomFieldswithFilter={false}
                  arrow={true}
                  customTop={"-55px"}
                  customRight={"45px"}
                />
              ) : (
                auth?.details?.isSuperAdmin === true && (
                  <>
                    <button
                      className="btn btn-0  border-0 text-danger mx-2"
                      onClick={() => handleDeleteConfirm(rowData)}
                      disabled={
                        roleList?.data?.filter(
                          (user) => user.status_id === rowData?.userType,
                        )[0]?.code === "SADM"
                      }
                    >
                      <img src={trashIcon} alt="Remove Admin" />
                    </button>
                  </>
                )
              )}
            </div>
          );
        },
        canSort: false,
      }),
  ].filter(Boolean);

  const isFiltered = () => {
    if (selectedFilters) {
      const filterObj = (({ searchTxt, team, country, workspace, board }) => ({
        searchTxt,
        team,
        country,
        workspace,
        board,
      }))(selectedFilters);
      return Object.values(filterObj || {}).some((val) => {
        return (
          (Array.isArray(val) && val.length > 0) ||
          (typeof val === "string" && val.trim().length > 0)
        );
      });
    }
  };

  /** HANDLE INFINITE SCROLL */
  const handleInfiniteScroll = () => {
    if (props?.onScrollEnd) {
      props?.onScrollEnd();
    }
  };

  useEffect(() => {
    const handleZoom = () => {
      setZoom(Math.round(window.devicePixelRatio * 100));
    };

    window.addEventListener("resize", handleZoom);
    return () => window.removeEventListener("resize", handleZoom);
  }, []);

  useEffect(() => {
    const container = document.getElementById("products__body-table_dashboard_table");

    if (!container) return;

    const table = container.querySelector("table");
    if (!table) return;

    const allRows = table.querySelectorAll("tbody tr");
    const firstRow = table.querySelector("tbody tr");

    if (!firstRow) return; // <-- ADD SAFETY CHECK

    // If outlet-container is a class → USE DOT
    const bodyContent = document.querySelector(".body-content");

    if (!bodyContent) {
      console.log("bodyContent not found");
    }
    if (allRows?.length >= 10 && userList?.length >= 10 && zoom <= 90) {
      const height = firstRow.getBoundingClientRect().height;

      if (bodyContent) {
        const bodyHeight = bodyContent.getBoundingClientRect().height;
        const tableHeight = Math.ceil(height * 10) + "px";
        // Math.ceil(height * (userList.length)) >= bodyHeight-100
        //   ? "70vh"
        //   : Math.ceil(height * 9) + "px";
        setGetTableHeight(tableHeight);
      }
    }
  }, [userList, initialData, zoom]);

  return (
    <div className="tableSection">
      <TopProgressBar loading={props?.loading} />
      {props?.loading && initialData?.length === 0 && (
        <div
          style={{ height: props?.tableHeight ? props?.tableHeight : "" }}
          className="customTableLoader"
        >
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          />
        </div>
      )}

      <Table
        columns={CustomColumns}
        columnData={initialData}
        // getDatas={getCard}
        className={classNames("products__body-table dashboard_table")}
        tableName={"Order_list"}
        noDataContent={
          tableType === "user" &&
          (userList?.length === 0 && isFiltered()
            ? renderNoResultsFound
            : renderEmptyContent)
        }
        tableHeight={getTableHeight}
        bgColor={"#FFF"}
        loading={props?.loading}
        onScrollEnd={handleInfiniteScroll}
      />

      <PopupModal
        show={showDeleteModal}
        onClose={setShowDeleteModal}
        className={"deleteConfirmModal"}
        // header={false}
      >
        <div className="deleteConfirmation">
          <div className="w-100 mx-auto">
            <h5 className="text-danger text-center">Confirm Deletion</h5>
            <p className="text-center">
              Deleting <b>{selectedRow?.userInfo?.displayName}</b> will remove all their
              access and related permissions.
            </p>
          </div>
          <div className="d-flex flex-row align-items-center justify-content-center gap-3 delete_btn_rows">
            <button
              className="btn btn-0 yes_btn px-4 rounded"
              onClick={() => deleteUser()}
            >
              Yes
            </button>
            <button
              className="btn btn-0 no_btn px-4 rounded"
              onClick={() => {
                setSelectedRow(null);
                setShowDeleteModal(false);
              }}
            >
              No
            </button>
          </div>
        </div>
      </PopupModal>
    </div>
  );
};

export default UserListing;

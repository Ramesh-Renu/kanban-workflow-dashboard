import Table from "../../components/common/Table";
import React, { Fragment, useEffect, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { classNames } from "@euroland/libs";
import { t } from "i18next";
import variables from "@orion/shared/src/styles/variables-style.json";
import LogoAvatarShowLetter from "../../components/common/LogoAvatarShowLetter";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import ToolTipPopup from "../../components/common/ToolTipPopup";
import trashIcon from "../../assets/images/trash_full.svg";
import pencilSimpleLine from "../../assets/images/pencil_simple_line.svg";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { EmptyOrder, NoResultsFound } from "../../assets/images";
import { useGlobalContext } from "store/context/GlobalProvider";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useGlobalMaster } from "@orion/shared";
import { renderOrderType } from "../../utils/common";
import TopProgressBar from "@orion/shared/src/components/TopProgressBar";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import { getKanbanDetailsPath } from "../../utils/kanbanRoutes";

const OrderList = ({ ...props }) => {
  /** VARIABLE DECLARATIONS */
  const columnHelper = createColumnHelper();
  const { orderType, labelList } = useGlobalMaster();
  const { masterState, orderCountState } = useGlobalContext();

  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);

  const [sorting, setSorting] = useState([
    {
      id: "companyName",
      desc: false,
    },
    {
      id: "orderDate",
      desc: true,
    },
    // {
    //   id: "expectedDeliveryDate",
    //   desc: false,
    // },
    {
      id: "dueDate",
      desc: false,
    },
  ]);

  useEffect(() => {
    const sortBy = props?.selectedFilters?.sortBy;
    const sortOrder = props?.selectedFilters?.sortOrder;

    if (!sortBy || !sortOrder) return;

    setSorting((prev) =>
      prev.map((item) => ({
        ...item,
        desc: item.id === sortBy ? sortOrder === "desc" : false,
      })),
    );
  }, [props?.selectedFilters]);

  const isFiltered = Object.values(props?.selectedFilters || {}).some((val) => {
    return (
      (Array.isArray(val) && val.length > 0) ||
      (typeof val === "string" && val.trim().length > 0)
    );
  });

  /** RENDER DATE CELL FUNCTION */
  const renderDateCell = (date) => (date ? dayjs(date).format("MMM DD, YYYY") : "---");

  /** RENDER AVATARS FUNCTION */
  const renderAvatars = (assignees) => {
    const people = Array.isArray(assignees) ? assignees : assignees ? [assignees] : [];
    if (people.length === 0) return "---";
    return (
      <div className="avatars">
        {people.map((row, i) => (
          <Fragment key={i}>
            <LogoAvatarShowLetter
              genaralData={typeof row === "string" ? { name: row } : row}
              profileName={"name"}
              outerClassName={"avatars__item"}
              innerClassName={"avatars__img"}
              index={"teammeber-" + i}
              key={"teammeber-" + i}
            />
            <span className="avatars-name">
              {typeof row === "string" ? row : row?.name || "---"}
            </span>
          </Fragment>
        ))}
      </div>
    );
  };
  /** HANDLE ORDER VIEW FUNCTION */
  const handleOrderView = (orderId, orderData, isEditable) => {
    if (orderId) {
      navigate(getKanbanDetailsPath(props?.boardData[0].boardID, orderId), {
        state: { orderData, isEditable },
      });
    }
  };

  /** GET STATUS BY ID */
  const getStatus = (status) => {
    const getStatusData = masterState?.orderStatus?.data?.filter((ids) =>
      status.includes(ids.status_id),
    );
    let color = variables.common["--color-primary-light-11"];
    let text = getStatusData[0]?.name || "---";
    if (getStatusData[0]?.code === "INP") {
      color = variables.common["--color-orange-lighter"];
      text = getStatusData[0].name;
    }
    if (getStatusData[0]?.code === "OP") {
      color = variables.common["--color-icon-purple"];
      text = getStatusData[0].name;
    }
    if (getStatusData[0]?.code === "COM") {
      color = variables.common["--color-icon-green"];
      text = getStatusData[0].name;
    }
    return {
      color: color || "---",
      text: text || "---",
    };
  };

  /** RENDER CATEGORY FUNCTION */
  const renderCategory = (ids, isTooltip) => {
    const category = masterState?.orderCategory?.data;
    const matchedNames = getMatchedNames(ids, category, "status_id");
    const displayName =
      matchedNames?.length > 1
        ? matchedNames.join(isTooltip ? " , " : " / ")
        : matchedNames?.[0] || "---";
    return displayName;
  };

  /** RENDER TOOLTIP FOR ORDER CATEGORY */
  const renderCategoryTooltip = (props, finalCategoryList) => {
    const upSellGroup = finalCategoryList?.find((item) => item.name === "Up-Sell");
    const reDesignGroup = finalCategoryList?.find((item) => item.name === "Re-Design");
    return (
      <Tooltip id="order-type-tooltip" className="custom-tooltip" {...props}>
        <div className="px-2 d-flex  flex-column align-items-start">
          <strong className="m-0">Category</strong>
          <p className="m-auto w-100 text-start customToolTipText mt-1">
            Up-Sell -{" "}
            {upSellGroup?.value.length > 0 && renderCategory(upSellGroup?.value, true)}
          </p>
          <p className="m-auto mt-2 w-100 text-start customToolTipText d-flex flex-row ">
            Re-Design -{" "}
            {reDesignGroup?.value.length > 0 &&
              renderCategory(reDesignGroup?.value, true)}
          </p>
        </div>
      </Tooltip>
    );
  };

  /** GET MATCHED NAMES FUNCTION */
  const getMatchedNames = (ids, dataList, matchedField) => {
    if (!Array.isArray(dataList) || !Array.isArray(ids)) return [];
    return dataList
      .filter((item) => ids.includes(item[matchedField]))
      .map((item) => item.name);
  };

  /** COLUMNS DEFINITION */
  const columns = [
    columnHelper.accessor("companyName", {
      header: () => (
        <span className="order_orion_header">{t("order_orion_v2.company_name")}</span>
      ),

      cell: (info) => {
        const rowData = info.row.original;
        return (
          <div
            tabIndex={0}
            className={`truncate-2-lines ${props?.isDeletedView ? "deletedBy" : ""}`}
            title={info.getValue()}
            onClick={() =>
              props?.isDeletedView ? null : handleOrderView(rowData?.orderId, rowData)
            }
          >
            {info.getValue()}
          </div>
        );
      },
      canSort: true,
    }),

    columnHelper.accessor("orderDate", {
      header: () => (
        <span className="order_orion_header">{t("order_orion_v2.order_date")}</span>
      ),
      cell: (info) => renderDateCell(info.getValue()),
      canSort: true,
    }),
    ...(props?.isDeletedView
      ? [
          columnHelper.accessor("deletedDate", {
            header: () => (
              <span className="order_orion_header">
                {t("order_orion_v2.deleted_date")}
              </span>
            ),
            cell: (info) => renderDateCell(info.getValue()),
            canSort: false,
          }),
        ]
      : []),

    // columnHelper.accessor("expectedDeliveryDate", {
    //   header: () => (
    //     <span className="order_orion_header">
    //       {t("order_orion_v2.delivery_date")}
    //     </span>
    //   ),
    //   cell: (info) => renderDateCell(info.getValue()),
    //   canSort: true,
    // }),

    columnHelper.accessor("status", {
      header: () => (
        <span className="order_orion_header">{t("order_orion_v2.status")}</span>
      ),
      cell: (info) => (
        <div style={{ color: getStatus(info.getValue()).color }}>
          {getStatus(info.getValue()).text}
        </div>
      ),
    }),

    columnHelper.accessor("labels", {
      header: () => (
        <span className="order_orion_header">{t("order_orion_v2.labels")}</span>
      ),
      cell: (info) => {
        const row = info.row.original.orderLabels || [];
        const matched = labelList?.data?.filter((item) => row.includes(item.status_id));
        return matched.length > 0 ? (
          <div className="flex-cloumn">
            {matched.map((label, i) => (
              <div
                className="d-flex align-items-center gap-2"
                style={{
                  color: label.colour_code,
                  width: "fit-content",
                  minWidth: "22px",
                }}
                key={i}
              >
                <span
                  style={{
                    display: "block",
                    background: label.colour_code,
                    fontWeight: "500",
                    width: "8px",
                    height: "8px",
                  }}
                >
                  &#160;
                </span>
                {label.name}
              </div>
            ))}
          </div>
        ) : (
          "---"
        );
      },
    }),
    ...(props?.isDeletedView
      ? [
          columnHelper.accessor("deletedBy", {
            header: () => (
              <span className="order_orion_header">{t("order_orion_v2.deleted_by")}</span>
            ),
            cell: (info) => renderAvatars(info.getValue()),
          }),
          columnHelper.accessor("assignee", {
            header: () => (
              <span className="order_orion_header">{t("order_orion_v2.assignee")}</span>
            ),
            cell: (info) => renderAvatars(info.getValue()),
          }),
        ]
      : [
          columnHelper.accessor("assignee", {
            header: () => (
              <span className="order_orion_header">{t("order_orion_v2.assignee")}</span>
            ),
            cell: (info) => renderAvatars(info.getValue()),
          }),
        ]),
    columnHelper.accessor("orderType", {
      header: () => (
        <span className="order_orion_header">{t("order_orion_v2.order_type")}</span>
      ),
      cell: (info) => {
        const row = info.row.original.orderType || [];
        return row.length > 0 ? (
          <div className="flex-cloumn">
            {row.map((type, i) => (
              <div
                className="d-flex align-items-center"
                style={{
                  width: "fit-content",
                  minWidth: "90px",
                }}
                key={i}
              >
                {renderOrderType([type], orderType.data, true, true)}
              </div>
            ))}
          </div>
        ) : (
          "---"
        );
      },
    }),

    columnHelper.accessor("orderCategory", {
      header: () => (
        <span className="order_orion_header">{t("order_orion_v2.category")}</span>
      ),
      cell: (info) => {
        const row = info.row.original;
        const hasOrderCategory =
          Array.isArray(row.orderCategory) && row.orderCategory.length > 0;
        const hasUpSell =
          Array.isArray(row.upSellCategory) && row.upSellCategory.length > 0;
        const hasReDesign =
          Array.isArray(row.reDesignCategory) && row.reDesignCategory.length > 0;

        let finalCategoryList = [];
        if (hasUpSell && hasReDesign) {
          // If both upsell and redesign exist, return grouped format
          finalCategoryList = [
            {
              name: "Up-Sell",
              value: row.upSellCategory,
            },
            {
              name: "Re-Design",
              value: row.reDesignCategory,
            },
          ];
        } else if (hasOrderCategory) {
          finalCategoryList = row.orderCategory; // flat array
        } else if (hasUpSell) {
          finalCategoryList = row.upSellCategory; // flat array
        } else if (hasReDesign) {
          finalCategoryList = row.reDesignCategory; // flat array
        } else {
          finalCategoryList = []; // fallback
        }

        const isGrouped =
          Array.isArray(finalCategoryList) &&
          finalCategoryList.length > 0 &&
          typeof finalCategoryList[0] === "object" &&
          "name" in finalCategoryList[0] &&
          "value" in finalCategoryList[0];

        return isGrouped ? (
          <div>
            <OverlayTrigger
              placement="left"
              overlay={(tooltipProps) =>
                renderCategoryTooltip(tooltipProps, finalCategoryList)
              }
            >
              <div className="tools-website">
                <div>Tools / Website</div>
              </div>
            </OverlayTrigger>
          </div>
        ) : (
          <div className="text-left">{renderCategory(finalCategoryList)}</div>
        );
      },
    }),
    ...(!props?.isDeletedView
      ? [
          columnHelper.accessor("orderId", {
            header: () => (
              <span className="order_orion_header">{t("order_orion_v2.action")}</span>
            ),
            cell: (info) => {
              const rowData = info.row.original;
              return (
                <div className="mx-auto w-100">
                  <ToolTipPopup
                    toolTipDatas={[
                      {
                        name: (
                          <button className="btn btn-0 p-0 border-0 m-0 w-100 d-flex justify-content-between">
                            {t("order_view.edit")}{" "}
                            <img src={pencilSimpleLine} alt="pencilSimpleLine" />
                          </button>
                        ),
                        id: 1,
                      },
                      {
                        name: (
                          <button className="btn btn-0 p-0 m-0 w-100 border-0 text-danger d-flex justify-content-between">
                            {t("common.delete")}{" "}
                            <img src={trashIcon} alt="Remove Instrument" />
                          </button>
                        ),
                        id: 2,
                      },
                    ]}
                    labelField="name"
                    valueField="id"
                    getSeletedVal={(e) =>
                      handleEditDeleteValue(e, info.getValue(), rowData)
                    }
                    canEdit={true}
                    isCustomFieldswithFilter={false}
                    arrow={true}
                  />
                </div>
              );
            },
          }),
        ]
      : []),
  ];
  const handleEditDeleteValue = (e, getVal, rowData) => {
    // if (rowData?.isProcessOrder && e.name.props.children.includes("Delete"))
    //   return;
    if (e.id === 2) {
      deleteConfirmation(getVal);
    } else {
      handleOrderView(getVal, rowData, true);
    }
  };

  /** DELETE CONFIRMATION POPUP */
  const deleteConfirmation = (id) => {
    setSelectedId(id);
    props?.setDeleteModal(true);
  };

  /** HANDLE SORTING CHANGE */
  const handleSortingChange = (columnId, newSorting) => {
    const newSortOrder =
      newSorting.find((sort) => sort.id === columnId)?.desc === true ? "desc" : "asc";
    props?.onSortChange(columnId, newSortOrder);

    let updatedSorting = sorting.map((sort) => {
      if (sort.id === columnId) {
        return {
          ...sort,
          desc: !sort.desc, // toggle the sort order
        };
      } else {
        return {
          ...sort,
          desc: false, // reset other columns to ascending
        };
      }
    });
    setSorting(updatedSorting);
  };

  /** RENDER NO RESULTS FOUND */
  const renderNoResultsFound = (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 createOrderContainer">
      <img src={NoResultsFound} alt="Empty Order" />
      <h5 className="mt-4 text-center">{t("order_orion_v2.no_result_found")}</h5>
      <p className="text-center w-25">
        {t(
          "order_create.manage_and_sort_all_your_company_orders_work_into_a_single_list_that_can_be_easily_scanned_and_sorted_by_category",
        )}
      </p>
    </div>
  );

  /** RENDER EMPTY CONTENT */
  const renderEmptyContent = (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 createOrderContainer">
      <img src={EmptyOrder} alt="Empty Order" />
      <h5 className="mt-4 text-center">{t("order_create.view_your_work_in_a_list")}</h5>
      <p className="text-center w-25">
        {t(
          "order_create.manage_and_sort_all_your_company_orders_work_into_a_single_list_that_can_be_easily_scanned_and_sorted_by_category",
        )}
      </p>
      <div className="orderSection mt-3">
        <button className="btn  activeButton" onClick={() => props?.setShowDrawer(true)}>
          {t("order_create.create_order_")}
        </button>
      </div>
    </div>
  );

  const renderDeletedEmptyContent = (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 createOrderContainer">
      <img src={EmptyOrder} alt="Empty deleted orders" />
      <h5 className="mt-4 text-center">No deleted orders</h5>
      <p className="text-center w-25">
        Deleted orders will appear here when an order is removed from the list.
      </p>
    </div>
  );

  /** HANDLE INFINITE SCROLL */
  const handleInfiniteScroll = () => {
    props?.onScrollEnd();
  };

  return (
    <Fragment>
      <TopProgressBar loading={props?.loading} />
      {props?.loading && props?.orders.length === 0 && (
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
      {/* ORDER LISTING */}
      {props?.orders && (
        <Table
          columns={columns}
          columnData={props?.orders}
          className={classNames("products__body-table dashboard_table")}
          onSortingChange={handleSortingChange}
          sorting={sorting}
          setSorting={setSorting}
          tableName="Order_list"
          noDataContent={
            props?.loading
              ? null // ✅ Do not render any "no data" content while loading
              : props?.isDeletedView && props?.orders?.length === 0
                ? renderDeletedEmptyContent
                : props?.totalCount !== undefined &&
                    props?.totalCount === 0 &&
                    props?.isTicket !== null &&
                    !props?.isTicket
                  ? renderEmptyContent
                  : isFiltered && props?.isTicket
                    ? renderNoResultsFound
                    : null
          }
          tableHeight={props?.tableHeight}
          loading={props?.loading}
          onScrollEnd={handleInfiniteScroll}
        />
      )}

      {/* DELETE CONFIRMATION POPUP */}
      <PopupModal
        show={props?.deleteModal}
        onClose={props?.setDeleteModal}
        className={"popupModal bg-white rounded-4"}
        width={"40vh"}
      >
        <div>
          <h5 className="text-center">Do you want to Delete this order ?</h5>
          <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
            <button
              className="btn btn-0 modalDelete_btn px-3"
              onClick={() => props?.handleDeleteOrder(selectedId)}
            >
              Yes
            </button>
            <button
              className="btn btn-0 modalCancel_btn px-3"
              onClick={() => {
                props?.setDeleteModal(false);
                setSelectedId(null);
              }}
            >
              No
            </button>
          </div>
        </div>
      </PopupModal>
    </Fragment>
  );
};

export default OrderList;

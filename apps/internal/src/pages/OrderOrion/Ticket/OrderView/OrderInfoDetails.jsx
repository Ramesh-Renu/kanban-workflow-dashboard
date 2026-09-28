import { useGlobalMaster } from "@orion/shared";
import { DoneRing } from "../../../../assets/images";
import dayjs from "dayjs";
import { t } from "i18next";
import React, { Fragment, useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { renderOrderType, updateMatserInfoWithValue } from "../../../../utils/common";

const OrderInfoDetails = ({ companyData, sourceData, setCanShow }) => {
  const { packageList, countryList, toolsList, orderType } = useGlobalMaster();
  const [companyInfo, setCompanyInfo] = useState();

  useEffect(() => {
    const companyInfo = updateMatserInfoWithValue(
      companyData.orderInfo.tools,
      sourceData
    );
    setCompanyInfo(companyInfo);
  }, []);

  const toolTypeConfig = orderType?.data?.filter((type) =>
    companyData.orderType.includes(type.status_id)
  );
  const getToolsDetails = (orderType) => {
    const match = companyData?.orderInfo?.tools?.toolsDetails?.find((detail) =>
      detail.orderType.includes(orderType)
    );

    if (!match) return { toolsCount: 0, names: [] };

    const names =
      match.toolsId
        ?.map((id) => toolsList?.data?.find((x) => x.toolId === id)?.toolName)
        .filter(Boolean) || [];

    return {
      toolsCount: match.toolsId?.length || 0,
      names,
    };
  };
  const has16 = companyData?.orderType?.includes(16);
  const hidePackage =
    companyData?.orderType.length === 2 &&
    companyData?.orderType.includes(18) &&
    companyData?.orderType.includes(53);

  const len = companyData?.orderType?.length;
  const nillData = "---";

  const infoArr = [
    /** PACKAGE DATA (Only if NOT type 16) */
    // ...((!has16 && len === 1) || (!hidePackage)
    ...(!has16
      ? [
        {
          subTitle: t("order_view.package"),
          value: [
            packageList?.data?.find(
              (p) =>
                p.status_id ===
                companyData?.orderInfo?.tools?.toolsDetails?.[0]?.package?.[0]
            )?.name,
          ].filter(Boolean),
          orderType: companyData?.orderType,
        },
      ]
      : []),

    /** TOOL TYPES GENERATED DYNAMICALLY */
    ...toolTypeConfig
      .filter((cfg) => companyData?.orderType?.includes(cfg.status_id))
      .map((cfg) => {
        const details = getToolsDetails(cfg.status_id);
        return {
          title: cfg.name + " Selected Tools",
          subTitle: t("order_view.tools_list"),
          toolsCount: details.toolsCount,
          value: details.names,
          orderType: companyData?.orderType,
        };
      }),

    /** LANGUAGE SELECTED */
    ...(companyInfo?.language
      ? [
        {
          subTitle: "Language Selected",
          value: companyInfo?.language?.map((l) => l.languageName),
        },
      ]
      : []),

    /** CURRENCY SELECTED */
    ...(companyInfo?.currency
      ? [
        {
          subTitle: "Currency Selected",
          value: companyInfo?.currency?.map((c) => c.currency_name),
        },
      ]
      : []),
  ];

  const infoLabelValue = [
    {
      label: t("order_view.order_value"),
      key: "order_value",
      value:
        countryList?.data
          .filter((item) =>
            companyData?.orderInfo?.tools?.orderVal_Currency.includes(
              item.country_id
            )
          )
          .map((item) => item.currency_code)
          .filter(Boolean) +
        " " +
        companyData?.orderInfo?.tools?.orderVal || nillData,
    },
    {
      label: t("order_view.start_up_fee"),
      key: "start_up_fee",
      value:
        countryList?.data
          .filter((item) =>
            companyData?.orderInfo?.tools?.startUpFee_Currency.includes(
              item.country_id
            )
          )
          .map((item) => item.currency_code)
          .filter(Boolean) +
        " " +
        companyData?.orderInfo?.tools?.startUpFee || nillData,
    },
    // {
    //   label: t("order_view.expected_delivery_date"),
    //   key: "expected_delivery_date",
    //   value:
    //     (companyData?.orderInfo?.tools?.deliveryDate &&
    //       dayjs(companyData?.orderInfo?.tools?.deliveryDate).format(
    //         "MMM DD, YYYY"
    //       )) ||
    //     nillData,
    // },
    {
      label: t("order_view.order_date"),
      key: "order_date",
      value:
        (companyData?.orderInfo?.tools?.orderDate &&
          dayjs(companyData?.orderInfo?.tools?.orderDate).format(
            "MMM DD, YYYY"
          )) ||
        nillData,
    },
    // {
    //   label: t("order_view.ir_link"),
    //   typeof: "link",
    //   value: companyData?.orderInfo?.tools?.irLink || nillData,
    // },
    // {
    //   label: t("order_view.order_date"),
    //   value: companyData?.orderInfo?.orderDate || nillData,
    // },
  ];

  return (
    <div className="orderInfoDetails companyDetails">
      <Row className="containerRow">
        <Col lg={7} className="p-0 pe-3 orderInfoDetails-first-col">
          <div className="orderInfoDetails-box">
            <div className="d-flex justify-content-between px-2 mt-2">
              <h6> Order Type</h6>
              <div className="d-flex gap-2">
                {orderType?.data &&
                  renderOrderType(
                    companyData,
                    orderType?.data,
                    true,
                    true,
                    null
                  )}
              </div>
            </div>
            {infoArr?.map((row, i) => {
              return (
                <Row
                  className="mx-auto  mt-2 d-flex justify-content-between flex-wrap"
                  key={i}
                >
                  {row?.subTitle === "Package" && (
                    <div className="w-100 d-flex  justify-content-between">
                      <div>
                        <div className="m-0 p-0 mt-3 text-secondary">
                          {row?.subTitle}
                        </div>
                      </div>
                      <div>
                        {row.subTitle === "Package" &&
                          row.value?.length > 0 &&
                          row.value.map((value, index) => (
                            <div
                              className="packageContainer m-0 rounded mt-3"
                              key={index}
                            >
                              <img src={DoneRing} alt="DoneRing" /> {value}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {row?.subTitle === "Language Selected" && (
                    <div className="w-100 d-flex justify-content-between align-items-start flex-wrap">
                      <h6 className="m-0 p-0 mt-3">Language</h6>
                      <div className="w-70 d-flex justify-content-end">
                        {row.subTitle === "Language Selected" &&
                          row?.value?.length > 0 ? (
                          <div
                            className="language-ellipsis mt-3"
                          // title={row?.value?.join(", ")} // tooltip with full text
                          >
                            {row?.value.map((name, i) => (
                              <span style={{ display: "inline-block" }} key={i}>
                                {name}
                                {i + 1 === row?.value?.length ? "" : ","}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="language-ellipsis mt-3">---</div>
                        )}
                      </div>
                    </div>
                  )}

                  {row?.subTitle === "Currency Selected" && (
                    <div className="w-100 d-flex justify-content-between align-items-start flex-wrap">
                      <h6 className="m-0 p-0 mt-3">Currency</h6>
                      <div className="w-50 d-flex  justify-content-end">
                        {row.subTitle === "Currency Selected" &&
                          row?.value?.length > 0 ? (
                          <div
                            className="language-ellipsis mt-3"
                            title={row?.value?.join(", ")} // tooltip with full text
                          >
                            {row?.value.map((name, i) => (
                              <span style={{ display: "inline-block" }} key={i}>
                                {name}
                                {i + 1 === row?.value?.length ? "" : ","}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="language-ellipsis mt-3">---</div>
                        )}
                      </div>
                    </div>
                  )}
                </Row>
              );
            })}

            {infoLabelValue
              .filter((item) => setCanShow?.includes(item.key))
              .map((item, index) => (
                <Fragment key={item.key}>
                  {item.key === "start_up_fee" ||
                    (item.key === "order_value" && (
                      <>
                        <hr className="w-100" />
                        <h6 className="w-100 px-2 mt-4">Order Fee Details</h6>
                      </>
                    ))}
                  <Row className="mx-auto align-items-center px-2 d-flex flex-row flex-wrap mt-1">
                    <Col
                      lg={12}
                      md={12}
                      xs={12}
                      key={index}
                      className="d-flex flex-row align-items-center justify-content-between labelValueContainer py-2 m-0 px-2"
                    >
                      <div className="p-0">
                        <p className="label_field">{item?.label}</p>
                      </div>
                      <Col md={5} className="">
                        <p className="value_field text-end">{item?.value}</p>
                      </Col>
                    </Col>
                  </Row>
                </Fragment>
              ))}
          </div>
        </Col>
        <Col lg={5} className=" p-0 ps-2 orderInfoDetails-second-col">
          <div className="border rounded h-100 toolsContainer shadow-sm p-3 ">
            {infoArr?.map((row, i) => {
              return (
                row?.subTitle === "Tools List" && (
                  <Row className="w-100 mx-auto px-2 mt-2" key={i}>
                    <div className="titleCountContainer">
                      <h3 className="selected-tools-heading">
                        {row?.orderType?.length >= 2
                          ? row.title
                          : "Selected Tools"}
                      </h3>
                      {row.toolsCount !== 0 && (
                        <div className="counterPill">{row?.toolsCount}</div>
                      )}
                    </div>
                    <hr className="mt-3 mb-0" style={{ color: "#d8d8d8ff" }} />
                    {row.subTitle === "Tools List" && row.value?.length > 0 && (
                      <Row
                        className="w-100 mx-auto d-flex flex-column flex-nowrap m-0 mt-3 p-0 tools-list"
                        style={{
                          maxHeight:
                            row?.orderType?.length >= 2 ? "140px" : "450px",
                        }}
                      >
                        {row.value.map((value, index) => (
                          <div className="tool-name-list" key={index}>
                            {value}
                          </div>
                        ))}
                      </Row>
                    )}
                    {row.subTitle === "Tools List" &&
                      row.value?.length === 0 && (
                        <Row className="w-100 mx-auto d-flex flex-column flex-nowrap m-0 mt-3 p-0 tools-list">
                          <div className="tool-name-list">
                            No Tools Selected Yet
                          </div>
                        </Row>
                      )}
                    {row.subTitle === "Language Selected" &&
                      row.value?.length > 0 && (
                        <Row className="w-100 mx-auto d-flex flex-row flex-wrap m-0 p-0 toolsRow">
                          {row.value.map((value, index) => (
                            <div
                              className="toolsContainer m-0  mt-3"
                              key={index}
                            >
                              {value}
                            </div>
                          ))}
                        </Row>
                      )}
                  </Row>
                )
              );
            })}{" "}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default OrderInfoDetails;

import { renderOrderType } from "../../../../utils/common";
import SideDrawer from "../../../../components/common/SideDrawer";
import dayjs from "dayjs";
import { t } from "i18next";
import React, { useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import variables from "@orion/shared/src/styles/variables-style.json";
import SVGImage from "../../SVGImage";
const OrderHistory = ({
  show,
  onHide,
  orderTypeMaster,
  orderHistoryData,
}) => {
  const [historyData, setHistoryData] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [getImageLeft, setImageLeft] = useState(0);
  const [getImageHeight, setImageHeight] = useState(20);
  const toggleExpand = (index) => {
    setExpandedIndex((prevIndex) => (prevIndex === index ? null : index));
  };

  useEffect(() => {
    setHistoryData(orderHistoryData);
  }, [orderHistoryData]);

  /** EFFECT TO SET IMAGE LEFT AND HEIGHT */
  useEffect(() => {
    const getWith = 480 / 20;
    setImageLeft(getWith);
    setImageHeight(30);
  }, []);

  const commonPlaceIconsStyle = {
    width: "24px",
    height: "24px",
    left: "-5px",
    top: "-3px",
  };
  
  return (
    <div>
      <SideDrawer
        show={show}
        onHide={onHide}
        title={"Order History"}
        customWidth={"35%"}
      >
        <div className="w-100  historyDataContainer">
          {historyData?.map((row, i) => {
            return (
              <div
                className={`historyBox p-3 mt-2 ${
                  expandedIndex === i && "active"
                }`}
                key={i}
              >
                {expandedIndex === i ? (
                  <Row className="w-100 mx-auto p-0 m-0">
                    <Col className="p-0 m-0 w-100 d-flex flex-row align-items-center justify-content-between">
                      <div>
                        <label className="customLabel">
                          {t("order_view.order_type")}
                        </label>
                        <div className="activeCustomValue">
                          {renderOrderType(
                            { orderType: row.orderType },
                            orderTypeMaster,
                            false,
                            false,
                            "activeCustomValue"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="position-relative">
                          <SVGImage
                            color={variables.common["--color-icon-purple"]}
                            style={{
                              position: "absolute",
                              left: -(getImageLeft * 2.4 + 11) + "px",
                              height: getImageHeight,
                              top: "0px",
                              background: "transparent",
                            }}
                            commonPlaceIconsStyle={commonPlaceIconsStyle}
                            isTransparent={true}
                          />
                          <label className="customLabel mx-4">
                            {t("order_view.order_date")}
                          </label>
                        </div>
                        <div className="activeCustomValue">
                          {dayjs(row.orderDate).format("MMM DD, YYYY")}
                        </div>
                      </div>
                      <button
                        className="btn tbn-0 m-0 border-0"
                        onClick={() => toggleExpand(i)}
                      >
                        <span
                          aria-hidden="true"
                          aria-label="Customer Timeline"
                          className="icon-chevron-thin-down"
                        ></span>
                      </button>
                    </Col>
                    <hr className="mt-3" />
                    <div className="toolCount-container w-auto px-3 py-1 rounded">
                      {t("order_view.tools_count")} :{" "}
                      <span>{row.totalCount}</span>
                    </div>
                    <div className="d-flex flex-row flex-wrap mt-3 p-0 gap-2">
                      {row?.tools?.map((item, index) => {
                        return (
                          <p className="toolsText m-0" key={index}>
                            {item}
                            {index === row.tools.length - 1 ? "" : ","}
                            {"  "}
                          </p>
                        );
                      })}
                    </div>
                  </Row>
                ) : (
                  <Row className="w-100 mx-auto p-0 m-0 historyBoxActive">
                    <Col className="p-0 m-0 w-100 d-flex flex-row align-items-center justify-content-between">
                      <Col xs={3} className="customValue">
                        {renderOrderType(
                          { orderType: row.orderType },
                          orderTypeMaster,
                          false,
                          false,
                          "activeCustomValue"
                        )}
                      </Col>
                      <Col xs={3} className=" position-relative">
                        <SVGImage
                          color={variables.common["--color-icon-purple"]}
                          style={{
                            position: "absolute",
                            left: -(getImageLeft * 2.5 + 11) + "px",
                            height: getImageHeight,
                            top: "0px",
                            background: "transparent",
                          }}
                          commonPlaceIconsStyle={{
                            ...commonPlaceIconsStyle,
                            left: "-8px",
                            top: "-5px",
                          }}
                          isTransparent={true}
                        />
                        <div className=" customValue mx-3">
                          {dayjs(row.orderDate).format("MMM DD, YYYY")}
                        </div>
                      </Col>
                      <Col xs={3}>
                        <label className="customValue">
                          {t("order_view.tool_count")} :{" "}
                          <span>{row.totalCount}</span>
                        </label>
                      </Col>
                      <button
                        className="btn tbn-0 m-0 border-0"
                        onClick={() => toggleExpand(i)}
                      >
                        <span
                          aria-hidden="true"
                          aria-label="Customer Timeline"
                          className="icon-chevron-thin-down"
                        ></span>
                      </button>
                    </Col>
                  </Row>
                )}
              </div>
            );
          })}
        </div>
      </SideDrawer>
    </div>
  );
};

export default OrderHistory;

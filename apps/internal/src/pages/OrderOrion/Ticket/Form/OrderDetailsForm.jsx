import React, { useEffect, useState, useRef, Fragment } from "react";
import { Col, Row, Tab, Tabs } from "react-bootstrap";
import { t } from "i18next";
import DynamicInput from "../../../../components/common/Dynamic/Input";
import DateTimeCalendar from "../../../../components/common/DateTimeCalendar";
import { SelectDropDown } from "@orion/shared";
import dayjs from "dayjs";
import {
  stripMasterInfoToIdOnly,
  updateMatserInfoWithValue,
} from "../../../../utils/common";
import { getOrderHistory } from "../../../../services";
import OrderedToolsPackage from "./OrderedToolsPackage";
import OrderHistory from "./OrderHistory";
import { useToast } from "@orion/shared";
import { useGlobalMaster } from "@orion/shared";

export const OrderDetailsForm = ({
  companyData,
  orderType,
  errorList,
  ...props
}) => {
  // VARIABLE DECLARATIONS
  const { showToast } = useToast();
  const { countryList, toolsList, getCountryList, getToolsList } =
    useGlobalMaster();
  const [currencyList, setCurrencyList] = useState([]);
  const [orderInfoData, setOrderInfoData] = useState({
    orderVal: "",
    startUpFee: "",
    orderDate: "",
    deliveryDate: "",
    language: [],
    currency: [],
    orderVal_Currency: [],
    startUpFee_Currency: [],
    toolsDetails: props?.formData?.orderInfo?.tools.toolsDetails,
  });
  const [showHistory, setShowHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState({});
  const divRef = useRef(null);
  const [getHistoryData, setDataHistory] = useState([]);
  const isFetchingRef = useRef(false);
  // Snapshot existing tools by orderType at open — never lock newly added tools
  const originalLockedToolsByOrderType = useRef(null);
  const buildLockedToolsByOrderType = (toolsDetailsList = []) => {
    const lockedByOrderType = {};
    toolsDetailsList.forEach((detail) => {
      const toolIds = (detail?.toolsId || [])
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id));
      (detail?.orderType || []).forEach((ot) => {
        lockedByOrderType[Number(ot)] = toolIds;
      });
    });
    return lockedByOrderType;
  };
  if (originalLockedToolsByOrderType.current === null) {
    originalLockedToolsByOrderType.current = buildLockedToolsByOrderType(
      props?.formData?.orderInfo?.tools?.toolsDetails || [],
    );
  }
  useEffect(() => {
    const current = originalLockedToolsByOrderType.current || {};
    const hasAny = Object.values(current).some((ids) => ids?.length > 0);
    if (hasAny) return;
    const next = buildLockedToolsByOrderType(
      props?.formData?.orderInfo?.tools?.toolsDetails || [],
    );
    if (Object.values(next).some((ids) => ids?.length > 0)) {
      originalLockedToolsByOrderType.current = next;
    }
  }, [props?.formData?.orderInfo?.tools?.toolsDetails]);
  const saved = localStorage.getItem("workspaceState");
  const parsed = JSON.parse(saved);
  const { activeWorkSpace, activeBoard } = parsed || {};
  const activeBoardCode = activeBoard?.[0]?.code;

  // get currency list data for dropdown
  useEffect(() => {
    if (!countryList?.loading && countryList?.data?.length === 0) {
      getCountryList();
    }
    const seen = new Set();
    const result = countryList?.data.filter(
      (obj) =>
        obj.currency_code &&
        !seen.has(obj.currency_code) &&
        seen.add(obj.currency_code)
    );
    setCurrencyList(result);
  }, [countryList?.data]);

  useEffect(() => {
    if (
      getHistoryData?.length === 0 &&
      companyData?.companyInfo.companyCode &&
      !companyData.orderType.includes(16)
    ) {
      fetchData(companyData?.companyInfo.companyCode);
    } else return;
  }, []);

  const fetchData = async (param) => {
    if (isFetchingRef.current) return; // Prevent multiple calls
    isFetchingRef.current = true;
    try {
      const res = await getOrderHistory(param); // ✅ await the actual API call
      if (res?.status) {
        setDataHistory(res.data);
      }
    } catch (error) {
      console.error(error);
      showToast({
        title: "Error",
        type: "SHOW_TOAST",
        payload: { message: error, variant: "danger" },
      });
    } finally {
      isFetchingRef.current = false;
    }
  };

  // check orderType is PLG or Not  for render predefined tool list
  useEffect(() => {
    if (!toolsList?.loading && toolsList?.data?.length === 0) {
      getToolsList();
    }
  }, [props?.formData?.orderType]);

  useEffect(() => {
    if (errorList) {
      const errorMessage = {
        "tools.language": "Select the Language",
        "tools.orderDate": "Select the Order Date",
        // "tools.deliveryDate": "Select the Delivery Date",
        "tools.toolsDetails[0].toolsId": "Select Tool is required",
        "tools.toolsDetails[1].toolsId": "Select Tool is required",
        "tools.toolsDetails[2].toolsId": "Select Tool is required",
        "tools.toolsDetails[0].package": "Select Package is required",
        "tools.toolsDetails[1].package": "Select Package is required",
        "tools.toolsDetails[2].package": "Select Package is required",
      };

      const filteredErrors = Object.keys(errorList).reduce((acc, key) => {
        if (errorList[key] && errorMessage[key]) {
          acc[key] = errorMessage[key];
        }
        return acc;
      }, {});
      setErrorMsg(filteredErrors);
      if (errorList && divRef?.current) {
        divRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [errorList]);

  const buildToolsDetailsDynamic = (orderType = [], toolsDetails = []) => {
    // Normalize toolsDetails by orderType → easy lookup
    const map = new Map();
    toolsDetails.forEach((item) => {
      (item.orderType || []).forEach((ot) => {
        map.set(Number(ot), {
          package: item.package || [],
          orderType: [Number(ot)],
          toolsId: item.toolsId || [],
        });
      });
    });

    // Build final result in the same order as orderType input
    return orderType.map((ot) => {
      ot = Number(ot);

      // If exists in toolsDetails → return the real data
      if (map.has(ot)) return map.get(ot);

      // If missing → create empty entry
      return {
        package: [],
        orderType: [ot],
        toolsId: [],
      };
    });
  };

  useEffect(() => {
    const sourceData = {
      currency: countryList?.data,
      // customerLanguageList: props?.customerLanguageList,
    };
    let orderDetailsForm = updateMatserInfoWithValue(
      props?.formData?.orderInfo?.tools,
      sourceData
    );
    const orderType = props?.formData?.orderType || [];
    const toolsDetails = orderDetailsForm?.toolsDetails || [];
    const getData = buildToolsDetailsDynamic(orderType, toolsDetails);
    orderDetailsForm = { ...orderDetailsForm, toolsDetails: getData };
    setOrderInfoData(orderDetailsForm);
  }, []);

  useEffect(() => {
    // 2. Fill in default currency if missing
    const isCurrencyMissing =
      orderInfoData?.orderVal_Currency?.length === 0 ||
      orderInfoData?.startUpFee_Currency?.length === 0;

    if (currencyList.length && isCurrencyMissing) {
      const defaultCurrency = currencyList.filter(
        (currency) => currency?.currency_code === "EUR"
      );

      const infoData = {
        ...orderInfoData,
        orderVal_Currency: defaultCurrency,
        startUpFee_Currency: defaultCurrency,
      };
      setOrderInfoData(infoData);
    }
  }, [currencyList]);

  const handleOrderInfoChange = (value, keyOrIndex, type = "field") => {
    
    if (type === "toolsDetails") {
      const updatedToolsDetails = [...orderInfoData.toolsDetails];
      updatedToolsDetails[keyOrIndex] = value;
      setOrderInfoData((prev) => ({
        ...prev,
        toolsDetails: updatedToolsDetails,
      }));

      props?.setFormData?.((prev) => ({
        ...prev,
        orderInfo: {
          ...prev.orderInfo,
          tools: {
            ...prev.orderInfo?.tools,
            toolsDetails: updatedToolsDetails,
          },
        },
      }));

      setErrorMsg((prev) => ({
        ...prev,
        [`tools.toolsDetails[${keyOrIndex}].toolsId`]:
          updatedToolsDetails.length > 0 ? false : true,
        [`tools.toolsDetails[${keyOrIndex}].package`]:
          updatedToolsDetails.length > 0 && value?.orderType?.includes(18)
            ? false
            : true,
      }));
    } else if (type === "language") {
      const updated = { ...orderInfoData, language: value.language };
      setOrderInfoData((prev) => ({
        ...prev,
        language: value.language,
      }));
      const pureIdsData = stripMasterInfoToIdOnly(updated);
      props?.setFormData?.((prev) => ({
        ...prev,
        orderInfo: {
          ...prev.orderInfo,
          tools: pureIdsData,
        },
      }));
      if (value?.language?.length > 0) {
        setErrorMsg((prev) => ({
          ...prev,
          "tools.language": false,
        }));
      }
    } else if (type === "currency") {
      const updated = { ...orderInfoData, currency: value.currency };
      setOrderInfoData((prev) => ({
        ...prev,
        currency: value.currency,
      }));
      const pureIdsData = stripMasterInfoToIdOnly(updated);
      props?.setFormData?.((prev) => ({
        ...prev,
        orderInfo: {
          ...prev.orderInfo,
          tools: pureIdsData,
        },
      }));
    } else {
      const updated = { ...orderInfoData, [keyOrIndex]: value };
      const specialKeys = ["orderVal_Currency", "startUpFee_Currency"];
      if (specialKeys.includes(keyOrIndex)) {
        if (
          orderInfoData[keyOrIndex] !== value &&
          keyOrIndex === "orderVal_Currency"
        ) {
          setOrderInfoData((prev) => ({
            ...prev,
            [keyOrIndex]: value,
            orderVal: "",
          }));
        } else if (
          orderInfoData[keyOrIndex] !== value &&
          keyOrIndex === "startUpFee_Currency"
        ) {
          setOrderInfoData((prev) => ({
            ...prev,
            [keyOrIndex]: value,
            startUpFee: "",
          }));
        }
      } else {
        setOrderInfoData((prev) => ({
          ...prev,
          [keyOrIndex]: value,
        }));
      }

      if (errorMsg[keyOrIndex] && value) {
        setErrorMsg((prev) => ({
          ...prev,
          [keyOrIndex]: false,
        }));
      }

      const pureIdsData = stripMasterInfoToIdOnly(updated);
      props?.setFormData?.((prev) => ({
        ...prev,
        orderInfo: {
          ...prev.orderInfo,
          tools: pureIdsData,
        },
      }));
    }
  };

  const isWebsiteInformationTab = () => {
    const orderCategory = props?.formData?.orderCategory || [];
    const reDesignCategory = props?.formData?.reDesignCategory || [];
    const upSellCategory = props?.formData?.upSellCategory || [];

    return (
      orderCategory.includes(20) ||
      reDesignCategory.includes(20) ||
      upSellCategory.includes(20)
    );
  };

  const isValidShowHistory = () => {
    let result = orderType?.filter((id) =>
      props.formData.orderType?.includes(id?.status_id)
    );

    if (result[0]?.code === "PLG") {
      return false;
    } else {
      return true;
    }
  };
  return (
    <Fragment>
      <Col xs={12} className="contact-info-header">
        <h5 className="mb-1">Order Information</h5>
        <span className="fs-12 p">Set up order-related details</span>
      </Col>
      <Tabs
        defaultActiveKey="tools"
        transition={false}
        id="noanim-tab-example"
        className="mt-3 mb-3 order-details-section"
      >
        <Tab
          eventKey="tools"
          title="Tools Information"
          className="order-details-section w-100 position-relative"
        >
          <Row className="w-40 justify-content-end mx-auto p-0 activeButton-div">
            {/* {isValidShowHistory() && getHistoryData.length > 0 && (
              <Col className="mt-2 text-end p-0">
                <button
                  className="btn btn-0 activeButton"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {t("order_view.order_history")}
                </button>
              </Col>
            )} */}
          </Row>

          {orderInfoData?.toolsDetails?.length > 0 &&
            orderInfoData?.toolsDetails?.some((t) => t.orderType?.length > 0) &&
            orderInfoData?.toolsDetails?.map((order, i) => {
              const selectedTypes = props.formData.orderType || [];
              const selectedOrder =
                props.formData.orderInfo.tools.toolsDetails || [];
              const getOrderType = orderType?.filter((t) =>
                selectedTypes.includes(t.status_id)
              );
              // 🔥 If currentType === 53 → always pick last element
              const currentOrder = selectedOrder[i];
              const currentType = order?.orderType?.[0];

              const hasUP = getOrderType.some((d) => d.code === "UP");
              const hasRD = getOrderType.some((d) => d.code === "RD");
              const onlyOneType = getOrderType.length === 1;

              let showPackage = false;
              let showLanguage = false;
              let getCurrentOrder = order;

              // -----------------------------
              // CASE 1 → Only 1 orderType
              // -----------------------------
              if (onlyOneType) {
                showLanguage = true;

                // “not PLG or RD”
                const isPLG = getOrderType[0].code === "PLG";
                const isRD = getOrderType[0].code === "RD";

                if (!isPLG && !isRD) {
                  showPackage = true;
                }
              }

              // -----------------------------
              // CASE 2 → Exactly 2 orderTypes
              // -----------------------------
              else if (getOrderType.length === 2) {
                if (hasUP && currentType === 53) {
                  showPackage = true;
                  showLanguage = true;
                  getCurrentOrder = currentOrder;
                }

                if (hasRD && currentType === 53) {
                  showPackage = false;
                  showLanguage = true;
                  getCurrentOrder = currentOrder;
                }

                if (hasRD && currentType === 17) {
                  showPackage = true;
                  showLanguage = true;
                  getCurrentOrder = currentOrder;
                }
              }

              // -----------------------------
              // CASE 3 → More than 2 types
              // -----------------------------
              else if (getOrderType.length > 2) {
                if ((hasRD || hasUP) && currentType === 53) {
                  showPackage = true;
                  showLanguage = true;
                }
              }
              if (currentType === undefined) {
                return null;
              }
              return (
                <OrderedToolsPackage
                  key={i}
                  orderId={{ orderType: [currentType] }}
                  orderType={orderType}
                  getlanguage={orderInfoData?.language}
                  getcurrency={orderInfoData?.currency}
                  toolsDetails={getCurrentOrder}
                  getSelectedtoolsDetails={(e, type) =>
                    handleOrderInfoChange(e, i, type)
                  }
                  index={i}
                  errorMsg={errorMsg}
                  disabledList={props.setCannotEidit}
                  languages={props?.customerLanguageList}
                  currencyList={props?.customerCurrencyList}
                  showPackage={showPackage}
                  showLanguage={showLanguage}
                  getOrderType={getOrderType}
                  initialLockedToolIds={
                    originalLockedToolsByOrderType.current?.[
                      Number(currentType)
                    ] || []
                  }
                />
              );
            })}

          {!props?.setCannotEidit?.includes("tools.orderVal") && (
            <>
              <label className=" mt-3 pb-2">Order Fee Details</label>

              <Row className="w-100 mt-2 d-flex">
                {[
                  {
                    label: t("order_view.order_value"),
                    key: "orderVal",
                    key1: "orderVal_Currency",
                  },
                  {
                    label: t("order_view.start_up_fee"),
                    key: "startUpFee",
                    key1: "startUpFee_Currency",
                  },
                ].map(({ label, key, key1 }) => (
                  <Col
                    md={4}
                    className="d-flex flex-row flex-wrap timelineInputs"
                    key={key}
                  >
                    <div className="w-100">
                      <label className="pb-2">{label}</label>
                    </div>
                    <div className="d-flex gap-2 ">
                      <div
                        className="dialCode-field"
                        style={{ minWidth: "100px" }}
                      >
                        <SelectDropDown
                          multi={false}
                          options={currencyList || []}
                          searchable={true}
                          placeholder="EUR"
                          labelField="currency_code"
                          valueField="country_id"
                          className="multiple-select"
                          values={orderInfoData[key1] || []}
                          onChange={(e) => handleOrderInfoChange(e, key1)}
                          dropdownPosition="auto"
                        />
                      </div>
                      <div>
                        <DynamicInput
                          labelName={null}
                          value={orderInfoData?.[key]}
                          setValue={(val) => {
                            handleOrderInfoChange(val, key);
                          }}
                          inputType={"number"}
                          maxLength={"9"}
                          className="input-group-renderer-default-style"
                        />
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
              {/* <SectionTitle title={t("order_view.timeline_details")} /> */}
            </>
          )}
          <label className=" mt-3 pb-2">
            {t("order_view.timeline_details")}
          </label>
          <Col className="w-100 timelineInputs">
            {[
              {
                label: t("order_orion_v2.order_date"),
                key: "orderDate",
                isMandatory: true,
              },
              // {
              //   label: t("order_view.expected_delivery_date"),
              //   key: "deliveryDate",
              //   isMandatory: activeBoardCode === "OB" ? true : false,
              // },
            ].map(({ label, key, isMandatory }) => (
              <Col md={4} key={key}>
                <label>
                  {label} {isMandatory && <sup className="text-danger">*</sup>}
                </label>
                <div className="picker-date mt-2 position-relative">
                  <DateTimeCalendar
                    value={orderInfoData?.[key]}
                    dateFormat="MMM DD, YYYY"
                    placeholder={label}
                    getDateTime={(date) => {
                      const formattedDate = dayjs(date).format(
                        "YYYY-MM-DD HH:mm:ss"
                      );
                      handleOrderInfoChange(formattedDate, key);
                    }}
                    orderDateValidation={key === "orderDate" ? true : false}
                    dueDateValidation={key === "deliveryDate" ? true : false}
                    timeFormat={false}
                    calendarPosition="top"
                    iconShow={true}
                    disabled={props?.setCannotEidit?.includes("tools." + key)}
                  />
                </div>
                {key === "orderDate" && errorMsg?.["tools.orderDate"] && (
                  <div className="text-danger small mt-1">
                    {t("order_orion_v2.order_date")} is required
                  </div>
                )}
                {/* {key === "deliveryDate" && errorMsg?.["tools.deliveryDate"] && (
                  <div className="text-danger small mt-1">
                    {t("order_orion_v2.delivery_date")} is required
                  </div>
                )} */}
              </Col>
            ))}
          </Col>
          <OrderHistory
            show={showHistory}
            onHide={() => setShowHistory(!showHistory)}
            orderTypeMaster={orderType}
            orderHistoryData={getHistoryData}
          />
        </Tab>

        {isWebsiteInformationTab() && (
          <Tab eventKey="profile" title="Website Information" disabled>
            Tab content for Website
          </Tab>
        )}
      </Tabs>
    </Fragment>
  );
};

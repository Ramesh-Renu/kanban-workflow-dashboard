import MandatoryText from "../../components/common/MandatoryText";
import SideDrawer from "../../components/common/SideDrawer";
import React, { useEffect, useRef, useState } from "react";
import { Col, Row, Spinner } from "react-bootstrap";
import { t } from "i18next";
import Select from "react-dropdown-select";
import useCompanySearch from "../../hooks/useCompanySearch";
import searchIcon from "../../assets/images/search-icon.svg";
import { SelectDropDown } from "@orion/shared";
import { createPLGTicket } from "../../services";
import { useGlobalContext } from "store/context/GlobalProvider";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { useToast } from "@orion/shared";
import { useGlobalMaster } from "@orion/shared";
import RenderCategory from "./RenderCategory";

const OrderOrionCreation = ({ showDrawer, setShowDrawer, orderCreated }) => {
  const debounceTimeoutRef = useRef(null);
  const upSellRef = useRef([]);
  const reDesignRef = useRef([]);
  const currentQueryRef = useRef("");
  const { filterState, dispatch } = useGlobalContext();
  const {
    orderType,
    orderCategory,
    marketRegionList,
    toolsList,
    packageDetails,
    getOrderType,
    getOrderCategory,
    getMarketRegionList,
    getToolsList,
    getPackageDetails,
  } = useGlobalMaster();
  const { showToast } = useToast();
  const { getCustomerSearch } = useCompanySearch();
  const suggestionRef = useRef(null);

  useEffect(() => {
    if (!toolsList?.loading && toolsList?.data?.length === 0) {
      getToolsList();
    }
  }, []);

  useEffect(() => {
    if (
      !orderType?.loading &&
      (orderType?.data?.length === 0 || orderType === undefined)
    ) {
      getOrderType();
    }
    if (
      !orderCategory?.loading &&
      (orderCategory?.data?.length === 0 || orderCategory === undefined)
    ) {
      getOrderCategory();
    }
  }, []);

  //____________________________________________________create order states_________________________________________________//
  const [showLoading, setShowLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [companyNotFound, setCompanyNotFound] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [companyId, setCompanyId] = useState(0);
  const [suggestedValues, setSuggestedValues] = useState([]);
  const [selectedTypesId, setSelectedTypesId] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState([]);
  const [upSellCategory, setUpSellCategory] = useState([]);
  const [reDesignCategory, setReDesignCategory] = useState([]);
  const [plgToolsId, setPlgToolsId] = useState([]);
  const [pLGToolList, setPLGToolList] = useState([]);
  const [enableCreate, setEnableCreate] = useState(true);
  const [showRemoveFieldMsg, setShowRemoveFieldMsg] = useState(false);
  const [showApiLoading, setShowApiLoading] = useState(false);
  const [getIndustryId, setGetIndustryId] = useState([]);
  const [addedCompanyValues, setAddedCompanyValues] = useState();

  //____________________________________________________create order states ended _______________________________________________ //

  const getToolsByPackageName = (data, packageName) => {
    return data?.find((item) => item.package_name === packageName)?.tools || [];
  };

  useEffect(() => {
    const fetchDataIfNeeded = async () => {
      if (!packageDetails?.loading && packageDetails?.data?.length === 0) {
        await getPackageDetails();
      } else if (packageDetails?.data?.length > 0) {
        const data = getToolsByPackageName(packageDetails.data, "PLG");
        setPlgToolsId(data);
      }
    };
    fetchDataIfNeeded();
  }, [selectedTypesId]);

  useEffect(() => {
    if (toolsList?.data?.length > 0) {
      const setData = toolsList?.data?.filter((tool) =>
        plgToolsId.includes(tool.toolId),
      );
      setPLGToolList(setData);
    }
  }, [plgToolsId, toolsList]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(event.target)
      ) {
        setIsDropdownVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  //  render custom select for   Order Type
  const customDropdownRenderer = ({ props, state, methods }) => {
    const regexp = new RegExp(state.search, "i");
    const selectedIds = state.values.map((v) => v.code);

    const isNewOrPlgSelected =
      selectedIds.includes("NC") || selectedIds.includes("PLG");
    const isUpsellSelected = selectedIds.includes("UP");
    const isRedesignSelected = selectedIds.includes("RD");
    const isImprovementSelected = selectedIds.includes("IMP");
    const filteredOptions = props.options.filter((item) =>
      regexp.test(item.name.toLowerCase()),
    );

    return (
      <div className="dropdownList-main">
        <div className="dropdownLists">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = selectedIds.includes(option.code);
              // === RULE LOGIC ===
              let isDisabled = false;
              // Rule 1: If New Order or PLG Order is selected
              if (isNewOrPlgSelected) {
                // Only allow selecting 1 or 4 (but not both)
                isDisabled =
                  !isSelected && option.code !== "NC" && option.code !== "PLG";
                // Prevent selecting both
                if (selectedIds.includes("NC") && option.code === "PLG")
                  isDisabled = true;
                if (selectedIds.includes("PLG") && option.code === "NC")
                  isDisabled = true;
              }
              // Rule 2: If Upsell or Redesign is selected
              else if (
                isUpsellSelected ||
                isRedesignSelected ||
                isImprovementSelected
              ) {
                isDisabled =
                  !["UP", "RD", "IMP"].includes(option.code) && !isSelected;
              }

              return (
                <div
                  key={option.code}
                  className={`dropdownLists-label ${isDisabled ? "disabled" : ""
                    }`}
                  tabIndex={-1}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    methods?.addItem(option);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="custom-checkbox"
                  />
                  <label
                    className={`${isSelected ? "selected-option-name" : "option-name"
                      }`}
                  >
                    {option.name}
                  </label>
                </div>
              );
            })
          ) : (
            <p className="error-show">No matching order type found.</p>
          )}
        </div>
      </div>
    );
  };

  //updates for category
  useEffect(() => {
    const isUpsellSelected = selectedTypesId.includes("UP");
    const isReDesignSelected = selectedTypesId.includes("RD");

    if (!isUpsellSelected) {
      setUpSellCategory([]);
      upSellRef.current = []; // also clear backup
    } else if (upSellCategory.length === 0 && upSellRef.current.length > 0) {
      setUpSellCategory(upSellRef.current); // restore if accidentally reset
    }

    if (!isReDesignSelected) {
      setReDesignCategory([]);
      reDesignRef.current = [];
    } else if (
      reDesignCategory.length === 0 &&
      reDesignRef.current.length > 0
    ) {
      setReDesignCategory(reDesignRef.current);
    }
    setCompanyName("");
    setSuggestedValues([]);
  }, [selectedTypesId]);
  // handle checkbox for Order Selection Category
  const handleCategory = (e, category, orderId) => {
    const isChecked = e.target.checked;

    const categoryMap = {
      NC: {
        state: selectedCategory,
        setState: setSelectedCategory,
      },
      UP: {
        state: upSellCategory,
        setState: setUpSellCategory,
        ref: upSellRef,
      },
      RD: {
        state: reDesignCategory,
        setState: setReDesignCategory,
        ref: reDesignRef,
      },
    };
    const config = categoryMap[orderId];
    if (!config) return;
    const { state, setState, ref } = config;
    const updated = isChecked
      ? [...state, category.code].filter((v, i, a) => a.indexOf(v) === i)
      : state.filter((id) => id !== category.code);
    setState(updated);
    if (ref) ref.current = updated; // keep the latest snapshot
  };

  const handleCompanySearch = (e, type) => {
    const query = e.target.value;
    setCompanyName(query);
    if (query.trim().length === 0) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!query) {
      setSuggestedValues([]);
      setIsDropdownVisible(false);
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setShowLoading(true);
      currentQueryRef.current = query;

      const apiData = { type, search: encodeURIComponent(query.trim()) };

      getCustomerSearch(apiData)
        .then((res) => {
          setShowLoading(false);
          if (currentQueryRef.current === query.trim() && res?.data) {
            setSuggestedValues([...res.data]); // ensure new reference
            setIsDropdownVisible(true);
            setCompanyNotFound(res.data.length === 0);
          }
        })
        .catch((error) => {
          setShowLoading(false);
          console.error("Error fetching customer data:", error);
        });
    }, 300);
  };

  //handle clear company name
  const clearCompanyName = () => {
    setCompanyName("");
    setSuggestedValues([]);
    setIsDropdownVisible(false);
    setSelectedMarket([]);
    setAddedCompanyValues();
  };

  //update selected order types
  const handleSelectedOrders = (orders) => {
    setSelectedOrders(orders);
    if (orders.length > 0) {
      const selectedIds = orders.map((v) => v.code);
      setSelectedTypesId(selectedIds);
      setCompanyNotFound(false);
      setSelectedCategory([]);
      setUpSellCategory([]);
      setReDesignCategory([]);
    } else {
      setSelectedTypesId([]);
      setCompanyName("");
      setSelectedMarket([]);
    }
  };

  useEffect(() => {
    if (!showDrawer) {
      setIsDropdownVisible(false);
      setCompanyName("");
      setCompanyId(0);
      removeField();
      setShowApiLoading(false);
    }
  }, [showDrawer]);

  // form data fields reset func
  const resetOrderForm = () => {
    if (
      companyName.trim().length === 0 &&
      selectedOrders.length === 0 &&
      ((selectedTypesId?.includes("NC") && selectedCategory.length === 0) ||
        (selectedTypesId?.includes("UP") && upSellCategory?.length === 0) ||
        (selectedTypesId?.includes("RD") && reDesignCategory?.length === 0) ||
        selectedMarket?.length === 0)
    ) {
      setShowRemoveFieldMsg(false);
      setShowDrawer(false);
    } else {
      setShowRemoveFieldMsg(true);
    }
  };

  // Order creation  and form validation
  const createOrder = () => {
    const formData = {
      orderType: orderType?.data
        .filter((order) =>
          selectedOrders?.some((selected) => selected.code === order.code),
        )
        .map((order) => order?.status_id),
      orderCategory:
        selectedOrders[0].code === "PLG"
          ? [orderCategory?.data[0]?.status_id]
          : orderCategory?.data
            .filter((order) => selectedCategory.includes(order.code))
            .map((order) => order?.status_id),
      upSellCategory: orderCategory?.data
        .filter((order) => upSellCategory.includes(order.code))
        .map((order) => order.status_id),
      reDesignCategory: orderCategory?.data
        .filter((order) => reDesignCategory.includes(order.code))
        .map((order) => order.status_id),
      companyId: companyId,
      companyName: companyName,
      companyCode: customerCode || "",
      industrySector: getIndustryId,
      isNewCustomer: isNewCustomer,
      isIPO: false,
      primaryMarket: selectedMarket?.map((market) => market.marketid),
      primaryMarketName: selectedMarket?.map((market) => market)[0].marketname,
      flag: "insert",
      isin: addedCompanyValues?.isin,
      symbol: addedCompanyValues?.symbol,
      market_id: [
        addedCompanyValues?.market_id?.length > 0
          ? addedCompanyValues?.market_id
          : "",
      ],
    };
    setShowApiLoading(true);
    try {
      const response = createPLGTicket(formData);
      response.then((res) => {
        if (res?.status) {
          if (res.data.status) {
            showToast({
              message: res?.data?.message,
              variant: "success",
            });
            setShowDrawer(false);
            // const updatedFilters = {
            //   ...filterState.filterValues,
            //   sortBy: "orderDate",
            //   sortOrder: "desc",
            //   pageOffSet: 0, // reset to first page on sort change
            // };
            dispatch({
              type: "SET_FILTER",
              payload: filterState.clearFilterValues,
            });
            orderCreated(true);
          } else {
            setShowApiLoading(false);
            showToast({
              message: res?.data?.message,
              variant:
                res.data.message ==
                  "This order type is not supported for this company."
                  ? "warning"
                  : "danger",
            });
          }
        } else {
          setShowApiLoading(false);
          setShowDrawer(false);
          showToast({
            message: res?.payload?.message,
            variant: "success",
          });
        }
      });
    } catch (error) {
      setShowApiLoading(false);
      setShowDrawer(false);
      // Handle errors
      showToast({
        message: error,
        variant: "danger",
      });
    }
  };

  useEffect(() => {
    if (
      companyName?.trim().length === 0 ||
      selectedOrders.length === 0 ||
      (selectedTypesId?.includes("NC") && selectedCategory.length === 0) ||
      (selectedTypesId?.includes("UP") && upSellCategory?.length === 0) ||
      (selectedTypesId?.includes("RD") && reDesignCategory?.length === 0) ||
      selectedMarket?.length === 0
    ) {
      setEnableCreate(true);
    } else {
      setEnableCreate(false);
    }
  }, [
    companyName,
    selectedOrders,
    selectedTypesId,
    selectedCategory,
    upSellCategory,
    selectedMarket,
    reDesignCategory,
  ]);
  // handle new company add
  const handleNewCompanyAdd = () => {
    setCompanyName(companyName);
    setIsNewCustomer(true);
    setCompanyId(0);
    setIsDropdownVisible(false);
    setSelectedMarket([]);
    setAddedCompanyValues();
  };
  // handle new company add
  // const handleCancelNewCompanyAdd = () => {
  //   setCompanyName("");
  //   setIsDropdownVisible(false);
  // };
  // get primary market lists
  useEffect(() => {
    if (!marketRegionList?.loading && marketRegionList?.data?.length == 0) {
      getMarketRegionList();
    } else return;
  }, []);

  const applyCompanySearchInfo = (info) => {
    setCompanyId(info?.customer_id);
    setCompanyName(info?.customer_name);
    setCustomerCode(info?.company_code);
    setIsDropdownVisible(false);
    setGetIndustryId([info?.industry_id]);
    const marketData = info?.market_id
      ? marketRegionList?.data?.filter(
        (item) => item?.marketid === Number(info?.market_id),
      )
      : [];
    setSelectedMarket(marketData);
    const updateCompanyValue = {
      symbol: info?.symbol,
      isin: info?.isin,
      market_id: marketData.length > 0 ? Number(info?.market_id) : null,
    };
    setAddedCompanyValues(updateCompanyValue);
  };

  const closeModal = () => {
    setShowRemoveFieldMsg(false);
  };

  const removeField = () => {
    setSelectedOrders([]);
    setSelectedTypesId([]);
    setSelectedCategory([]);
    setCompanyName("");
    setIsDropdownVisible(false);
    setIsNewCustomer(false);
    setShowDrawer(false);
    setCompanyId(0);
    setSelectedMarket([]);
    setShowRemoveFieldMsg(false);
    setAddedCompanyValues();
  };
  // header Container and greetings

  return (
    <div className="d-flex flex-row flex-wrap align-items-center justify-content-between p-4 orderOrionDashboard bg-gray">
      {/* create order modal  */}
      <SideDrawer
        show={showDrawer}
        onHide={() => resetOrderForm()}
        title="Create Order"
      >
        <div className="w-100 orderSection">
          <Row className="m-0">
            <Col className="p-0">
              <h5>
                {t("order_orion_v2.select_your_order_type")} <MandatoryText />
              </h5>
              <p className="CustomText">
                {t("order_orion_v2.start_creating_your_order_by_selecting")}
              </p>
            </Col>

            {/* Select Order Type */}
            <Col xs={12} className="mt-2 p-0">
              <Select
                multi
                options={orderType?.data}
                labelField="name"
                valueField="code"
                searchable={false}
                searchBy="name"
                placeholder="Select Order Type"
                className="custom-dropdownRenderer order-creation"
                dropdownRenderer={customDropdownRenderer}
                dropdownPosition="bottom"
                keepSelectedInList
                values={selectedOrders}
                onChange={(e) => handleSelectedOrders(e)}
              />
            </Col>

            {/* select category  */}
            <section className="mt-2 p-0">
              <RenderCategory
                selectedOrders={selectedOrders}
                selectedCategory={selectedCategory}
                orderCategory={orderCategory}
                selectedTypesId={selectedTypesId}
                upSellCategory={upSellCategory}
                reDesignCategory={reDesignCategory}
                handleCategory={handleCategory}
              />
              {selectedTypesId?.includes("PLG") && (
                <Row className="mt-3 ">
                  <Col xs={12}>
                    <h5>
                      {t("order_orion_v2.category")} <MandatoryText />{" "}
                    </h5>
                    <p className="plg_category_text">
                      {t("order_orion_v2.tools_list")} :
                    </p>
                  </Col>
                  <Col
                    xs={12}
                    className="d-flex flex-wrap align-items-center gap-2"
                  >
                    {pLGToolList?.map((tool, i) => (
                      <div
                        key={i}
                        className="w-auto border rounded py-1 px-2 plg_order_tool_list"
                      >
                        <label>{tool?.toolName}</label>
                      </div>
                    ))}
                  </Col>
                </Row>
              )}
              <hr className="mb-0 mt-4" />
            </section>
            <Row className="mt-4 d-flex flex-column p-0 m-0">
              {/* search Company */}
              <Col className="p-0">
                <p className="CustomText w-75">
                  {t(
                    "order_orion_v2.start_creating_your_order_by_searching_the_company",
                  )}{" "}
                  <MandatoryText />
                </p>
              </Col>
              <Col className="p-0">
                <div
                  className="d-flex input-field position-relative"
                  ref={suggestionRef}
                >
                  <input
                    id="companyName"
                    className="input-type"
                    placeholder="Search by Company Name"
                    value={companyName}
                    onChange={(e) => handleCompanySearch(e, "name")}
                    disabled={selectedTypesId.length === 0}
                  />
                  {showLoading ? (
                    <span className="search-loading"></span>
                  ) : (
                    <div>
                      {companyName || suggestedValues?.length > 0 ? (
                        <div
                          className="icon-close-icon close_icon btn btn-0 border-0 m-0 p-0"
                          onClick={() => clearCompanyName()}
                        ></div>
                      ) : (
                        ""
                      )}

                      <img
                        className="search-icon"
                        src={searchIcon}
                        alt="searchIcon"
                      />
                    </div>
                  )}
                  {/* Dropdown suggestions */}
                  {isDropdownVisible && suggestedValues?.length > 0 && (
                    <div className="suggestion-container">
                      <div className="suggestion-list">
                        {suggestedValues?.map((suggestion) => {
                          return (
                            <li
                              key={`${suggestion.customer_id}-${suggestion.customer_name}`}
                              onClick={() => {
                                applyCompanySearchInfo(suggestion);
                              }}
                            >
                              {suggestion.customer_name}
                            </li>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {isDropdownVisible && companyNotFound && (
                    <div className="suggestion-container p-2">
                      <div className="suggestion-list w-100 py-2">
                        <div className="company-not-found d-flex flex-row gap-2 align-items-center">
                          <img className="" src={searchIcon} alt="searchIcon" />
                          <p className="m-0 text-left">
                            {t(
                              "order_orion_v2.no_results_found_for_your_search",
                            )}
                          </p>
                        </div>
                        {(selectedTypesId?.includes("NC") ||
                          selectedTypesId?.includes("UP") ||
                          selectedTypesId?.includes("PLG")) && (
                            <div className="w-100 create_company_container">
                              <button
                                className="cursor-pointer  mt-2 btn btn-0  m-0 p-0"
                                onClick={() => handleNewCompanyAdd()}
                              >
                                <span>+ </span>{" "}
                                {t("order_orion_v2.click_to_add_this_company")}
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </Col>

              {/* select market */}
              <Col className="mt-3 p-0">
                <SelectDropDown
                  multi={false}
                  options={marketRegionList?.data}
                  labelField={"marketname"}
                  valueField={"marketid"}
                  values={selectedMarket}
                  searchable={true}
                  placeholder={"Select Primary Market"}
                  className="primaryMarket-dropdownRenderer"
                  disabled={
                    marketRegionList?.data?.length === 0
                      ? true
                      : false ||
                      (addedCompanyValues?.market_id &&
                        selectedMarket?.length > 0)
                  }
                  onChange={setSelectedMarket}
                  dropdownPosition="auto"
                />
              </Col>

              <hr className="mb-0 mt-4" />
            </Row>
            {/* footer buttons  */}
            <Col className="mt-4 d-flex flex-row justify-content-end gap-3 p-0">
              <button
                className="btn inActiveButton px-3 "
                onClick={() => resetOrderForm()}
              >
                Cancel
              </button>

              <button
                className={`activeButton btn px-4 `}
                onClick={() => createOrder()}
                disabled={enableCreate}
              >
                {`Creat${showApiLoading ? "ing  " : "e"}`}
                {showApiLoading && (
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                )}
              </button>
            </Col>
          </Row>
        </div>
      </SideDrawer>
      {showRemoveFieldMsg && (
        <PopupModal
          show={showRemoveFieldMsg}
          onClose={closeModal}
          className={"popupModal bg-white rounded-4"}
          width={"40vh"}
        >
          <div>
            <h5 className="text-center">Do you want to Cancel this Order?</h5>
            <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
              <button
                className="btn btn-0 modalDelete_btn px-3"
                onClick={removeField}
              >
                Yes
              </button>
              <button
                className="btn btn-0 modalCancel_btn px-3"
                onClick={closeModal}
              >
                No
              </button>
            </div>
          </div>
        </PopupModal>
      )}
    </div>
  );
};

export default OrderOrionCreation;

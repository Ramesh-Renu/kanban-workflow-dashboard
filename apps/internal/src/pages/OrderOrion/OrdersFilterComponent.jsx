import React, { useEffect, useMemo, useRef, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { SelectDropDown } from "@orion/shared";
import NestedDropdown from "../../components/common/NestedDropdown";
import variables from "@orion/shared/src/styles/variables-style.json";
import { t } from "i18next";
import dayjs from "dayjs";
import { searchIcon } from "../../assets/images/index";
import { useGlobalContext } from "store/context/GlobalProvider";
import { initialFilterState } from "store/reducers/filterValuesReducer";
import useAuth from "../../hooks/useAuth";
import SVGImage from "./SVGImage";

const OrdersFilterComponent = ({
  allUser,
  filterFrom,
  filterConfig,
  ticketsCount,
  getSelectedFilters,
  initialSelectedFilter,
  apiLoading,
}) => {
  /** VARIABLE DECLARATIONS */
  const [{ data: auth }] = useAuth();
  const [getSearchValue, setSearchValue] = useState("");
  const debounceTimeoutRef = useRef(null);
  const [getImageleft, setImageleft] = useState(30);
  const [getImageHeight, setImageHeight] = useState(20);
  const { orderListState } = useGlobalContext();
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCalendarFor, setShowCalendarFor] = useState(null);
  const [lastConfirmedDateRange, setLastConfirmedDateRange] = useState(null);
  const [valueOrderDateRange, setValueOrderDateRange] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState(
    initialSelectedFilter || []
  );
  const [datePlaceholder, setDatePlaceholder] = useState(null);
  const commonPlaceIconsStyle = {
    width: "24px",
    height: "24px",
    left: "4px",
    top: "4px",
  };

  const { restrictions } = auth;
  const [filterSelection, setFilterSelection] = useState([]);

  useEffect(() => {
    setSelectedFilters(initialSelectedFilter);
    setSearchValue(initialSelectedFilter?.searchTxt || "");
    setSelectedDate(initialSelectedFilter.selectedDate);
    if (initialSelectedFilter?.selectedDate) {
      const setPlaceholder =
        initialSelectedFilter?.selectedDate == null &&
          initialSelectedFilter.orderDateRange?.length > 0
          ? "Order Date"
          : initialSelectedFilter.dueDateRange?.length > 0
            ? "Delivery Date"
            : "Select Date";
      const setPlaceholderCustom =
        initialSelectedFilter?.selectedDate !== null &&
          Object.keys(initialSelectedFilter?.selectedDate).length > 0 &&
          initialSelectedFilter.orderDateRange?.length > 0
          ? "Custom Order Date"
          : initialSelectedFilter.dueDateRange?.length > 0
            ? "Custom Delivery Date"
            : "Select Date";
      let setValueRange = null;
      if (initialSelectedFilter?.dueDateRange?.length > 0) {
        const selected = initialSelectedFilter.dueDateRange[0];
        setValueRange = ["dueDateRange", selected.id];
      } else if (initialSelectedFilter?.orderDateRange?.length > 0) {
        const selected = initialSelectedFilter.orderDateRange[0];
        setValueRange = ["orderDateRange", selected.id];
      }
      setValueOrderDateRange(setValueRange);
      setDatePlaceholder(
        initialSelectedFilter.selectedDate == null
          ? setPlaceholder
          : setPlaceholderCustom
      );
    }
  }, [initialSelectedFilter]);

  useEffect(() => {
    const value = filterConfig?.map((config) => ({
      multi: config?.multi || true,
      searchable: true,
      disabled: config.disabled ?? false,
      onChange: (val) => handleChangeFilterBy(config.key, val),
      values:
        selectedFilters?.length === 0
          ? initialSelectedFilter?.[config.key]
          : selectedFilters?.[config.key], // dynamic binding from state
      ...config, // spread common fields like options, labelField, valueField, etc.
    }));
    setFilterSelection(value);
  }, [filterConfig]);

  /** SET IMAGE POSITION */
  useEffect(() => {
    const getWith = 450 / 15;
    setImageleft(getWith);
    setImageHeight(30);
  }, []);

  /** CLEAR ALL FILTERS */
  const clearAllFilters = () => {
    setSearchValue("");
    setSelectedFilters({
      allUser: allUser,
      searchTxt: "",
      orderStatus: [],
      orderLabels: [],
      orderCategory: [],
      orderType: [],
      assignee: [],
      orderDateRange: [],
      selectedDate: null,
    });
    setSelectedDate(null);
    setValueOrderDateRange([]);
    setDatePlaceholder(null);
    let restoredFilters = initialFilterState.filterValues;
    getSelectedFilters({ ...restoredFilters, allUser: allUser });
  };

  /** SET FILTER VALUE */
  const handleChangeFilterBy = (key, selectedItems) => {
    const updatedFilters = {
      ...selectedFilters,
      [key]: selectedItems,
    };
    setSelectedFilters(updatedFilters);
    getSelectedFilters(updatedFilters);
  };
  /** HANDLE CHANGED VALUE FOR NESTED DROPDOWN */
  const handleChangedValue = (parent, children) => {
    // ✅ Case 1: both parent and children are selected
    if (
      parent &&
      Object.keys(parent).length > 0 &&
      children &&
      Object.keys(children).length > 0
    ) {
      setValueOrderDateRange([parent.id, children.id]);

      if (!children?.customEntry) {
        // Normal preset date range
        setDatePlaceholder(parent.name);

        const updatedFilters = {
          ...selectedFilters,
          [parent.id]: [children],
        };

        setSelectedFilters(updatedFilters);
        getSelectedFilters(updatedFilters); // ensure backend gets the same updated data

        setLastConfirmedDateRange([parent.id, children.id]);
        setShowCalendarFor(null);
      } else {
        // Custom date range selected — open calendar
        setShowCalendarFor(parent.id);
      }
    }
    // ✅ Case 2: either parent or children is cleared (reset state)
    else {
      const updatedFilters = {
        ...selectedFilters,
        orderDateRange: [],
        dueDateRange: [],
        selectedDate: null,
      };
      const checkAPICall =
        selectedFilters?.dueDateRange?.length > 0 ||
        selectedFilters.orderDateRange.length > 0;
      setSelectedFilters(updatedFilters);
      if (checkAPICall) {
        getSelectedFilters(updatedFilters);
      }
      setSelectedDate(null);
      setValueOrderDateRange([]);
      setDatePlaceholder(null);
      setLastConfirmedDateRange(null);
      setShowCalendarFor(null);
    }
  };

  /** HANDLE SELECTED DATE */
  const handleSelectedDate = (data, parent, children) => {
    // Update the selected date
    const formatDate = {
      from: data?.startDate,
      to: data?.endDate,
    };
    setSelectedDate(formatDate);
    // Prepare updated filters
    const updatedFilters = {
      ...selectedFilters,
      [parent.id]: [children],
      selectedDate: formatDate,
    };
    // Apply filters to state and trigger any API logic
    setSelectedFilters(updatedFilters);
    getSelectedFilters(updatedFilters);
    // Update UI helpers
    setDatePlaceholder(`Custom ${parent.name}`);
    setLastConfirmedDateRange([parent.id, children.id]);
  };
  /** HANDLE REMOVE FILTER */
  const handleRemoveFilter = (key, itemToRemove) => {
    // Compute the new filter state first
    const updatedFilters = {
      ...selectedFilters,
      [key]: selectedFilters[key]?.filter((item) => {
        const identifier = item.id ?? item.code ?? item.regId ?? item.labelId;
        const removeIdentifier =
          itemToRemove.id ??
          itemToRemove.code ??
          itemToRemove.regId ??
          itemToRemove.labelId;
        return identifier !== removeIdentifier;
      }),
      ...(itemToRemove.id === "customDateRange" ? { selectedDate: {} } : {}),
    };
    // Update the React state and call your filter logic
    setSelectedFilters(updatedFilters);
    getSelectedFilters(updatedFilters);

    // Reset UI states if needed
    setValueOrderDateRange([]);
    setDatePlaceholder(null);
  };

  /** APPLY SEARCH FILTER */
  const applySearchFilter = (e) => {
    const value = typeof e === "string" ? e : e.target.value;
    setSearchValue(value);

    if (
      (e.type === "click" || e.key === "Enter" || typeof e === "string") &&
      value.trim()?.length > 0
    ) {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

      debounceTimeoutRef.current = setTimeout(() => {
        setSelectedFilters((prev) => {
          const updatedFilters = {
            ...prev,
            searchTxt: value.trim(),
          };
          // ✅ Trigger your parent callback or API update
          getSelectedFilters(updatedFilters);

          return updatedFilters;
        });
      }, 300);
    }
  };

  /** APPLY SEARCH FILTER */
  const cleraSearchFilter = (e) => {
    setSearchValue("");
    setSelectedFilters((prev) => {
      const updatedFilters = {
        ...prev,
        searchTxt: "",
      };
      // ✅ Trigger your parent callback or API update
      getSelectedFilters(updatedFilters);

      return updatedFilters;
    });
  };

  /** RENDER PLACEHOLDER ONLY */
  const renderPlaceholderOnly = ({ props }) => (
    <div className="custom-placeholder_filter mx-2">{props.placeholder}</div>
  );

  /** CHECK IF CLEAR BUTTON IS ENABLED AND CHECK THE FILTER COUNT  */
  const isClearEnabled = useMemo(() => {
    const { allUser, sortBy, sortOrder, pageOffSet, pageSize, ...rest } =
      selectedFilters;
    return Object?.values(rest)?.some((val) => {
      return (
        (Array.isArray(val) && val.length > 0) ||
        (typeof val === "string" && val.trim().length > 0)
      );
    });
  }, [selectedFilters]);

  return (
    <div className="filtersComponent w-100">
      <div className="filtersComponent-flex mb-2">
        <div className="search-ticket w-100 p-0 m-0 d-flex input-field position-relative">
          <input
            className="search-input"
            placeholder="Search Order by Company Name"
            type="text"
            value={getSearchValue || ""}
            onChange={(e) => applySearchFilter(e)}
            onKeyDown={(e) => applySearchFilter(e)}
            disabled={apiLoading}
          />
          {getSearchValue?.length > 0 && (
            <div
              className="icon-close-icon close_icon btn btn-0 border-0 m-0 p-0"
              onClick={(e) => cleraSearchFilter(e)}
            ></div>
          )}
          <img
            className="search-icon"
            src={searchIcon}
            alt="searchIcon"
            onClick={() => applySearchFilter(getSearchValue)}
          />
        </div>

        {filterSelection?.map((data, i) => (
          <div key={i} className="position-relative m-0 p-0 customDropDown">
            <SVGImage
              color={data.iconColor || "#000000"}
              style={{
                position: "absolute",
                left: -(getImageleft * data.iconPlacement + 10) + "px",
                height: getImageHeight,
                top: "0px",
              }}
              commonPlaceIconsStyle={commonPlaceIconsStyle}
              isTransparent={true}
              bgColor={"transparent"}
            // bgColor={data.disabled ? "#e9ecef" : "#FFFFFF"}
            />
            {data.type === "simple" && (
              <SelectDropDown
                multi={data.multi}
                options={data.options}
                labelField={data.labelField}
                valueField={data.valueField}
                values={Array.isArray(data.values) ? data.values : []} // ✅ Fix here
                searchable={data.searchable}
                onChange={data.onChange}
                placeholder={data.placeholder}
                className="filter-select-dropDown"
                disabled={data.disabled || apiLoading}
                optionType="checkbox"
                dropdownPosition="bottom"
                contentRenderer={renderPlaceholderOnly}
              />
            )}
            {data.type === "nested" && (
              <NestedDropdown
                data={data.options}
                defaultValue={valueOrderDateRange}
                onChange={handleChangedValue}
                getShowValue={""}
                placeHolder={datePlaceholder || "Select Date"}
                styles={{ paddingLeft: "30px" }}
                iconType={"radioChecked"}
                showCalendarFor={showCalendarFor}
                setShowCalendarFor={setShowCalendarFor}
                setSelectedDate={handleSelectedDate}
                selectedDate={selectedDate}
                disabled={data.disabled || apiLoading}
                lastConfirmedDateRange={lastConfirmedDateRange}
                setValueOrderDateRange={setValueOrderDateRange}
                customIcon={
                  <SVGImage
                    color={variables.common["--color-icon-purple"]}
                    style={{
                      position: "absolute",
                      left: -(getImageleft * data.iconPlacement + 10) + "px",
                      height: getImageHeight,
                    }}
                    commonPlaceIconsStyle={{
                      ...commonPlaceIconsStyle,
                      left: "auto",
                      right: "12px",
                      top: "-5px",
                    }}
                    isTransparent={true}
                    bgColor="transparent"
                  />
                }
              />
            )}
          </div>
        ))}
      </div>
      <div className="d-flex flex-row flex-wrap justify-content-center p-0 align-items-end">
        <Col lg={9} md={12} className="d-flex gap-2 p-0 m-0 filterTags">
          {Object.entries(selectedFilters).map(([key, items]) => {
            if (!Array.isArray(items)) return null;
            return items?.map((item, index) => {
              if (item.id === "customDateRange") {
                return (
                  <div
                    key={`${key}-${index}`}
                    className="selectedFilter-tag position-relative"
                  >
                    {selectedDate?.from && selectedDate?.to && (
                      <span>
                        {`${dayjs(selectedDate.from).format(
                          "MMM DD, YYYY"
                        )} - ${dayjs(selectedDate.to).format("MMM DD, YYYY")}`}
                      </span>
                    )}
                    <button
                      className="btn btn-0 border-0"
                      onClick={() => handleRemoveFilter(key, item)}
                    >
                      <SVGImage
                        color={variables.common["--color-primary"]}
                        style={{
                          position: "absolute",
                          left: `-${getImageleft * 15 + 8}px`,
                          height: "25px",
                          backgroundColor:
                            variables.common["--color-btn-filter-gray"],
                        }}
                        commonPlaceIconsStyle={{
                          ...commonPlaceIconsStyle,
                          left: null,
                          width: "22px",
                          height: "23px",
                          right: "2px",
                          top: "2px",
                          borderRadius: "50%",
                        }}
                        isTransparent={true}
                        bgColor="transparent"
                      />
                    </button>
                  </div>
                );
              } else {
                return (
                  <div
                    key={`${key}-${index}`}
                    className="selectedFilter-tag position-relative"
                  >
                    <span>{item.name || item.displayName}</span>
                    <button
                      className="btn btn-0 border-0"
                      onClick={() => handleRemoveFilter(key, item)}
                    >
                      <SVGImage
                        color={variables.common["--color-primary"]}
                        style={{
                          position: "absolute",
                          left: `-${getImageleft * 15 + 8}px`,
                          height: "25px",
                          backgroundColor:
                            variables.common["--color-btn-filter-gray"],
                        }}
                        commonPlaceIconsStyle={{
                          ...commonPlaceIconsStyle,
                          left: null,
                          width: "22px",
                          height: "23px",
                          right: "2px",
                          top: "2px",
                          borderRadius: "50%",
                        }}
                        isTransparent={true}
                        bgColor="transparent"
                      />
                    </button>
                  </div>
                );
              }
            });
          })}
        </Col>
        {isClearEnabled && (
          <Col
            lg={3}
            md={12}
            className="p-0  d-flex flex-column align-items-end justify-content-end"
          >
            <button
              className="btn btn-0 border-0 clearFilters-btn mx-3"
              onClick={clearAllFilters}
              disabled={!isClearEnabled || apiLoading}
            >
              Clear Filters
              <SVGImage
                color={variables.common["--color-primary"]}
                style={{
                  position: "absolute",
                  left: -(getImageleft * 19 + 10) + "px",
                  height: getImageHeight,
                }}
                commonPlaceIconsStyle={{
                  ...commonPlaceIconsStyle,
                  left: null,
                  right: "-15px",
                  top: "1px",
                }}
                isTransparent={true}
                bgColor="transparent"
              />
            </button>
            <p className="results_text m-0 p-0 text-end">
              {t("order_orion_v2.showing_result_data")}
              <span>{ticketsCount}</span>
              {t("order_orion_v2.entries_found")}
            </p>
          </Col>
        )}
      </div>
    </div>
  );
};

export default OrdersFilterComponent;

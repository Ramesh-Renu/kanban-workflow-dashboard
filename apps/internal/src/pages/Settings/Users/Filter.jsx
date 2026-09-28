import { searchIcon } from "../../../assets/images";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Col, Row } from "react-bootstrap";
import variables from "@orion/shared/src/styles/variables-style.json";
import { SelectDropDown } from "@orion/shared";
import SettingsSvg from "../SettingsSvg";
import { t } from "i18next";
import { useGlobalMaster } from "@orion/shared";
import SVGImage from '../../OrderOrion/SVGImage';

const WorkSpaceFilter = ({
  selectedFilters,
  setSelectedFilters,
  filtersReset,
  setFiltersReset,
  userList,
  masterApiData,
  setPageOffset,
  setHasMoreRecords,
}) => {
  const debounceTimeoutRef = useRef(null);
  const {
    countryList,
    getCountryList,
    allTeamList,
    getAllTeamList,
    allWorkspaceList,
    getAllWorkSpaceList,
    boardList,
    getBoardList,
  } = useGlobalMaster();
  const [getSearchValue, setSearchValue] = useState("");
  const [getImageleft, setImageleft] = useState(30);
  const [getImageHeight, setImageHeight] = useState(20);
  const [boardData, setBoardData] = useState([]);

  useEffect(() => {
    if (!countryList?.loading && countryList?.data?.length === 0) {
      getCountryList();
    }
    if (!allTeamList?.loading && allTeamList?.data?.length === 0) {
      getAllTeamList();
    }
    if (!allWorkspaceList?.loading && allWorkspaceList?.data?.length === 0) {
      getAllWorkSpaceList();
    }
    if (!boardList?.loading && boardList?.data?.length === 0) {
      getBoardList();
    }
  }, []);

  /** RESET FILTERS */
  useEffect(() => {
    if (filtersReset) {
      clearAllFilters();
      setFiltersReset(false);
    }
  }, [filtersReset]);

  useEffect(() => {
    if (selectedFilters?.workspace?.length > 0) {
      const boardArr = [];
      selectedFilters.workspace.forEach((item) => {
        boardArr.push(...item.board_ids);
      });
      let filteredBoardData = masterApiData?.board.filter((item) =>
        boardArr.includes(item.boardID)
      );
      setBoardData(filteredBoardData);
    } else {
      setBoardData([]);
    }
  }, [selectedFilters]);

  const FilterSelection = [
    {
      multi: true,
      options: masterApiData?.team,
      labelField: "name",
      valueField: "team_id",
      values: selectedFilters?.team, // <- bind to state
      searchable: true,
      onChange: (val) => handleChangeFilterBy("team", val),
      placeholder: "Team",
      disabled: false,
      iconPlacement: 4,
      type: "simple",
      key: "team",
    },
    {
      multi: true,
      labelField: "country_name",
      valueField: "country_id",
      options: masterApiData?.country,
      values: selectedFilters?.country, // <- bind to state
      searchable: true,
      onChange: (val) => handleChangeFilterBy("country", val),
      placeholder: "Country",
      disabled: false,
      iconPlacement: 7,
      type: "simple",
      key: "country",
    },
    {
      multi: true,
      options: masterApiData?.workspace,
      labelField: "name",
      valueField: "work_space_id",
      values: selectedFilters?.workspace, // <- bind to state
      searchable: true,
      onChange: (val) => handleChangeFilterBy("workspace", val),
      placeholder: "Workspace",
      disabled: masterApiData?.workspace?.length === 0,
      iconPlacement: 8,
      type: "simple",
      key: "workspace",
    },
    {
      multi: true,
      options: boardData,
      labelField: "name",
      valueField: "boardID",
      values: selectedFilters.board, // <- bind to state
      searchable: true,
      onChange: (val) => handleChangeFilterBy("board", val),
      placeholder: "Board",
      disabled: selectedFilters?.workspace?.length === 0,
      iconPlacement: 9,
      type: "simple",
      key: "board",
    },
  ];

  const commonPlaceIconsStyle = {
    width: "24px",
    height: "24px",
    left: "4px",
    top: "4px",
  };

  /** SET IMAGE POSITION */
  useEffect(() => {
    const getWith = 450 / 15;
    setImageleft(getWith);
    setImageHeight(30);
  }, []);

  /** RENDER PLACEHOLDER ONLY */
  const renderPlaceholderOnly = ({ props }) => (
    <div className="custom-placeholder_filter mx-2">{props.placeholder}</div>
  );

  /** CLEAR ALL FILTERS */
  const clearAllFilters = () => {
    setSearchValue("");
    setSelectedFilters((prev) => ({
      ...prev, // ensures a new object reference
      searchTxt: "",
      team: [],
      country: [],
      workspace: [],
      board: [],
      pageOffset: 0,
    }));
    setPageOffset(0);
    setHasMoreRecords(true); // <--- RESET HERE
    // onFilterChange({});
  };

  const handleChangeFilterBy = (key, selectedItems) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [key]: selectedItems,
      pageOffset: 0,
    }));
    setPageOffset(0);
    setHasMoreRecords(true);
  };

  /** APPLY SEARCH FILTER */
  const applySearchFilter = (e) => {
    const value = typeof e === "string" ? e : e.target.value || getSearchValue;
    setSearchValue(value);
    if (
      (e.type === "click" || e.key === "Enter" || typeof e === "string") &&
      value.trim()?.length > 0
    ) {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      setPageOffset(0);
      setHasMoreRecords(true);
      debounceTimeoutRef.current = setTimeout(() => {
        setSelectedFilters((prev) => ({
          ...prev,
          ["searchTxt"]: value.trim(),
        }));
      }, 300);
    }
  };

  /** CHECK IF CLEAR BUTTON IS ENABLED */
  const isClearEnabled = useMemo(() => {
    const filterObj = (({ searchTxt, team, country, workspace, board }) => ({
      searchTxt,
      team,
      country,
      workspace,
      board,
    }))(selectedFilters);
    return Object.values(filterObj).some((val) => {
      return (
        (Array.isArray(val) && val.length > 0) ||
        (typeof val === "string" && val.trim().length > 0) ||
        null
      );
    });
  }, [selectedFilters]);

  /** HANDLE REMOVE FILTER */
  const handleRemoveFilter = (key, itemToRemove) => {
    let keyField = "";
    if (key === "team") {
      keyField = "team_id";
    } else if (key === "board") {
      keyField = "boardID";
    } else if (key === "country") {
      keyField = "country_id";
    } else if (key === "workspace") {
      keyField = "work_space_id";
    }
    setSelectedFilters((prevFilters) => ({
      ...prevFilters,
      [key]: prevFilters[key].filter(
        (item) => item[keyField] !== itemToRemove[keyField]
      ),
    }));
    // setValueOrderDateRange([]);
    // setDatePlaceholder(null);
  };

  return (
    <div className="filtersComponent">
      <Row className="d-flex row align-items-center w-100 mx-auto gap-2 py-2 ">
        <Col
          lg={4}
          className="search-ticket w-100 p-0 m-0 d-flex input-field position-relative"
        >
          <input
            className="search-input"
            placeholder="Search by Users Name"
            type="text"
            value={getSearchValue || ""}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => applySearchFilter(e)}
          />
          {getSearchValue?.trim().length > 0 && (
            <div
              className="icon-close-icon close_icon btn btn-0 border-0 m-0 p-0"
              onClick={() => {
                applySearchFilter("");
                setSelectedFilters((prev) => ({
                  ...prev,
                  ["searchTxt"]: "",
                }));
              }}
            ></div>
          )}
          <img
            className="search-icon"
            src={searchIcon}
            alt="searchIcon"
            onClick={() => applySearchFilter(getSearchValue)}
          />
        </Col>
        {FilterSelection.map((data, i) => (
          <Col key={i} className="position-relative m-0 p-0 customDropDown">
            <SettingsSvg
              color={"#000000"}
              style={{
                position: "absolute",
                left: -(getImageleft * data.iconPlacement + 10) + "px",
                height: getImageHeight,
                top: "0px",
              }}
              commonPlaceIconsStyle={commonPlaceIconsStyle}
              bgColor={data.disabled ? "#e9ecef" : "#FFFFFF"}
            />
            <SelectDropDown
              multi={data.multi}
              options={data.options}
              labelField={data.labelField}
              valueField={data.valueField}
              values={data?.values}
              searchable={true}
              onChange={data.onChange}
              placeholder={data.placeholder}
              className="filter-select-dropDown"
              disabled={data.disabled}
              optionType="checkbox"
              dropdownPosition="bottom"
              contentRenderer={renderPlaceholderOnly}
              customSearch={true}
            />
          </Col>
        ))}
        {/* {isClearEnabled && (
          <Col className="p-0  d-flex flex-column align-items-end justify-content-end">
          
          </Col>
        )} */}
      </Row>
      <Row className="d-flex flex-row flex-wrap justify-content-between p-0 align-items-center">
        {isClearEnabled && (
          <Col lg={10} md={12} className="d-flex  gap-2  mt-2 filterTags">
            {Object.entries(selectedFilters)?.map(([key, items]) => {
              if (!Array.isArray(items)) return null;
              return items?.map((item, index) => {
                return (
                  <div
                    key={`${key}-${index}`}
                    className="selectedFilter-tag position-relative"
                  >
                    <span>{item.name || item.country_name}</span>
                    <button
                      className="btn btn-0 border-0"
                      onClick={() => handleRemoveFilter(key, item, items)}
                    >
                      <SVGImage
                        color={variables.common["--color-primary"]}
                        style={{
                          position: "absolute",
                          left: `-${getImageleft * 15 + 11}px`,
                          height: "25px",
                          backgroundColor:
                            variables.common["--color-btn-filter-gray"],
                        }}
                        commonPlaceIconsStyle={{
                          ...commonPlaceIconsStyle,
                          left: null,
                          width: "21px",
                          height: "23px",
                          right: "2px",
                          top: "2px",
                          borderRadius: "50%",
                        }}
                        isTransparent={true}
                        bgColor={variables.common["--color-btn-filter-gray"]}
                      />
                    </button>
                  </div>
                );
              });
            })}
          </Col>
        )}
        {isClearEnabled && (
          <Col
            lg={2}
            md={12}
            className="p-0  d-flex flex-column align-items-end justify-content-center"
          >
            {" "}
            <button
              className="btn btn-0 border-0 clearFilters-btn mx-3"
              onClick={clearAllFilters}
              disabled={!isClearEnabled}
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
              />
            </button>
            <div>
              <p className="results_text m-0 p-0 text-end">
                {t("order_orion_v2.showing_result_data")}
                <span>{userList?.totalCount || "0"}</span>
                {t("order_orion_v2.entries_found")}
              </p>
            </div>
          </Col>
        )}
      </Row>
      {!isClearEnabled && (
        <Row className="d-flex flex-row flex-wrap justify-content-end p-0 align-items-center">
          <Col
            lg={12}
            className="d-flex flex-row align-items-end justify-content-end"
          >
            <div>
              <div className=" position-relative">
                <SettingsSvg
                  color={variables.common["--color-primary"]}
                  style={{
                    position: "absolute",
                    left: `-${getImageleft * 4 + 10}px`,
                    height: "25px",
                    backgroundColor:
                      variables.common["--color-btn-filter-gray"],
                  }}
                  commonPlaceIconsStyle={{
                    ...commonPlaceIconsStyle,
                    right: null,
                    width: "20px",
                    height: "25px",
                    left: "-23px",
                    top: "-7px",
                  }}
                  isTransparent={true}
                />
                <div className="results_text m-0 p-0 text-end mt-3 ">
                  Total Workspace user count :
                  <span className="mx-2">{userList?.totalCount || "0"}</span>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default WorkSpaceFilter;

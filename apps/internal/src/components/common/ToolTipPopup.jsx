/** This component created by Ramesh R ***/
import React, { Fragment, useEffect, useMemo, useState, useRef } from "react";
import editIcon from "../../assets/images/edit-board.svg";
import LogoAvatarShowLetter from "./LogoAvatarShowLetter";
import {
  unChecked,
  checkedIcon,
  searchIcon,
  radioChecked,
  checkedBlueIcon,
  unCheckedBlueIcon,
  radioUnChecked,
} from "../../assets/images/index";

const ToolTipPopup = ({
  toolTipDatas,
  isSingleEntry,
  customClass,
  customIcon,
  closePoup,
  getSeletedVal,
  labelField,
  valueField,
  defaultValue,
  searchToolTip = false,
  isCustomFieldswithFilter,
  searchPlaceholder,
  canEdit = true,
  everySelectApiCall = false,
  auth,
  setClearFilter,
  arrow = false,
  customRender,
  customTop,
  customWidth,
  customRight,
  collapseButton = true,
  filterHeaderTitle,
  showFilterFooter = false,
  filterListPreviewLimit,
  ...props
}) => {
  // const {
  //   list: filteredListDatas,
  //   filterlabel: getfilterLabel,
  //   sortBy,
  // } = useSelector((state) => state?.kanban.board.filterDataList);

  const popupRef = useRef(null);
  const [showToolTip, setShowToolTip] = useState(false);
  const didApplyRef = useRef(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [filterLabel, setfilterLabel] = useState([]);
  const [participantList, setParticipantList] = useState([]);
  const [labelListId, setLabelListId] = useState([]);
  const [singleGroupIds, setSingleGroupIds] = useState([]);
  const [searchInput, setSearchInput] = useState();
  const [filteredData, setFilteredData] = useState([]);
  const [apiFilteredData, setApiFilteredData] = useState(
    toolTipDatas?.reduce((acc, curr) => {
      // Add parent key
      if (!(curr.key in acc)) {
        acc[curr.key] = null;
      }
      // Add child keys
      curr?.searchList?.forEach((item) => {
        if (!(item.key in acc)) {
          acc[item.key] = null;
        }
      });
      return acc;
    }, {}),
  );
  const [appliedApiFilteredData, setAppliedApiFilteredData] = useState(
    toolTipDatas?.reduce((acc, curr) => {
      // Add parent key
      if (!(curr.key in acc)) {
        acc[curr.key] = null;
      }
      // Add child keys
      curr?.searchList?.forEach((item) => {
        if (!(item.key in acc)) {
          acc[item.key] = null;
        }
      });
      return acc;
    }, {}),
  );

  const [selectedBoard, setSelectedBoard] = useState(null);
  const [divHeight, setDivHeight] = useState(window.innerHeight);
  const [showAdditionalLabels, setShowAdditionalLabels] = useState(
    toolTipDatas?.length === 1 ? true : false,
  );
  const [expandedFilterLists, setExpandedFilterLists] = useState({});
  const [sectionSearchQueries, setSectionSearchQueries] = useState({});

  const [filteredToolTipDatas, setFilteredToolTipDatas] = useState(
    toolTipDatas ? toolTipDatas : [],
  );
  const [searchToolInput, setSearchToolInput] = useState("");
  const getScopedFilterId = (groupKey, id) => `${groupKey || "global"}:${String(id)}`;
  const listPreviewLimit =
    filterListPreviewLimit ?? (customClass === "filter-board" ? 5 : null);

  const getSectionSearchQuery = (sectionKey) =>
    sectionSearchQueries[sectionKey] || "";

  const handleSectionSearchChange = (sectionKey, value) => {
    setSectionSearchQueries((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
    // Searching should reveal matches immediately (skip "+N more" collapse).
    if (String(value || "").trim()) {
      setExpandedFilterLists((prev) => ({
        ...prev,
        [sectionKey]: true,
      }));
    }
  };

  const getFilteredSectionItems = (sectionKey, items = []) => {
    const query = getSectionSearchQuery(sectionKey).trim().toLowerCase();
    if (!query) return items || [];
    return (items || []).filter((item) => {
      const label =
        item?.[labelField] ??
        item?.name ??
        item?.displayName ??
        item?.label ??
        "";
      return String(label).toLowerCase().includes(query);
    });
  };

  const renderSectionSearchInput = (sectionKey, placeholderLabel, items = []) => {
    if (!items || items.length <= (listPreviewLimit || 5)) return null;
    return (
      <div
        className="filter-section-search"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          className="filter-section-search__input"
          placeholder={`Search ${placeholderLabel || "options"}`}
          value={getSectionSearchQuery(sectionKey)}
          onChange={(e) => handleSectionSearchChange(sectionKey, e.target.value)}
          aria-label={`Search ${placeholderLabel || "options"}`}
        />
        <img className="filter-section-search__icon" src={searchIcon} alt="" aria-hidden />
      </div>
    );
  };

  const getVisibleListItems = (sectionKey, items) => {
    if (!listPreviewLimit || !items?.length) {
      return {
        visibleItems: items || [],
        hasMoreToggle: false,
        hiddenCount: 0,
        isExpanded: false,
      };
    }
    const isExpanded = Boolean(expandedFilterLists[sectionKey]);
    const total = items.length;
    if (total <= listPreviewLimit) {
      return {
        visibleItems: items,
        hasMoreToggle: false,
        hiddenCount: 0,
        isExpanded: false,
      };
    }
    if (isExpanded) {
      return {
        visibleItems: items,
        hasMoreToggle: true,
        hiddenCount: total - listPreviewLimit,
        isExpanded: true,
      };
    }
    return {
      visibleItems: items.slice(0, listPreviewLimit),
      hasMoreToggle: true,
      hiddenCount: total - listPreviewLimit,
      isExpanded: false,
    };
  };

  const toggleFilterListExpand = (sectionKey) => {
    setExpandedFilterLists((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const renderListExpandToggle = (sectionKey, listPreview) => {
    if (!listPreview.hasMoreToggle) return null;
    if (!listPreview.isExpanded) {
      return (
        <li
          className="show_more_labels"
          id={`show_more_labels-${sectionKey}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFilterListExpand(sectionKey);
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              toggleFilterListExpand(sectionKey);
            }
          }}
        >
          +{listPreview.hiddenCount} more
        </li>
      );
    }
    return (
      <li
        className="show_less_labels"
        id={`show_less_labels-${sectionKey}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleFilterListExpand(sectionKey);
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            toggleFilterListExpand(sectionKey);
          }
        }}
      >
        Less
      </li>
    );
  };

  // Count of active selections (used for pending UI state).
  const pendingFiltersCount = useMemo(() => {
    const ids = [
      ...(Array.isArray(labelListId) ? labelListId : []),
      ...(Array.isArray(filterLabel) ? filterLabel : []),
    ];
    return new Set(ids.map((v) => String(v))).size;
  }, [labelListId, filterLabel]);

  // Count of applied selections (used for the trigger button).
  const [appliedFilterLabel, setAppliedFilterLabel] = useState([]);
  const [appliedLabelListId, setAppliedLabelListId] = useState([]);
  const appliedFiltersCount = useMemo(() => {
    const ids = [
      ...(Array.isArray(appliedLabelListId) ? appliedLabelListId : []),
      ...(Array.isArray(appliedFilterLabel) ? appliedFilterLabel : []),
    ];
    return new Set(ids.map((v) => String(v))).size;
  }, [appliedLabelListId, appliedFilterLabel]);

  // If the user closes the popup without pressing Apply,
  // revert pending selections back to the last applied state.
  useEffect(() => {
    if (showToolTip) {
      setHasOpenedOnce(true);
      return;
    }
    if (!hasOpenedOnce) return;

    if (didApplyRef.current) {
      didApplyRef.current = false;
      return;
    }

    if (showFilterFooter && customClass === "filter-board") {
      setfilterLabel(appliedFilterLabel);
      setLabelListId(appliedLabelListId);
      setApiFilteredData(appliedApiFilteredData);
      setFilteredData([]);
      setParticipantList([]);
      setExpandedFilterLists({});
      setSectionSearchQueries({});
      setSearchInput("");
    }
  }, [
    showToolTip,
    hasOpenedOnce,
    appliedFilterLabel,
    appliedLabelListId,
    appliedApiFilteredData,
    showFilterFooter,
    customClass,
  ]);
  useEffect(() => {
    setFilteredToolTipDatas(toolTipDatas);
  }, [toolTipDatas, filteredData]);

  useEffect(() => {
    setShowToolTip(closePoup);
    setSearchToolInput("");
  }, [closePoup]);

  useEffect(() => {
    if (isCustomFieldswithFilter) {
      getSeletedVal({ apiCall: false });
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setDivHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the click is outside the popup, close it
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        event.target.id !== "show_more_labels1" &&
        event.target.id !== "show_less_labels2" &&
        !String(event.target.id || "").startsWith("show_more_labels-") &&
        !String(event.target.id || "").startsWith("show_less_labels-")
      ) {
        setShowToolTip(false);
        setSearchToolInput("");
      }
    };
    // Attach the event listener to the document body
    document.addEventListener("click", handleClickOutside);

    // Cleanup the event listener when the component is unmounted
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleSearchToolTipInput = (val) => {
    setSearchToolInput(val);
    setFilteredToolTipDatas(
      toolTipDatas !== null
        ? toolTipDatas.filter((user) =>
            user?.[labelField].toLocaleLowerCase().includes(val.toLocaleLowerCase()),
          )
        : [],
    );
    toolTipDatas.filter((user) => {
      user?.[labelField].toLocaleLowerCase().includes(val.toLocaleLowerCase());
    });
  };
  const addTaskStatus = (e) => {
    const showPopup = showToolTip ? !showToolTip : true;
    if (e.type === "click" || e.key === "Enter") {
      setShowToolTip(showPopup);
    }
  };

  const selectEntry = (val, subVal) => {
    const setData = subVal === true || subVal === "true" ? false : true;
    setShowToolTip(false);
    if (getSeletedVal) {
      getSeletedVal(val, val?.subEntry === true && setData);
    } else return;
  };

  const addLabel = (id, entry, multiSelect, isSingleEntryKey) => {
    const parsedId = id;
    const isMulti = Boolean(multiSelect);
    const scopedId = getScopedFilterId(entry?.key, parsedId);
    const selectedSource = isMulti ? labelListId : filterLabel;
    const alreadySelected = selectedSource.includes(scopedId);
    if (alreadySelected) {
      const stageIdsFromSubList =
        entry?.subList?.length > 0
          ? entry.subList.flatMap((sub) =>
              (sub.searchList || []).map((item) => item.filter_id),
            )
          : [];
      const stageScopedIds = stageIdsFromSubList.map((stageId) =>
        getScopedFilterId("stageList", stageId),
      );

      let updatedFilterLabel = filterLabel?.filter((label) => label !== scopedId);

      if (stageScopedIds.length > 0) {
        updatedFilterLabel = updatedFilterLabel?.filter(
          (label) => !stageScopedIds.includes(label),
        );
      }

      const updatedLabelList = labelListId?.filter(
        (label) => label !== scopedId && !stageScopedIds.includes(label),
      );

      setfilterLabel(updatedFilterLabel);
      setLabelListId(updatedLabelList);
      setFilteredData(
        filteredData.filter(
          (f) =>
            f?.filter_id !== entry?.filter_id &&
            !stageIdsFromSubList.includes(f?.filter_id),
        ),
      );

      if (isMulti) {
        const previousFilterIds = Array.isArray(apiFilteredData?.[entry.key])
          ? apiFilteredData[entry.key]
          : [];
        const nextBoardIds = previousFilterIds.filter((val) => val !== entry.filter_id);

        let nextApi = {
          ...apiFilteredData,
          [entry.key]: nextBoardIds,
        };

        // Drop this board's stage ids from child filter keys (e.g. stageList); otherwise
        // apiFilteredData.stageList keeps stale values after the board is unchecked.
        if (stageIdsFromSubList.length > 0) {
          const childKeys = [
            ...new Set(entry.subList.map((sub) => sub.key).filter(Boolean)),
          ];
          childKeys.forEach((childKey) => {
            const prevChild = Array.isArray(nextApi[childKey]) ? nextApi[childKey] : [];
            const nextChild = prevChild.filter(
              (fid) => !stageIdsFromSubList.includes(fid),
            );
            nextApi[childKey] = nextChild.length > 0 ? nextChild : null;
          });
        } else if (entry.key === "boardId" && nextBoardIds.length === 0) {
          // Board had no subList / no stage ids in payload — still clear stageList when
          // no boards remain so stale stageList values are not sent to the API.
          nextApi.stageList = null;
        }

        setApiFilteredData(nextApi);
        if (everySelectApiCall) {
          getSeletedVal(nextApi, updatedFilterLabel, { apiCall: true });
        }
      } else {
        setApiFilteredData({
          ...apiFilteredData,
          [entry.key]: false,
        });
        if (everySelectApiCall) {
          getSeletedVal(
            {
              ...apiFilteredData,
              [entry.key]: false,
            },
            filterLabel,
            { apiCall: true },
          );
        }
      }
      return;
    }

    let nextFilterLabel = [...filterLabel, scopedId];
    if (isMulti) {
      setLabelListId([...labelListId, scopedId]);
      setFilteredData([...filteredData, entry.filter_id]);
      const previousFilterIds = Array.isArray(apiFilteredData?.[entry.key])
        ? apiFilteredData[entry.key]
        : [];
      setApiFilteredData({
        ...apiFilteredData,
        [entry.key]: [...new Set([...previousFilterIds, entry.filter_id])],
      });
      if (everySelectApiCall) {
        getSeletedVal(
          {
            ...apiFilteredData,
            [entry.key]: [...new Set([...previousFilterIds, entry.filter_id])],
          },
          filterLabel,
          { apiCall: true },
        );
      }
    } else {
      // Single-select per group: selecting one option replaces the previous option in same group key.
      setSingleGroupIds([entry.filter_id]);
      nextFilterLabel = nextFilterLabel.filter(
        (labelId) =>
          !singleGroupIds?.includes(Number(String(labelId).split(":")[1] ?? labelId)),
      );
      nextFilterLabel.push(scopedId);
      setFilteredData([...filteredData.filter((f) => f?.key !== entry?.filter_id)]);
      setApiFilteredData({
        ...apiFilteredData,
        [isSingleEntryKey && !isMulti ? isSingleEntryKey : entry.key]: entry.filter_id,
      });
      if (everySelectApiCall) {
        getSeletedVal(
          {
            ...apiFilteredData,
            [isSingleEntryKey && !isMulti ? isSingleEntryKey : entry.key]:
              entry.filter_id,
          },
          filterLabel,
          { apiCall: true },
        );
      }
    }
    setfilterLabel([...new Set(nextFilterLabel)]);
  };

  const handleSearchInputChange = (event) => {
    setSearchInput(event.target.value);
  };

  const searchSeletedValue = (val) => {
    setShowToolTip(false);
    setShowAdditionalLabels(false);
    if (getSeletedVal && filteredData) {
      const fdata = [
        {
          ...apiFilteredData,
          search_ticket_name: searchInput ? searchInput : null,
        },
      ];
      // Check if "1" should be added or removed from filterLabel
      const updatedFilterLabel = searchInput
        ? [...new Set([...filterLabel, "1"])] // Add "1" if searchInput is not null
        : filterLabel.filter((label) => label !== "1"); // Remove "1" if searchInput is null

      setfilterLabel(updatedFilterLabel);
      // Defer API calls to footer Apply when configured (e.g., BoardDashboard filter).
      if (everySelectApiCall) {
        getSeletedVal(fdata, updatedFilterLabel, { apiCall: true });
      }
    } else return;
  };

  const clearFilter = () => {
    const defaultFilterId = defaultValue?.[0]?.filter_id;
    const clearedApiFilteredData = {
      ...toolTipDatas?.reduce((acc, curr) => {
        acc[curr.key] =
          defaultFilterId != null &&
          curr?.searchList?.length > 0 &&
          curr?.searchList?.find((item) => item.filter_id == defaultFilterId)
            ? defaultFilterId
            : null;
        return acc;
      }, {}),
    };
    setfilterLabel([]);
    setFilteredData([]);
    getSeletedVal([], [], { apiCall: false });
    setSearchInput("");
    setParticipantList([]);
    setLabelListId([]);
    setExpandedFilterLists({});
    setApiFilteredData(clearedApiFilteredData);

    // Clear "applied" snapshot too, so trigger button count resets immediately.
    setAppliedFilterLabel([]);
    setAppliedLabelListId([]);
    setAppliedApiFilteredData(clearedApiFilteredData);
  };

  const heightValue =
    (divHeight > 900 ? 850 : divHeight > 600 ? divHeight : divHeight + 80) - 210;
  const toolsDivStyle = {
    maxHeight: `${heightValue}px`,
    top: customTop,
    minWidth: customWidth || "auto",
  };
  const customToolsDivStyle = {
    maxHeight: `700px`,
    top: customTop,
    minWidth: customWidth || "auto",
  };
  const filterBoardPopupStyle = {
    maxHeight: "min(700px, calc(100vh - 100px))",
    top: customTop,
    minWidth: customWidth || "auto",
  };

  const noneToolsDivStyle = {
    height: `auto`,
    top: customTop,
  };
  const expandedListMaxHeight = Math.max(200, heightValue - 230);
  const collapsedListMaxHeight = 500;
  const customPopupHeight = {
    maxHeight: `600px`,
  };
  const [selectedHeader, setSelectedHeader] = useState(
    toolTipDatas?.length === 1 ? toolTipDatas[0] : null,
  );

  const handleShowMore = (header) => {
    const isTogglingSame =
      header?.headerName === selectedHeader?.headerName && showAdditionalLabels;
    setSelectedHeader(header);
    setShowToolTip(true);
    setShowAdditionalLabels(
      header?.headerName === selectedHeader?.headerName ? !showAdditionalLabels : true,
    );
    setSelectedBoard(
      header?.headerName === selectedHeader?.headerName ? null : selectedBoard,
    );
    if (isTogglingSame) {
      const sectionKey = header?.key ?? header?.headerName;
      if (sectionKey) {
        setSectionSearchQueries((prev) => {
          const next = { ...prev };
          delete next[`${sectionKey}-list`];
          delete next[`${sectionKey}-filters`];
          return next;
        });
      }
    }
  };
  const [showSubList, setShowSubList] = useState(null);

  const isSubListVisible = (l) => {
    setShowSubList(showSubList === l.filter_id ? null : l.filter_id);
  };
  const getHeaderSelectedCount = (header) => {
    if (!header?.key) return 0;
    const selectedValue = apiFilteredData?.[header.key];
    if (Array.isArray(selectedValue)) return selectedValue.length;
    if (
      selectedValue === null ||
      selectedValue === undefined ||
      selectedValue === false
    ) {
      return 0;
    }
    return 1;
  };

  useEffect(() => {
    if (setClearFilter) {
      const defaultFilterId = defaultValue?.[0]?.filter_id;
      setfilterLabel([]);
      setFilteredData([]);
      getSeletedVal([], [], { apiCall: false });
      setSearchInput("");
      setParticipantList([]);
      setLabelListId([]);
      setAppliedFilterLabel([]);
      setAppliedLabelListId([]);
      setApiFilteredData({
        ...toolTipDatas?.reduce((acc, curr) => {
          acc[curr.key] =
            defaultFilterId != null &&
            curr?.searchList?.length > 0 &&
            curr?.searchList?.find((item) => item.filter_id == defaultFilterId)
              ? defaultFilterId
              : null;
          return acc;
        }, {}),
      });
      setAppliedApiFilteredData({
        ...toolTipDatas?.reduce((acc, curr) => {
          acc[curr.key] =
            defaultFilterId != null &&
            curr?.searchList?.length > 0 &&
            curr?.searchList?.find((item) => item.filter_id == defaultFilterId)
              ? defaultFilterId
              : null;
          return acc;
        }, {}),
      });
    }
  }, [setClearFilter]);

  return (
    <Fragment>
      <div
        className={`showToolTip ${customClass ? customClass : ""} ${
          isCustomFieldswithFilter ? "isCustomField" : ""
        }`}
        ref={popupRef}
      >
        <button
          className={`update-status`}
          onClick={(e) => addTaskStatus(e)}
          tabIndex={0}
          onKeyDown={(e) => addTaskStatus(e)}
          disabled={!canEdit}
        >
          {typeof customIcon === "string" && customIcon.length > 0 && (
            <img src={customIcon ? customIcon : editIcon} alt="editIcon" />
          )}
          {React.isValidElement(customIcon) && (
            <Fragment>
              {/* <span
                className={`${customIcon?.props?.className} ${
                  showToolTip ? "active" : ""
                }`}
              ></span> */}
              {customIcon}
            </Fragment>
          )}
          {!customIcon && (
            <img src={editIcon} className={showToolTip ? "active" : ""} alt="editIcon" />
          )}
          {isCustomFieldswithFilter && appliedFiltersCount !== 0 && (
            <span className="filter-count">({appliedFiltersCount})</span>
          )}
        </button>
        {showToolTip && (
          <div
            className="popup-content"
            style={
              isCustomFieldswithFilter
                ? {
                    ...(customClass === "filter-board"
                      ? filterBoardPopupStyle
                      : customToolsDivStyle),
                    minWidth: customWidth || "auto",
                    right: customRight && customRight,
                  }
                : {
                    ...noneToolsDivStyle,
                    minWidth: customWidth || "auto",
                    right: customRight && customRight,
                  }
            }
          >
            {customClass === "module-status-popup" && (
              <span className="arrow-before"></span>
            )}
            {arrow && <span className="arrow-bottom-right"></span>}

            {isSingleEntry && !isCustomFieldswithFilter && (
              <div className={`showPopup`}>
                <p className="tip-entry">
                  {filteredToolTipDatas ? filteredToolTipDatas : "No Data Available"}
                </p>
              </div>
            )}
            {searchToolTip && (
              <div className="toollist_search">
                <input
                  onChange={(e) => handleSearchToolTipInput(e.target.value)}
                  className={`search-label-input`}
                  placeholder={searchPlaceholder ? searchPlaceholder : "Search"}
                  value={searchToolInput ? searchToolInput : ""}
                />
                <img className="searchIcon" src={searchIcon} alt="searchIcon" />
              </div>
            )}
            {!isSingleEntry && !isCustomFieldswithFilter && (
              <div className="showPopup">
                <ul className="tip-entry-main">
                  {filteredToolTipDatas?.length > 0
                    ? filteredToolTipDatas?.map((list, i) => {
                        return (
                          <li
                            className={`tip-entry ${
                              defaultValue?.length > 0 &&
                              defaultValue?.find(
                                (item) => item[valueField] == list[valueField],
                              )
                                ? "active"
                                : ""
                            } ${list?.disabled ? "disabled" : ""}`}
                            key={
                              list[valueField]
                                ? `${list[valueField]}_${i}`
                                : `fallback_${i}`
                            }
                            onClick={() =>
                              selectEntry(
                                list,
                                (list?.subEntry &&
                                  props?.subEntry &&
                                  props?.subEntryData?.filter(
                                    (sub) => sub?.statusName == list?.[labelField],
                                  )[0]?.qaPssChangeRequest) ||
                                  undefined,
                              )
                            }
                            id={list[valueField]}
                          >
                            {list?.subEntry && (
                              <span className="sub-entry">
                                <img
                                  src={
                                    props?.subEntry &&
                                    (props?.subEntryData?.filter(
                                      (sub) => sub?.statusName === list?.[labelField],
                                    )[0]?.qaPssChangeRequest === true ||
                                      props?.subEntryData?.filter(
                                        (sub) => sub?.statusName === list?.[labelField],
                                      )[0]?.qaPssChangeRequest === "true")
                                      ? checkedIcon
                                      : props?.subEntryData?.filter(
                                            (sub) =>
                                              sub?.statusName === list?.[labelField],
                                          )[0]?.qaPssChangeRequest === false ||
                                          props?.subEntryData?.filter(
                                            (sub) =>
                                              sub?.statusName === list?.[labelField],
                                          )[0]?.qaPssChangeRequest === "false"
                                        ? unChecked
                                        : unChecked
                                  }
                                  alt="checkedIcon"
                                  width={15}
                                />
                              </span>
                            )}
                            {labelField ? list[labelField] : list?.name}
                          </li>
                        );
                      })
                    : !customRender && (
                        <li className="tip-entry error-message" key="noentry">
                          No Data Available
                        </li>
                      )}
                </ul>
              </div>
            )}
            {customRender && customRender}

            {isCustomFieldswithFilter && (
              <div className="custom-popup-content">
                <header>
                  <h1
                    className="main-header"
                    style={{ paddingRight: collapseButton ? "140px" : "0px" }}
                  >
                    <div className="filter-by-text">
                      {filterHeaderTitle ?? `Filter by (${pendingFiltersCount})`}
                    </div>

                    <button
                      type="button"
                      className="filter-clear-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFilter();
                      }}
                      disabled={!canEdit || pendingFiltersCount === 0}
                    >
                      Clear all
                    </button>
                    {collapseButton && (
                      <span
                        onClick={() => setShowToolTip(false)}
                        className="icon-close"
                        tabIndex="0"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setShowToolTip(false);
                          }
                        }}
                      ></span>
                    )}
                  </h1>
                </header>
                {searchToolTip ? (
                  <div className="search-label">
                    <h4 className="header-text">{"Keyword"}</h4>
                    <input
                      onChange={handleSearchInputChange}
                      className={`search-label-input ${
                        searchInput?.length > 0 ? "active" : ""
                      }`}
                      placeholder={searchPlaceholder ? searchPlaceholder : "Search"}
                      // disabled={boardData.data.length === 0 ? true : false}
                      value={searchInput ? searchInput : ""}
                    />
                    {/* <img
                    className="search-icon"
                    src={searchIcon}
                    alt="searchIcon"
                  /> */}
                    {/* , Members, Labels and more */}
                    <label>Search card/ticket name</label>
                  </div>
                ) : null}
                <div
                  className="customList-container"
                  style={customClass === "filter-board" ? undefined : customPopupHeight}
                >
                  {filteredToolTipDatas?.map((header, k) => {
                    const sectionKey =
                      header?.key ?? header?.headerName ?? `filter-section-${k}`;

                    if (
                      header?.headerName === "Participants" ||
                      (header?.headerName === "Assignee" &&
                        header?.searchList?.length > 0)
                    ) {
                      return (
                        <div
                          className="customList participants"
                          key={`${sectionKey}-participants`}
                        >
                          <h4
                            className="header-text"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowMore(header);
                            }}
                          >
                            <span>
                              {header?.headerName}{" "}
                              {getHeaderSelectedCount(header) > 0 && (
                                <span className="filter-count">
                                  {getHeaderSelectedCount(header)}
                                </span>
                              )}
                            </span>
                            <span
                              className={`show-more-less-btn ${
                                showAdditionalLabels &&
                                selectedHeader?.headerName === header?.headerName
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <svg fill="currentColor" viewBox="0 0 40 40">
                                <path d="M31 26.4q0 .3-.2.5l-1.1 1.2q-.3.2-.6.2t-.5-.2l-8.7-8.8-8.8 8.8q-.2.2-.5.2t-.5-.2l-1.2-1.2q-.2-.2-.2-.5t.2-.5l10.4-10.4q.3-.2.6-.2t.5.2l10.4 10.4q.2.2.2.5z"></path>
                              </svg>
                            </span>
                          </h4>
                          {showAdditionalLabels &&
                            selectedHeader?.headerName === header?.headerName && (
                              <>
                                {renderSectionSearchInput(
                                  `${sectionKey}-list`,
                                  header?.headerName,
                                  header?.searchList,
                                )}
                              <ul
                                className={`customList-names ${
                                  header?.headerName
                                    ? header?.headerName
                                        .toString()
                                        .toLocaleLowerCase()
                                        .replaceAll(" ", "-")
                                    : ""
                                }${
                                  getVisibleListItems(
                                    `${sectionKey}-list`,
                                    getFilteredSectionItems(
                                      `${sectionKey}-list`,
                                      header?.searchList,
                                    ),
                                  ).isExpanded
                                    ? " customList-names--expanded"
                                    : ""
                                }`}
                                key={`${sectionKey}-list`}
                              >
                                {(() => {
                                  const filteredItems = getFilteredSectionItems(
                                    `${sectionKey}-list`,
                                    header?.searchList,
                                  );
                                  const listPreview = getVisibleListItems(
                                    `${sectionKey}-list`,
                                    filteredItems,
                                  );
                                  if (!filteredItems.length) {
                                    return (
                                      <li className="tip-entry error-message" key="no-match">
                                        No matching options
                                      </li>
                                    );
                                  }
                                  return listPreview.visibleItems?.map((l, i) => {
                                  const listScopedId = getScopedFilterId(
                                    l?.key,
                                    l[valueField],
                                  );
                                  return (
                                    <li
                                      onClick={() => {
                                        addLabel(
                                          l[valueField],
                                          l,
                                          header?.multiSelect,
                                          header?.key,
                                        );
                                      }}
                                      key={
                                        l[valueField] && !isNaN(l[valueField])
                                          ? `${l[valueField]}_${i}`
                                          : `fallback_${i}`
                                      }
                                      className={`user-selection  ${
                                        defaultValue?.length > 0 &&
                                        defaultValue?.find(
                                          (item) => item[valueField] == l[valueField],
                                        )
                                          ? "active"
                                          : ""
                                      } ${l?.disabled ? "disabled" : ""}`}
                                      id={"filter_id-" + l?.valueField}
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          addLabel(
                                            l[valueField],
                                            l,
                                            header?.multiSelect,
                                            header?.key,
                                          );
                                        }
                                      }}
                                    >
                                      <div className="list__checkbox">
                                        <img
                                          src={
                                            filterLabel.includes(listScopedId)
                                              ? checkedBlueIcon
                                              : unCheckedBlueIcon
                                          }
                                          alt="checkedIcon"
                                        />
                                      </div>
                                      <LogoAvatarShowLetter
                                        genaralData={l}
                                        profileName={"displayName"}
                                        outerClassName={"data_section_list_image"}
                                        innerClassName={"userNull-image"}
                                      ></LogoAvatarShowLetter>
                                      <div className="participants-details">
                                        <p className="participants-name">
                                          {l.displayName}
                                        </p>
                                      </div>
                                    </li>
                                  );
                                });
                                })()}
                                {renderListExpandToggle(
                                  `${sectionKey}-list`,
                                  getVisibleListItems(
                                    `${sectionKey}-list`,
                                    getFilteredSectionItems(
                                      `${sectionKey}-list`,
                                      header?.searchList,
                                    ),
                                  ),
                                )}
                              </ul>
                              </>
                            )}
                        </div>
                      );
                    }
                    if (
                      header?.headerName !== "Keyword" &&
                      header?.headerName !== "Participants" &&
                      header?.searchList?.length > 0
                    ) {
                      return (
                        <div className="customList" key={`${sectionKey}-filters`}>
                          <h4
                            className="header-text"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowMore(header);
                            }}
                          >
                            <span>
                              {header?.headerName}{" "}
                              {getHeaderSelectedCount(header) > 0 && (
                                <span className="filter-count">
                                  {getHeaderSelectedCount(header)}
                                </span>
                              )}
                            </span>
                            <span
                              className={`show-more-less-btn ${
                                showAdditionalLabels &&
                                selectedHeader?.headerName === header?.headerName
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <svg fill="currentColor" viewBox="0 0 40 40">
                                <path d="M31 26.4q0 .3-.2.5l-1.1 1.2q-.3.2-.6.2t-.5-.2l-8.7-8.8-8.8 8.8q-.2.2-.5.2t-.5-.2l-1.2-1.2q-.2-.2-.2-.5t.2-.5l10.4-10.4q.3-.2.6-.2t.5.2l10.4 10.4q.2.2.2.5z"></path>
                              </svg>
                            </span>
                          </h4>
                          {showAdditionalLabels &&
                            selectedHeader?.headerName === header?.headerName && (
                              <>
                                {renderSectionSearchInput(
                                  `${sectionKey}-filters`,
                                  header?.headerName,
                                  header?.searchList,
                                )}
                              <ul
                                className={`customList-names ${
                                  header?.headerName
                                    ? header?.headerName
                                        .toString()
                                        .toLocaleLowerCase()
                                        .replaceAll(" ", "-")
                                    : ""
                                }${
                                  getVisibleListItems(
                                    `${sectionKey}-filters`,
                                    getFilteredSectionItems(
                                      `${sectionKey}-filters`,
                                      header?.searchList,
                                    ),
                                  ).isExpanded
                                    ? " customList-names--expanded"
                                    : ""
                                }`}
                              >
                                {(() => {
                                  const filteredItems = getFilteredSectionItems(
                                    `${sectionKey}-filters`,
                                    header?.searchList,
                                  );
                                  const listPreview = getVisibleListItems(
                                    `${sectionKey}-filters`,
                                    filteredItems,
                                  );
                                  if (!filteredItems.length) {
                                    return (
                                      <li className="tip-entry error-message" key="no-match">
                                        No matching options
                                      </li>
                                    );
                                  }
                                  return listPreview.visibleItems?.map((l, i) => {
                                  const itemScopedId = getScopedFilterId(
                                    l?.key,
                                    parseInt(l[valueField]),
                                  );
                                  const selectedStageCount =
                                    l?.subList?.reduce(
                                      (acc, sub) =>
                                        acc +
                                        sub.searchList.filter((item) =>
                                          filterLabel.includes(
                                            getScopedFilterId(item?.key, item.filter_id),
                                          ),
                                        ).length,
                                      0,
                                    ) || 0;
                                  const listItemKey =
                                    l[valueField] != null && l[valueField] !== ""
                                      ? `${sectionKey}-${l[valueField]}`
                                      : `${sectionKey}-item-${i}`;

                                  return (
                                    <Fragment key={listItemKey}>
                                      <li
                                        className={`entry-selection-list checkbox-container ${
                                          defaultValue?.length > 0 &&
                                          defaultValue?.find(
                                            (item) => item[valueField] == l[valueField],
                                          )
                                            ? "active"
                                            : ""
                                        } ${l?.disabled ? "disabled" : ""}`}
                                        id={"filter_id-" + l[valueField]}
                                      >
                                        <span className="checkbox-container-main">
                                          <img
                                            onClick={() => {
                                              addLabel(
                                                parseInt(l[valueField]),
                                                l,
                                                header?.multiSelect,
                                                header?.key,
                                              );
                                              setSelectedBoard((prev) =>
                                                prev?.filter_id === l.filter_id
                                                  ? null
                                                  : l,
                                              );
                                            }}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                addLabel(
                                                  parseInt(l[valueField]),
                                                  l,
                                                  header?.multiSelect,
                                                  header?.key,
                                                );
                                                setSelectedBoard((prev) =>
                                                  prev?.filter_id === l.filter_id
                                                    ? null
                                                    : l,
                                                );
                                              }
                                            }}
                                            src={
                                              filterLabel.includes(itemScopedId)
                                                ? header?.multiSelect
                                                  ? checkedBlueIcon
                                                  : unCheckedBlueIcon
                                                : header?.multiSelect
                                                  ? unChecked
                                                  : radioUnChecked
                                            }
                                            alt="checkbox"
                                            width={15}
                                            height={15}
                                          />
                                          <span
                                            style={{ backgroundColor: l?.colorcode }}
                                            className="color-box"
                                          >
                                            {l[labelField]}

                                            {selectedStageCount > 0 && (
                                              <span className="filter-count">
                                                {selectedStageCount}
                                              </span>
                                            )}
                                          </span>
                                        </span>
                                        {l?.subList?.length > 0 && (
                                          <span
                                            className={`show-more-less-btn ${
                                              showAdditionalLabels &&
                                              showSubList === l.filter_id
                                                ? "active"
                                                : ""
                                            }`}
                                            onClick={() => {
                                              isSubListVisible(l);
                                            }}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                isSubListVisible(l);
                                              }
                                            }}
                                          >
                                            <svg fill="currentColor" viewBox="0 0 40 40">
                                              <path d="M31 26.4q0 .3-.2.5l-1.1 1.2q-.3.2-.6.2t-.5-.2l-8.7-8.8-8.8 8.8q-.2.2-.5.2t-.5-.2l-1.2-1.2q-.2-.2-.2-.5t.2-.5l10.4-10.4q.3-.2.6-.2t.5.2l10.4 10.4q.2.2.2.5z"></path>
                                            </svg>
                                          </span>
                                        )}
                                      </li>

                                      {filterLabel.includes(itemScopedId) &&
                                        l?.subList?.length > 0 && (
                                          <div
                                            className="customList sublist-container"
                                            key={`${listItemKey}-sublist`}
                                            style={{
                                              display:
                                                showSubList === l.filter_id
                                                  ? "block"
                                                  : "none",
                                            }}
                                          >
                                            {l.subList.map((sub, idx) => {
                                              const subKey =
                                                sub?.key ?? `sub-${l.filter_id}-${idx}`;
                                              return (
                                                <div key={`${listItemKey}-${subKey}`}>
                                                  <ul className="customList-names">
                                                    {sub.searchList.map((item, i) => (
                                                      <li
                                                        key={`${subKey}-${item.filter_id ?? item.name ?? i}`}
                                                        onClick={() =>
                                                          addLabel(
                                                            item.filter_id,
                                                            item,
                                                            sub.multiSelect,
                                                            sub.key,
                                                          )
                                                        }
                                                        className="entry-selection-list"
                                                      >
                                                        <img
                                                          src={
                                                            filterLabel.includes(
                                                              getScopedFilterId(
                                                                item?.key,
                                                                item.filter_id,
                                                              ),
                                                            )
                                                              ? checkedBlueIcon
                                                              : unChecked
                                                          }
                                                          width={15}
                                                        />
                                                        <span>{item.name}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                    </Fragment>
                                  );
                                });
                                })()}
                                {renderListExpandToggle(
                                  `${sectionKey}-filters`,
                                  getVisibleListItems(
                                    `${sectionKey}-filters`,
                                    getFilteredSectionItems(
                                      `${sectionKey}-filters`,
                                      header?.searchList,
                                    ),
                                  ),
                                )}
                              </ul>
                              </>
                            )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                {showFilterFooter && (
                  <div className="buttons filter-board-footer">
                    <button
                      type="button"
                      className="clear-cancel-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFilter();
                      }}
                      disabled={!canEdit || pendingFiltersCount === 0}
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      className="save-label-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Trigger API only when the user explicitly applies the filter.
                        if (getSeletedVal) {
                          getSeletedVal(apiFilteredData, filterLabel, {
                            apiCall: true,
                          });
                        }
                        // Commit pending selection so the trigger button count updates.
                        setAppliedFilterLabel(filterLabel);
                        setAppliedLabelListId(labelListId);
                        setAppliedApiFilteredData(apiFilteredData);
                        didApplyRef.current = true;
                        setShowToolTip(false);
                      }}
                      disabled={!canEdit}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
            {customClass === "module-status-popup" && (
              <span className="arrow-after"></span>
            )}
          </div>
        )}
      </div>
    </Fragment>
  );
};

export default ToolTipPopup;

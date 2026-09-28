import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import worldCountries from "world-countries";
import worldGeography from "world-atlas/countries-50m.json";
import { boardExpandIcon } from "assets/images";
import DashboardChartSkeleton from "../utils/DashboardChartSkeleton";
import DashboardExpandablePanel from "../utils/DashboardExpandablePanel";

const DONUT_COLORS = ["#0F5BB7", "#5B67F1", "#15B785", "#EC4899", "#F59E0B"];
const OTHERS_COLOR = "#94A3B8";
const NO_DATA_COLOR = "#EFF0F2";
const MAP_BORDER_COLOR = "#D1D3D9";
const MAP_FOCUS_COLOR = "#0B4FA8";
const OTHERS_MAP_FOCUS_COLOR = "#2563EB";

const MAP_WIDTH = 800;
const ANTARCTICA_GEO_ID = "010";
const MICRO_STATE_MAX_AREA = 1000;

const MAP_BINS = [
  { label: "No Data", min: 0, max: 0, color: NO_DATA_COLOR },
  { label: "1–2", min: 1, max: 2, color: "#DCEEFF" },
  { label: "3–5", min: 3, max: 5, color: "#B8DAFF" },
  { label: "6–10", min: 6, max: 10, color: "#82BBF4" },
  { label: "11–20", min: 11, max: 20, color: "#438ED8" },
  { label: "20+", min: 21, max: Infinity, color: "#0F5BB7" },
];

const COUNTRY_NAME_ALIASES = {
  boliviaplurinationalstateof: "bolivia",
  bruneidarussalam: "brunei",
  cotedivoire: "ivorycoast",
  czechrepublic: "czechia",
  iranislamicrepublicof: "iran",
  korearepublicof: "southkorea",
  koreademocraticpeoplesrepublicof: "northkorea",
  laopeoplesdemocraticrepublic: "laos",
  moldovarepublicof: "moldova",
  russianfederation: "russia",
  syrianarabrepublic: "syria",
  tanzaniaunitedrepublicof: "tanzania",
  unitedstatesofamerica: "unitedstates",
  venezuelabolivarianrepublicof: "venezuela",
  vietnam: "vietnam",
};

const normalizeCountryName = (value) => {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
  return COUNTRY_NAME_ALIASES[normalized] ?? normalized;
};

const numericValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const countryMetadataByName = new Map();
const countryMetadataByGeoId = new Map();
worldCountries.forEach((country) => {
  const names = [
    country?.name?.common,
    country?.name?.official,
    ...(country?.altSpellings || []),
  ];
  names.forEach((name) => {
    const normalized = normalizeCountryName(name);
    if (normalized) countryMetadataByName.set(normalized, country);
  });
  if (country?.ccn3) {
    countryMetadataByGeoId.set(String(country.ccn3).padStart(3, "0"), country);
  }
});

const GENERIC_COUNTRY_NAMES = new Set(["", "—", "unselected", "unknown"]);

const getCountryGeoId = (countryName) => {
  const metadata = countryMetadataByName.get(normalizeCountryName(countryName));
  return metadata?.ccn3 ? String(metadata.ccn3).padStart(3, "0") : null;
};

const getCountryDisplay = (geoId, fallbackName = "") => {
  const metadata = geoId ? countryMetadataByGeoId.get(geoId) : null;
  const normalizedFallback = String(fallbackName ?? "").trim();
  const useFallback =
    normalizedFallback && !GENERIC_COUNTRY_NAMES.has(normalizedFallback.toLowerCase());
  return {
    name: metadata?.name?.common ?? (useFallback ? normalizedFallback : "Unknown"),
    flagSrc: metadata?.cca2
      ? `https://flagcdn.com/24x18/${metadata.cca2.toLowerCase()}.png`
      : "",
  };
};

const resolveCountrySource = (data) => {
  if (!data || typeof data !== "object") return null;
  const source = data.country && typeof data.country === "object" ? data.country : data;
  if (!Array.isArray(source.allCountries) && !Array.isArray(source.topFiveCountries)) {
    return null;
  }
  return source;
};

const mapCountryRows = (items = [], overallCount = 0) =>
  items
    .map((item, index) => {
      const name = item?.countryName ?? item?.name ?? "—";
      const count = numericValue(item?.countryCount ?? item?.count ?? item?.totalCount);
      const id = item?.countryId ?? item?.id ?? `${name}-${index}`;
      return {
        id: String(id),
        name,
        count,
        value: count,
        percentage: overallCount > 0 ? Math.round((count / overallCount) * 100) : 0,
        geoId: getCountryGeoId(name),
        color: DONUT_COLORS[index % DONUT_COLORS.length],
      };
    })
    .filter((row) => row.count > 0);

const getMapColor = (count) =>
  MAP_BINS.find((bin) => count >= bin.min && count <= bin.max)?.color ?? NO_DATA_COLOR;

const isAntarctica = (geography) =>
  String(geography?.id ?? "").padStart(3, "0") === ANTARCTICA_GEO_ID;

const getMapHeight = (panelExpanded) => (panelExpanded ? 320 : 260);

const getMapProjectionConfig = (panelExpanded) => ({
  scale: panelExpanded ? 132 : 124,
  center: [0, 30],
});

const createMapProjection = (mapHeight, projectionConfig) =>
  geoMercator()
    .scale(projectionConfig.scale)
    .center(projectionConfig.center)
    .translate([MAP_WIDTH / 2, mapHeight / 2]);

const clampTooltipPct = (value, min, max) => Math.max(min, Math.min(max, value));

/** When anchor is this close to the top, show tooltip below so it is not clipped. */
const TOOLTIP_FLIP_Y_THRESHOLD = 20;

const withTooltipPlacement = (anchor, panelExpanded = false) => {
  if (!anchor) return null;
  if (!panelExpanded) {
    return { ...anchor, placement: "above" };
  }
  return {
    ...anchor,
    placement: anchor.yPct <= TOOLTIP_FLIP_Y_THRESHOLD ? "below" : "above",
  };
};

const getProjectedCountryTop = (geography, mapHeight, projectionConfig) => {
  const projection = createMapProjection(mapHeight, projectionConfig);
  const path = geoPath().projection(projection);
  const [[x0, y0], [x1]] = path.bounds(geography);
  return { x: (x0 + x1) / 2, y: y0 };
};

const getLatLngAnchor = (geoId, mapHeight, projectionConfig) => {
  const latlng = countryMetadataByGeoId.get(geoId)?.latlng;
  if (!Array.isArray(latlng) || latlng.length < 2) return null;
  const [lat, lng] = latlng;
  const [x, y] = createMapProjection(mapHeight, projectionConfig)([lng, lat]);
  return { x, y };
};

const getElementTopAnchor = (element, stageElement) => {
  if (!element || !stageElement) return null;

  const elementRect = element.getBoundingClientRect();
  const stageRect = stageElement.getBoundingClientRect();
  if (!stageRect.width || !stageRect.height) return null;

  return {
    xPct: clampTooltipPct(
      ((elementRect.left + elementRect.width / 2 - stageRect.left) / stageRect.width) *
        100,
      8,
      92,
    ),
    yPct: clampTooltipPct(
      ((elementRect.top - stageRect.top) / stageRect.height) * 100,
      4,
      96,
    ),
  };
};

const getProjectedTopAnchor = (
  geoId,
  mapHeight,
  projectionConfig,
  elementRefs,
  stageElement,
) => {
  const svg = stageElement?.querySelector("svg");
  if (!svg || !stageElement) return null;

  const geography = elementRefs.geographyData.current.get(geoId);
  const point = geography
    ? getProjectedCountryTop(geography, mapHeight, projectionConfig)
    : getLatLngAnchor(geoId, mapHeight, projectionConfig);
  if (!point) return null;

  const svgPoint = svg.createSVGPoint();
  svgPoint.x = point.x;
  svgPoint.y = point.y;
  const screenPoint = svgPoint.matrixTransform(svg.getScreenCTM());
  const stageRect = stageElement.getBoundingClientRect();
  if (!stageRect.width || !stageRect.height) return null;

  return {
    xPct: clampTooltipPct(
      ((screenPoint.x - stageRect.left) / stageRect.width) * 100,
      8,
      92,
    ),
    yPct: clampTooltipPct(
      ((screenPoint.y - stageRect.top) / stageRect.height) * 100,
      4,
      96,
    ),
  };
};

const resolveTooltipAnchor = (
  geoId,
  mapHeight,
  projectionConfig,
  elementRefs,
  stageElement,
  panelExpanded = false,
) => {
  const renderedElement =
    elementRefs.geographyElements.current.get(geoId) ??
    elementRefs.markerElements.current.get(geoId) ??
    null;

  if (renderedElement?.isConnected && stageElement?.isConnected) {
    const anchor = getElementTopAnchor(renderedElement, stageElement);
    if (anchor) return withTooltipPlacement(anchor, panelExpanded);
  }

  return withTooltipPlacement(
    getProjectedTopAnchor(geoId, mapHeight, projectionConfig, elementRefs, stageElement),
    panelExpanded,
  );
};

const CountryDonutSlice = ({
  cx,
  cy,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  fill,
  index,
  activeIndex,
}) => (
  <Sector
    cx={cx}
    cy={cy}
    innerRadius={innerRadius}
    outerRadius={outerRadius + (index === activeIndex ? 7 : 0)}
    startAngle={startAngle}
    endAngle={endAngle}
    fill={fill}
    stroke="#FFFFFF"
    strokeWidth={2}
    style={{ cursor: "pointer", transition: "opacity 180ms ease" }}
  />
);

const CountryDistribution = ({
  title = "Country distribution",
  centerLabel = "Orders",
  data = null,
  loading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredCountryId, setHoveredCountryId] = useState(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState(null);
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [tooltipAnchor, setTooltipAnchor] = useState(null);
  const collapsedInteractionRootRef = useRef(null);
  const expandedInteractionRootRef = useRef(null);
  const collapsedMapStageRef = useRef(null);
  const expandedMapStageRef = useRef(null);
  const geographyByGeoIdRef = useRef(new Map());
  const collapsedGeographyElementByGeoIdRef = useRef(new Map());
  const expandedGeographyElementByGeoIdRef = useRef(new Map());
  const collapsedMarkerElementByGeoIdRef = useRef(new Map());
  const expandedMarkerElementByGeoIdRef = useRef(new Map());

  const getMapStage = useCallback(
    (panelExpanded) =>
      panelExpanded ? expandedMapStageRef.current : collapsedMapStageRef.current,
    [],
  );

  const getMapElementRefs = useCallback(
    (panelExpanded) => ({
      geographyElements: panelExpanded
        ? expandedGeographyElementByGeoIdRef
        : collapsedGeographyElementByGeoIdRef,
      markerElements: panelExpanded
        ? expandedMarkerElementByGeoIdRef
        : collapsedMarkerElementByGeoIdRef,
      geographyData: geographyByGeoIdRef,
    }),
    [],
  );

  const source = useMemo(() => resolveCountrySource(data), [data]);
  const reportedOrderCount = numericValue(source?.overallCountryCount);
  const totalOrderCount = numericValue(source?.overallCountryCount);

  const allRows = useMemo(() => {
    const items = source?.allCountries ?? source?.topFiveCountries ?? [];
    const orderTotal =
      reportedOrderCount ||
      items.reduce(
        (sum, item) =>
          sum + numericValue(item?.countryCount ?? item?.count ?? item?.totalCount),
        0,
      );
    return mapCountryRows(items, orderTotal);
  }, [source, reportedOrderCount]);

  /** Number of countries (not order volume) for heading + donut center. **/
  const countryCount = allRows?.filter((row) => row?.id !== "0" && row?.id !== 0)?.length;

  const topRows = useMemo(() => {
    const orderTotal =
      reportedOrderCount || allRows.reduce((sum, row) => sum + row.count, 0);
    const mappedTopRows = mapCountryRows(source?.topFiveCountries ?? [], orderTotal);
    return mappedTopRows.length ? mappedTopRows.slice(0, 5) : allRows.slice(0, 5);
  }, [source, reportedOrderCount, allRows]);

  const displayRows = useMemo(() => {
    if (isExpanded) {
      return allRows.map((row, index) => ({
        ...row,
        color: DONUT_COLORS[index % DONUT_COLORS.length],
        memberIds: [row.id],
      }));
    }

    const topIds = new Set(topRows.map((row) => row.id));
    const otherRows = allRows.filter((row) => !topIds.has(row.id));
    const othersCount = otherRows.reduce((sum, row) => sum + row.count, 0);
    const rows = topRows.map((row, index) => ({
      ...row,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
      memberIds: [row.id],
    }));

    if (othersCount > 0) {
      rows.push({
        id: "__country-others__",
        name: "+ Others",
        count: othersCount,
        value: othersCount,
        color: OTHERS_COLOR,
        isOthers: true,
        memberIds: otherRows.map((row) => row.id),
      });
    }
    return rows;
  }, [allRows, topRows, isExpanded]);

  const rowById = useMemo(() => new Map(allRows.map((row) => [row.id, row])), [allRows]);
  const rowByGeoId = useMemo(
    () => new Map(allRows.filter((row) => row.geoId).map((row) => [row.geoId, row])),
    [allRows],
  );

  const microStateRows = useMemo(
    () =>
      allRows.filter((row) => {
        if (!row.geoId) return false;
        const area = countryMetadataByGeoId.get(row.geoId)?.area ?? Infinity;
        return area < MICRO_STATE_MAX_AREA;
      }),
    [allRows],
  );

  const segmentForCountry = useCallback(
    (countryId) =>
      displayRows.find((segment) => segment.memberIds?.includes(countryId)) ?? null,
    [displayRows],
  );

  const activeCountryId =
    hoveredSegmentId != null ? hoveredCountryId : (hoveredCountryId ?? selectedCountryId);
  const activeSegmentId =
    hoveredSegmentId ??
    (activeCountryId ? segmentForCountry(activeCountryId)?.id : selectedSegmentId);
  const activeSegmentIndex = displayRows.findIndex((row) => row.id === activeSegmentId);
  const activeSegment = activeSegmentIndex >= 0 ? displayRows[activeSegmentIndex] : null;

  const focusedCountryIds = useMemo(() => {
    if (activeCountryId) return new Set([activeCountryId]);
    return new Set(activeSegment?.memberIds ?? []);
  }, [activeCountryId, activeSegment]);

  const tooltipRow = activeCountryId ? rowById.get(activeCountryId) : null;
  const isOthersFocused = activeSegment?.isOthers === true;
  const mapTooltip = tooltipRow
    ? {
        ...getCountryDisplay(tooltipRow.geoId, tooltipRow.name),
        count: tooltipRow.count,
      }
    : isOthersFocused
      ? { name: "Other countries", flagSrc: "", count: activeSegment.count }
      : null;
  const hasFocus = focusedCountryIds.size > 0;
  const showEmptyState = !source || !allRows.length;

  useEffect(() => {
    const clearOutsideSelection = (event) => {
      const inCollapsed = collapsedInteractionRootRef.current?.contains(event.target);
      const inExpanded = expandedInteractionRootRef.current?.contains(event.target);
      if (!inCollapsed && !inExpanded) {
        setSelectedCountryId(null);
        setSelectedSegmentId(null);
        setTooltipAnchor(null);
      }
    };
    document.addEventListener("mousedown", clearOutsideSelection);
    return () => document.removeEventListener("mousedown", clearOutsideSelection);
  }, []);

  const clearHover = useCallback(() => {
    setHoveredCountryId(null);
    setHoveredSegmentId(null);
    setTooltipAnchor(null);
  }, []);

  const updateTooltipAnchorFromGeoId = useCallback(
    (geoId, panelExpanded) => {
      const stageElement = getMapStage(panelExpanded);
      if (!geoId || !stageElement?.isConnected) {
        setTooltipAnchor(null);
        return;
      }

      const mapHeight = getMapHeight(panelExpanded);
      const projectionConfig = getMapProjectionConfig(panelExpanded);
      const anchor = resolveTooltipAnchor(
        geoId,
        mapHeight,
        projectionConfig,
        getMapElementRefs(panelExpanded),
        stageElement,
        panelExpanded,
      );
      if (anchor) setTooltipAnchor(anchor);
    },
    [getMapElementRefs, getMapStage],
  );

  useEffect(() => {
    setHoveredCountryId(null);
    setHoveredSegmentId(null);
    setSelectedCountryId(null);
    setSelectedSegmentId(null);
    setTooltipAnchor(null);
  }, [isExpanded]);

  useEffect(() => {
    if (!tooltipRow?.geoId) return undefined;

    let innerFrame;
    const frame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        updateTooltipAnchorFromGeoId(tooltipRow.geoId, isExpanded);
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      if (innerFrame) cancelAnimationFrame(innerFrame);
    };
  }, [tooltipRow?.geoId, isExpanded, activeCountryId, updateTooltipAnchorFromGeoId]);

  const focusCountry = useCallback(
    (row, persistent = false) => {
      if (!row) return;
      const segment = segmentForCountry(row.id);
      if (persistent) {
        setSelectedCountryId(row.id);
        setSelectedSegmentId(segment?.id ?? null);
      } else {
        setHoveredCountryId(row.id);
        setHoveredSegmentId(segment?.id ?? null);
      }
    },
    [segmentForCountry],
  );

  const focusSegment = useCallback((segment, persistent = false) => {
    if (!segment) return;

    if (persistent && segment.isOthers) {
      setHoveredCountryId(null);
      setHoveredSegmentId(null);
      setSelectedCountryId(null);
      setSelectedSegmentId(null);
      setIsExpanded(true);
      return;
    }

    const countryId = segment.isOthers ? null : (segment.memberIds?.[0] ?? null);
    if (persistent) {
      setSelectedSegmentId(segment.id);
      setSelectedCountryId(countryId);
    } else {
      setHoveredSegmentId(segment.id);
      setHoveredCountryId(countryId);
    }
  }, []);

  const header = (
    <div className="country-distribution__head">
      <div className="country-distribution__title-wrap">
        <h4 className="country-distribution__title">{title}</h4>
        <span className="country-distribution__total">
          <i aria-hidden />
          {countryCount} {"Countries"}
        </span>
      </div>
      {!isExpanded && (
        <button
          type="button"
          className="board-overdue-health-chart__subtitle-expand"
          aria-label={`Expand ${title}`}
          disabled={loading || showEmptyState}
          onClick={() => setIsExpanded(true)}
        >
          Expand &#160;
          <img src={boardExpandIcon} alt="" />
        </button>
      )}
    </div>
  );

  return (
    <DashboardExpandablePanel
      className="country-distribution"
      ariaLabel={title}
      expandDisabled={loading}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
      showDefaultExpandButton={false}
      header={header}
    >
      {(panelExpanded) => {
        if (loading) {
          return (
            <DashboardChartSkeleton
              variant="donut"
              expanded={panelExpanded}
              legendCount={5}
              ariaLabel={`Loading ${title}`}
            />
          );
        }

        if (showEmptyState) {
          return (
            <div className="country-distribution__empty">
              <p className="workspace-widget__no-data-found w-100">No Data Found</p>
            </div>
          );
        }

        const mapHeight = getMapHeight(panelExpanded);
        const mapProjectionConfig = getMapProjectionConfig(panelExpanded);
        const donutHeight = panelExpanded ? 210 : 220;
        // Collapsed + expanded both stay mounted; only the active view should reflect hover.
        const isActiveView = panelExpanded === isExpanded;
        const viewFocusedCountryIds = isActiveView ? focusedCountryIds : new Set();
        const viewHasFocus = isActiveView && hasFocus;
        const viewIsOthersFocused = isActiveView && isOthersFocused;
        const viewActiveSegmentId = isActiveView ? activeSegmentId : null;
        const viewActiveSegmentIndex = isActiveView ? activeSegmentIndex : -1;
        const viewMapTooltip = isActiveView ? mapTooltip : null;
        const viewTooltipAnchor = isActiveView ? tooltipAnchor : null;

        const handleSegmentFocus = (segment, persistent = false) => {
          if (!isActiveView) return;
          focusSegment(segment, persistent);
          if (segment?.isOthers) {
            if (!persistent) setTooltipAnchor(null);
            return;
          }
          const countryId = segment?.memberIds?.[0];
          const row = countryId ? rowById.get(countryId) : null;
          updateTooltipAnchorFromGeoId(row?.geoId, panelExpanded);
        };

        const handleMapLeave = () => {
          if (!isActiveView) return;
          if (selectedCountryId) {
            setHoveredCountryId(null);
            setHoveredSegmentId(null);
            const row = rowById.get(selectedCountryId);
            updateTooltipAnchorFromGeoId(row?.geoId, panelExpanded);
            return;
          }
          clearHover();
        };

        const renderViewSlice = (props) => (
          <CountryDonutSlice {...props} activeIndex={viewActiveSegmentIndex} />
        );

        return (
          <div
            ref={panelExpanded ? expandedInteractionRootRef : collapsedInteractionRootRef}
            className={`country-distribution__layout${
              panelExpanded ? " country-distribution__layout--expanded" : ""
            }`}
          >
            <div
              className="country-distribution__map-panel"
              onMouseLeave={handleMapLeave}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedCountryId(null);
                  setSelectedSegmentId(null);
                  setTooltipAnchor(null);
                }
              }}
            >
              <div
                ref={panelExpanded ? expandedMapStageRef : collapsedMapStageRef}
                className="country-distribution__map-stage"
                style={{ "--map-aspect-ratio": `${MAP_WIDTH} / ${mapHeight}` }}
              >
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={mapProjectionConfig}
                  width={MAP_WIDTH}
                  height={mapHeight}
                  className="country-distribution__map"
                  role="img"
                  aria-label="World map showing Orders distribution by country"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      setSelectedCountryId(null);
                      setSelectedSegmentId(null);
                      setTooltipAnchor(null);
                    }
                  }}
                >
                  <Geographies geography={worldGeography}>
                    {({ geographies }) =>
                      geographies
                        .filter((geography) => !isAntarctica(geography))
                        .map((geography) => {
                          const geoId = String(geography.id).padStart(3, "0");
                          geographyByGeoIdRef.current.set(geoId, geography);
                          const row = rowByGeoId.get(geoId);
                          const display = getCountryDisplay(geoId, row?.name);
                          const isFocused = row
                            ? viewFocusedCountryIds.has(row.id)
                            : false;
                          const opacity =
                            viewHasFocus && !isFocused
                              ? viewIsOthersFocused
                                ? 0.45
                                : 0.55
                              : 1;

                          const handleGeographyEnter = () => {
                            if (!isActiveView || !row) return;
                            focusCountry(row);
                            updateTooltipAnchorFromGeoId(row.geoId, panelExpanded);
                          };

                          const handleGeographyLeave = () => {
                            if (!isActiveView) return;
                            if (row && selectedCountryId === row.id) {
                              setHoveredCountryId(null);
                              setHoveredSegmentId(null);
                              return;
                            }
                            clearHover();
                          };

                          return (
                            <Geography
                              key={geography.rsmKey}
                              geography={geography}
                              ref={(node) => {
                                const geoElements = panelExpanded
                                  ? expandedGeographyElementByGeoIdRef.current
                                  : collapsedGeographyElementByGeoIdRef.current;
                                if (node && row) {
                                  geoElements.set(geoId, node);
                                } else {
                                  geoElements.delete(geoId);
                                }
                              }}
                              tabIndex={row ? 0 : -1}
                              aria-label={
                                row
                                  ? `${display.name}: ${row.count} Orders`
                                  : `${display.name}: No data`
                              }
                              onMouseEnter={handleGeographyEnter}
                              onMouseLeave={handleGeographyLeave}
                              onClick={() => {
                                if (!isActiveView) return;
                                if (row) {
                                  focusCountry(row, true);
                                  updateTooltipAnchorFromGeoId(row.geoId, panelExpanded);
                                } else {
                                  setSelectedCountryId(null);
                                  setSelectedSegmentId(null);
                                  setTooltipAnchor(null);
                                }
                              }}
                              onKeyDown={(event) => {
                                if (!isActiveView) return;
                                if (row && (event.key === "Enter" || event.key === " ")) {
                                  event.preventDefault();
                                  focusCountry(row, true);
                                  updateTooltipAnchorFromGeoId(row.geoId, panelExpanded);
                                }
                              }}
                              fill={
                                isFocused
                                  ? viewIsOthersFocused
                                    ? OTHERS_MAP_FOCUS_COLOR
                                    : MAP_FOCUS_COLOR
                                  : getMapColor(row?.count ?? 0)
                              }
                              stroke={
                                isFocused && viewIsOthersFocused
                                  ? "#1D4ED8"
                                  : isFocused
                                    ? "#083B7A"
                                    : MAP_BORDER_COLOR
                              }
                              strokeWidth={
                                isFocused ? (viewIsOthersFocused ? 2 : 1.4) : 0.55
                              }
                              style={{
                                default: {
                                  outline: "none",
                                  opacity,
                                  transition:
                                    "opacity 180ms ease, fill 180ms ease, stroke 180ms ease",
                                },
                                hover: {
                                  outline: "none",
                                  opacity: row ? 1 : opacity,
                                  cursor: row ? "pointer" : "default",
                                },
                                pressed: { outline: "none" },
                              }}
                            />
                          );
                        })
                    }
                  </Geographies>
                  {microStateRows.map((row) => {
                    const latlng = countryMetadataByGeoId.get(row.geoId)?.latlng;
                    if (!Array.isArray(latlng) || latlng.length < 2) return null;

                    const [lat, lng] = latlng;
                    const isFocused = viewFocusedCountryIds.has(row.id);
                    const opacity =
                      viewHasFocus && !isFocused
                        ? viewIsOthersFocused
                          ? 0.45
                          : 0.55
                        : 1;
                    const display = getCountryDisplay(row.geoId, row.name);
                    const markerRadius = isFocused ? 6 : 5;

                    const handleMarkerEnter = () => {
                      if (!isActiveView) return;
                      focusCountry(row);
                      updateTooltipAnchorFromGeoId(row.geoId, panelExpanded);
                    };

                    const handleMarkerLeave = () => {
                      if (!isActiveView) return;
                      if (selectedCountryId === row.id) {
                        setHoveredCountryId(null);
                        setHoveredSegmentId(null);
                        return;
                      }
                      clearHover();
                    };

                    return (
                      <Marker key={`micro-${row.id}`} coordinates={[lng, lat]}>
                        <circle
                          r={markerRadius}
                          ref={(node) => {
                            const markerElements = panelExpanded
                              ? expandedMarkerElementByGeoIdRef.current
                              : collapsedMarkerElementByGeoIdRef.current;
                            if (node) {
                              markerElements.set(row.geoId, node);
                            } else {
                              markerElements.delete(row.geoId);
                            }
                          }}
                          tabIndex={0}
                          aria-label={`${display.name}: ${row.count} Orders`}
                          fill={
                            isFocused
                              ? viewIsOthersFocused
                                ? OTHERS_MAP_FOCUS_COLOR
                                : MAP_FOCUS_COLOR
                              : getMapColor(row.count)
                          }
                          stroke={isFocused ? "#083B7A" : MAP_BORDER_COLOR}
                          strokeWidth={isFocused ? 1.6 : 1.2}
                          opacity={opacity}
                          style={{ cursor: "pointer", outline: "none" }}
                          onMouseEnter={handleMarkerEnter}
                          onMouseLeave={handleMarkerLeave}
                          onClick={() => {
                            if (!isActiveView) return;
                            focusCountry(row, true);
                            updateTooltipAnchorFromGeoId(row.geoId, panelExpanded);
                          }}
                          onKeyDown={(event) => {
                            if (!isActiveView) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              focusCountry(row, true);
                              updateTooltipAnchorFromGeoId(row.geoId, panelExpanded);
                            }
                          }}
                        />
                      </Marker>
                    );
                  })}
                </ComposableMap>
                {viewMapTooltip && viewTooltipAnchor && (
                  <div
                    className={`country-distribution__map-tooltip-card${
                      viewTooltipAnchor.placement === "below"
                        ? " country-distribution__map-tooltip-card--below"
                        : ""
                    }`}
                    role="status"
                    aria-live="polite"
                    style={{
                      left: `${viewTooltipAnchor.xPct}%`,
                      top: `${viewTooltipAnchor.yPct}%`,
                    }}
                  >
                    <div className="country-distribution__map-tooltip-head">
                      <strong>{viewMapTooltip.name}</strong>
                      {viewMapTooltip.flagSrc ? (
                        <img
                          src={viewMapTooltip.flagSrc}
                          alt=""
                          className="country-distribution__map-tooltip-flag"
                          width={20}
                          height={15}
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div>
                      <span>Orders</span>
                      <b>{viewMapTooltip.count}</b>
                    </div>
                    <span
                      className="country-distribution__map-tooltip-arrow"
                      aria-hidden
                    />
                  </div>
                )}
              </div>
              <div
                className="country-distribution__map-legend"
                aria-label="Map value scale"
              >
                <strong>Orders</strong>
                <div className="country-distribution__map-legend-scale">
                  {MAP_BINS.map((bin) => (
                    <span key={bin.label}>
                      <i style={{ backgroundColor: bin.color }} />
                      <small>{bin.label}</small>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <aside className="country-distribution__summary">
              <div
                className="country-distribution__donut-wrap"
                onMouseLeave={handleMapLeave}
              >
                <ResponsiveContainer width="100%" height={donutHeight}>
                  <PieChart>
                    <Pie
                      data={displayRows}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={panelExpanded ? 52 : 48}
                      outerRadius={panelExpanded ? 80 : 74}
                      paddingAngle={1}
                      stroke="none"
                      shape={renderViewSlice}
                      isAnimationActive
                      animationDuration={450}
                      onMouseEnter={(_, index) => handleSegmentFocus(displayRows[index])}
                      onMouseLeave={handleMapLeave}
                      onClick={(_, index) => handleSegmentFocus(displayRows[index], true)}
                    >
                      {displayRows.map((row) => (
                        <Cell key={row.id} fill={row.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="country-distribution__donut-center" aria-hidden>
                  <strong>{totalOrderCount}</strong>
                  <span>{centerLabel}</span>
                </div>
              </div>

              <ul
                className={`country-distribution__legend${
                  panelExpanded ? " country-distribution__legend--expanded" : ""
                }`}
              >
                {displayRows.map((row) => {
                  const isActive = row.id === viewActiveSegmentId;
                  return (
                    <li
                      key={row.id}
                      className={isActive ? "is-active" : ""}
                      tabIndex={0}
                      role="button"
                      aria-pressed={isActive}
                      onMouseEnter={() => handleSegmentFocus(row)}
                      onMouseLeave={handleMapLeave}
                      onClick={() => handleSegmentFocus(row, true)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSegmentFocus(row, true);
                        }
                      }}
                    >
                      <span
                        className="country-distribution__legend-dot"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="country-distribution__legend-name">
                        {row.name}
                      </span>
                      <strong>{row.count}</strong>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        );
      }}
    </DashboardExpandablePanel>
  );
};

export default memo(CountryDistribution);

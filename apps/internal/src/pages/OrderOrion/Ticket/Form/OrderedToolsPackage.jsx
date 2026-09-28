import { Fragment, useEffect, useRef, useState } from "react";
import ProductsTools from "../../../../components/common/ProductsTools";
import { renderOrderType } from "../../../../utils/common";
import { Col, Form } from "react-bootstrap";
import { t } from "i18next";
import { DoneRing } from "../../../../assets/images";
import { useGlobalMaster } from "@orion/shared";
import { SelectDropDown } from "@orion/shared";

const OrderedToolsPackage = ({
  orderId,
  orderType,
  getSelectedtoolsDetails,
  toolsDetails,
  getlanguage,
  getcurrency,
  errorMsg,
  disabledList,
  index,
  languages,
  currencyList,
  showPackage,
  showLanguage,
  getOrderType,
  initialLockedToolIds = [],
}) => {
  const { packageList, toolsList, getPackageList, getToolsList } =
    useGlobalMaster();
  const [toolsOrdered, setToolsOrdered] = useState([]);
  const [toolsLanguages, setToolsLanguages] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState([]);
  const [toolsCurrency, setToolsCurrency] = useState([]);
  // Remount Select Tools after chip remove so dropdown internal state clears
  const [toolsSelectResetKey, setToolsSelectResetKey] = useState(0);
  const toolsHydratedRef = useRef(false);
  // Previously saved tools only — newly added tools stay unlockable
  const normalizeLockedIds = (ids = []) =>
    (Array.isArray(ids) ? ids : [])
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));
  const [lockedToolIds, setLockedToolIds] = useState(() =>
    normalizeLockedIds(initialLockedToolIds),
  );

  useEffect(() => {
    if (lockedToolIds.length > 0) return;
    const next = normalizeLockedIds(initialLockedToolIds);
    if (next.length > 0) setLockedToolIds(next);
  }, [initialLockedToolIds, lockedToolIds.length]);

  const isToolLocked = (toolId) =>
    lockedToolIds.some((id) => Number(id) === Number(toolId));

  const resolveToolsByIds = (ids = [], source = []) =>
    (ids || [])
      .map((id) =>
        (source || []).find((tool) => Number(tool.toolId) === Number(id)),
      )
      .filter(Boolean);

  const resolveToolObjects = (list = [], source = []) =>
    resolveToolsByIds(
      (list || []).map((t) => t?.toolId ?? t),
      source,
    );

  useEffect(() => {
    setTools(toolsList?.data || []);
  }, [toolsList]);
  useEffect(() => {
    if (getlanguage?.length > 0) {
      setToolsLanguages(
        languages.filter((lang) => getlanguage.includes(lang.languageId))
      );
    }
  }, [getlanguage]);
  useEffect(() => {
    if (!toolsList?.loading && toolsList?.data?.length === 0) {
      getToolsList();
    }
  }, []);
  useEffect(() => {
    if (getcurrency?.length > 0) {
      setToolsCurrency(
        currencyList.filter((c) => getcurrency.includes(c.currency_id))
      );
    }
  }, [getcurrency]);
  // get Package list
  useEffect(() => {
    if (!packageList?.loading && packageList?.data?.length === 0) {
      getPackageList();
    }
    if (toolsDetails?.orderType?.length === 0) {
      getSelectedtoolsDetails(
        {
          ...toolsDetails,
          orderType: orderId.orderType,
        },
        "toolsDetails"
      );
    } else {
      return;
    }
  }, []);

  // Hydrate once from API toolsId (do not overwrite chip/dropdown changes later)
  useEffect(() => {
    if (!tools?.length) return;

    if (!toolsHydratedRef.current) {
      const detailIds = Array.isArray(toolsDetails?.toolsId)
        ? toolsDetails.toolsId
        : null;
      if (detailIds === null && lockedToolIds.length === 0) {
        return; // wait until toolsDetails toolsId is available
      }
      const mergedIds = [...(detailIds || [])];
      lockedToolIds.forEach((id) => {
        if (!mergedIds.some((existing) => Number(existing) === Number(id))) {
          mergedIds.unshift(id);
        }
      });
      setToolsOrdered(resolveToolsByIds(mergedIds, tools));
      toolsHydratedRef.current = true;
    }

    if (toolsDetails?.package?.length > 0) {
      const getPackage = packageList?.data?.filter((pack) =>
        toolsDetails?.package?.includes(pack.status_id),
      );
      if (getPackage?.[0]?.status_id != null) {
        setSelectedPackage(getPackage[0].status_id);
      }
    }
  }, [tools, packageList, toolsDetails?.toolsId, toolsDetails?.package, lockedToolIds]);

  useEffect(() => {
    // Avoid wiping API-selected tools before master list maps them
    if (!toolsHydratedRef.current) return;
    if (!toolsOrdered.length && toolsDetails?.toolsId?.length > 0) return;

    const gettoolIds = toolsOrdered.map((tool) => tool.toolId);
    if (toolsDetails?.orderType[0] === orderId?.orderType[0]) {
      getSelectedtoolsDetails(
        {
          ...toolsDetails,
          toolsId: gettoolIds.length > 0 ? gettoolIds : toolsDetails.toolsId,
        },
        "toolsDetails",
      );
    } else {
      getSelectedtoolsDetails(
        {
          ...toolsDetails,
          orderType: orderId.orderType,
          toolsId: gettoolIds,
          package: toolsDetails?.package || [],
        },
        "toolsDetails",
      );
    }
  }, [toolsOrdered]);

  const applyToolsSelection = (selected, { fromChip = false } = {}) => {
    const source = toolsList?.data || tools || [];
    const next = resolveToolObjects(selected, source);
    let merged = next;
    if (lockedToolIds.length) {
      const lockedTools = resolveToolsByIds(lockedToolIds, source);
      const unlockedSelected = next.filter((tool) => !isToolLocked(tool.toolId));
      merged = [...lockedTools, ...unlockedSelected].filter(
        (tool, i, arr) =>
          arr.findIndex((t) => Number(t.toolId) === Number(tool.toolId)) === i,
      );
    }
    setToolsOrdered(merged);
    if (fromChip) {
      setToolsSelectResetKey((k) => k + 1);
    }
  };

  const getToolsParam = (selected) => applyToolsSelection(selected, { fromChip: false });

  const removeUnlockedToolChip = (toolId) => {
    applyToolsSelection(
      toolsOrdered.filter((prev) => Number(prev.toolId) !== Number(toolId)),
      { fromChip: true },
    );
  };
  const handlesChangeToolsLanguages = (languages) => {
    setToolsLanguages(languages);
    getSelectedtoolsDetails(
      {
        ...toolsDetails,
        language:
          languages?.length > 0
            ? languages?.map((lang) => lang.languageId)
            : [],
      },
      "language"
    );
  };
  const handlesChangeRemovedToolsLanguages = (languages) => {
    setToolsLanguages(
      toolsLanguages.filter((prev) => prev.languageId !== languages.languageId)
    );
    getSelectedtoolsDetails(
      {
        ...toolsDetails,
        language: toolsLanguages
          .filter((prev) => prev.languageId !== languages.languageId)
          ?.map((lang) => lang.languageId),
      },
      "language"
    );
  };

  const handlesChangeToolsCurrency = (curr) => {
    setToolsCurrency(curr);
    getSelectedtoolsDetails(
      {
        ...toolsDetails,
        currency: curr?.length > 0 ? curr?.map((d) => d.currency_id) : [],
      },
      "currency"
    );
  };
  const handlesChangeRemovedToolsCurrency = (curr) => {
    setToolsCurrency(
      toolsCurrency.filter((prev) => prev.currency_id !== curr.currency_id)
    );
    getSelectedtoolsDetails(
      {
        ...toolsDetails,
        currency: toolsCurrency
          .filter((prev) => prev.currency_id !== curr.currency_id)
          ?.map((curr) => curr.currency_id),
      },
      "currency"
    );
  };

  const handleChangePackage = (getPackage) => {
    setSelectedPackage(getPackage.status_id);
    getSelectedtoolsDetails(
      {
        ...toolsDetails,
        package: [getPackage.status_id],
      },
      "toolsDetails"
    );
  };

  return (
    <Fragment>
      <Col xs={12} className="mt-2 mb-2 d-flex align-items-center">
        <p className="m-0"> {t("order_view.order_type")}:&#160;</p>
        <div className="d-flex gap-2">
          {renderOrderType(orderId, orderType, true, true)}
        </div>
      </Col>
      {/* {getOrderType[0]?.code === "RD" &&
        errorMsg &&
        errorMsg[`tools.toolsDetails[${index}].toolsId`] && (
          <div className="text-danger small mt-1">
            Tools List is empty
          </div>
        )} */}

      {getOrderType.length > 0 && getOrderType[0]?.code !== "PLG" && (
        <Col md={5} xs={12}>
          <label className="pb-2 fs-14 text-dark">
            {t("order_view.select_tools")} <sup className="text-danger">*</sup>
          </label>
          <ProductsTools
            key={`ordered-tools-select-${toolsSelectResetKey}`}
            defaultToolsList={toolsOrdered}
            setToolsList={getToolsParam}
            multiSelect={true}
            className="nestedList-dropdownRenderer regionDropDownList filter-select-dropDown toolListDrop"
            placeholder={"Select Tools"}
            customRenderSelection={true}
            searchable={true}
            lockedToolIds={lockedToolIds}
            disabled={false}
          />
          {errorMsg && errorMsg[`tools.toolsDetails[${index}].toolsId`] && (
            <div className="text-danger small mt-1">
              {errorMsg[`tools.toolsDetails[${index}].toolsId`]}
            </div>
          )}
        </Col>
      )}

      {toolsOrdered?.length > 0 && (
        <Col xs={12}>
          <label className="mt-3">Tools Selected</label>
          <div className="d-flex flex-row flex-wrap gap-3 mt-2">
            {toolsOrdered.map((tool) => (
              <div
                key={tool.toolId}
                className={`tool-name ${isToolLocked(tool.toolId) ? "locked-tool" : ""}`}
              >
                {tool.toolName}
                {!isToolLocked(tool.toolId) && (
                  <div
                    className="icon-close-icon close_icon btn btn-0 border-0 m-0 p-0"
                    onClick={() => removeUnlockedToolChip(tool.toolId)}
                    title="Remove newly added tool"
                  />
                )}
              </div>
            ))}
          </div>
        </Col>
      )}
      {showLanguage && (
        <>
          <Col lg={5} md={5} xs={10} className="mt-3 d-flex flex-column">
            <Form.Label htmlFor={"01"} className="fs-14">
              {"Languages"} <sup className="text-danger">*</sup>
            </Form.Label>
            <SelectDropDown
              multi={true}
              options={languages}
              labelField={"languageName"}
              valueField={"languageId"}
              searchable={true}
              values={toolsLanguages}
              onChange={(e) => handlesChangeToolsLanguages(e)}
              placeholder={`Choose ${"Language"}`}
              className="multiple-select"
              optionType={"checkbox"}
              nestedList={false}
              disabled={false}
              dropdownPosition="auto"
              errorMsg={errorMsg?.["tools.language"]}
            />
            {errorMsg && errorMsg["tools.language"] && (
              <div className="text-danger small mt-1">
                {errorMsg["tools.language"]}
              </div>
            )}
          </Col>
          {toolsLanguages?.length > 0 && (
            <Col xs={12}>
              <label className="mt-3">Language Selected</label>
              <div className="d-flex flex-row flex-wrap gap-3 mt-2">
                {toolsLanguages?.map((lang, i) => (
                  <div key={i} className={`tool-name`}>
                    {lang.languageName}
                    <div
                      className="icon-close-icon close_icon btn btn-0 border-0 m-0 p-0"
                      onClick={() => handlesChangeRemovedToolsLanguages(lang)}
                    />
                  </div>
                ))}
              </div>
            </Col>
          )}

          {/* CURRENCY DROPDOWN */}
          <Col lg={5} md={5} xs={10} className="mt-3 d-flex flex-column">
            <Form.Label htmlFor={"01"} className="fs-14">
              {"Currency"}
            </Form.Label>
            <SelectDropDown
              multi={true}
              options={currencyList}
              labelField={"currency_name"}
              valueField={"currency_id"}
              searchable={true}
              values={toolsCurrency}
              onChange={(e) => handlesChangeToolsCurrency(e)}
              placeholder={`Choose ${"Currency"}`}
              className="multiple-select"
              optionType={"checkbox"}
              nestedList={false}
              disabled={false}
              dropdownPosition="auto"
              errorMsg={errorMsg?.["tools.currency"]}
            />
          </Col>
          {toolsCurrency?.length > 0 && (
            <Col xs={12}>
              <label className="mt-3">Currency Selected</label>
              <div className="d-flex flex-row flex-wrap gap-3 mt-2">
                {toolsCurrency?.map((currency, i) => (
                  <div key={i} className={`tool-name`}>
                    {currency.currency_name}
                    <div
                      className="icon-close-icon close_icon btn btn-0 border-0 m-0 p-0"
                      onClick={() =>
                        handlesChangeRemovedToolsCurrency(currency)
                      }
                    />
                  </div>
                ))}
              </div>
            </Col>
          )}
        </>
      )}
      {showPackage && (
        <Col md={12} xs={12}>
          <label className="mt-3 mb-2">
            Choose Package <sup className="text-danger">*</sup>
          </label>
          <div className="d-flex flex-row gap-3 pb-4 mx-auto packageRow flex-wrap">
            {packageList?.data &&
              packageList?.data.map((item, i) => (
                <button
                  key={i}
                  className={`d-flex flex-row gap-1  fs-14 
                            ${selectedPackage === item?.status_id
                      ? "activePackage"
                      : "inActivePackage"
                    }`}
                  onClick={() => {
                    handleChangePackage(item);
                  }}
                  disabled={
                    toolsOrdered?.length === 0 ||
                      disabledList.includes(
                        `tools.toolsDetails[${index}].toolsId`
                      )
                      ? true
                      : false
                  }
                >
                  {selectedPackage === item?.status_id ? (
                    <img src={DoneRing} alt="DoneRing" />
                  ) : (
                    <span>+</span>
                  )}
                  {item?.name}
                </button>
              ))}
          </div>
          {errorMsg && errorMsg[`tools.toolsDetails[${index}].package`] && (
            <div className="text-danger small mt-1">
              {errorMsg[`tools.toolsDetails[${index}].package`]}
            </div>
          )}
        </Col>
      )}
    </Fragment>
  );
};

export default OrderedToolsPackage;

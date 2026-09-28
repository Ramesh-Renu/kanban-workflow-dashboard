import React, { useCallback, useEffect, useRef, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import CompanyDetailsForm from "./CompanyDetailsForm";
import "styles/pages/ticketCreationForm.scss";
import { OrderDetailsForm } from "./OrderDetailsForm";
import BrandingGuideLines from "./BrandingGuideLines/index";
import { useGlobalMaster, useToast } from "@orion/shared";
import {
  updateTicketDetails,
  getTicketDetails,
  updateOrderInfoDetails,
  addToolToExistingOrder,
  updateBrandingGuidelines,
} from "../../../../services";
import {
  buildBrandingGuidelinesFormData,
  parseDeletedAttachmentsFromApi,
  buildBrandingPayload,
  extractLegacyBrandingForUpdateTicket,
  resolveBrandingForUpdateTicket,
  isBrandingV2Dirty,
  isBrandingGuidelinesDirty,
  isBrandingGuidelineNotesDirty,
  getBrandingV2ChangedSections,
  getMissingRequiredFields,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useGlobalContext } from "store/context/GlobalProvider";
import PopupModal from "@orion/shared/src/components/PopupModal";
import appConstants from "../../../../constant/common";
import { renderOrderType } from "../../../../utils/common";
import DocumentsContainer from "./DocumentsContainer";

const TicketFormContainer = ({ companyData, tabName }) => {
  const navigate = useNavigate();
  const { dispatch } = useGlobalContext();
  const route = useLocation();
  const [enableTab, setEnableTab] = useState([]);
  const formRef = useRef();
  const brandingSaveRef = useRef(null);
  const navId = useParams();

  const appendBrandingToUpdateParam = (paramData, formData, baselineData, updateType) => {
    const brandingPayload = resolveBrandingForUpdateTicket({
      branding: formData?.branding,
      baselineBranding: baselineData?.branding,
      updateType,
    });
    if (brandingPayload !== undefined) {
      paramData.branding = brandingPayload;
    }
    return paramData;
  };

  const getBrandingV2StateFromForm = (data) => {
    const payload = buildBrandingPayload(data?.branding || {});
    return {
      sections: payload.sections,
      commentsBySection: payload.commentsBySection,
      guidelineNotes: payload.guidelineNotes ?? "",
      pendingAttachments: data?.branding?.v2PendingAttachments || {},
      pendingTypographyFontFiles: data?.branding?.v2PendingTypographyFontFiles || {},
      deletedAttachmentIds: parseDeletedAttachmentsFromApi(
        data?.branding?.v2DeletedAttachmentIds ?? data?.branding?.deleted_attachments,
      ),
      deletedFontBlobNames: data?.branding?.v2DeletedFontBlobNames || [],
    };
  };

  const isBrandingV2Changed = () => {
    if (brandingSaveRef.current?.isBrandingV2Dirty?.()) return true;
    const current = getBrandingV2StateFromForm(formDataMap);
    const baseline = getBrandingV2StateFromForm(tempCompanyData);
    baseline.pendingAttachments = {};
    baseline.deletedAttachmentIds = [];
    return isBrandingV2Dirty(current, baseline);
  };

  const isBrandingGuidelinesChanged = () => {
    if (brandingSaveRef.current?.isBrandingGuidelinesDirty?.()) return true;
    const current = getBrandingV2StateFromForm(formDataMap);
    const baseline = getBrandingV2StateFromForm(tempCompanyData);
    baseline.pendingAttachments = {};
    baseline.pendingTypographyFontFiles = {};
    baseline.deletedAttachmentIds = [];
    return isBrandingGuidelinesDirty(current, baseline);
  };

  const buildBrandingFormDataForSave = () => {
    if (brandingSaveRef.current?.buildBrandingSaveFormData) {
      return brandingSaveRef.current.buildBrandingSaveFormData();
    }
    const state = getBrandingV2StateFromForm(formDataMap);
    const baseline = getBrandingV2StateFromForm(tempCompanyData);
    baseline.pendingAttachments = {};
    baseline.deletedAttachmentIds = [];
    if (!isBrandingGuidelinesDirty(state, baseline)) {
      return null;
    }
    const changedSectionIds = getBrandingV2ChangedSections(state, baseline);
    const guidelineNotesChanged = isBrandingGuidelineNotesDirty(state, baseline);

    return buildBrandingGuidelinesFormData({
      orderId: formDataMap.orderId,
      sections: state.sections,
      pendingAttachments: state.pendingAttachments,
      pendingTypographyFontFiles: state.pendingTypographyFontFiles,
      deletedAttachmentIds: state.deletedAttachmentIds,
      guidelineNotes: state.guidelineNotes ?? "",
      changedSectionIds,
      guidelineNotesChanged,
    });
  };

  /** VARIABLE DECLARATIONS */
  const {
    orderType,
    orderCategory,
    countryList,
    marketRegionList,
    regionList,
    languageList,
    industriesList,
    currencyList,
    getOrderType,
    getOrderCategory,
    packageList,
    getPackageList,
    getCountryList,
    getMarketRegionList,
    getRegionList,
    getLanguageList,
    getIndustriesList,
    getCurrencyList,
  } = useGlobalMaster();

  const [validationCheck, setValidationCheck] = useState(false);
  const [errorExist, setErrorExist] = useState(null);
  const [errorList, setErrorList] = useState([]);
  const [formDataMap, setFormDataMap] = useState(companyData || {});
  const [tempCompanyData, setTempCompanyData] = useState(companyData || {});
  const setBrandingFormData = useCallback((updateFn) => {
    setFormDataMap((prev) => {
      const current = prev || {};
      const updated = typeof updateFn === "function" ? updateFn(current) : updateFn;
      if (updated === current || updated === prev) return prev;
      return { ...prev, ...updated };
    });
  }, []);
  const mergeFormDataUpdate = useCallback((updateFn) => {
    setFormDataMap((prev) => {
      const current = prev || {};
      const updated =
        typeof updateFn === "function" ? updateFn(current) : updateFn;
      if (updated === current || updated === prev) return prev;
      return { ...prev, ...updated };
    });
  }, []);
  const { showToast } = useToast();
  const [selectedForm, setSelectedForm] = useState([]);
  const [currentForm, setCurrentForm] = useState(0);
  const [currentToolForm, setCurrentToolForm] = useState(0);
  const [showRemoveFieldMsg, setShowRemoveFieldMsg] = useState(false);
  const [enableToolTab, setEnableToolTab] = useState([]);
  const [selectedToolForm, setSelectedToolForm] = useState([]);
  const [showToolListTab, setShowToolListTab] = useState(false);
  const [cannotEidit, setCannotEidit] = useState([]);
  const [canClickEditButton, setCanClickEditButton] = useState(false);
  const [apiloading, setApiloading] = useState(false);
  const [apiSaveloading, setApiSaveloading] = useState(false);
  const [apiNextBtnloading, setApiNextBtnloading] = useState(false);

  useEffect(() => {
    setValidationCheck(false);
    if (!orderType?.loading && orderType?.data?.length === 0) {
      getOrderType();
    }
    if (!orderCategory?.loading && orderCategory?.data.length === 0) {
      getOrderCategory();
    }
    if (!packageList?.loading && packageList?.data?.length === 0) {
      getPackageList();
    }
    if (!countryList?.loading && countryList?.data?.length === 0) {
      getCountryList();
    }
    if (!marketRegionList?.loading && marketRegionList?.data?.length === 0) {
      getMarketRegionList();
    }
    if (!regionList?.loading && regionList?.data?.length === 0) {
      getRegionList();
    }
    if (!languageList?.loading && languageList?.data?.length === 0) {
      getLanguageList();
    }
    if (!industriesList?.loading && industriesList?.data?.length === 0) {
      getIndustriesList();
    }
    if (!currencyList?.loading && currencyList?.data?.length === 0) {
      getCurrencyList();
    }
  }, []);

  const isSame = () => {
    const currentType = getNametoUpdate.find(
      (tab) => tab.name === selectedForm?.name,
    )?.key;
    if (currentType === "Order_Info") {
      return deepEqual(formDataMap.orderInfo, tempCompanyData.orderInfo);
    } else if (currentType === "Company_Info") {
      return (
        deepEqual(formDataMap.companyInfo, tempCompanyData.companyInfo) &&
        deepEqual(formDataMap.contactForm, tempCompanyData.contactForm)
      );
    } else if (currentType === "Branding") {
      const legacySame = deepEqual(
        extractLegacyBrandingForUpdateTicket(formDataMap.branding),
        extractLegacyBrandingForUpdateTicket(tempCompanyData.branding),
      );
      return legacySame && !isBrandingV2Changed();
    }
    return true;
  };
  const saved = localStorage.getItem("workspaceState");
  const parsed = JSON.parse(saved);
  const { activeWorkSpace, activeBoard } = parsed || {};

  const activeBoardCode = activeBoard?.[0]?.code;

  useEffect(() => {
    setTempCompanyData(companyData);
    setFormDataMap(companyData);
    isSame();
    const key = companyData?.isProcessOrder ? activeBoardCode + "CanNotEditField" : "";
    const fields =
      appConstants[key]?.[selectedForm.length === 0 ? tabName.id : selectedForm.id]
        ?.fields || [];
    setCannotEidit(fields);
  }, [companyData]);

  const isObject = (obj) => obj && typeof obj === "object" && !Array.isArray(obj);

  const deepEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== typeof obj2) return false;

    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) return false;
      for (let i = 0; i < obj1.length; i++) {
        if (!deepEqual(obj1[i], obj2[i])) return false;
      }
      return true;
    }

    if (isObject(obj1) && isObject(obj2)) {
      const keys1 = Object.keys(obj1).filter((key) => key !== "disabled");
      const keys2 = Object.keys(obj2).filter((key) => key !== "disabled");

      if (keys1.length !== keys2.length) return false;

      for (let key of keys1) {
        if (!deepEqual(obj1[key], obj2[key])) return false;
      }

      return true;
    }

    return false;
  };

  const getOrderToolsDetails = (orderInfo) =>
    orderInfo?.tools?.toolsDetails || orderInfo?.toolsDetails || [];

  /** True when the order already has at least one tool saved (baseline / API data). */
  const orderHasExistingTools = (orderInfo) =>
    (getOrderToolsDetails(orderInfo) || []).some(
      (detail) => Array.isArray(detail?.toolsId) && detail.toolsId.length > 0,
    );

  const buildNewlyAddedToolsPayload = (currentOrderInfo, originalOrderInfo) => {
    const currentDetails = getOrderToolsDetails(currentOrderInfo);
    const originalDetails = getOrderToolsDetails(originalOrderInfo);

    return (currentDetails || [])
      .map((current) => {
        const currentOrderType = Number(current?.orderType?.[0]);
        const original =
          (originalDetails || []).find(
            (item) => Number(item?.orderType?.[0]) === currentOrderType,
          ) || {};
        const originalIds = (original?.toolsId || []).map(Number);
        const newlyAddedIds = (current?.toolsId || [])
          .map(Number)
          .filter((id) => id && !originalIds.includes(id));

        if (!newlyAddedIds.length) return null;

        return {
          package: current?.package || [],
          orderType: current?.orderType || [],
          toolsId: newlyAddedIds,
        };
      })
      .filter(Boolean);
  };

  /**
   * Build orderInfo for add-order-detail when the order already has tools:
   * keep original toolsDetails so newly selected tools are NOT sent on that API.
   */
  const buildOrderInfoWithoutNewlyAddedTools = (
    currentOrderInfo,
    originalOrderInfo,
  ) => {
    const originalDetails = getOrderToolsDetails(originalOrderInfo);
    if (!currentOrderInfo?.tools) {
      return {
        ...currentOrderInfo,
        toolsDetails: originalDetails,
      };
    }
    return {
      ...currentOrderInfo,
      tools: {
        ...currentOrderInfo.tools,
        toolsDetails: originalDetails,
      },
    };
  };

  const fetchTicketData = async (apiName, clickedButton, updateParam) => {
    setApiloading(true);
    if (clickedButton === "SaveClose") {
      setApiSaveloading(true);
    } else if (clickedButton === "Next") {
      setApiNextBtnloading(true);
    }
    const clearLoading = () => {
      setApiNextBtnloading(false);
      setApiSaveloading(false);
      setApiloading(false);
    };
    try {
      let response;

      if (apiName === "Order_Info") {
        // Tool APIs differ by whether the order already has tools:
        // - no existing tool  → add-order-detail (first-time only)
        // - already has tools → addtooltoexistingorder for new tools (never add-order-detail for those)
        const hasExistingTools = orderHasExistingTools(tempCompanyData?.orderInfo);
        const newlyAddedTools = buildNewlyAddedToolsPayload(
          formDataMap?.orderInfo,
          tempCompanyData?.orderInfo,
        );

        if (!hasExistingTools) {
          // Scenario: first tool addition on this order → add-order-detail only
          response = await updateOrderInfoDetails(updateParam);
          if (!response?.data?.status) {
            showToast({
              message: response?.data?.message || "Update failed",
              variant: "danger",
            });
            clearLoading();
            return;
          }
          showToast({
            message: response.data.message,
            variant: "success",
          });
        } else {
          // Order already has tool(s). Do not send newly added tools via add-order-detail.
          const orderInfoForDetailApi = buildOrderInfoWithoutNewlyAddedTools(
            updateParam.orderInfo,
            tempCompanyData?.orderInfo,
          );
          const hasNonToolOrderInfoChanges = !deepEqual(
            orderInfoForDetailApi,
            tempCompanyData?.orderInfo,
          );

          if (hasNonToolOrderInfoChanges) {
            response = await updateOrderInfoDetails({
              ...updateParam,
              orderInfo: orderInfoForDetailApi,
            });
            if (!response?.data?.status) {
              showToast({
                message: response?.data?.message || "Update failed",
                variant: "danger",
              });
              clearLoading();
              return;
            }
          }

          if (newlyAddedTools.length > 0) {
            // Subsequent tool selection/addition → addtooltoexistingorder only
            const addToolsRes = await addToolToExistingOrder({
              orderId: updateParam.orderId || formDataMap.orderId,
              toolsDetails: newlyAddedTools,
            });
            if (!addToolsRes?.data?.status) {
              showToast({
                message:
                  addToolsRes?.data?.message ||
                  "Order updated, but new tool(s) could not be added.",
                variant: "danger",
              });
              clearLoading();
              return;
            }
            response = addToolsRes;
            showToast({
              message:
                addToolsRes?.data?.message ||
                "Tool(s) added successfully.",
              variant: "success",
            });
          } else if (response?.data?.status) {
            showToast({
              message: response.data.message,
              variant: "success",
            });
          } else if (!hasNonToolOrderInfoChanges) {
            // No API call needed (should be rare if isSame() already gated saves)
            showToast({
              message: "No changes to save",
              variant: "success",
            });
          }
        }
      } else {
        response = await updateTicketDetails(updateParam);

        if (!response?.data?.status) {
          showToast({
            message: response?.data?.message || "Update failed",
            variant: "danger",
          });
          clearLoading();
          return;
        }

        showToast({
          message: response.data.message,
          variant: "success",
        });
      }

      if (isBrandingGuidelinesChanged()) {
        if (!runBrandingValidation()) {
          clearLoading();
          scrollFormToTop();
          return;
        }
        const brandingFormData = buildBrandingFormDataForSave();
        if (brandingFormData) {
          try {
            const brandingRes = await updateBrandingGuidelines(brandingFormData);
            const brandingOk =
              brandingRes?.status === true || brandingRes?.data?.status === true;
            if (!brandingOk) {
              showToast({
                message:
                  brandingRes?.message ||
                  brandingRes?.data?.message ||
                  "Branding guidelines could not be saved.",
                variant: "danger",
              });
              clearLoading();
              return;
            }
            brandingSaveRef.current?.resetBrandingBaseline?.();
          } catch (brandingError) {
            showToast({
              message:
                brandingError?.message || "Branding guidelines could not be saved.",
              variant: "danger",
            });
            clearLoading();
            return;
          }
        }
      }

      const ticketRes = await getTicketDetails({
        ticketId: updateParam.orderId,
        boardID: activeBoard?.[0]?.boardID,
      });
      if (ticketRes?.status) {
        dispatch({ type: "SET_TICKET_DETAILS", payload: ticketRes.data });
        const refreshed = ticketRes.data?.orderTicketDetails;
        if (refreshed) {
          setTempCompanyData(refreshed);
          setFormDataMap(refreshed);
        }
      }

      setValidationCheck(false);
      clearLoading();

      const nextIndex = currentForm + 1;
      if (clickedButton === "SaveClose") {
        navigate(`${route.pathname}`, {
          state: {
            orderData: { orderId: formDataMap.orderId },
            isEditable: false,
          },
        });
      } else if (clickedButton === "Next") {
        if (nextIndex < buttonProps?.length) {
          if (buttonProps[nextIndex].subLevel) {
            setSelectedForm(buttonProps[nextIndex]);
            setShowToolListTab(true);
            setSelectedToolForm(toolListButton[0]);
          } else if (!showToolListTab) {
            setSelectedForm(buttonProps[nextIndex]);
          }
        }
      }
    } catch (error) {
      showToast({
        message: error?.message || String(error),
        variant: "danger",
      });
      clearLoading();
    }
  };

  const getValueByPath = (obj, path) => {
    try {
      return path
        .replace(/\[(\d+)\]/g, ".$1") // convert [0] to .0
        .split(".")
        .reduce((acc, part) => acc?.[part], obj);
    } catch (e) {
      return undefined;
    }
  };

  const isPathIndexValid = (obj, path) => {
    const arrayIndexMatch = path?.match(/\[(\d+)\]/);
    if (!arrayIndexMatch) return true; // no index in path — it's valid

    const index = parseInt(arrayIndexMatch[1], 10);
    const arrayPath = path?.substring(0, path.indexOf("[")); // eg: tools.toolsDetails
    const arrayValue = getValueByPath(obj, arrayPath);
    return Array.isArray(arrayValue) && index < arrayValue?.length;
  };

  const handleMandatoryFieldCheck = (currentStep, originalData) => {
    // if (
    //   originalData?.tools &&
    //   originalData?.tools?.toolsDetails?.length === 1 &&
    //   originalData?.tools?.toolsDetails?.some((data) =>
    //     data.orderType?.includes(18)
    //   )
    // ) {
    //   return {
    //     isValid: true,
    //     missingFields: {},
    //   };
    // }
    const missingFields = {};
    const fields = Array.isArray(currentStep.fields) ? currentStep.fields : [];

    for (const field of fields) {
      // If field path includes index, ensure the array at that index exists
      if (!isPathIndexValid(originalData, field)) continue;
      const value = getValueByPath(originalData, field);
      const isValid =
        value !== null &&
        value !== undefined &&
        (typeof value === "string" ? value.trim().length > 0 : true) &&
        (!Array.isArray(value) || value.length > 0);
      if (!isValid) {
        missingFields[field] = true;
      }
    }
    return {
      isValid: Object.keys(missingFields).length === 0,
      missingFields,
    };
  };

  const toolListButton = [
    {
      errorKey: "scrollingTicker",
      name: "Scrolling Ticker",
      subLevel: true,
      id: 11,
    },
    {
      errorKey: "staticTicker",
      name: "Static Ticker",
      subLevel: true,
      id: 12,
    },
    {
      errorKey: "tickerChart",
      name: "Ticker Chart",
      subLevel: true,
      id: 13,
    },
    {
      errorKey: "imageTicker",
      name: "Image Ticker",
      subLevel: true,
      id: 14,
    },
    {
      errorKey: "shareGraph",
      name: "Share Graph",
      subLevel: true,
      id: 15,
    },
    {
      errorKey: "sharePriceLookUp",
      name: "Share Price Look-up",
      subLevel: true,
      id: 16,
    },
    {
      errorKey: "Fragulizer",
      name: "Fragulizer",
      subLevel: true,
      id: 17,
    },
    {
      errorKey: "shareAlerts",
      name: "Share Alerts",
      subLevel: true,
      id: 18,
    },
    {
      errorKey: "investmentCalculator",
      name: "Investment Calculator",
      subLevel: true,
      id: 19,
    },
    {
      errorKey: "totalShareholdersReturn",
      name: "Total Shareholders Return",
      subLevel: true,
      id: 20,
    },
    {
      errorKey: "companyAnnouncements",
      name: "Company Announcements",
      subLevel: true,
      id: 21,
    },
    {
      errorKey: "financialCalendar",
      name: "Financial Calendar",
      subLevel: true,
      id: 22,
    },
    {
      errorKey: "interactiveAnalysisTool",
      name: "Interactive Analysis Tool",
      subLevel: true,
      id: 23,
    },
    {
      errorKey: "factSheet",
      name: "Fact Sheet",
      subLevel: true,
      id: 24,
    },
    {
      errorKey: "majorShareHolderReturn",
      name: "Major Share holder Return",
      subLevel: true,
      id: 25,
    },
    {
      errorKey: "financialCalendarTicker",
      name: "Financial Calendar Ticker",
      subLevel: true,
      id: 26,
    },
    {
      errorKey: "companyAnoucementTicker",
      name: "Company Anoucement Ticker",

      id: 27,
    },
  ];

  const buttonProps = [
    {
      errorKey: "companyInfo",
      name: "Company Information",
      subLevel: false,
      renderComponent: (
        setSelectedForm,
        validationCheck,
        setErrorExist,
        cannotEidit,
        errorList,
        formDataMap,
      ) => {
        return (
          <CompanyDetailsForm
            key={tabName.id}
            regionList={regionList?.data}
            customerLanguageList={languageList?.data}
            marketRegionList={marketRegionList?.data}
            industryData={industriesList?.data}
            countryList={countryList?.data}
            setSelectedForm={setSelectedForm}
            formData={formDataMap || null}
            validationCheck={validationCheck}
            errorList={errorList} // ✅ pass errorList
            setErrorExist={setErrorExist}
            setCannotEidit={cannotEidit}
            setFormData={mergeFormDataUpdate}
          />
        );
      },
      id: 1,
    },
    {
      errorKey: "orderInfo",
      name: "Order Details",
      subLevel: false,
      renderComponent: (
        setSelectedForm,
        validationCheck,
        setErrorExist,
        cannotEidit,
        errorList,
        formDataMap,
      ) => (
        <OrderDetailsForm
          key={tabName.id}
          setSelectedForm={setSelectedForm}
          companyData={tempCompanyData}
          orderType={orderType?.data}
          customerLanguageList={languageList?.data}
          customerCurrencyList={currencyList?.data}
          formData={formDataMap || null}
          validationCheck={validationCheck}
          removeValidation={() => setValidationCheck(false)}
          setErrorExist={setErrorExist}
          setCannotEidit={cannotEidit}
          errorList={errorList} // ✅ pass errorList
          setFormData={mergeFormDataUpdate}
          // handleOrderTicketUpdate={handleOrderTicketUpdate}
        />
      ),
      id: 2,
    },
    // {
    //   errorKey: "toolsInformation",
    //   name: "Tools Information",
    //   subLevel: true,
    //   renderComponent: (
    //     setSelectedForm,
    //     validationCheck,
    //     setErrorExist,
    //     errorList,
    //     formDataMap,
    //     selectedToolForm
    //   ) => (
    //     <ToolsInformation
    //       key={tabName.id}
    //       setSelectedForm={setSelectedForm}
    //       selectedToolForm={selectedToolForm}
    //       companyData={companyData}
    //       validationCheck={validationCheck}
    //       formData={formDataMap || null}
    //       setErrorExist={setErrorExist}
    //       errorList={errorList} // ✅ pass errorList
    //       setFormData={(updateFn) => {
    //         setFormDataMap((prev) => {
    //           const current = prev || {};
    //           const updated =
    //             typeof updateFn === "function" ? updateFn(current) : updateFn;
    //           return {
    //             ...prev,
    //             ...updated,
    //           };
    //         });
    //       }}
    //     />
    //   ),
    //   id: 3,
    // },
    // {
    // errorKey: "marketDetails",
    //   name: "Market Details",
    // subLevel: false,
    //   renderComponent: (setSelectedForm) => (
    //     <MarketDetailsForm setSelectedForm={setSelectedForm} />
    //   ),
    // id: 4
    // },

    {
      errorKey: "branding",
      name: "Branding Guidelines",
      subLevel: false,
      renderComponent: (
        setSelectedForm,
        validationCheck,
        setErrorExist,
        cannotEidit,
        errorList,
        formDataMap,
      ) => (
        <BrandingGuideLines
          ref={brandingSaveRef}
          key={tabName.id}
          validationCheck={validationCheck}
          formData={formDataMap || null}
          setErrorExist={setErrorExist}
          setCannotEidit={cannotEidit}
          setFormData={setBrandingFormData}
        />
      ),
      id: 5,
    },
    // {
    // errorKey: "templates",
    // subLevel: false,
    //   name: "Templates",
    // },
    // id: 6
    {
      errorKey: "documents",
      name: "Documents",
      subLevel: false,
      renderComponent: (
        setSelectedForm,
        validationCheck,
        setErrorExist,
        cannotEidit,
        errorList,
        formDataMap,
      ) => (
        <DocumentsContainer
          key={tabName.id}
          setSelectedForm={setSelectedForm}
          companyData={companyData}
          formData={formDataMap || null}
          setCannotEidit={cannotEidit}
          setFormData={mergeFormDataUpdate}
        />
      ),
      id: 7,
    },
  ];

  const scrollFormToTop = () => {
    if (formRef?.current) {
      formRef.current.scrollTo({
        top: formRef.current.offsetTop,
        behavior: "smooth",
      });
    }
  };

  const focusBrandingTab = () => {
    const brandingTab = buttonProps.find((tab) => tab.errorKey === "branding");
    if (brandingTab) {
      setSelectedForm(brandingTab);
      setShowToolListTab(false);
    }
  };

  const runBrandingValidation = () => {
    if (brandingSaveRef.current?.validateBrandingForm) {
      return brandingSaveRef.current.validateBrandingForm();
    }
    const current = getBrandingV2StateFromForm(formDataMap);
    const missing = getMissingRequiredFields({
      sections: current.sections,
      deletedAttachmentIds: current.deletedAttachmentIds,
      pendingTypographyFontFiles: current.pendingTypographyFontFiles,
      deletedFontBlobNames: current.deletedFontBlobNames,
    });
    if (missing.length > 0) {
      focusBrandingTab();
      setValidationCheck(true);
    }
    return missing.length === 0;
  };

  const shouldValidateBranding = () =>
    selectedForm?.errorKey === "branding" || isBrandingGuidelinesChanged();

  /** ACTIVATE FORM ONCE MASTER DATA AVAILABLE */
  useEffect(() => {
    if (regionList?.data && languageList?.data) {
      if (tabName) {
        updateSelectedForm(tabName);
      } else {
        if (!showToolListTab) {
          setSelectedForm(buttonProps[0]);
        } else {
          setSelectedForm(buttonProps[2]);
        }
      }
    } else {
      updateSelectedForm(tabName);
    }
  }, [regionList, languageList, tabName]);

  const getNametoUpdate = [
    { name: "Company Information", key: "Company_Info" },
    { name: "Order Details", key: "Order_Info" },
    { name: "Branding Guidelines", key: "Branding" },
  ];

  // When the user comes from the Order View section, update the side nav so the relevant link is marked as active.

  const updateSelectedForm = (tabName) => {
    if (!showToolListTab) {
      setSelectedForm(buttonProps.filter((tab) => tab.id === tabName.id)[0]);
    } else {
      setSelectedForm(buttonProps.filter((tab) => tab.id === 3)[0]);
    }
  };

  /** AFTER CANCEL ACTION GOTO OVERVIEW PAGE */
  const handleGotoOverviewButton = () => {
    navigate(`${route.pathname}`, {
      state: {
        orderData: { orderId: formDataMap?.orderId },
        isEditable: false,
      },
    });
  };
  const hasFormChanges = () => !isSame() || isBrandingV2Changed();

  const handleTiggerAPIFormData = (tabButtom, getParamData) => {
    const nextIndex = currentForm + 1;
    if (!hasFormChanges()) {
      if (nextIndex < buttonProps?.length) {
        if (buttonProps[nextIndex].subLevel) {
          setSelectedForm(buttonProps[nextIndex]);
          setShowToolListTab(true);
          setSelectedToolForm(toolListButton[0]);
        } else if (!showToolListTab) {
          setSelectedForm(buttonProps[nextIndex]);
        }
      }
      return;
    }
    if (!isSame() && getParamData?.type === "Order_Info") {
      const paramData = {
        orderId: companyData.orderId,
        orderInfo: getParamData.orderInfo,
      };
      fetchTicketData("Order_Info", tabButtom, paramData);
    } else {
      fetchTicketData(getParamData?.type, tabButtom, getParamData);
    }
  };
  /** CANCEL BUTTON ACTION CALL */
  const handleCancelFormData = () => {
    if (!isSame()) {
      setShowRemoveFieldMsg(true);
    } else {
      setShowRemoveFieldMsg(false);
      handleGotoOverviewButton();
    }
  };

  const closeModal = () => {
    setShowRemoveFieldMsg(false);
  };
  function getFields(formId, companyData) {
    const config = appConstants.orderCreationMandatoryField[formId];
    if (!config) return { fields: [], tab_restiction: [] };

    const fields =
      typeof config.fields === "function"
        ? config.fields(companyData)
        : config.fields || [];
    return {
      fields,
      tab_restiction: config.tab_restiction || [],
    };
  }

  /** NEXT BUTTON ACTION WITH VALIDATION CALL */
  const updateFormDataNext = () => {
    const currentStep =
      activeBoardCode === "SA"
        ? getFields(selectedForm.id, companyData)
        : appConstants.OBMandatoryField[selectedForm.id];
    const { isValid, missingFields } = handleMandatoryFieldCheck(
      currentStep,
      formDataMap?.[selectedForm.errorKey],
    );
    const key = companyData?.isProcessOrder ? activeBoardCode + "CanNotEditField" : "";
    const fields =
      appConstants[key]?.[isValid ? selectedForm.id + 1 : selectedForm.id]?.fields || [];
    setCannotEidit(fields);
    setErrorList(missingFields);
    const brandingValid = shouldValidateBranding() ? runBrandingValidation() : true;
    const canProceed = isValid && brandingValid;
    setValidationCheck(!canProceed);
    setCurrentToolForm(0);
    if (canProceed) {
      if (!showToolListTab) {
        const updateType = getNametoUpdate?.find(
          (tab) => tab?.name === selectedForm?.name,
        )?.key;
        const paramData = appendBrandingToUpdateParam(
          {
            orderId: formDataMap.orderId,
            type: updateType,
            companyInfo: formDataMap.companyInfo,
            contactForm: formDataMap.contactForm,
            orderInfo: formDataMap.orderInfo,
          },
          formDataMap,
          tempCompanyData,
          updateType,
        );
        handleTiggerAPIFormData("Next", paramData);
      }
    } else {
      scrollFormToTop();
    }
  };

  /** TOOL NEXT BUTTON ACTION WITH VALIDATION CALL */
  const updateToolDataNext = () => {
    const nextIndex = currentToolForm + 1;
    if (nextIndex < toolListButton?.length) {
      setSelectedToolForm(toolListButton[nextIndex]);
      setCurrentToolForm(nextIndex);
    } else {
      setShowToolListTab(false);
    }
  };

  /** SAVE AND CLOSE BUTTON ACTION WITH VALIDATION CALL */
  const handleSaveClose = () => {
    if (shouldValidateBranding() && !runBrandingValidation()) {
      scrollFormToTop();
      return;
    }

    const updateType = getNametoUpdate.find((tab) => tab.name === selectedForm?.name).key;
    const paramData = appendBrandingToUpdateParam(
      {
        orderId: formDataMap.orderId,
        type: updateType,
        companyInfo: formDataMap.companyInfo,
        contactForm: formDataMap.contactForm,
        orderInfo: formDataMap.orderInfo,
      },
      formDataMap,
      tempCompanyData,
      updateType,
    );

    if (!hasFormChanges()) {
      return;
    }
    handleTiggerAPIFormData("SaveClose", paramData);
  };

  /** ACTIVE FORM */
  useEffect(() => {
    const currentIndex = buttonProps.findIndex(
      (button) => button?.name === selectedForm?.name,
    );
    setCurrentForm(currentIndex);
  }, [selectedForm]);

  /** ACTIVE FORM */
  // useEffect(() => {
  //   const currentIndex = buttonProps.findIndex(
  //     (button) => button?.name === selectedToolForm?.name
  //   );
  //   setSelectedToolForm(currentIndex);
  // }, [selectedToolForm]);

  useEffect(() => {
    // appConstants.orderCreationMandatoryField[]
    const currentStep =
      activeBoardCode === "SA"
        ? getFields(selectedForm.id, companyData)
        : appConstants.OBMandatoryField[selectedForm.id];
    // Fallback if step is undefined
    if (!currentStep || !currentStep.fields) {
      setEnableTab([]);
      return;
    }
    const { isValid, missingFields } = handleMandatoryFieldCheck(
      currentStep,
      formDataMap?.[selectedForm.errorKey],
    );

    const key = companyData?.isProcessOrder ? "canClickEditButton" : "";
    setCanClickEditButton(appConstants[key]?.includes(activeBoardCode));
    setEnableTab(isValid ? [] : currentStep.tab_restiction); // true if all fields are filled
  }, [companyData, selectedForm]);
  const shouldRender =
    typeof selectedForm.renderComponent === "function" &&
    Object.keys(formDataMap).length !== 0 &&
    Number(navId.orderId) === Number(formDataMap.orderId);
  //  &&
  //  errorList;
  const handleChangeButtonName = (button) => {
    const key = companyData?.isProcessOrder ? activeBoardCode + "CanNotEditField" : "";
    const fields = appConstants[key]?.[button.id]?.fields || [];
    setCannotEidit(fields);
    if (button.id !== 3) {
      setSelectedForm(button);
      setShowToolListTab(false);
    } else {
      setSelectedForm(button);
      setShowToolListTab(true);
      setSelectedToolForm(toolListButton[0]);
    }
  };
  const handleChangeToolButton = () => {
    setShowToolListTab(!showToolListTab);
    setSelectedToolForm(toolListButton[0]);
  };
  const handleChangeToolButtonName = (button) => {
    setSelectedToolForm(button);
  };

  return (
    <div className="orderOrion-form p-0">
      {/* Stepper and Button Section */}
      {/* <Row className="mt-3">
        <Col xs={12} className="mx-auto">
          <CustomStepper steps={steps} currentStep={currentStep} />
        </Col>
        <hr className="w-100" />
      </Row> */}
      <div className="w-100 p-0">
        <Row className="py-3 orderOrion-form-header m-0 w-100">
          {/* Header Content */}
          <Col
            xs={12}
            className="p-3 gap-2 d-flex align-items-center rounded orderOrion-form-header-col"
          >
            <span className="fw-semibold orderOrion-form-header-title fs-4">
              {tempCompanyData?.companyInfo?.companyName}
            </span>
            <div className="d-flex flex-row gap-2 fs-14">
              {renderOrderType(tempCompanyData, orderType?.data, true, true, null, true)}
              {companyData?.companyInfo?.isIPO && (
                <div
                  className={`px-2 rounded py-2 d-flex align-items-center  ${"className"}`}
                  style={{
                    backgroundColor: "#016859",
                    color: "#FFF",
                    fontWeight: "500",
                    fontSize: "var(--font-size-xs)",
                  }}
                >
                  {"IPO"}
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* Main Content Row */}
        <Row className="px-0 py-0 m-0 orderOrion-form-container w-100">
          <Col
            xs={12}
            md={2}
            lg={2}
            className="p-3 rounded orderOrion-form-container-list"
          >
            {showToolListTab && (
              <button
                disabled={enableTab?.includes("") ? "disabled" : ""}
                className={`d-flex w-100 fs-18 enableToolsTab ${
                  3 === selectedForm.id ? "active" : ""
                }`}
                onClick={() => handleChangeToolButton()}
                title={"Tools Information"}
              >
                <span
                  aria-hidden="true"
                  aria-label="Tools Information"
                  className="icon-chevron-thin-down tools-information-down"
                ></span>
                <span className="button-name">{"Tools Information"}</span>
              </button>
            )}
            <div
              xs={12}
              className="rounded d-flex flex-column gap-2 align-items-center position-relative showToolList"
            >
              {!showToolListTab &&
                formDataMap &&
                errorList &&
                buttonProps?.map((button, index) => {
                  return (
                    <button
                      key={index}
                      disabled={enableTab?.includes(button.id) ? "disabled" : ""}
                      className={`btn d-flex w-100 border-0 gap-2 fs-18 justify-content-start ${
                        button.id === selectedForm.id ? "active" : ""
                      }`}
                      onClick={() => handleChangeButtonName(button)}
                      title={button.name}
                    >
                      {" "}
                      <span className="button-name">{button.name}</span>
                      {button.id === 3 && (
                        <span
                          aria-hidden="true"
                          aria-label="Tools Information"
                          className="icon-chevron-thin-down tools-information"
                        ></span>
                      )}
                    </button>
                  );
                })}

              {showToolListTab &&
                toolListButton?.map((button, index) => {
                  return (
                    <button
                      key={index}
                      disabled={enableToolTab.includes(button.id) ? "disabled" : ""}
                      className={`btn d-flex w-100 border-0 gap-2 fs-18 justify-content-start ${
                        button.id === selectedToolForm.id ? "active" : ""
                      }`}
                      onClick={() => handleChangeToolButtonName(button)}
                      title={button.name}
                      id={button.id}
                    >
                      <span className="button-name">{button.name}</span>
                    </button>
                  );
                })}
            </div>
          </Col>
          <Col
            xs={12}
            md={10}
            className="mb-3 orderOrion-form-container-render p-0"
            ref={formRef}
          >
            <div className=" p-4 w-100 shadow-sm orderOrion-form-container-render-data">
              {shouldRender
                ? selectedForm?.renderComponent(
                    setSelectedForm,
                    validationCheck,
                    setErrorExist,
                    cannotEidit,
                    errorList,
                    formDataMap,
                    selectedToolForm,
                    (data) => {
                      setFormDataMap((prev) => ({
                        ...prev,
                        [selectedForm.name]: data,
                      }));
                    },
                  )
                : Object.keys(formDataMap).length !== 0 && selectedForm.renderComponent}

              {/* <hr /> */}
              {showToolListTab ? (
                <div className="w-100 d-flex flex-row justify-content-start gap-2 mt-4 action-btns py-2 tabs-footer">
                  <button
                    className="btn cancel-btn border-secondary px-4"
                    onClick={() => handleCancelFormData()}
                  >
                    Cancel
                  </button>
                  {currentForm === buttonProps?.length - 1 ? (
                    ""
                  ) : (
                    <button
                      className="btn cancel-btn border-secondary px-4"
                      onClick={() => updateToolDataNext()}
                    >
                      Next
                    </button>
                  )}
                  <button
                    className="btn next-btn px-4"
                    onClick={() => handleSaveClose()}
                    disabled={isSame()}
                  >
                    Save & Close
                  </button>
                </div>
              ) : (
                <div className="w-100 d-flex flex-row justify-content-start gap-2 mt-4 action-btns py-2 tabs-footer">
                  <button
                    className={`btn  border-secondary px-4 ${
                      selectedForm.id !== 7 ? "cancel-btn" : "next-btn"
                    }`}
                    onClick={() => handleCancelFormData()}
                  >
                    {selectedForm.id !== 7 ? "Cancel" : "Save & Close"}
                  </button>
                  {currentForm === buttonProps?.length - 1 ? (
                    ""
                  ) : (
                    <button
                      className={`btn cancel-btn border-secondary px-4 handleNext ${
                        apiNextBtnloading ? "loading" : ""
                      }`}
                      disabled={apiNextBtnloading || apiSaveloading}
                      onClick={() => updateFormDataNext()}
                    >
                      Next
                    </button>
                  )}
                  {selectedForm.id !== 7 && (
                    <button
                      className={`btn next-btn px-4 handleSaveClose ${
                        apiSaveloading ? "loading" : ""
                      }`}
                      onClick={() => handleSaveClose()}
                      disabled={isSame() || apiSaveloading || apiNextBtnloading}
                    >
                      Save & Close
                    </button>
                  )}
                </div>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {showRemoveFieldMsg && (
        <PopupModal
          show={showRemoveFieldMsg}
          onClose={closeModal}
          className={"popupModal bg-white rounded-4"}
          width={"40vh"}
        >
          <div>
            <h5 className="text-center">
              Information will not be saved. Do you wish to proceed?
            </h5>
            <div className="d-flex flex-row justify-content-center gap-3 mt-4 modalActions">
              <button
                className="btn btn-0 modalDelete_btn px-3"
                onClick={handleGotoOverviewButton}
              >
                Yes
              </button>
              <button className="btn btn-0 modalCancel_btn px-3" onClick={closeModal}>
                No
              </button>
            </div>
          </div>
        </PopupModal>
      )}
    </div>
  );
};

export default TicketFormContainer;

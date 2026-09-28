import React, { useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import useCompanySearch from "../../../../hooks/useCompanySearch";
import { SelectDropDown } from "@orion/shared";
import DateTimeCalendar from "../../../../components/common/DateTimeCalendar";
import SearchableInput from "../../../../components/common/Dynamic/SearchableInput";
import DynamicField from "../../../../components/common/Dynamic/DynamicField";
import InputGroupRenderer from "../../../../components/common/InputGroupRenderer";
import useDynamicOtherData from "../../../../hooks/useDynamicOtherData";
import appConstants from "../../../../constant/common";
import {
  updateMatserInfoWithValue,
  stripMasterInfoToIdOnly,
  getLimitedHtmlWithNewlineContent,
} from "../../../../utils/common";
import dayjs from "dayjs";
import InstrumentSelectionPopup from "./Instrument/InstrumentSelectionPopup";
import OverflowContentRenderer from "../../../../components/common/OverflowContentRenderer";
import { useGlobalContext } from "store/context/GlobalProvider";
import ContactForm from "./ContactForm";
import FieldsData from "./FieldsData";
// Company Info Form
const CompanyInfoForm = ({ errorList, ...props }) => {
  /** VARIABLE DECLARATIONS */
  const divRef = useRef(null);
  const containerRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);
  const debounceTimeoutRef = useRef(null);
  const currentQueryRef = useRef("");
  const [showLoading, setShowLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [suggestedValues, setSuggestedValues] = useState([]);
  const [errorMsg, setErrorMsg] = useState({});
  const { customerSearchList, getCustomerSearch } = useCompanySearch();
  const { instrumentData } = useGlobalContext();
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "",
    companyCode: "",
    industrySector: [],
    region: [],
    country: [],
    primaryMarket: [],
    language: [],
    instrument: [],
    websiteLink: "",
    isIPO: false,
    ipoListingDate: "",
    otherData: [{ fieldName: "New Field", fieldValue: "", id: 1 }],
    headquartersAddress: "",
    irAddress: "",
    isSameAddress: false,
    isin: "",
    symbol: "",
  });
  const { otherData, handleAddField, handleRemoveField, updateFieldData } =
    useDynamicOtherData(companyInfo.otherData, (updatedData) =>
      setCompanyInfo((prev) => ({ ...prev, otherData: updatedData })),
    );
  const saved = localStorage.getItem("workspaceState");
  const parsed = JSON.parse(saved);
  const { activeWorkSpace, activeBoard } = parsed || {};
  const activeBoardCode = activeBoard?.[0]?.code;

  useEffect(() => {
    if (errorList) {
      const errorMessage = {
        region: "Select the Region",
        country: "Select the Country",
        primaryMarket: "Select the Market",
        language: "Select the Language",
        instrument: "Select the Instrument",
        websiteLink: "Enter the Website link",
        isin: "Enter the ISIN",
        symbol: "Enter the Symbol",
      };

      const filteredErrors = Object.keys(errorList).reduce((acc, key) => {
        if (errorList[key] && errorMessage[key]) {
          acc[key] = errorMessage[key];
        }
        return acc;
      }, {});

      setErrorMsg(filteredErrors);
    }
  }, [errorList]);

  useEffect(() => {
    const sourceData = {
      customerLanguageList: props?.customerLanguageList,
      marketRegionList: props?.marketRegionList,
      regionList: props?.regionList,
      industryData: props.industryData,
      countryList: props?.countryList,
      instrumentList: instrumentData.data,
    };

    const nextCompanyInfo = updateMatserInfoWithValue(
      props?.formData?.companyInfo,
      sourceData,
    );

    // Orders like #321 ship otherData: []. Keep a local default instead of
    // flipping [] ↔ [{ New field }] on every formData write (update-depth loop).
    setCompanyInfo((prev) => {
      const incomingOtherData = nextCompanyInfo?.otherData;
      const resolvedOtherData =
        Array.isArray(incomingOtherData) && incomingOtherData.length > 0
          ? incomingOtherData
          : prev.otherData?.length > 0
            ? prev.otherData
            : [{ fieldName: "New Field", fieldValue: "", id: 1 }];

      return {
        ...nextCompanyInfo,
        companyName: nextCompanyInfo?.companyName ?? "",
        companyCode: nextCompanyInfo?.companyCode ?? "",
        websiteLink: nextCompanyInfo?.websiteLink ?? "",
        headquartersAddress: nextCompanyInfo?.headquartersAddress ?? "",
        irAddress: nextCompanyInfo?.irAddress ?? "",
        ipoListingDate: nextCompanyInfo?.ipoListingDate ?? "",
        isin: nextCompanyInfo?.isin ?? "",
        symbol: nextCompanyInfo?.symbol ?? "",
        otherData: resolvedOtherData,
      };
    });
  }, [props?.formData]);

  useEffect(() => {
    props?.setFormData?.((prev) => {
      if (prev?.companyInfo?.otherData === otherData) {
        return prev;
      }
      return {
        ...prev,
        companyInfo: {
          ...prev.companyInfo,
          otherData: otherData,
        },
      };
    });
  }, [otherData]);

  /** COMPANY DETAIL RELATED INFO UPDATE */
  const handleCompanyInfoForm = (value, key) => {
    let updated;

    if (typeof value === "object" && !Array.isArray(value)) {
      // value is an object with multiple fields like { irAddress, isSameAddress }
      updated = { ...companyInfo, ...value };
    } else {
      updated = { ...companyInfo, [key]: value };
      // If unchecking IPO via checkbox directly
      if (key === "isIPO" && value === false) {
        updated.ipoListingDate = "";
      }
      // Dynamically update isSameAddress only if irAddress is changing
      if (key === "headquartersAddress" && companyInfo.isSameAddress) {
        updated.irAddress = value;
      }
    }
    const pureIdsData = stripMasterInfoToIdOnly(updated);
    setCompanyInfo(updated);

    props?.setFormData?.((prev) => ({
      ...prev,
      companyInfo: pureIdsData,
    }));

    // Website validation check
    const webSiteCheck =
      key === "websiteLink" && value.length > 2
        ? !new RegExp(appConstants.VALIDATION_PATTERNS.url).test(value)
        : false;

    setErrorMsg((prev) => ({
      ...prev,
      [key]: webSiteCheck ? "Enter the valid URL" : false,
    }));
  };

  /** COMPANY SEARCH */
  // const handleCompanySearch = (e, type) => {
  //   const getCustName = e.target.value;
  //   handleCompanyInfoForm(getCustName, "companyName");

  //   if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

  //   if (getCustName.trim().length > 0) {
  //     debounceTimeoutRef.current = setTimeout(() => {
  //       setShowLoading(true);
  //       currentQueryRef.current = getCustName;
  //       const apiData = { type, search: encodeURIComponent(getCustName) };

  //       getCustomerSearch(apiData)
  //         .then((res) => {
  //           setShowLoading(false);
  //           if (currentQueryRef.current === getCustName) {
  //             setSuggestedValues(res?.payload || []);
  //             setIsDropdownVisible(true);
  //           }
  //         })
  //         .catch(() => setShowLoading(false));
  //     }, 300);
  //   } else {
  //     setSuggestedValues([]);
  //     setIsDropdownVisible(false);
  //   }
  // };

  const handleCompanySearch = (e, type) => {
    const query = e.target.value;
    setCompanyInfo((prev) => ({ ...prev, companyName: query }));
    handleCompanyInfoForm(query, "companyName");
    if (query.trim().length === 0) {
      setSuggestedValues([]);
      return;
    }
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
          }
        })
        .catch((error) => {
          setShowLoading(false);
          console.error("Error fetching customer data:", error);
        });
    }, 300);
  };
  const headquartersAddressFiledValue = (e) => {
    const limitedText = getLimitedHtmlWithNewlineContent(e, 250);
    handleCompanyInfoForm(limitedText, "headquartersAddress");
  };

  const iRAddressFiledValue = (e) => {
    const limitedText = getLimitedHtmlWithNewlineContent(e, 250);
    handleCompanyInfoForm(limitedText, "irAddress");
  };

  const isDisabled =
    (!companyInfo.headquartersAddress?.trim() &&
      companyInfo.headquartersAddress?.trim() === companyInfo.irAddress?.trim()) ||
    ((companyInfo.headquartersAddress?.trim() === "" ||
      companyInfo.headquartersAddress?.trim()?.length > 0) &&
      companyInfo.irAddress?.trim()?.length > 0 &&
      !companyInfo.isSameAddress);

  const handleGetInstrumentIds = () => {
    const disabled = props?.setCannotEidit.includes("instrument") ? false : true;
    setShowPopup(disabled);
  };

  const closeShowPopup = () => {
    setShowPopup(!showPopup);
  };

  const handleUpdateSelectedInstrument = (data) => {
    setShowPopup(!showPopup);
    const updated = { ...companyInfo, instrument: data?.instruments };
    const formDataUpdated = {
      ...companyInfo,
      instrument: data?.instruments?.map((inst) => inst.id),
    };
    setCompanyInfo((prev) => ({
      ...prev,
      companyInfo: updated,
    }));
    const pureIdsData = stripMasterInfoToIdOnly(formDataUpdated);
    props?.setFormData?.((prev) => ({
      ...prev,
      companyInfo: pureIdsData,
    }));

    setErrorMsg((prev) => ({
      ...prev,
      instrument: false,
    }));
  };
  const applyCompanySearchInfo = (info) => {
    handleCompanyInfoForm(info.customer_name, "companyName");
    handleCompanyInfoForm(info.company_code, "companyCode");
    handleCompanyInfoForm(info.customer_id, "companyId");
    handleCompanyInfoForm([info.industry_id], "industrySector");
    handleCompanyInfoForm([info.isin], "isin");
    handleCompanyInfoForm([info.symbol], "symbol");
    handleCompanyInfoForm([Number(info.market_id)], "primaryMarket");
    setCompanyInfo((prev) => ({
      ...prev,
      companyName: info.customer_name || "",
      companyCode: info.company_code || "",
      companyId: info.customer_id || 0,
      industrySector: [info.industry_id],
      primaryMarket: [Number(info.market_id)],
      isin: info.isin || "",
      symbol: info.symbol || "",
    }));
    setIsDropdownVisible(false);
  };

  return (
    <Row className="company-info" ref={divRef}>
      <Col xs={12} className="company-info-header">
        <h5 className="mb-1">Company Info</h5>
        <span className="fs-12">Enter company details and info</span>
      </Col>

      <Row className="w-100 form-group d-flex flex-wrap align-items-baseline justify-content-flex-start row g-2 h-100 company-info-form px-3">
        <Col lg={4} md={4} xs={10} className="">
          <SearchableInput
            id="companyName"
            labelName="Company Name"
            placeholder="Enter or Search Company Name"
            value={companyInfo?.companyName}
            onChange={(e) => handleCompanySearch(e, "name")}
            isLoading={showLoading}
            isDropdownVisible={isDropdownVisible}
            suggestions={suggestedValues}
            onSelectSuggestion={applyCompanySearchInfo}
            errorMsg={errorMsg.companyName}
            className="fs-14 searchableInput"
            ismandatory={true}
            disabled={activeBoardCode === "SA" || activeBoardCode === "OB" ? false : true}
          />
        </Col>
        <InputGroupRenderer
          fields={[
            {
              label: "Company Code",
              placeholder: "Company Code",
              key: "companyCode",
              disabled:
                !props.formData.isProcessOrder ||
                props?.setCannotEidit.includes("companyCode")
                  ? true
                  : false,
              isMandatory: true,
            },
          ]}
          formData={companyInfo}
          handleChange={handleCompanyInfoForm}
          errors={errorMsg}
          className="input-group-renderer-default-style"
        />
        {/* Select DropDowns */}
        {FieldsData({ companyInfo, activeBoardCode, props }).map((item) => (
          <Col lg={4} md={4} xs={10} key={item.id} className="mt-3 d-flex flex-column">
            <Form.Label htmlFor={item.id} className="fs-14">
              {item.label} {item.isMandatory && <sup>*</sup>}
            </Form.Label>
            <SelectDropDown
              id={item.id}
              multi={item.multi}
              options={item.options}
              labelField={item.labelField}
              valueField={item.valueField}
              searchable={true}
              values={item.values}
              onChange={(e) => handleCompanyInfoForm(e, item.fieldName)}
              placeholder={`Choose ${item.label}`}
              className="multiple-select"
              optionType={item.optionType}
              nestedList={item.nestedList}
              disabled={item.disabled}
              dropdownPosition="auto"
              errorMsg={item.isMandatory && errorMsg?.[item.fieldName]}
              isInvalid={!!errorMsg?.[item.fieldName]}
              customSearch={item?.customSearch}
            />
          </Col>
        ))}

        <Col lg={4} md={4} xs={10} className="mt-3">
          <div className="w-100 d-flex flex-column dynamic-input-wrapper">
            <Form.Label className="fs-14">
              {"Secondary Markets"} {activeBoardCode === "OB" ? <sup>*</sup> : false}
            </Form.Label>
            <div
              className={`selected-item-show show-custom-tooltip ${
                props?.setCannotEidit.includes("instrument") ? "disabled" : ""
              }`}
              onClick={handleGetInstrumentIds}
            >
              <div className="instrument-item-container" ref={containerRef}>
                {companyInfo.instrument.length === 0 ? (
                  <span className="placeholder-text">Select Secondary Markets</span>
                ) : (
                  companyInfo.instrument.length > 0 &&
                  companyInfo.instrument.map((instrument) => {
                    return instrument ? (
                      <span key={instrument.id} className="instrument-item">
                        {instrument.name}
                      </span>
                    ) : null;
                  })
                )}
              </div>
              {companyInfo.instrument.length > 1 && (
                <OverflowContentRenderer
                  multi={true}
                  values={companyInfo.instrument}
                  labelField="name"
                  placeholder={"Select Instrument"}
                  containerRef={containerRef} // Pass ref
                />
              )}
            </div>
            {errorMsg.instrument && (
              <small className="text-danger form-text">{errorMsg.instrument}</small>
            )}
          </div>
        </Col>
        
        <InputGroupRenderer
          fields={[
            {
              label: "ISIN",
              placeholder: "Enter ISIN",
              key: "isin",
              isMandatory: true,
              disabled:
              !props.formData.isProcessOrder ||
              props?.setCannotEidit.includes("isin")
                ? true
                : false,
            },
            
          ]}
          formData={companyInfo}
          handleChange={handleCompanyInfoForm}
          errors={errorMsg}
          className="input-group-renderer-default-style"
        />
        <InputGroupRenderer
          fields={[
            {
              label: "Symbol",
              placeholder: "Enter Symbol",
              key: "symbol",
              isMandatory: true,
              disabled:
              !props.formData.isProcessOrder ||
              props?.setCannotEidit.includes("symbol")
                ? true
                : false,
            },
            
          ]}
          formData={companyInfo}
          handleChange={handleCompanyInfoForm}
          errors={errorMsg}
          className="input-group-renderer-default-style"
        />
        
        {showPopup && (
          <InstrumentSelectionPopup
            show={showPopup}
            onSave={handleUpdateSelectedInstrument}
            onCancel={closeShowPopup}
            instruments={instrumentData.data}
            initialSelectedInstruments={companyInfo?.instrument || []}
          ></InstrumentSelectionPopup>
        )}
        <InputGroupRenderer
          fields={[
            {
              label: "Website Link",
              placeholder: "Enter Website Link",
              key: "websiteLink",
              isMandatory: true,
              disabled: props?.setCannotEidit.includes("websiteLink") ? true : false,
            },
          ]}
          formData={companyInfo}
          handleChange={handleCompanyInfoForm}
          errors={errorMsg}
          className="input-group-renderer-default-style"
        />
        {/* IPO Date */}
        <Col lg={4} md={4} xs={10} className="mt-3">
          <Form.Check
            type="checkbox"
            checked={companyInfo?.isIPO}
            id="isIPOListed"
            onChange={() => handleCompanyInfoForm(!companyInfo?.isIPO, "isIPO")}
            className="d-flex align-items-center gap-2"
            label={
              <span className="fs-14" htmlFor="isIPOListed">
                IPO Listed
              </span>
            }
            disabled={props?.setCannotEidit.includes("websiteLink") ? true : false}
          ></Form.Check>
          <div
            className={`w-100 position-relative ${!companyInfo?.isIPO ? "disabled" : ""}`}
          >
            <div className="picker-date mt-1 position-relative">
              <DateTimeCalendar
                value={companyInfo?.isIPO ? companyInfo.ipoListingDate : ""}
                dateFormat="MMM DD, YYYY"
                disabled={
                  !companyInfo?.isIPO || props?.setCannotEidit.includes("websiteLink")
                    ? true
                    : false
                }
                placeholder="Select IPO Listing Date"
                getDateTime={(date) => {
                  const formattedDate = dayjs(date).format("YYYY-MM-DD HH:mm:ss");
                  handleCompanyInfoForm(formattedDate, "ipoListingDate");
                }}
                dueDateValidation={true}
                calendarPosition={"auto"}
                timeFormat={false}
                iconShow={true}
              />
            </div>
          </div>
        </Col>
        
        {/* Other Data */}
        {otherData.map((inp, i) => (
          <Col lg={4} md={4} xs={10} className="" key={inp.id}>
            <DynamicField
              format={""}
              getData={{
                removeBtn: otherData.length > 1,
                addBtn: otherData.length === i + 1,
                labelClassName: `label`,
                fieldName: inp.fieldName,
                fieldValue: inp.fieldValue,
                getId: inp.id,
                index: i,
                disabled: inp.disabled,
              }}
              setIsClicked={() => {}}
              fieldAdd={handleAddField}
              fieldRemove={() => handleRemoveField(inp.id)}
              updateFieldData={(type, id, name, val) => updateFieldData(id, name, val)}
              type={"otherData"}
              extraFlag={true}
            />
          </Col>
        ))}
        {/* Addresses */}
        <Row className="w-100 mt-3">
          <Col lg={6} md={6} xs={10} className="m-0 p-0">
            <Form.Label className="fs-14">Headquarters Address</Form.Label>
            <Form.Control
              as="textarea"
              placeholder="Enter Address"
              className="address-value mt-1 fs-14"
              rows={4}
              value={companyInfo.headquartersAddress}
              onChange={(e) => headquartersAddressFiledValue(e.target.value)}
              style={{ resize: "none" }} // ✅ disables resize
            />
          </Col>
          <Col lg={6} md={6} xs={10}>
            <div className="w-100 d-flex ">
              <Col lg={4} md={3} xs={3}>
                <Form.Label className="fs-14">IR Address</Form.Label>
              </Col>
              <Col
                lg={8}
                md={7}
                xs={7}
                className="text-end d-flex align-items-center justify-content-end gap-1"
              >
                <Form.Check
                  type="checkbox"
                  id="isSame"
                  checked={companyInfo.isSameAddress}
                  disabled={isDisabled}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    handleCompanyInfoForm({
                      irAddress: isChecked ? companyInfo.headquartersAddress : "",
                      isSameAddress: isChecked,
                    });
                  }}
                  className="d-flex align-items-center gap-2"
                  label={
                    <span className="fs-14" htmlFor={"isSame"}>
                      Same as Headquarters address
                    </span>
                  }
                />
              </Col>
            </div>
            <Form.Control
              as="textarea"
              placeholder="Enter IR Address"
              className="address-value mt-1 fs-14"
              rows={4}
              value={companyInfo.irAddress || ""}
              onChange={(e) => iRAddressFiledValue(e.target.value)}
              disabled={companyInfo.isSameAddress}
              style={{ resize: "none" }} // ✅ disables resize
            />
          </Col>
        </Row>
      </Row>
    </Row>
  );
};

const CompanyDetailsForm = ({ ...props }) => {
  return (
    <div className="company-details-section">
      <CompanyInfoForm {...props} />
      <ContactForm {...props} />
    </div>
  );
};

export default CompanyDetailsForm;

import { t } from "i18next";
import DynamicField from "components/common/Dynamic/DynamicField";
import React, { useEffect, useRef, useState } from "react";
import { Col, Row } from "react-bootstrap";
import RichTextEditor from "components/common/RichTextEditor/Editor";
import {
  getLimitedHtmlWithNewlineContent,
  isCharacterLimitExceeded,
  stripMasterInfoToIdOnly,
  updateMatserInfoWithValue,
} from "utils/common";
import Select from "react-dropdown-select";
import { useGlobalMaster, useToast } from "@orion/shared";
import useDynamicOtherData from "hooks/useDynamicOtherData";
import appConstants from "constant/common";
import AttachmentUpload from "components/common/AttachmentUpload";
import { getUploadAttachmentFile } from "services";
import { useGlobalContext } from "store/context/GlobalProvider";

const BrandingGuideLinesOld = ({ ...props }) => {
  const {
    fontFamilyList,
    getFontFamilyList,
    addFontFamilyList,
  } = useGlobalMaster();
  const { showToast } = useToast();
  const wrapperRef = useRef(null);
  const divRef = useRef(null);
  const { dispatch } = useGlobalContext();

  const [getAttachmentFile, setGetAttachmentFile] = useState([]);
  const isFetchingRef = useRef(false);

  const [notes, setNotes] = useState("");
  const [enteredCharacter, setEnteredCharacter] = useState(0);
  const [balanceCharacter, setBalanceCharacter] = useState(null);
  const [focusedFlag, setFocusedFlag] = useState(false);
  const [fontFamily, setfontFamily] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [brandingInfo, setBrandingInfo] = useState({
    primaryColor: "",
    secondaryColor: "",
    fontFamily: [],
    fontColor: "",
    fontSize: "",
    designLink: "",
    notes: "",
    otherData: [{ fieldName: "New Field", fieldValue: "", id: 1 }],
  });

  useEffect(() => {
    if (!fontFamilyList?.loading && fontFamilyList?.data?.length === 0) {
      getFontFamilyList();
    }
  }, []);
  useEffect(() => {
    const sourceData = {
      fontFamilyList: fontFamilyList?.data,
    };

    const branding = updateMatserInfoWithValue(
      props?.formData?.branding,
      sourceData
    );
    handleNotesData(branding?.notes);
    setBrandingInfo(branding);
  }, []);

  const fetchAttachmentFile = async (paramData) => {
    if (isFetchingRef.current) return; // Prevent multiple calls
    try {
      isFetchingRef.current = true; // Block further fetches
      const response = await getUploadAttachmentFile(paramData); // await instead of .then
      if (response?.status) {
        setGetAttachmentFile(response.data);
        dispatch({
          type: "SET_BRANDING_GUIDELINES_DATA",
          payload: response.data,
        });
        dispatch({
          type: "SET_BRANDING_ATTACHMENT_ORDERID",
          payload: props?.formData?.orderId,
        });
      }
    } catch (error) {
      showToast({
        message: error?.message || "Failed to fetch attachments.",
        variant: "danger",
      });
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    const paramData = {
      module: "branding_guidelines",
      referenceId: props?.formData?.orderId,
    };
    if (props?.formData?.orderId && getAttachmentFile.length === 0) {
      fetchAttachmentFile(paramData);
    }
  }, []);

  useEffect(() => {
    const containsString = brandingInfo?.fontFamily.some(
      (item) => typeof item.font_id === "string" || item === "string"
    );
    if (containsString) {
      let fontFamilyId = fontFamilyList?.data?.filter(
        (item) => item.name === brandingInfo?.fontFamily?.[0].font_id
      );
      if (fontFamilyId.length > 0) {
        handleChangeBrandingInfo(fontFamilyId, "fontFamily");
      }
    }
  }, [brandingInfo, fontFamilyList?.data]);

  useEffect(() => {
    setfontFamily(fontFamilyList?.data);
  }, [fontFamilyList]);

  const {
    otherData,
    handleAddField,
    handleRemoveField,
    updateFieldData,
  } = useDynamicOtherData(brandingInfo?.otherData, (updatedData) =>
    setBrandingInfo((prev) => ({ ...prev, otherData: updatedData }))
  );

  useEffect(() => {
    props?.setFormData?.((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        otherData: otherData,
      },
    }));
  }, [otherData]);

  /** COMPANY DETAIL RELATED INFO UPDATE */
  const handleChangeBrandingInfo = (value, key) => {
    let updated = { ...brandingInfo, [key]: value };
    // if (typeof value === "object" && !Array.isArray(value)) {
    //   // value is an object with multiple fields like { irAddress, isSameAddress }
    //   updated = { ...brandingInfo, ...value };
    // } else {
    //   updated = { ...brandingInfo, [key]: value };

    //   // Dynamically update isSameAddress only if irAddress is changing
    //   if (key === "irAddress") {
    //     updated.isSameAddress = value?.length > 0;
    //   }
    // }
    const pureIdsData = stripMasterInfoToIdOnly(updated);
    setBrandingInfo(updated);

    props?.setFormData?.((prev) => ({
      ...prev,
      branding: pureIdsData,
    }));
    // Website validation check
    const webSiteCheck =
      key === "designLink" && value.length > 2
        ? !new RegExp(appConstants.VALIDATION_PATTERNS.url).test(value)
        : false;
    setErrorMsg(webSiteCheck ? "Enter the valid URL" : null);
  };

  // handle attachment uploading process functions

  // label and value arr
  const labelAndValueRender = [
    {
      label: t("ticket.form_field.label.primary_color"),
      value: brandingInfo.primaryColor,
      typeOf: "colorPicker",
      key: "primaryColor",
      disabled: props?.setCannotEidit?.includes("primaryColor") ? true : false,
    },
    {
      label: t("ticket.form_field.label.secondary_color"),
      value: brandingInfo.secondaryColor,
      typeOf: "colorPicker",
      key: "secondaryColor",
      disabled: props?.setCannotEidit?.includes("secondaryColor")
        ? true
        : false,
    },
    {
      label: t("order_view.font_family"),
      value: brandingInfo.fontFamily,
      typeOf: "fontFamily",
      key: "fontFamily",
      disabled: props?.setCannotEidit?.includes("fontFamily") ? true : false,
    },
    {
      label: t("order_view.font_colour"),
      value: brandingInfo.fontColor,
      typeOf: "colorPicker",
      key: "fontColor",
      disabled: props?.setCannotEidit?.includes("fontColor") ? true : false,
    },
    {
      label: t("order_view.font_size"),
      value: brandingInfo.fontSize,
      inputType: "number",
      maxLength: "2",
      key: "fontSize",
      disabled: props?.setCannotEidit?.includes("fontSize") ? true : false,
    },
    {
      label: t("order_view.design_link"),
      value: brandingInfo.designLink,
      key: "designLink",
      disabled: props?.setCannotEidit?.includes("designLink") ? true : false,
    },
  ];
  /** USED TO HANDLE INPUT FOCUS */
  const handleFocus = (e) => {
    setFocusedFlag(true);
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        enteredCharacter === 0
      ) {
        setFocusedFlag(false); // update your state
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotesData = (e) => {
    const result = isCharacterLimitExceeded(
      e,
      appConstants.charCountLimit.brandingNotes
    );
    setEnteredCharacter(result?.characterCount);
    setBalanceCharacter(result?.remainingCharacters);
    const limitedText = getLimitedHtmlWithNewlineContent(
      e,
      appConstants.charCountLimit.brandingNotes
    );
    setNotes(limitedText);
    handleChangeBrandingInfo(limitedText, "notes");
  };

  const customRender = ({ props, state, methods }) => {
    const regexp = new RegExp(state.search, "i");
    const options = Array.isArray(props.options) ? props.options : [];

    state.searchResults = [...options]
      ?.sort((a, b) => a.name.localeCompare(b.name))
      ?.filter(
        (item) =>
          regexp.test(item[props?.labelField]) ||
          regexp.test(item[props?.valueField])
      );

    const setEntry = () => {
      methods.createNew(state?.search);
      const addFont = {
        name: state?.search,
      };
      addFontFamilyList(addFont).then((res) => {
        if (res.data.status) {
          setfontFamily((prev) => [
            ...prev,
            {
              font_id: fontFamilyList?.data.length + 1,
              name: state?.search,
            },
          ]);
          getFontFamilyList();
          // let value = [
          //   {
          //     font_id: fontFamilyList?.length + 1,
          //     name: state?.search,
          //   },
          // ];
          // // handleChangeBrandingInfo(value, "fontFamily");
          showToast({
            message: res?.data?.message,
            variant: "success",
          });
        } else {
          setfontFamily(fontFamily);
          showToast({
            message: res?.data?.message,
            variant: "danger",
          });
        }
      });
    };

    return (
      <div className="dropdwonList-main" key={`dropdown-main-${props?.title}`}>
        {props.title && <p className="dropdwonList-head">{props.title}</p>}
        <div
          className="dropdwonLists single"
          key={`dropdown-list-${props?.title}-single`}
        >
          {props.options
            .filter((item) =>
              regexp.test(item[props.searchBy] || item[props.labelField])
            )
            .map((option) => (
              <>
                <p
                  className={
                    option.disabled
                      ? "dropdwonLists-label disabled"
                      : "dropdwonLists-label"
                  }
                  key={option[props.valueField]}
                  onClick={() => methods?.addItem(option)}
                  disabled={option.disabled}
                >
                  <label>{option[props.labelField]}</label>
                </p>
              </>
            ))}
          {state?.searchResults?.length === 0 && (
            <>
              <p className="create-new-entry">
                "{state?.search}"
                <button className="create-new-entrybtn" onClick={setEntry}>
                  + Add
                </button>
              </p>
              <p className="error-show">Not Found</p>
            </>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (props?.validationCheck) {
      const hasErrors = errorMsg ? Object.keys(errorMsg).length > 0 : false;
      props?.setErrorExist(hasErrors);
      if (hasErrors && divRef?.current) {
        divRef.current.scrollIntoView({ behavior: "smooth" });
      }
      props?.setFormData?.((prev) => ({
        ...prev,
        branding: {
          ...brandingInfo,
        },
      }));
    }
  }, [props?.validationCheck]);
  return (
    <Col xs={12} className="brandingGuidelines" ref={divRef}>
      <Col xs={12} className="w-100 p-0">
        <h5>{t("order_view.branding_guidelines")}</h5>
        <p className="fs-12 subHead">{t("order_view.branding_info_text")}</p>
      </Col>
      <Row className="pt-3 d-flex flex-row align-items-start row-gap-2 h-100 flex-wrap p-0">
        {/* <Col xs={10}>
          <label htmlFor="CompanyWebsite">Company Website</label>
          <input
            id="CompanyWebsite"
            type="text"
            className="input-type mt-3"
            placeholder="Enter Company Website"
          />
        </Col>
        <Col xs={2}>
          <button className="btn mt-2 w-100 py-2 activeButton">
            Extract Information{" "}
          </button>
        </Col> */}
        {labelAndValueRender.map((item, index) => (
          <Col
            lg={4}
            md={6}
            xs={10}
            key={index}
            className="labelValueContainer"
          >
            {item.typeOf === "colorPicker" ? (
              <DynamicField
                format={"colorPicker"}
                getData={{
                  fieldName: item?.label,
                  fieldValue: item?.value,
                }}
                // setIsClicked={handleClickedInput}
                // fieldAdd={handleAddField}
                // fieldRemove={handleRemoveField}
                updateFieldData={(type, id, name, val) =>
                  handleChangeBrandingInfo(val, item?.key)
                }
                type={item?.label}
                extraFlag={false}
                disabled={item.disabled}
              />
            ) : item.typeOf === "fontFamily" ? (
              <div className="input-field position-relative">
                <label className="pb-2">Font Family</label>
                <Select
                  multi={false}
                  options={fontFamily || []}
                  labelField={"name"}
                  valueField={"font_id"}
                  values={item.value || []}
                  searchable={true}
                  onChange={(e) => handleChangeBrandingInfo(e, "fontFamily")}
                  placeholder={"Select Font/ Create Entry"}
                  className="multiple-select fontFamily"
                  disabled={
                    fontFamily?.length === 0 || item.disabled ? true : false
                  }
                  dropdownPosition="auto"
                  create={true}
                  dropdownRenderer={customRender}
                ></Select>
              </div>
            ) : (
              <>
                <DynamicField
                  getData={{
                    fieldName: item?.label,
                    fieldValue: item?.value,
                  }}
                  // setIsClicked={handleClickedInput}
                  // fieldAdd={handleAddField}
                  // fieldRemove={handleRemoveField}
                  updateFieldData={(type, id, name, val) =>
                    handleChangeBrandingInfo(val, item?.key)
                  }
                  // type={"primary_color"}
                  extraFlag={false}
                  inputType={item.inputType || "text"}
                  maxLength={item.maxLength || ""}
                  type={item.typeOf}
                  disabled={item.disabled}
                />
                {item?.key === "designLink" && errorMsg && (
                  <p className="popup-error">{errorMsg}</p>
                )}
              </>
            )}
          </Col>
        ))}
        {/* new field arr Data */}
        {otherData.map((inp, i) => (
          <Col lg={4} md={4} xs={10} key={inp.id}>
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
              updateFieldData={(type, id, name, val) =>
                updateFieldData(id, name, val)
              }
              type={"otherData"}
              extraFlag={true}
            />
          </Col>
        ))}
      </Row>
      <AttachmentUpload
        heading="Attachment"
        moduleName={"branding_guidelines"}
        referenceId={props.formData}
        headingSize={"s"} //s, m, l, xl
        isAccessDelete={true}
        isAccessUpload={true}
        fetchAttachmentFile={fetchAttachmentFile}
        getAttachmentFile={getAttachmentFile}
        cols={{ lg: 4, md: 8, xs: 10 }}
        displayFlex={"flex-row"}
      ></AttachmentUpload>
      <Col md={12} className="d-flex flex-column py-3 w-100 disabled p-0">
        <div ref={wrapperRef} className="input-field">
          <label className="m-0 mb-2">{t("order_view.notes")}</label>
          <RichTextEditor
            toolbarId={"ticket-description"}
            headTitle="Description"
            // placeholder={}
            value={notes}
            handleValueChange={handleNotesData}
            handleMentionedUsers={() => {
              return null;
            }}
            taggableMembers={[]}
            className={`description_input ${focusedFlag && `focused`}`}
            onFocus={handleFocus}
            isVisible={false}
            enableMention={false}
          />
          {(enteredCharacter !== null || enteredCharacter?.length > 0) && (
            <p className="error-msg">
              <b>
                {enteredCharacter > appConstants?.charCountLimit?.brandingNotes
                  ? appConstants?.charCountLimit?.brandingNotes
                  : enteredCharacter}
                /{appConstants?.charCountLimit?.brandingNotes}
              </b>{" "}
              {t("ticket.characters_used")}, <b>{balanceCharacter}</b>{" "}
              {t("ticket.remaining")}
            </p>
          )}
        </div>
      </Col>
    </Col>
  );
};

export default BrandingGuideLinesOld;
import { InputField } from "@orion/shared";
import { SelectDropDown } from "@orion/shared";
import React, { useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import DynamicInput from "../../../../components/common/Dynamic/Input";
import { useGlobalMaster } from "@orion/shared";

export const MarketDetailsForm = () => {
  const [toolData, setToolData] = useState([
    {
      fieldName: "New Field",
      fieldValue: "",
      id: 1,
    },
  ]);
  const [secondaryTool, setSecondaryTool] = useState([
    {
      fieldName: "New Field",
      fieldValue: "",
      id: 1,
    },
  ]);
  const [clickedInput, setClickedInput] = useState({
    arrayName: "",
    inputId: null,
  });
  const [currencyList, getCurrencyList] = useGlobalMaster();
  const [primaryMarketForm, setPrimaryMarketForm] = useState({
    market: "",
    customerCode: "",
    isinCode: "",
    tickerCode: "",
    currency: "",
    arrFields: [
      {
        fieldName: "New Field",
        fieldValue: "",
        id: 1,
      },
    ],
  });

  useEffect(() => {
    if (!currencyList?.loading && currencyList?.data?.length === 0) {
      getCurrencyList();
    }
  }, []);

  /** New Field added */
  const addField = (categoryName, categoryId, fieldName, defaultValue) => {
    const maxId = primaryMarketForm.arrFields.length + 1;
    const newField = {
      fieldName: "New field" + " " + maxId,
      fieldValue: defaultValue,
      id: maxId,
      disabled: primaryMarketForm.arrFields?.length === 6 ? true : false,
    };
    const updatedData = primaryMarketForm.arrFields?.map((field) => ({
      ...field,
      disabled: true,
    }));
    let oldFormData = { ...primaryMarketForm };
    const olddynamicFieldsArr = [...updatedData, newField];
    oldFormData["arrFields"] = olddynamicFieldsArr;
    setPrimaryMarketForm(oldFormData);
  };

  /** Remove Field */
  const removeField = (categoryName, categoryId, fieldId) => {
    let updatedArray = primaryMarketForm.arrFields?.filter(
      (item) => item.id !== fieldId
    );
    if (updatedArray.length === 1 || updatedArray.length < 7) {
      updatedArray = updatedArray.map((field) => ({
        ...field,
        disabled: false,
      }));
    }
    let oldFormData = { ...primaryMarketForm };
    oldFormData["arrFields"] = updatedArray;
    setPrimaryMarketForm(oldFormData);
  };

  /** Update Field Heading*/
  const updateFieldData = (
    categoryName,
    categoryId,
    fieldId,
    newFieldName,
    newFieldValue
  ) => {
    const oldArr = primaryMarketForm?.arrFields?.map((category) => {
      if (category.fieldName === categoryName && category.id === categoryId) {
        return {
          ...category,
          fieldName: newFieldName,
          fieldValue: newFieldValue,
        };
      }
      return category;
    });
    let oldFormData = { ...primaryMarketForm };
    oldFormData["arrFields"] = oldArr;
    setPrimaryMarketForm(oldFormData);
  };

  const clickedIuput = (arrayName, inputId) => {
    // setClickedInput({ arrayName, inputId });
  };

  /** New Field added */
  const addFieldSecondary = (
    categoryName,
    categoryId,
    fieldName,
    defaultValue
  ) => {
    const maxId = secondaryTool.length + 1;

    setSecondaryTool((prevData) => {
      const updatedData = prevData.map((field) => ({
        ...field,
        disabled: true,
      }));
      const newField = {
        fieldName: "New field" + " " + maxId,
        fieldValue: defaultValue,
        id: maxId,
        disabled: secondaryTool.length === 6 ? true : false,
      };
      return [...updatedData, newField];
    });
  };

  /** Remove Field */
  const removeFieldSecondary = (categoryName, categoryId, fieldId) => {
    let updatedArray = secondaryTool.filter((item) => item.id !== fieldId);
    if (updatedArray.length === 1 || updatedArray.length < 7) {
      updatedArray = updatedArray.map((field) => ({
        ...field,
        disabled: false,
      }));
    }
    setSecondaryTool(updatedArray);
  };

  /** Update Field Heading*/
  const updateFieldDataSecondary = (
    categoryName,
    categoryId,
    fieldId,
    newFieldName,
    newFieldValue
  ) => {
    setSecondaryTool((prevData) => {
      return prevData.map((category) => {
        if (category.fieldName === categoryName && category.id === categoryId) {
          return {
            ...category,
            fieldName: newFieldName,
            fieldValue: newFieldValue,
          };
        }
        return category;
      });
    });
  };

  const handlePrimaryForm = (e, name) => {
    let oldObj = { ...primaryMarketForm };
    oldObj[name] = e;
    setPrimaryMarketForm(oldObj);
  };

  return (
    <Row className="w-100">
      <Row className="w-100  form-group mt-4 d-flex flex-wrap align-items-baseline justify-content-flex-start row g-3 h-100">
        <Col xs={12}>
          <h5>Primary Market </h5>
        </Col>
        <Col lg={4} md={4} xs={10}>
          <label htmlFor="irLink">Market</label>
          <SelectDropDown
            id="regionSelect"
            multi={true}
            searchBy="name"
            placeholder={"Select Market"}
            className="nestedList-dropdownRenderer regionDropDownList "
            optionType="checkbox"
            nestedList={true}
            dropdownPosition="auto"
          />
        </Col>
        <Col lg={4} md={4} xs={10}>
          <DynamicInput
            labelName={"Customer Code"}
            value={primaryMarketForm?.customerCode}
            setValue={(e) => handlePrimaryForm(e, "customerCode")}
          />
        </Col>
        <Col lg={4} md={4} xs={10}>
          <DynamicInput
            labelName={"ISIN Code"}
            value={primaryMarketForm?.isinCode}
            setValue={(e) => handlePrimaryForm(e, "isinCode")}
          />
        </Col>
        <Col lg={4} md={4} xs={10}>
          <label htmlFor="TickerCode">Ticker Code</label>
          <input
            id="TickerCode"
            type="text"
            className="input-type"
            placeholder="Enter Ticker Code"
          />
        </Col>
        <Col lg={4} md={4} xs={10}>
          <label htmlFor="Currency">Currency</label>
          <SelectDropDown
            multi={true}
            options={currencyList?.data}
            labelField="currency_name"
            valueField="currency_id"
            // values={currency ? currency : []}
            searchable={true}
            title={"Currency"}
            // onChange={handleChangeCurrency}
            placeholder={"Select Currency"}
            className="custom-dropdownRenderer nestedList-dropdownRenderer regionDropDownList"
            // disabled={props?.customerLanguageList?.length === 0 ? true : false}
            optionType="checkbox"
            dropdownPosition="auto"
            key={"currencyList1"}
          />
        </Col>

        {primaryMarketForm.arrFields?.length > 0 &&
          primaryMarketForm.arrFields?.map((inp, i) => {
            const classNameSet = `label${
              clickedInput.inputId === inp?.id ? "clicked" : ""
            }`;
            const setRemoveBtn =
              primaryMarketForm.arrFields?.length - 1 ? true : false;
            const setAddbtn = primaryMarketForm.arrFields?.length + 1;
            let setData = {
              removeBtn: setRemoveBtn,
              addBtn: setAddbtn,
              labelClassName: classNameSet,
              fieldName: inp.fieldName,
              fieldValue: inp.fieldValue,
              getId: inp.id,
              index: primaryMarketForm.arrFields.length + 1,
              mainHead: inp.fieldName,
              mainHeadId: inp.id,
              disabled: inp.disabled,
            };
            return (
              <Col lg={4} md={4} xs={10}>
                <InputField
                  getData={setData}
                  setIsClicked={clickedIuput}
                  fieldAdd={addField}
                  fieldRemove={removeField}
                  updateFieldData={updateFieldData}
                  key={i}
                />
              </Col>
            );
          })}
      </Row>

      <Row className="w-100  form-group mt-4 d-flex flex-wrap align-items-baseline justify-content-flex-start row g-4 h-100">
        <Col xs={12} className="mt-3">
          <h5>Sendary Market </h5>
        </Col>
        <Col lg={4} md={4} xs={10}>
          <label>Market</label>
          <SelectDropDown
            id="regionSelect"
            multi={true}
            // options={regionList?.data}
            // labelField="name"
            // valueField="countryId"
            // values={(region && region) || []}
            // onChange={getUpdated}
            searchBy="name"
            placeholder={"Select Market"}
            className="nestedList-dropdownRenderer regionDropDownList"
            optionType="checkbox"
            nestedList={true}
            dropdownPosition="auto"
            // {...(companyName?.length > 0 ? {} : { disabled: true })}
          />
        </Col>

        {secondaryTool?.length > 0 &&
          secondaryTool?.map((inp, i) => {
            const classNameSet = `label${
              clickedInput.inputId === inp?.id ? "clicked" : ""
            }`;
            const setRemoveBtn = secondaryTool?.length - 1 ? true : false;
            const setAddbtn = secondaryTool?.length + 1;
            let setData = {
              removeBtn: setRemoveBtn,
              addBtn: setAddbtn,
              labelClassName: classNameSet,
              fieldName: inp.fieldName,
              fieldValue: inp.fieldValue,
              getId: inp.id,
              index: secondaryTool.length + 1,
              mainHead: inp.fieldName,
              mainHeadId: inp.id,
              disabled: inp.disabled,
            };
            return (
              <Col lg={4} md={4} xs={10}>
                <InputField
                  getData={setData}
                  setIsClicked={clickedIuput}
                  fieldAdd={addFieldSecondary}
                  fieldRemove={removeFieldSecondary}
                  updateFieldData={updateFieldDataSecondary}
                  key={i}
                />
              </Col>
            );
          })}
      </Row>
    </Row>
  );
};

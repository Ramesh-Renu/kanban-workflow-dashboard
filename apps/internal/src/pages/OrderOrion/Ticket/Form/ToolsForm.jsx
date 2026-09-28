import { InputField } from "@orion/shared";
import { SelectDropDown } from "@orion/shared";
import React, { useState } from "react";
import { Col, Row } from "react-bootstrap";
import DynamicInput from "../../../../components/common/Dynamic/Input";

const ToolsForm = () => {
  const [activeTab, setActiveTab] = useState("scrolling");
  const [toolData, setToolData] = useState([
    {
      fieldName: "Market",
      fieldValue: "",
      id: 1,
    },
  ]);
  const [clickedInput, setClickedInput] = useState({
    arrayName: "",
    inputId: null,
  });

  const [scrollingTickerData, setScrollingTickerData] = useState({
    name: "",
    isin: "",
    arrFields: [{ fieldName: "Market", fieldValue: "", id: 1 }],
  });

  /** New Field added */
  const addField = (categoryName, categoryId, fieldName, defaultValue) => {
    const maxId = scrollingTickerData.arrFields.length + 1;
    const newField = {
      fieldName: "New field" + " " + maxId,
      fieldValue: defaultValue,
      id: maxId,
      disabled: scrollingTickerData.arrFields?.length === 6 ? true : false,
    };
    const updatedData = scrollingTickerData.arrFields?.map((field) => ({
      ...field,
      disabled: true,
    }));
    let oldFormData = { ...scrollingTickerData };
    const olddynamicFieldsArr = [...updatedData, newField];
    oldFormData["arrFields"] = olddynamicFieldsArr;
    setScrollingTickerData(oldFormData);
  };

  /** Remove Field */
  const removeField = (categoryName, categoryId, fieldId) => {
    let updatedArray = scrollingTickerData.arrFields?.filter(
      (item) => item.id !== fieldId
    );
    if (updatedArray.length === 1 || updatedArray.length < 7) {
      updatedArray = updatedArray.map((field) => ({
        ...field,
        disabled: false,
      }));
    }
    let oldFormData = { ...scrollingTickerData };
    oldFormData["arrFields"] = updatedArray;
    setScrollingTickerData(oldFormData);
  };

  /** Update Field Heading*/
  const updateFieldData = (
    categoryName,
    categoryId,
    fieldId,
    newFieldName,
    newFieldValue
  ) => {
    const oldArr = scrollingTickerData?.arrFields?.map((category) => {
      if (category.fieldName === categoryName && category.id === categoryId) {
        return {
          ...category,
          fieldName: newFieldName,
          fieldValue: newFieldValue,
        };
      }
      return category;
    });
    let oldFormData = { ...scrollingTickerData };
    oldFormData["arrFields"] = oldArr;
    setScrollingTickerData(oldFormData);
  };

  const clickedIuput = (arrayName, inputId) => {
    // setClickedInput({ arrayName, inputId });
  };

  const handleScrollinTickerForm = (e, name) => {
    let oldObj = { ...scrollingTickerData };
    oldObj[name] = e;
    setScrollingTickerData(oldObj);
  };
  return (
    <Row className="w-100 p-0 m-0  mt-4">
      <div className="d-flex justify-content-between align-items-center w-100">
        <h5 className="mb-0">Ticker</h5>
        <div>
          {" "}
          <SelectDropDown
            multi={true}
            // options={categoriesList?.data}
            labelField="name"
            valueField="id"
            // values={toolCategory}
            searchable={false}
            // onChange={handleChangeToolCategory}
            placeholder={"Select Tools"}
            className="search-filter"
            // disabled={categoriesList?.data?.length === 0 ? true : false}
            optionType="checkbox"
            clearable={false}
            // clearRenderer={false}
          />
        </div>
      </div>
      {/* tabs and pills  */}
      <Row className="d-flex flex-row align-items-start  mt-4 ">
        <button
          className={`w-auto btn  btn-0 border-0 px-4  ${
            activeTab === "scrolling"
              ? "border-bottom border-dark border-2 rounded-0  "
              : "border-0"
          }`}
          onClick={() => setActiveTab("scrolling")}
        >
          Scrolling Ticker
        </button>
        <button
          className={`w-auto btn  btn-0 border-0  px-5 ${
            activeTab === "static"
              ? "border-bottom border-dark border-2 rounded-0  "
              : "border-0"
          }`}
          onClick={() => setActiveTab("static")}
        >
          Static Ticker
        </button>
        <button
          className={`w-auto btn  btn-0 border-0  px-5 ${
            activeTab === "chart"
              ? "border-bottom border-dark border-2 rounded-0  "
              : "border-0"
          }`}
          onClick={() => setActiveTab("chart")}
        >
          Chart Ticker
        </button>
      </Row>
      {/* content section */}
      <Row className="w-100 mt-5">
        <Col xs={12} className="mx-auto">
          {activeTab === "scrolling" && (
            <>
              <h5>Necessary Fields </h5>
              <Row className="w-100 d-flex flex-row align-items-start  flex-wrap mt-3">
                {/* Scrolling Ticker Content */}

                <Col lg={4} md={4} xs={10}>
                  <DynamicInput
                    labelName={"Name"}
                    value={scrollingTickerData.name}
                    setValue={(e) => handleScrollinTickerForm(e, "name")}
                  />
                </Col>
                <Col lg={4} md={4} xs={10}>
                  <DynamicInput
                    labelName={"ISIN"}
                    value={scrollingTickerData.isin}
                    setValue={(e) => handleScrollinTickerForm(e, "isin")}
                  />
                </Col>

                {scrollingTickerData.arrFields?.length > 0 &&
                  scrollingTickerData.arrFields?.map((inp, i) => {
                    const classNameSet = `label${
                      clickedInput.inputId === inp?.id ? "clicked" : ""
                    }`;
                    const setRemoveBtn =
                      scrollingTickerData.arrFields?.length - 1 ? true : false;
                    const setAddbtn = scrollingTickerData.arrFields?.length + 1;
                    let setData = {
                      removeBtn: setRemoveBtn,
                      addBtn: setAddbtn,
                      labelClassName: classNameSet,
                      fieldName: inp.fieldName,
                      fieldValue: inp.fieldValue,
                      getId: inp.id,
                      index: toolData.length + 1,
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
            </>
          )}
          {activeTab === "static" && (
            <div>
              {/* Static Ticker Content */}
              <p>Content for Static Ticker</p>
            </div>
          )}
          {activeTab === "chart" && (
            <div>
              {/* Chart Ticker Content */}
              <p>Content for Chart Ticker</p>
            </div>
          )}
        </Col>
      </Row>
    </Row>
  );
};

export default ToolsForm;

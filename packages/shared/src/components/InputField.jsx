import React, { useState, useRef, useEffect, Fragment } from "react";
import { trashFull } from "../assets/images";
import { ColorPicker } from "@euroland/react";
import Select from "react-dropdown-select";
import SelectDropDown from "./SelectDropDown";
import useToast from "../hooks/useToast";
import useGlobalMaster from "../hooks/useGlobalMaster";

const InputField = ({
  getData,
  setIsClicked,
  fieldAdd,
  fieldRemove,
  updateFieldData,
  errorMsg,
  showRequiredField,
}) => {
  const [changedHeading, setChangedHeading] = useState("");
  const [changedValue, setChangedValue] = useState("");
  const { marketRegionList, fontFamilyList, getFontFamilyList, addFontFamilyList, currencyList, getCurrencyList } = useGlobalMaster();
  const { showToast } = useToast();
  const [cList, setCList] = useState([]);
  const [changedCurrency, setChangedCurrency] = useState([]);
  const regexVal = new RegExp("^#[0-9A-Fa-f]{0,6}$");
  const getId = useRef();

  const [showMarketData, setShowMarketData] = useState([]);
  const [showSecondMarketData, setShowSecondMarketData] = useState([]);
  const [fontFamily, setfontFamily] = useState([]);

  useEffect(() => {
    if (getData?.fieldName === "Font Family") {
      getFontFamilyList(); // pulls font list from API
    }
  }, []);
  useEffect(() => {
    if (getData?.mainHead === "Currency" && currencyList?.data?.length === 0) {
      getCurrencyList(); // fetch currency master
    }
  }, []);

  useEffect(() => {
    setChangedHeading(getData?.fieldName);
    setChangedValue(getData?.fieldValue);
  }, [getData]);

  useEffect(() => {
    if (getData?.mainHead === "Currency" && currencyList?.data?.length > 0) {
      const addCode = currencyList.data.map((c) => {
        return {
          ...c,
          currency_name: c.currency_name + " (" + c.currency_code + ")",
        };
      });
      setCList(addCode);

      setChangedCurrency(
        addCode.filter(
          (c) =>
            c.currency_code == getData?.fieldValue ||
            c.currency_name == getData?.fieldValue
        )
      );
    }

    if (
      getData?.fieldName === "Primary Market" &&
      marketRegionList?.data?.length > 0
    ) {
      setShowMarketData(
        marketRegionList.data.filter(
          (c) =>
            c.marketid == getData?.fieldValue ||
            c.marketname == getData?.fieldValue
        )
      );
    }
    if (
      getData?.fieldName === "Secondary Market" &&
      marketRegionList?.data?.length > 0
    ) {
      const fieldValueArray = getData?.fieldValue?.split(", ");
      function getMatchedValues(fieldValueArray, secondMarketData) {
        const matchedValues = [];
        // Iterate over each element in fieldValueArray
        for (let fieldValue of fieldValueArray) {
          // Iterate over each object in secondMarketData
          for (let marketData of secondMarketData) {
            // Check if the market_code property of marketData matches the current fieldValue
            if (marketData.marketname === fieldValue) {
              matchedValues.push(marketData); // Add the matched marketData object to matchedValues array
            }
          }
        }
        return matchedValues; // Return the array of matched values
      }
      const matchedValues = getMatchedValues(fieldValueArray, marketRegionList.data);
      setShowSecondMarketData(matchedValues);
    }
    if (getData?.fieldName === "Font Family" && fontFamilyList?.data?.length > 0) {
      setfontFamily(
        fontFamilyList?.data?.filter((f) => f.name == getData?.fieldValue)
      );
    }
  }, [getData, currencyList]);

  const fieldHeadingChanged = (e) => {
    const headVal = e.target.value;
    if (headVal.trim().length > 60) {
      setChangedHeading(headVal.trim().substring(0, 60));
    } else {
      setChangedHeading(headVal);
      updateFieldData(
        getData?.mainHead,
        getData?.mainHeadId,
        getData?.getId,
        headVal,
        changedValue
      );
    }
  };

  const fieldValueChanged = (e) => {
    const headVal = e.target.value;
    if (getData?.mainHead == "Description" && headVal.length > 500) {
      setChangedValue(headVal.trim().substring(0, 500));
    } else if (getData?.mainHead !== "Description" && headVal.length > 250) {
      setChangedValue(headVal.trim().substring(0, 250));
    } else {
      setChangedValue(headVal);
      updateFieldData(
        getData?.mainHead,
        getData?.mainHeadId,
        getData?.getId,
        changedHeading,
        headVal
      );
    }
  };
  const colorfieldValueChanged = (e) => {
    const colorVal = e.target.value;
    if (colorVal.trim().length > 1 && !colorVal.match(regexVal)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    } else {
      setChangedValue(colorVal);
      updateFieldData(
        getData?.mainHead,
        getData?.mainHeadId,
        getData?.getId,
        changedHeading,
        colorVal.trim().length == 0 ? "" : colorVal
      );
    }
  };
  const handleInputClick = () => {
    setIsClicked(getData?.mainHead, getData?.mainHeadId, getData?.getId);
  };

  const handleAddField = () => {
    fieldAdd(
      getData?.mainHead,
      getData?.mainHeadId,
      "Field " + [getData?.getId + 1],
      ""
    );
  };
  const handleRemoveField = () => {
    fieldRemove(getData?.mainHead, getData?.mainHeadId, getData?.getId);
  };

  const colorPickerRef = useRef(null);
  // Event listener to close the dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [colorPickerRef]);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const toggleColorPicker = () => {
    setShowColorPicker((prev) => !prev);
  };
  const handleColorPickerChange = (color) => {
    setChangedValue(color);
    // setShowColorPicker(false);
    updateFieldData(
      getData?.mainHead,
      getData?.mainHeadId,
      getData?.getId,
      changedHeading,
      color
    );
  };

  const handleChangedCurrency = (e) => {
    if (e.length === 0) {
      setChangedCurrency([]);
      return;
    }
    setChangedCurrency(e);
    updateFieldData(
      getData?.mainHead,
      getData?.mainHeadId,
      getData?.getId,
      changedHeading,
      e[0].currency_name
    );
  };

  const handleChangedPriMarket = (e) => {
    if (e.length === 0) {
      setShowMarketData([]);
      return;
    }
    setShowMarketData(e);
    updateFieldData(
      getData?.mainHead,
      getData?.mainHeadId,
      getData?.getId,
      changedHeading,
      e[0]?.marketname
    );
  };

  const handleChangedSecondMarket = (e) => {
    if (e.length === 0) {
      setShowSecondMarketData([]);
      return;
    }
    const eString = e?.map((item) => `${item.marketname}`).join(", ");
    setShowSecondMarketData(e);
    updateFieldData(
      getData?.mainHead,
      getData?.mainHeadId,
      getData?.getId,
      changedHeading,
      eString
    );
  };

  const handleChangedFontFamily = (e) => {
    if (e.length === 0) {
      setfontFamily([]);
      return;
    }
    // const eString = e?.map(item => `${item.market_code}`).join(', ');
    setfontFamily(e);
    updateFieldData(
      getData?.mainHead,
      getData?.mainHeadId,
      getData?.getId,
      changedHeading,
      e[0]?.name
    );
  };
  const setRequiredField = showRequiredField?.filter((item) => {
    return item.title == getData?.mainHead || item.title == getData?.fieldName;
  });

  const customRender = ({ props, state, methods }) => {
    const regexp = new RegExp(state.search, "i");
    state.searchResults = props?.options?.filter(
      (item) =>
        regexp.test(item[props?.labelField]) ||
        regexp.test(item[props?.valueField])
    );
    const setEntry = () => {
      methods.createNew(state?.search);
      const addFont = {
        name: state?.search,
        is_customfont: true,
      };
      addFontFamilyList(addFont).then((res) => {
        if (res.payload.status) {
          setfontFamily({
            font_id: fontFamilyList?.data?.length + 1,
            name: state?.search,
          });
          showToast({
            message: res?.payload?.message,
            variant: "success",
          });

          getFontFamilyList();
        } else {
          setfontFamily(fontFamily);
          showToast({
            message: res?.payload?.message,
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

  return (
    <Fragment>
      {(getData?.mainHead == "Description" && (
        <div className="input-field description">
          <p className="flex-col">
            <input
              ref={getId}
              id={getData?.getId}
              className={getData?.labelClassName}
              value={changedHeading}
              onChange={fieldHeadingChanged}
              onClick={() => handleInputClick(getData?.getId)}
            />
          </p>
          <textarea
            className={`input-type ${
              getData?.fieldName == "Market" ? "market-data" : ""
            }`}
            value={changedValue}
            onChange={fieldValueChanged}
            placeholder={
              changedHeading == "Font Family"
                ? "Paste the reference link"
                : changedHeading == "Notes"
                ? "Notes text here..."
                : ""
            }
          />
        </div>
      )) || (
        <div className="input-field">
          <p className="flex-col d-flex flex-row justify-content-between p-0 m-0">
            <span className="head-field">
              {(setRequiredField?.length > 0 && !getData?.removeBtn && (
                <>
                  <span>{changedHeading}</span>
                  {getData?.fieldName !== "Secondary Market" &&
                    getData?.fieldName !== "ISIN Code" &&
                    getData?.fieldName !== "Ticker Code" && <sup>*</sup>}
                </>
              )) || (
                <input
                  ref={getId}
                  id={getData?.getId}
                  className={`${getData?.labelClassName}`}
                  value={`${changedHeading}`}
                  onChange={fieldHeadingChanged}
                  onClick={() => handleInputClick(getData?.getId)}
                />
              )}
            </span>
            {getData?.removeBtn && (
              <button
                className="remove-field btn btn-0 p-0 m-0 "
                onClick={() => handleRemoveField(getData?.getId)}
              >
                <img src={trashFull} alt={"trashFull"} />
              </button>
            )}
          </p>
          {getData?.mainHead === "Market Data" &&
            getData?.fieldName === "Primary Market" && (
              <>
                {marketRegionList?.data && (
                  <SelectDropDown
                    multi={false}
                    options={marketRegionList.data}
                    labelField={"marketname"}
                    valueField={"marketid"}
                    values={showMarketData}
                    searchable={true}
                    onChange={handleChangedPriMarket}
                    placeholder={"Select Primary Market"}
                    className="currency-dropdownRenderer departmentList"
                    disabled={marketRegionList?.data?.length === 0 ? true : false}
                    dropdownPosition="auto"
                  />
                )}
              </>
            )}
          {getData?.mainHead === "Market Data" &&
            getData?.fieldName === "Secondary Market" && (
              <>
                {marketRegionList?.data && (
                  <SelectDropDown
                    multi={true}
                    options={marketRegionList.data}
                    labelField={"marketname"}
                    valueField={"marketid"}
                    values={showSecondMarketData}
                    searchable={true}
                    onChange={handleChangedSecondMarket}
                    placeholder={"Select Secondary Market"}
                    className="currency-dropdownRenderer departmentList"
                    disabled={marketRegionList?.data?.length === 0 ? true : false}
                    dropdownPosition="auto"
                    optionType={"checkbox"}
                  />
                )}
              </>
            )}
          {getData?.mainHead === "Currency" && (
            <>
              {currencyList?.data && (
                <SelectDropDown
                  multi={false}
                  options={cList}
                  labelField={"currency_name"}
                  valueField={"currency_code"}
                  values={changedCurrency}
                  searchable={true}
                  onChange={handleChangedCurrency}
                  placeholder={"Select Currency"}
                  className="currency-dropdownRenderer departmentList"
                  disabled={cList?.length === 0 ? true : false}
                  dropdownPosition="auto"
                />
              )}
            </>
          )}
          {getData?.mainHead === "User Interface" &&
            getData?.fieldName === "Font Family" && (
              <>
                {fontFamilyList?.data && (
                  <Select
                    multi={false}
                    options={fontFamilyList.data}
                    labelField={"name"}
                    valueField={"font_id"}
                    values={fontFamily}
                    searchable={true}
                    onChange={handleChangedFontFamily}
                    placeholder={"Select Font/ Create Entry"}
                    className="currency-dropdownRenderer departmentList"
                    disabled={fontFamilyList?.data?.length === 0 ? true : false}
                    dropdownPosition="auto"
                    create={true}
                    dropdownRenderer={customRender}
                  ></Select>
                )}
              </>
            )}
          {((getData?.fieldName === "Primary Color" ||
            getData?.fieldName === "Secondary Color") && (
            <>
              <input
                className="input-type"
                value={changedValue}
                onChange={colorfieldValueChanged}
                onClick={toggleColorPicker}
              />
              <span
                className="color-sample"
                style={{ backgroundColor: changedValue }}
                onClick={toggleColorPicker}
              ></span>
              {showColorPicker && (
                <ColorPicker
                  ref={colorPickerRef}
                  onChangeColor={handleColorPickerChange}
                  color={changedValue}
                />
              )}
            </>
          )) ||
            (getData?.mainHead !== "Currency" &&
              getData?.fieldName !== "Secondary Market" &&
              getData?.fieldName !== "Primary Market" &&
              getData?.fieldName !== "Font Family" && (
                <input
                  className={`input-type ${
                    getData?.fieldName == "Market" ? "market-data" : ""
                  }`}
                  value={changedValue}
                  onChange={fieldValueChanged}
                  placeholder={
                    changedHeading == "Font Family"
                      ? "Paste the reference link"
                      : changedHeading == "Notes"
                      ? "Notes text here..."
                      : ""
                  }
                />
              ))}

          <p className="flex-col2">
            <label className="error-msg">
              {errorMsg === true &&
                !getData?.removeBtn &&
                "* Please Enter the " + getData?.fieldName}
            </label>
            {getData?.addBtn && (
              <button
                className="add-field mt-3 btn btn-0 border-0"
                disabled={getData?.disabled}
                onClick={() => handleAddField()}
              >
                + Add extra field
              </button>
            )}
          </p>
        </div>
      )}
    </Fragment>
  );
};

export default InputField;

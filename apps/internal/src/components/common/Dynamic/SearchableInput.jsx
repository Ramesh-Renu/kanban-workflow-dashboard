import React from "react";
import searchIcon from "../../../assets/images/search-icon.svg";
import { Form } from "react-bootstrap";
import { t } from "i18next";
const SearchableInput = ({
  id,
  placeholder,
  value,
  onChange,
  clearCompanyName,
  isLoading,
  suggestions,
  onSelectSuggestion,
  isDropdownVisible,
  labelName = "",
  errorMsg,
  ismandatory,
  ...rest
}) => {
  return (
    <div className="dynamic-input-wrapper orderSection position-relative">
      {labelName && (
        <Form.Label className="fs-14" htmlFor={labelName}>
          {labelName} {ismandatory && <sup>*</sup>}
        </Form.Label>
      )}
      <div className="search-input-container">
        {/* <input
                    id={id}
                    className="input-type"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                /> */}
        <Form.Control
          aria-label={placeholder}
          aria-describedby={placeholder}
          placeholder={placeholder}
          onChange={onChange}
          {...rest}
          value={value ?? ""}
        ></Form.Control>
        {isLoading ? (
          <span className="search-loading"></span>
        ) : (
          <div>
            {(value || value?.length > 0) && clearCompanyName ? (
              <div
                className="icon-close-icon close_icon btn btn-0 border-0 m-0 p-0"
                onClick={() => clearCompanyName()}
              ></div>
            ) : (
              ""
            )}

            <img className="search-icon" src={searchIcon} alt="searchIcon" />
          </div>
        )}
      </div>

      {isDropdownVisible && suggestions.length > 0 && (
        <div className="suggestion-container">
          <div className="suggestion-list">
            {suggestions.map((suggestion) => (
              <li
                key={`${suggestion.customer_id}-${suggestion.customer_name}`}
                onClick={() => onSelectSuggestion(suggestion)}
              >
                {suggestion.customer_name}
              </li>
            ))}
          </div>
        </div>
      )}

      {isDropdownVisible && suggestions.length === 0 && (
        <div className="suggestion-container p-2">
          <div className="suggestion-list w-100 py-2">
            <div className="company-not-found d-flex flex-row gap-2 align-items-center">
              <img className="" src={searchIcon} alt="searchIcon" />
              <p className="m-0 text-left">
                {t("order_orion_v2.no_results_found_for_your_search")}
              </p>
            </div>
          </div>
        </div>
      )}
      {errorMsg && <label className="error-msg">{errorMsg}</label>}
    </div>
  );
};

export default SearchableInput;

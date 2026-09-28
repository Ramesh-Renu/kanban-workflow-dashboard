import React from "react";
import { Form } from "react-bootstrap";

const DynamicInput = ({
  labelName,
  maxLength,
  inputType,
  value,
  setValue,
  type,
  isMandatory,
  ...props
}) => {
  const inputId = labelName || props.id;

  return (
    <div className="w-100 d-flex flex-column dynamic-input-wrapper">
      {labelName && <Form.Label className="fs-14" htmlFor={inputId}>
        {labelName} {isMandatory && <sup>*</sup>}
      </Form.Label>}
      <Form.Control
        id={inputId}
        maxLength={maxLength}
        type={inputType || "text"}
        value={value}
        onChange={(e) => {
          props.onChange?.(e); // use parent handler if passed
          setValue?.(e.target.value); // fallback or local setter
        }}
        aria-label={props["aria-label"] || undefined}
        {...props}
      />
      {props.error && <small className="text-danger form-text">{props.error}</small>}
    </div>
  );
};

export default DynamicInput;

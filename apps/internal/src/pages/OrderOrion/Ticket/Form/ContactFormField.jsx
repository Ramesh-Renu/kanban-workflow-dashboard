import { Fragment } from "react";
import { Col, Form,  Row } from "react-bootstrap";
import DynamicInput from "../../../../components/common/Dynamic/Input";
import { SelectDropDown } from "@orion/shared";

const ContactFormField = ({
  className,
  fields,
  formData,
  handleChange,
  ...props
}) => {
  return (
    <Fragment>
      {fields.map((val, idx) => {
        // Flag to prevent multiple renders of the phone block
        if (val.type === "dialCode" || val.type === "phoneNumber") {
          if (idx !== 1) return null; // Render only once at index 1 (adjust if needed)
          return (
            <Col key={"phone-group_"+idx} lg={4} md={4} xs={10} className="mt-2">
              <Form.Label className="fs-14">&#160;Phone Number</Form.Label>
              <Row className="row px-3 gap-2">
                <Col lg={5} md={5} xs={8} className="dialCode-field p-0 m-0">
                  <SelectDropDown
                    id="dialCode"
                    multi={false}
                    searchable={true}
                    options={props.countryList || []}
                    labelField="dial_code"
                    valueField="country_id"
                    values={formData["dialCode"] || []}
                    onChange={(e) => handleChange(e, "dialCode")}
                    placeholder="+91"
                    className="multiple-select"
                    // optionType="radio"
                    dropdownPosition="auto"
                  />
                </Col>
                <Col className="p-0 m-0">
                  <DynamicInput
                    className={`fs-14 ${className || ""} ${
                      fields.find((f) => f.key === "phoneNumber")?.classNames ||
                      ""
                    }`}
                    placeholder={
                      fields.find((f) => f.key === "phoneNumber")
                        ?.placeholder || "Enter Mobile Number"
                    }
                    value={formData["phoneNumber"]}
                    onChange={(e) =>
                      handleChange(e.target.value, "phoneNumber")
                    }
                    error={props?.errors?.["phoneNumber"] || ""}
                    disabled={
                      fields.find((f) => f.key === "phoneNumber")?.disabled
                    }
                  />
                </Col>
              </Row>
            </Col>
          );
        }
        // Handle normal input fields
        return val.type === "input" ? (
          <Col lg={4} md={4} xs={10} key={idx} className="mt-3">
            <DynamicInput
              className={`fs-14 ${className || ""} ${val.classNames || ""}`}
              labelName={val.label}
              placeholder={val.placeholder}
              value={formData[val.key]}
              onChange={(e) => handleChange(e.target.value, val.key)}
              error={props?.errors?.[val.key.trim?.()] || ""}
              disabled={val?.disabled}
            />
          </Col>
        ) : null;
      })}
    </Fragment>
  );
};

export default ContactFormField;

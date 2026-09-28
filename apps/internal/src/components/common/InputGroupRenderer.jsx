import { Col } from "react-bootstrap";
import DynamicInput from "../../components/common/Dynamic/Input";

const InputGroupRenderer = ({
  className,
  fields,
  formData,
  handleChange,
  ...props
}) => {
  
  return (
    <>
      {fields.map((val, idx) => {
        return (
        <Col lg={4} md={4} xs={10} key={idx} className="mt-3">
          <DynamicInput
            className={`fs-14 ${className ? className : ""} ${
              val.classNames ? val.classNames : ""
            }`}
            labelName={val.label}
            placeholder={val.placeholder}
            value={formData[val.key]}
            onChange={(e) => handleChange(e.target.value, val.key)}
            error={(props?.errors?.[val.key.trim?.()]) || ""}
            isMandatory={val?.isMandatory}
            disabled={val?.disabled} 
            {...props}
          />
        </Col>
      )})}
    </>
  );
};

export default InputGroupRenderer;

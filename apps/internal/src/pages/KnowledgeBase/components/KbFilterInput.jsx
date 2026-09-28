import { Col } from "react-bootstrap";
import { searchIcon } from "assets/images";

const KbFilterInput = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  colProps = { xs: 12, md: 6, lg: 4 },
  wrapperClassName = "position-relative",
  inputClassName = "form-control knowledge-base-hub__filter-input",
  iconClassName = "knowledge-base-hub__filter-icon knowledge-base-hub__filter-icon--inline",
}) => (
  <Col {...colProps} className={wrapperClassName}>
    <input
      type="search"
      className={inputClassName}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel || placeholder}
    />
    <img className={iconClassName} src={searchIcon} alt="" />
  </Col>
);

export default KbFilterInput;

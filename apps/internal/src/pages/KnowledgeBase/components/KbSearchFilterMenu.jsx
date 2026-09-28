import { Dropdown } from "react-bootstrap";
import { classNames } from "@euroland/libs";

/**
 * Soft-pill filter menu with explicit checkmark on the selected option.
 */
const KbSearchFilterMenu = ({
  label,
  ariaLabel,
  options = [],
  value,
  onChange,
  className,
}) => (
  <Dropdown
    className={classNames("knowledge-base-hub__search-menu", className)}
    onSelect={(eventKey) => {
      if (eventKey == null) return;
      onChange?.(eventKey);
    }}
  >
    <Dropdown.Toggle
      variant="outline-secondary"
      size="sm"
      className="knowledge-base-hub__search-menu-toggle"
      aria-label={ariaLabel || label}
    >
      <span className="knowledge-base-hub__search-menu-label">{label}</span>
      <span className="icon-chevron-thin-down" aria-hidden="true" />
    </Dropdown.Toggle>
    <Dropdown.Menu className="knowledge-base-hub__search-menu-panel">
      {options.map((option) => {
        const isActive = String(value) === String(option.value);
        return (
          <Dropdown.Item
            key={option.value}
            eventKey={option.value}
            active={isActive}
            className={classNames("knowledge-base-hub__search-menu-item", {
              "knowledge-base-hub__search-menu-item--active": isActive,
            })}
          >
            <span
              className="knowledge-base-hub__search-menu-check"
              aria-hidden="true"
            >
              {isActive ? "✓" : ""}
            </span>
            <span className="knowledge-base-hub__search-menu-item-label">
              {option.label}
            </span>
          </Dropdown.Item>
        );
      })}
    </Dropdown.Menu>
  </Dropdown>
);

export default KbSearchFilterMenu;

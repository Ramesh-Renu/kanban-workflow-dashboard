import React, { useEffect, useState } from "react";

function ToggleSwitch({ label, toggled = false, onClick, ...props }) {
  const [isToggled, setIsToggled] = useState(toggled);

  useEffect(() => {
    setIsToggled(toggled);
  }, [toggled]);

  const handleChange = () => {
    if (props.disabled) return;
    const newValue = !isToggled;
    setIsToggled(newValue);
    onClick?.(newValue);
  };

  return (
    <div className="toggle-switch">
      {label && (
        <span className="toggle-label">
          {label}
        </span>
      )}
      <label className={`toggle-switch-label ${props?.disabled ? "disable" : props?.status || ""}`}>
        <input
          type="checkbox"
          checked={isToggled}
          onChange={handleChange}
          {...props}
        />
        <span className="switch" />
      </label>
    </div>
  );
}

export default ToggleSwitch;

import { classNames } from "@euroland/libs";
import React from "react";

export default function InputContainer({ className, label, children, isRequired, chip }) {
  return (
    <div className={classNames(className, "input-container flex-col")}>
      <label className='font-semibold '>
        {label}
        {chip ? <span className='chip'>{`${chip}`}</span> : null}
        {isRequired && <span className="text-[var(--color-light-red)] ml-1">*</span>}
      </label>
      <div className="input-field">{children}</div>
    </div>
  );
}

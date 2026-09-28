import React from "react";
import PropTypes from "prop-types";
import { classNames } from "@euroland/libs/utils";

const ICON_NAME = /** @type { const } */ ([
  "checkbox-active",
  "checkbox",
  "triangle-up",
  "chevron-thin-down",
  "chevron-thin-right",
  "arrow-left",
  "arrow-down",
  "arrow-up",
  "loading",
  "chevron-down",
  "close",
  "rectangle",
  "opf-bold",
  "opf-italic",
  "opf-under-text",
  "opf-lower-upper-case",
  "opf-upper-case",
  "opf-lower-case",
  "opf-check",
]);
/**
 *
 * @param {{
 * className: string,
 * name: import("../..").ArrayToTuple<typeof ICON_NAME>
 * style: interface {}
 * }} props
 */
export default function Icon({ name, className, style = {}, ...props }) {
  return (
    <span
      aria-hidden="true"
      {...props}
      style={{ ...style }}
      className={classNames(`icon-${name}`, className)}
    ></span>
  );
}

Icon.propTypes = {
  name: PropTypes.oneOf(ICON_NAME),
  className: PropTypes.string,
};

import { setVariableByTemplate } from "@euroland/libs/utils";

import variableStyles from "@orion/shared/src/styles/variables-style.json";
import variableStylesCommon from "@euroland/react/dist/esm/scss/variables-style.json";

export function loadVariableStyles(template = "") {
  setVariableByTemplate(
    template,
    variableStylesCommon,
    variableStyles
  ).injectTo(document.head, true);
}
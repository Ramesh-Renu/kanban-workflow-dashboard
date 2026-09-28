/** Branding Guidelines v2 — constants & field schema */

export const BRANDING_SECTION_IDS = [
  "typography",
  "colorScheme",
  "buttons",
  "tabs",
  "tables",
  "inputFields",
  "checkbox",
  "radioButtons",
  "dropDown",
  "exportIcons",
];

/** Centralized notes section (nav only — not a customerBranding API section). */
export const BRANDING_NOTES_SECTION_ID = "notes";

export const BRANDING_NAV_SECTION_IDS = [...BRANDING_SECTION_IDS, BRANDING_NOTES_SECTION_ID];

export const UNIT_OPTIONS = [
  { label: "px", value: "px" },
  { label: "%", value: "%" },
  { label: "rem", value: "rem" },
  { label: "em", value: "em" },
];

export const BRANDING_FONT_SIZE_LIMITS = { min: 1, max: 999 };
export const FONT_SIZE_MAX_DECIMAL_PLACES = 3;
export const BRANDING_FONT_SIZE_UNIT_PATTERN = "px|rem|em|%";

export const VALID_FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
export const BRANDING_FONT_WEIGHT_LIMITS = { min: 100, max: 900, step: 100 };
export const FONT_WEIGHT_OPTIONS = VALID_FONT_WEIGHTS.map((weight) => ({
  label: String(weight),
  value: String(weight),
}));
export const BRANDING_BORDER_WIDTH_LIMITS = { min: 0, max: 999 };
export const BRANDING_BORDER_RADIUS_LIMITS = { min: 0, max: 999 };

export const BRANDING_EDGE_QUAD_EDGES = {
  width: [
    { key: "top", labelKey: "branding_edge_top" },
    { key: "bottom", labelKey: "branding_edge_bottom" },
    { key: "left", labelKey: "branding_edge_left" },
    { key: "right", labelKey: "branding_edge_right" },
  ],
  radius: [
    { key: "topLeft", labelKey: "branding_edge_top_left" },
    { key: "bottomRight", labelKey: "branding_edge_bottom_right" },
    { key: "topRight", labelKey: "branding_edge_top_right" },
    { key: "bottomLeft", labelKey: "branding_edge_bottom_left" },
  ],
};

export const BRANDING_SECTION_I18N = {
  typography: "branding_section_typography",
  colorScheme: "branding_section_color_scheme",
  buttons: "branding_section_buttons",
  tabs: "branding_section_tabs",
  tables: "branding_section_tables",
  inputFields: "branding_section_input_fields",
  checkbox: "branding_section_checkbox",
  radioButtons: "branding_section_radio_buttons",
  dropDown: "branding_section_drop_down",
  exportIcons: "branding_section_export_icons",
  notes: "branding_section_notes",
};

/** Typography fields that are always shown (per-language font fields are generated separately). */
export const BRANDING_TYPOGRAPHY_STATIC_FIELDS = [
  {
    key: "languages",
    labelKey: "branding_field_languages",
    type: "languagesReadOnly",
    groupTitle: "",
    colSize: 12,
  },
  {
    key: "headingFontSize",
    labelKey: "branding_field_font_size",
    type: "sizeWithUnit",
    groupTitle: "branding_group_heading_details",
    colSize: 6,
  },
  {
    key: "headingFontWeight",
    labelKey: "branding_field_font_weight",
    type: "fontWeightNumeric",
    colSize: 6,
  },
  {
    key: "headingTextFormatting",
    labelKey: "branding_field_text_formatting",
    type: "textFormatting",
    colSize: 6,
  },
  {
    key: "headingColor",
    labelKey: "branding_field_color",
    type: "color",
    colSize: 6,
  },
  {
    key: "bodyFontSize",
    labelKey: "branding_field_font_size",
    type: "sizeWithUnit",
    groupTitle: "branding_group_body_details",
    colSize: 6,
  },
  {
    key: "bodyColor",
    labelKey: "branding_field_color",
    type: "color",
    colSize: 6,
  },
];

export const BRANDING_SECTION_FIELDS = {
  typography: BRANDING_TYPOGRAPHY_STATIC_FIELDS,

  /** Multi-color primary/secondary — rendered via BrandingColorSchemeSection. */
  colorScheme: [],

  buttons: [
    // {
    //   key: "configurationMethod",
    //   labelKey: "branding_field_configuration_method",
    //   type: "radioGroup",
    //   options: [
    //     { labelKey: "branding_option_standard_selection", value: "standard" },
    //     // { labelKey: "branding_option_parameter_code", value: "code" },
    //   ],
    //   groupTitle: "",
    //   colSize: 12,
    // },
    {
      key: "inactiveBgColor",
      labelKey: "branding_field_background_color",
      type: "color",
      groupTitle: "branding_group_inactive_state",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "inactiveFontColor",
      labelKey: "branding_field_font_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "inactiveBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "hoverBgColor",
      labelKey: "branding_field_background_color",
      type: "color",
      groupTitle: "branding_group_active_hover_state",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "hoverFontColor",
      labelKey: "branding_field_font_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "hoverBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "buttonBorderWidth",
      labelKey: "branding_field_border_width",
      type: "edgeQuad",
      quadLayout: "width",
      condition: "standard",
      colSize: 12,
    },
    {
      key: "buttonBorderRadius",
      labelKey: "branding_field_border_radius",
      type: "edgeQuad",
      quadLayout: "radius",
      condition: "standard",
      colSize: 12,
    },
    {
      key: "buttonFontSize",
      labelKey: "branding_field_font_size",
      type: "sizeWithUnit",
      condition: "standard",
      colSize: 4,
      placeholder: "branding_font_size_placeholder",
    },
    {
      key: "buttonTextFormatting",
      labelKey: "branding_field_text_formatting",
      type: "textFormatting",
      condition: "standard",
      colSize: 12,
    },
    // {
    //   key: "buttonParametersCode",
    //   labelKey: "branding_field_button_parameters_code",
    //   type: "textarea",
    //   condition: "code",
    //   placeholder: "Enter button styling code (CSS, JSON, etc.)...",
    //   colSize: 12,
    // },
  ],

  tabs: [
    // {
    //   key: "configurationMethod",
    //   labelKey: "branding_field_configuration_method",
    //   type: "radioGroup",
    //   options: [
    //     { labelKey: "branding_option_standard_selection", value: "standard" },
    //     // { labelKey: "branding_option_tab_parameter_code", value: "code" },
    //   ],
    //   groupTitle: "",
    //   colSize: 12,
    // },
    {
      key: "inactiveBgColor",
      labelKey: "branding_field_background_color",
      type: "color",
      groupTitle: "branding_group_inactive_state",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "inactiveFontColor",
      labelKey: "branding_field_font_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "inactiveBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "activeBgColor",
      labelKey: "branding_field_background_color",
      type: "color",
      groupTitle: "branding_group_active_hover_state",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "activeFontColor",
      labelKey: "branding_field_font_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "activeBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "activeBorderWidth",
      labelKey: "branding_field_border_width",
      type: "edgeQuad",
      quadLayout: "width",
      condition: "standard",
      colSize: 12,
    },
    {
      key: "tabBorderRadius",
      labelKey: "branding_field_border_radius",
      type: "edgeQuad",
      quadLayout: "radius",
      condition: "standard",
      colSize: 12,
    },
    {
      key: "tabFontSize",
      labelKey: "branding_field_font_size",
      type: "sizeWithUnit",
      condition: "standard",
      colSize: 4,
      placeholder: "branding_font_size_placeholder",
    },
    {
      key: "tabTextFormatting",
      labelKey: "branding_field_text_formatting",
      type: "textFormatting",
      condition: "standard",
      colSize: 12,
    },
    // {
    //   key: "tabParametersCode",
    //   labelKey: "branding_field_tab_parameters_code",
    //   type: "textarea",
    //   condition: "code",
    //   placeholder: "Enter tab styling code (CSS, JSON, etc.)...",
    //   colSize: 12,
    // },
  ],

  tables: [
    // {
    //   key: "configurationMethod",
    //   labelKey: "branding_field_configuration_method",
    //   type: "radioGroup",
    //   options: [
    //     { labelKey: "branding_option_standard_selection", value: "standard" },
    //     // { labelKey: "branding_option_table_parameter_code", value: "code" },
    //   ],
    //   groupTitle: "",
    //   colSize: 12,
    // },
    {
      key: "tableBorderRadius",
      labelKey: "branding_field_border_radius",
      type: "edgeQuad",
      quadLayout: "radius",
      condition: "standard",
      colSize: 12,
    },
    {
      key: "headerTextFormatting",
      labelKey: "branding_field_text_formatting",
      type: "textFormatting",
      groupTitle: "branding_group_table_header",
      condition: "standard",
      colSize: 12,
    },
    {
      key: "headerBgColor",
      labelKey: "branding_field_header_background",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "headerTextColor",
      labelKey: "branding_field_header_text_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "headerBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "rowTextFormatting",
      labelKey: "branding_field_text_formatting",
      type: "textFormatting",
      groupTitle: "branding_group_table_body",
      condition: "standard",
      colSize: 12,
    },
    {
      key: "rowBgColor",
      labelKey: "branding_field_body_background",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "rowTextColor",
      labelKey: "branding_field_body_text_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "rowBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "rowBorderWidth",
      labelKey: "branding_field_border_width",
      type: "edgeQuad",
      quadLayout: "width",
      condition: "standard",
      colSize: 12,
    },
    {
      key: "oddRowBgColor",
      labelKey: "branding_field_odd_row",
      type: "color",
      groupTitle: "branding_group_odd_even_row_bg",
      condition: "standard",
      colSize: 4,
    },
    {
      key: "evenRowBgColor",
      labelKey: "branding_field_even_row",
      type: "color",
      condition: "standard",
      colSize: 4,
    },
    // {
    //   key: "tableParametersCode",
    //   labelKey: "branding_field_table_parameters_code",
    //   type: "textarea",
    //   condition: "code",
    //   placeholder: "Enter table styling code (CSS, JSON, etc.)...",
    //   colSize: 12,
    // },
  ],

  inputFields: [
    {
      key: "inputBorderWidth",
      labelKey: "branding_field_border_width",
      type: "edgeQuad",
      quadLayout: "width",
      colSize: 12,
    },
    {
      key: "primaryColor",
      labelKey: "branding_field_border_color",
      type: "color",
      colSize: 12,
    },
    {
      key: "inputBorderRadius",
      labelKey: "branding_field_border_radius",
      type: "edgeQuad",
      quadLayout: "radius",
      colSize: 12,
    },
  ],

  checkbox: [
    {
      key: "checkboxActiveBgColor",
      labelKey: "branding_field_background_color",
      type: "color",
      groupTitle: "branding_group_active_state",
      colSize: 6,
    },
    {
      key: "checkboxActiveBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      colSize: 6,
    },
    {
      key: "checkboxNormalBgColor",
      labelKey: "branding_field_background_color",
      type: "color",
      groupTitle: "branding_group_normal_state",
      colSize: 6,
    },
    {
      key: "checkboxNormalBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      colSize: 6,
    },
  ],

  radioButtons: [
    {
      key: "radioActiveBgColor",
      labelKey: "branding_field_background_color",
      type: "color",
      groupTitle: "branding_group_active_state",
      colSize: 6,
    },
    {
      key: "radioActiveBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      colSize: 6,
    },
    {
      key: "radioNormalBgColor",
      labelKey: "branding_field_background_color",
      type: "color",
      groupTitle: "branding_group_normal_state",
      colSize: 6,
    },
    {
      key: "radioNormalBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      colSize: 6,
    },
  ],

  dropDown: [
    {
      key: "dropdownBorderColor",
      labelKey: "branding_field_border_color",
      type: "color",
      colSize: 12,
    },
    {
      key: "dropdownBorderWidth",
      labelKey: "branding_field_border_width",
      type: "edgeQuad",
      quadLayout: "width",
      colSize: 12,
    },
    {
      key: "dropdownActiveBgColor",
      labelKey: "branding_field_active_background_color",
      type: "color",
      colSize: 12,
    },
    {
      key: "dropdownBorderRadius",
      labelKey: "branding_field_border_radius",
      type: "edgeQuad",
      quadLayout: "radius",
      colSize: 12,
    },
  ],

  exportIcons: [],
};

export const BRANDING_REQUIRED_FIELDS = {
  typography: ["languages"],
};

/** UI section id → API payload key */
export const BRANDING_UI_TO_API_SECTION = {
  typography: "typography",
  colorScheme: "colors",
  buttons: "buttons",
  tabs: "tabs",
  tables: "tables",
  inputFields: "inputFields",
  checkbox: "checkbox",
  radioButtons: "radioButton",
  dropDown: "dropdown",
  exportIcons: "exportIcons",
};

/** API key → UI section id */
export const BRANDING_API_TO_UI_SECTION = Object.fromEntries(
  Object.entries(BRANDING_UI_TO_API_SECTION).map(([ui, api]) => [api, ui])
);

/** Maps UI section id to API payload key (e.g. colorScheme → colors). */
export function mapBrandingUiSectionToApiKey(uiSectionId) {
  return BRANDING_UI_TO_API_SECTION[uiSectionId] || uiSectionId;
}

/** section_id sent when a section has no id from GET (fresh branding save). */
export const BRANDING_FRESH_SECTION_ID = 0;

/** @deprecated Use BRANDING_FRESH_SECTION_ID (0) when API did not return section_id. */
export const BRANDING_SECTION_API_IDS = {
  typography: BRANDING_FRESH_SECTION_ID,
  colors: BRANDING_FRESH_SECTION_ID,
  buttons: BRANDING_FRESH_SECTION_ID,
  tabs: BRANDING_FRESH_SECTION_ID,
  tables: BRANDING_FRESH_SECTION_ID,
  inputFields: BRANDING_FRESH_SECTION_ID,
  checkbox: BRANDING_FRESH_SECTION_ID,
  radioButton: BRANDING_FRESH_SECTION_ID,
  dropdown: BRANDING_FRESH_SECTION_ID,
};

export const BRANDING_ATTACHMENT_FORM_KEYS = {
  typography: "typographyAttachements",
  colorScheme: "colorsAttachements",
  buttons: "buttonsAttachements",
  tabs: "tabsAttachements",
  tables: "tablesAttachements",
  inputFields: "inputFieldsAttachements",
  checkbox: "checkboxAttachements",
  radioButton: "radioButtonAttachements",
  dropdown: "dropdownAttachements",
  exportIcons: "iconAttachements",
};

export const LEGACY_BRANDING_KEYS = [
  "primaryColor",
  "secondaryColor",
  "fontFamily",
  "fontColor",
  "fontSize",
  "designLink",
  "otherData",
  "notes",
];

/** API payload key on ticket branding (v2 section data from backend). */
export const BRANDING_CUSTOMER_BRANDING_KEY = "customerBranding";

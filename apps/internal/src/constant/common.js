const appConstants = Object.freeze({
  // Validation patterns
  VALIDATION_PATTERNS: {
    onlyAlphabet: "^[a-zA-Z]+$", // Applicable for alphapet field
    alphaNumeric: "[أ-يa-zA-Z-_()0-9]+", // Applicable for alpha Numeric field
    alphaNumericWithDot: "[أ-يa-zA-Z-_()0-9.]+", // Applicable for alpha Numeric with dot
    alphaNumericWithSpace: "[أ-يa-zA-Z-_()0-9 ]+", // Applicable for alpha Numeric with space
    onlyNumber: "^[0-9]*$", // Applicable for Number field
    alphabetWithSpace: "^[a-zA-Z ]+$", // Applicable for alphapet with space
    phonenumber: "[+0-9 ]+", // Applicable for phone Number field
    phonenumberHyphens: "^[+0-9\\- ]+$", //allow numbers with hyphens
    email:
      "([a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]{1}[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]*)((@[a-zA-Z-]{2}[a-zA-Z-]*)[\\.](([a-zA-Z]{3}|[a-zA-Z]{2})|([a-zA-Z]{3}|[a-zA-Z]{2}).[a-zA-Z]{2}))", // Applicable for email field
    countryCode: "[+0-9]+", // Applicable for country code field
    password: "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$",
    url: /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/, // Applicable for URL field
    customUrl:
      /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*\.com(?:\/[^\s/?#]+(?:\?(?:[^\s#&]+(?:=[^\s&]*)?&)*(?:[^\s#&]+(?:=[^\s&]*)?)?)?(?:#[^\s]*)?)?(?:\/[^\s]*)?(?:\/|(?![^\s]))?$/,
    priceFormatPattern: "[0-9.,]+", // Applicable for price format
    colorPickerPattern: "^#[0-9A-Fa-f]{0,6}$",
  },
  pageOffSet: 0,
  pageSize: 20,
  listOffSet: 0,
  listSize: 10,
  maxFileSize: 50,
  restrictedFileTypes: [
    // Executable & system files
    "exe",
    "msi",
    "bat",
    "cmd",
    "com",
    "scr",
    "pif",
    "cpl",
    "dll",
    "sys",
    "drv",

    // Script & code files (cross-site scripting or malware risk)
    "js",
    "vbs",
    "sh",
    "php",
    "py",
    "rb",
    "pl",
    "asp",
    "aspx",
    "jsp",
    "jar",

    // Disk and ISO related
    "vhd",
    "vhdx",
    "vmdk",
    "ova",
    "ovf",
    "iso",
    "dmg",
    "img",
    "vmdk",

    // Dangerous documents/macros
    "docm",
    "xlsm",
    "pptm",
    "dotm",
    "xltm",
    "ppam",

    // Misc (abuse-prone or misleading)
    "torrent",
    "apk",
    "bin",
    "dat",
    "ps1",
    "db",
    "sql",
  ],
  intervalTime: 120000,
  commentsIntervalTime: 60000,
  workAllocationIntervalTime: 60000,
  charCountLimit: {
    comments: 5000,
    compnayDescription: 5000,
    brandingNotes: 5000,
    taskTitle: 60,
  },
  createSubTaskCountLimit: 100,
  createSubTaskNameCharMinLimit: 5,
  createSubTaskNameCharMaxLimit: 100,
  orderCreationMandatoryField: {
    1: {
      fields: [
        "companyName",
        // "companyCode",
        "primaryMarket",
        // "language",
        "websiteLink",
      ],
      tab_restiction: [2, 3, 5, 7],
    },
    2: {
      fields: (companyData) => {
        if (
          companyData?.orderType?.length === 1 &&
          companyData?.orderType[0] === 16
        ) {
          return [
            "tools.language",
            "tools.orderDate",
            "tools.toolsDetails[0].toolsId",
          ];
        } else if (
          companyData?.orderType?.length === 1 &&
          companyData?.orderType[0] === 18
        ) {
          return [
            "tools.language",
            "tools.orderDate",
            "tools.toolsDetails[0].toolsId",
          ];
        } else if (
          companyData?.orderType?.length === 1 &&
          companyData?.orderType[0] !== 16
        ) {
          return [
            "tools.language",
            "tools.orderDate",
            "tools.toolsDetails[0].toolsId",
            "tools.toolsDetails[0].package",
          ];
        } else if (
          companyData?.orderType?.length === 2 &&
          companyData?.orderType.includes(53) &&
          companyData?.orderType.includes(18)
        ) {
          return [
            "tools.language",
            "tools.orderDate",
            "tools.toolsDetails[0].toolsId",
            "tools.toolsDetails[1].toolsId",
          ];
        } else if (
          companyData?.orderType?.length === 2 &&
          companyData?.orderType.includes(53) &&
          companyData?.orderType.includes(17)
        ) {
          return [
            "tools.language",
            "tools.orderDate",
            "tools.toolsDetails[0].toolsId",
            "tools.toolsDetails[1].toolsId",
            "tools.toolsDetails[1].package",
          ];
        } else if (
          companyData?.orderType?.length === 2 &&
          !companyData?.orderType.includes(53)
        ) {
          return [
            "tools.language",
            "tools.orderDate",
            "tools.toolsDetails[0].toolsId",
            "tools.toolsDetails[0].package",
            "tools.toolsDetails[1].toolsId",
          ];
        } else if (companyData?.orderType?.length > 2) {
          return [
            "tools.language",
            "tools.orderDate",
            "tools.toolsDetails[0].toolsId",
            "tools.toolsDetails[1].toolsId",
            "tools.toolsDetails[2].toolsId",
            "tools.toolsDetails[2].package",
          ];
        }
        return [];
      },
      tab_restiction: [],
    },
    4: {
      fields: [],
      tab_transition: [],
    },
    3: {
      fields: [],
      tab_transition: [],
    },
    6: {
      fields: [],
      tab_transition: [],
    },
    5: {
      fields: [],
      tab_transition: [],
    },
    7: {
      fields: [],
      tab_transition: [],
    },
  },
  beforeProcessOrderSalesMandatoryField: {
    1: {
      fields: [
        "companyInfo.companyName",
        "companyInfo.primaryMarket",
        // "companyInfo.language",
        "companyInfo.websiteLink",
      ],
    },
    2: {
      fields: (companyData) => {
        const hasPackage = (companyData, index) => {
          const pkg =
            companyData?.orderInfo?.tools?.toolsDetails?.[index]?.package;
          return Array.isArray(pkg) && pkg.length > 0;
        };
        const fieldIf = (condition, path) => (condition ? [path] : []);

        if (
          companyData?.orderType?.length === 1 &&
          companyData?.orderType[0] === 18
        ) {
          return [
            "orderInfo.tools.language",
            "orderInfo.tools.orderDate",
            "orderInfo.tools.toolsDetails[0].toolsId",
          ];
        } else if (
          companyData?.orderType?.length === 1 &&
          companyData?.orderType[0] !== 16
        ) {
          return [
            "orderInfo.tools.language",
            "orderInfo.tools.orderDate",
            "orderInfo.tools.toolsDetails[0].toolsId",
            "orderInfo.tools.toolsDetails[0].package",
          ];
        } else if (
          companyData?.orderType?.length === 2 &&
          companyData?.orderType.includes(53) &&
          companyData?.orderType.includes(18)
        ) {
          return [
            "orderInfo.tools.language",
            "orderInfo.tools.orderDate",
            "orderInfo.tools.toolsDetails[0].toolsId",
            "orderInfo.tools.toolsDetails[1].toolsId",
          ];
        } else if (
          companyData?.orderType?.length === 2 &&
          companyData?.orderType.includes(53) &&
          companyData?.orderType.includes(17)
        ) {
          return [
            "orderInfo.tools.language",
            "orderInfo.tools.orderDate",
            "orderInfo.tools.toolsDetails[0].toolsId",
            ...fieldIf(
              hasPackage(companyData, 0),
              "orderInfo.tools.toolsDetails[0].package"
            ),
            "orderInfo.tools.toolsDetails[1].toolsId",
            ...fieldIf(
              hasPackage(companyData, 1),
              "orderInfo.tools.toolsDetails[1].package"
            ),
          ];
        } else if (
          companyData?.orderType?.length === 2 &&
          !companyData?.orderType.includes(53)
        ) {
          return [
            "orderInfo.tools.language",
            "orderInfo.tools.orderDate",
            "orderInfo.tools.toolsDetails[0].toolsId",
            "orderInfo.tools.toolsDetails[0].package",
            "orderInfo.tools.toolsDetails[1].toolsId",
          ];
        } else if (companyData?.orderType?.length > 1) {
          return [
            "orderInfo.tools.language",
            "orderInfo.tools.orderDate",
            "orderInfo.tools.toolsDetails[0].toolsId",
            "orderInfo.tools.toolsDetails[0].package",
            "orderInfo.tools.toolsDetails[1].toolsId",
          ];
        }
        return [];
      },
    },

    3: { fields: [] },
    4: { fields: [] },
    5: { fields: [] },
  },
  OBMandatoryField: {
    1: {
      fields: [
        // "companyName",
        // "industrySector",
        // "region",
        // "country",
        // "primaryMarket",
        // "language",
        // "instrument",
        // "websiteLink",
      ],
      tab_restiction: [2, 3, 5, 7],
    },
    2: {
      fields: [
        // "tools.orderDate",
        // "tools.deliveryDate",
        // "tools.toolsDetails[0].toolsId",
        // "tools.toolsDetails[1].toolsId",
        // "tools.toolsDetails[0].package",
        // "tools.toolsDetails[1].package",
      ],
      tab_restiction: [],
    },
    4: {
      fields: [],
      tab_transition: [],
    },
    3: {
      fields: [],
      tab_transition: [],
    },
    6: {
      fields: [],
      tab_transition: [],
    },
    5: {
      fields: [],
      tab_transition: [],
    },
    7: {
      fields: [],
      tab_transition: [],
    },
  },
  SACanNotEditField: {
    1: {
      fields: [
        "companyName",
        "companyCode",
        "industrySector",
        // "region",
        // "country",
        // "primaryMarket",
        // "language",
        // "websiteLink",
        // "ipoListingDate",
        // "instrument",
        // "websiteLink",
      ],
    },
    2: {
      fields: [
        "tools.orderDate",
        "tools.toolsDetails[0].toolsId",
        "tools.toolsDetails[0].package",
        "tools.toolsDetails[1].toolsId",
        "tools.toolsDetails[1].package",
      ],
    },
    3: { fields: [] },
    4: { fields: [] },
    5: {
      fields: [
        // "primaryColor",
        // "secondaryColor",
        // "fontFamily",
        // "fontColor",
        // "fontSize",
        // "designLink"
      ],
    },
    7: {
      fields: [],
    },
  },
  OBCanNotEditField: {
    1: {
      fields: ["companyName", "companyCode", "industrySector", "isin", "symbol"],
    },
    2: {
      fields: [
        "tools.orderVal",
        "tools.orderDate",
        "tools.toolsDetails[0].toolsId",
        "tools.toolsDetails[1].toolsId",
        "tools.toolsDetails[0].package",
      ],
    },
    5: {
      fields: [],
    },
    7: {
      fields: ["confidential_attachment"],
    },
  },
  SACanShowField: {
    1: {
      fields: [],
    },
    2: {
      fields: [
        "tools.orderDate",
        "tools.toolsDetails[0].toolsId",
        "tools.toolsDetails[0].package",
        "order_value",
        "start_up_fee",
      ],
    },
    5: {
      fields: [],
    },
    7: {
      fields: ["confidential_attachment", "common_attachment"],
    },
  },
  OBCanShowField: {
    1: {
      fields: [],
    },
    2: {
      fields: [
        "tools.orderDate",
        "tools.toolsDetails[0].toolsId",
        "tools.toolsDetails[0].package",
      ],
    },
    5: {
      fields: [],
    },
    7: {
      fields: ["common_attachment"],
    },
  },
  canClickEditButton: ["SA", "OB"],
  canAssigneeAddChange: ["SA", "OB"],
  canChangeLabel: ["SA", "OB"],
});
export default appConstants;

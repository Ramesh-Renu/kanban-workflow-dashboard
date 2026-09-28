import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { secureEncrypt } from "./encrypt";
import dayjs from "dayjs";
// import * as XLSX from "xlsx";
import { setActiveWorkSpace, setAuthType, setExpiresOn } from "@orion/shared";

export const compareObject = (a = {}, b = {}) => {
  if (a === b) return true;
  if ((Array.isArray(a) && !Array.isArray(b)) || (!Array.isArray(a) && Array.isArray(b)))
    return false;
  const aggregate = { ...a, ...b };
  for (const key in aggregate) {
    if (typeof a[key] === "object" && typeof b[key] === "object") {
      return compareObject(a[key], b[key]);
    }
    if (a[key] !== b[key]) return false;
  }
  return true;
};

/**
 *
 * @param {Record<string,any>} data
 * @returns {Record<string,any>}
 */
export const trimObjectProperties = (data = {}) => {
  const newData = { ...data };
  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      const element = data[key];
      if (typeof element === "string") {
        newData[key] = element.trim();
      }
    }
  }
  return newData;
};

export const isObjectEmpty = (objectName) => {
  return Object.keys(objectName).length === 0 && objectName.constructor === Object;
};

export const isArrayEmpty = (array) => {
  return array.length === 0;
};

export const isValidType = (name, allowType) => {
  for (let j = 0; j < allowType.length; j++) {
    let sCurExtension = allowType[j];
    if (
      name
        .substr(name.length - sCurExtension.length, sCurExtension.length)
        .toLowerCase() === sCurExtension.toLowerCase()
    ) {
      return true;
    }
  }
  return false;
};

export const validateFiles = (fileArray, allowFileType) => {
  return fileArray.filter((file) => isValidType(file.name, allowFileType));
};

export const hasScrollBar = (className) => {
  const element = document.querySelector(className);
  if (!element) {
    return false;
  }
  const hasScrollBar =
    element.clientHeight < element.scrollHeight ||
    element.clientWidth < element.scrollWidth;

  return hasScrollBar;
};

export const normalizeData = (data) => {
  const normalizedData = {
    entities: {},
    result: [],
  };

  data.forEach((item) => {
    const { id } = item;
    normalizedData.entities[id] = item;
    normalizedData.result.push(id);
  });

  return normalizedData;
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are zero-based
  const year = date.getFullYear();

  const formattedDay = day < 10 ? `0${day}` : day;
  const formattedMonth = month < 10 ? `0${month}` : month;

  return `${formattedDay}/${formattedMonth}/${year}`;
};

export const getFileTypeClassName = (fileType) => {
  if (!fileType) {
    return ""; // Return a default class or an empty string if file is not provided
  }

  const fileTypeParam = fileType.split("/")[0]; // 'image', 'application', etc.
  const fileFormat = fileType.split("/")[1];
  switch (fileTypeParam) {
    case "image":
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".gif":
    case ".bmp":
    case ".webp":
    case ".svg":
    case ".ico":
      return "icon-image-file";
    case "application":
      if (fileFormat == "pdf") {
        return "icon-pdf-file";
      } else if (fileFormat == "x-zip-compressed") {
        return "icon-archive-file";
      } else if (
        fileFormat == "vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        return "icon-doc-file";
      } else if (fileFormat == "vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        return "icon-xls-file";
      } else {
        return "icon-unsupported-file";
      }
    case ".pdf":
      return "icon-pdf-file";
    case ".zip":
      return "icon-archive-file";
    case ".doc":
    case ".docx":
      return "icon-doc-file";
    case ".xls":
    case ".xlsx":
      return "icon-xls-file";
    default:
      return "icon-unsupported-file"; // Return a default class for unknown file types
  }
};

/** CALCULATE LUMINANCE CODE */
export const calculateLuminance = (r, g, b) => {
  const [rNormalized, gNormalized, bNormalized] = [r, g, b].map((x) => {
    x = x / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rNormalized + 0.7152 * gNormalized + 0.0722 * bNormalized;
};

/** Function to convert HEX to RGB **/
export const hexToRgb = (hex) => {
  let r = 0,
    g = 0,
    b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }

  return { r, g, b };
};

/** Function to determine text color based on background color */
export const getOptimalTextColor = (backgroundColor) => {
  let r, g, b;
  if (backgroundColor.startsWith("#")) {
    const { r: red, g: green, b: blue } = hexToRgb(backgroundColor);
    r = red;
    g = green;
    b = blue;
  }
  const luminance = calculateLuminance(r, g, b);

  // If luminance is above 0.5, it’s light, so return dark text color, else light text color
  return luminance > 0.5 ? "black" : "white";
};

export const getMimeTypeFromExtension = (extension) => {
  switch (extension.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    // Add more cases for other file types as needed
    default:
      return "application/octet-stream"; // Default to generic binary data
  }
};

export const objectToQueryString = (params) => {
  return Object.keys(params)
    .map(
      (key) =>
        encodeURIComponent(key) + "=" + encodeURIComponent(secureEncrypt(params[key])),
    )
    .join("&");
};

/**
 * Returns an array of years based on a provided configuration.
 * The function returns regular calendar years (e.g., 2023, 2024, 2025).
 *
 * @param {Object} [config={ previousYears: 1, currentYear: 1, nextYears: 1 }] - Configuration object for specifying year offsets.
 * @returns {Object[]} Array containing the years.
 */
export const getSingleYear = (
  config = { previousYears: 1, currentYear: 1, nextYears: 1 },
) => {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Helper function to format the year as a string
  const formatYear = (year) => `${year}`;

  // Initialize the result array
  const result = [];

  // Initialize the ID counter
  let id = 0;

  // Add previous years based on config
  for (let i = config.previousYears; i > 0; i--) {
    result.push({
      id: id++, // Assign current id and then increment
      year: formatYear(currentYear - i),
    });
  }

  // Add the current year
  if (config.currentYear > 0) {
    result.push({
      id: id++, // Assign current id and then increment
      year: formatYear(currentYear),
    });
  }

  // Add future years based on config
  for (let i = 1; i <= config.nextYears; i++) {
    result.push({
      id: id++, // Assign current id and then increment
      year: formatYear(currentYear + i),
    });
  }

  return result;
};

/**
 * Returns an array of financial years based on a provided configuration.
 * The financial year runs from April 1 to March 31.
 *
 * @param {Object} [config={ previousYears: 5, currentFinancialYear: 1, nextFinancialYear: 1 }] - Configuration object for specifying year offsets.
 * @returns {Object[]} Array containing the financial years from the current year down to previous years, and optionally the next financial year.
 */
export const getFinancialYears = (
  config = { previousYears: 5, currentFinancialYear: 1, nextFinancialYear: 1 },
) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Determine the start year of the current financial year
  let startYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  // Helper function to format the financial year string
  const formatYear = (year) => `${year}-${(year + 1).toString().slice(-2)}`;

  // Initialize the result array
  const result = [];

  // Add the current financial year
  result.push({
    id: config.currentFinancialYear,
    year: formatYear(startYear),
  });

  // Add previous financial years in reverse order
  for (let i = 1; i <= config.previousYears; i++) {
    result.push({
      id: config.currentFinancialYear + i,
      year: formatYear(startYear - i),
    });
  }

  // Add the next financial year if the config allows it
  if (config.nextFinancialYear > 0) {
    result.unshift({
      id: config.currentFinancialYear - 1,
      year: formatYear(startYear + 1),
    });
  }

  // Ensure unique IDs by removing duplicates
  const uniqueResult = result.reduce((acc, current) => {
    const x = acc.find((item) => item.id === current.id);
    if (!x) {
      return acc.concat([current]);
    }
    return acc;
  }, []);

  return uniqueResult;
};

/**
 * Returns an array of financial years from a specified start year up to the current financial year.
 * The financial year runs from April 1 to March 31.
 *
 * @param {string} startYear - The start year in "YYYY-YY" format (e.g., "2022-23").
 * @returns {Object[]} Array containing the financial years from the specified start year up to the current financial year.
 */
export const getFinancialYearsFromStart = (startYear) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Determine the start year of the current financial year
  const currentFinancialStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  // Extract the starting year from the input
  const startYearParts = startYear.split("-");
  const startYearStart = parseInt(startYearParts[0]);

  // Helper function to format the financial year string
  const formatYear = (year) => `${year}-${(year + 1).toString().slice(-2)}`;

  // Initialize the result array
  const result = [];

  // Check if the starting year is valid
  if (startYearStart > currentFinancialStartYear) {
    throw new Error("Start year cannot be after the current financial year.");
  }

  // Populate the result array starting from the specified start year up to the current financial year
  let yearToAdd = startYearStart;

  while (yearToAdd <= currentFinancialStartYear) {
    result.push({
      id: currentFinancialStartYear - yearToAdd + 1,
      year: formatYear(yearToAdd),
    });
    yearToAdd++;
  }

  // Sort the result array in descending order of financial years
  result.sort((a, b) => {
    // Extract years from the 'year' property to sort correctly
    const yearA = parseInt(a.year.split("-")[0]);
    const yearB = parseInt(b.year.split("-")[0]);
    return yearB - yearA;
  });

  return result;
};

/** MSAL - TOKEN FALLBACK STATE CHECK */
export const acquireTokenWithFallback = async (
  instance,
  account,
  tokenRequest,
  forceRefresh = false,
) => {
  try {
    // Attempt silent token acquisition
    const response = await instance.acquireTokenSilent({
      ...tokenRequest,
      account: account,
      forceRefresh: forceRefresh,
    });
    return response;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // If silent acquisition fails, fallback to interactive login
      try {
        const interactiveResponse = await instance.acquireTokenPopup(tokenRequest);
        return interactiveResponse;
      } catch (interactiveError) {
        console.error("Interactive login failed:", interactiveError);
        setExpiresOn("");
        setAuthType("");
        setActiveWorkSpace("");
        window.location.href = "/";
        throw interactiveError;
      }
    } else {
      console.error("Token acquisition error:", error);
      throw error;
    }
  }
};

export const isOnlyWhitespaceHtml = (input) => {
  // Use a DOM parser to extract text content and handle <br> or similar elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  const body = doc.body;

  // Remove non-textual elements like <br>, <img>, etc., if they should be ignored
  body.querySelectorAll("br, img").forEach((el) => el.remove());

  // Get the remaining text content
  const textContent = body.textContent || "";

  // Check if the remaining text content is only whitespace
  return /^\s*$/.test(textContent);
};

export const isCharacterLimitExceeded = (input, maxLength = 1000) => {
  // Use a DOM parser to extract text content and handle <br> or similar elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(input || "", "text/html");
  const body = doc.body;

  // Remove non-textual elements like <br>, <img>, etc., if they should be ignored
  body.querySelectorAll("br, img").forEach((el) => el.remove());

  // Get the remaining text content
  const textContent = body.textContent || "";
  const currentLength = textContent.length;
  const isExceeded = currentLength > maxLength;
  const remainingCharacters = isExceeded ? 0 : maxLength - currentLength;

  // Return an object with the character count, limit status, and remaining count
  return {
    characterCount: currentLength,
    isExceeded,
    remainingCharacters,
  };
};

export const getLimitedHtmlContent = (input, maxLength = 1000) => {
  // Use a DOM parser to extract text content and handle <br> or similar elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  const body = doc.body;

  // Remove non-textual elements like <br>, <img>, etc., if they should be ignored
  // body.querySelectorAll("br, img").forEach((el) => el.remove());

  // Get the remaining text content
  const textContent = body.textContent || "";

  // Check if the text content exceeds the max length
  if (textContent.length > maxLength) {
    // Truncate the HTML content while preserving structure
    let charCount = 0;
    const truncateNodes = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (charCount + node.textContent.length > maxLength) {
          node.textContent = node.textContent.slice(0, maxLength - charCount);
        }
        charCount += node.textContent.length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach((child) => {
          if (charCount < maxLength) {
            truncateNodes(child);
          } else {
            node.removeChild(child);
          }
        });
      }
    };

    truncateNodes(body);
  }

  // Return the modified HTML content
  return body.innerHTML;
};

export const getLimitedHtmlWithNewlineContent = (input, maxLength = 1000) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  const body = doc.body;

  // Remove images but keep <br> elements
  // body.querySelectorAll("img").forEach((el) => el.remove());

  let charCount = 0;
  let reachedLimit = false;

  const truncateNodes = (node) => {
    if (reachedLimit) {
      // Allow only <img> and <br> elements if the limit is reached
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node.tagName === "IMG" ||
          (node.tagName === "P" && node.innerHTML.trim() === "<br>"))
      ) {
        return; // Keep images and line breaks
      } else {
        node.remove(); // Remove everything else
        return;
      }
    }

    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent;
      let length = text.length;

      if (charCount + length >= maxLength) {
        let cutoffIndex = maxLength - charCount;

        // If cutoffIndex lands on a space, adjust to prevent trimming the last word
        if (text[cutoffIndex - 1] === " ") {
          cutoffIndex--; // Move back one character to keep a word
        }

        node.textContent = text.slice(0, cutoffIndex);
        charCount = maxLength;
        reachedLimit = true;
      } else {
        charCount += length;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      let childNodes = Array.from(node.childNodes);
      for (let i = 0; i < childNodes.length; i++) {
        if (reachedLimit) {
          // Remove all remaining children
          while (node.childNodes[i]) {
            node.removeChild(node.childNodes[i]);
          }
          break;
        } else {
          truncateNodes(childNodes[i]);
        }
      }
    }
  };

  truncateNodes(body);

  return body.innerHTML;
};

export const selectedQuatreColor = [
  { id: 1, colorCode: "#00ADF0", name: "Q1" },
  { id: 2, colorCode: "#44EBB1", name: "Q2" },
  { id: 3, colorCode: "#E283BB", name: "Q3" },
  { id: 4, colorCode: "#384955", name: "Q4" },
  { id: 5, colorCode: "#EC6240", name: "H1" },
  { id: 6, colorCode: "#9CADBC", name: "H2" },
  { id: 7, colorCode: "#3FC08C", name: "Annual" },
];

export const getLast30DaysDate = (date = new Date()) => {
  // Clone the date to avoid modifying the original one
  const last30DaysDate = new Date(date);
  last30DaysDate.setDate(date.getDate() - 30); // Subtract 30 days

  // Format the date as YYYY-MM-DD
  const formattedDate = `${last30DaysDate.getFullYear()}-${String(
    last30DaysDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(last30DaysDate.getDate()).padStart(2, "0")}`;

  return formattedDate;
};

/** USED TO GENERATE EXCEL FILE AND PERFORM DOWNLOAD */
// export const generateExcelFile = (data, reportName = null) => {
//   const ws = XLSX.utils.aoa_to_sheet(data);

//   const wb = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

//   const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
//   const date = new Date();
//   const formattedDate = date.toLocaleDateString("en-GB").replace(/\//g, "");
//   const formattedTime = date
//     .toLocaleTimeString("en-GB", { hour12: false })
//     .replace(/:/g, "");
//   const filename = reportName || `Report_${formattedDate}${formattedTime}.xlsx`;

//   // Create a Blob from the binary string and download
//   const buf = new ArrayBuffer(wbout.length);
//   const view = new Uint8Array(buf);
//   for (let i = 0; i < wbout.length; i++) {
//     view[i] = wbout.charCodeAt(i) & 0xff;
//   }
//   const blob = new Blob([buf], { type: "application/octet-stream" });
//   const link = document.createElement("a");
//   link.href = URL.createObjectURL(blob);
//   link.download = filename;
//   link.click();
// };

export const updateMatserInfoWithValue = (companyInfo, sourceData) => {
  const updatedCompanyInfo = { ...companyInfo };
  // Helper map: field in companyInfo => source list & matcher
  const fieldMappings = {
    language: {
      listKey: "customerLanguageList",
      idKey: "languageId",
    },
    primaryMarket: {
      listKey: "marketRegionList",
      idKey: "marketid",
    },
    industrySector: {
      listKey: "industryData",
      idKey: "industryid",
    },
    country: {
      listKey: "countryList",
      idKey: "country_id",
    },
    region: {
      listKey: "regionList", // special handling below
      idKey: "regionId",
    },
    orderVal_Currency: {
      listKey: "currency",
      idKey: "country_id",
    },
    startUpFee_Currency: {
      listKey: "currency",
      idKey: "country_id",
    },
    fontFamily: {
      listKey: "fontFamilyList",
      idKey: "font_id",
    },
    instrument: {
      listKey: "instrumentList",
      idKey: "id",
    },
    currency: {
      listKey: "customerCurrencyList",
      idKey: "currency_id",
    },
    // You can extend here:
    // tools: { listKey: "toolsList", idKey: "toolId" },
    // currency: { listKey: "currencyList", idKey: "currencyId" },
  };

  Object.entries(fieldMappings).forEach(([field, config]) => {
    const sourceList = sourceData?.[config.listKey];

    if (!sourceList) return;
    // if (field === "region") {
    //   updatedCompanyInfo.region = (companyInfo?.region || [])
    //     .map((id) => {
    //       for (const region of sourceList) {
    //         const match = region.countryList?.find((c) => c.countryId === id);
    //         if (match) return match;
    //       }
    //       return null;
    //     })
    //     .filter(Boolean);
    // } else {
    updatedCompanyInfo[field] = (companyInfo?.[field] || [])
      .map((id) => sourceList?.find((item) => item?.[config.idKey] === id))
      .filter(Boolean);
    // }
  });

  return updatedCompanyInfo;
};

export const updateDashboardInfoWithValue = (dashboardInfo = [], sourceData = {}) => {
  if (!Array.isArray(dashboardInfo)) return [];

  const healthList = sourceData?.healthStatusList || [];

  return dashboardInfo.map((item) => {
    const matchedHealth = healthList.find((h) => h.healthId === item.healthId);

    return {
      ...item,
      healthLabel: matchedHealth?.healthLabel || "",
    };
  });
};

export const stripMasterInfoToIdOnly = (companyInfo = {}) => {
  // Field config: key in companyInfo => ID key to extract
  const fieldIdMappings = {
    language: "languageId",
    primaryMarket: "marketid",
    region: "regionId",
    industrySector: "industryid",
    country: "country_id",
    orderVal_Currency: "country_id",
    startUpFee_Currency: "country_id",
    fontFamily: "font_id",
    instrument: "id",
    currency: "currency_id",
    // Add more fields here as needed
  };

  const updatedInfo = { ...companyInfo };

  Object.entries(fieldIdMappings).forEach(([key, idKey]) => {
    if (Array.isArray(companyInfo[key])) {
      updatedInfo[key] = companyInfo[key].map((item) =>
        typeof item === "object" && item !== null ? item[idKey] : item,
      );
    }
  });

  return updatedInfo;
};

export const renderOrderType = (ids, orderType, background, color, className, border) => {
  const isArrayOfNumbers =
    Array.isArray(ids) && ids?.every((item) => typeof item === "number");
  const orders = isArrayOfNumbers ? ids : ids?.orderType;
  if (!Array.isArray(orders) || !orderType) return "";
  const typeOfOrder = orders
    .map((id) => orderType.find((o) => o.status_id === id))
    .filter(Boolean);
  const getOrderTypeStyles = (code) => {
    const style = orderType.filter((type) => type.code === code);
    return {
      backgroundColor: style[0].back_ground_colour,
      color: style[0].colour_code,
    };
  };

  return typeOfOrder.map((item, i) => {
    const style = getOrderTypeStyles(item.code);
    const appliedStyles = {
      ...(background && {
        backgroundColor: border ? "#FFFFFF" : style.backgroundColor,
      }),
      ...(color && { color: style.color }),
      border: border ? `1px solid ${style.color}` : "none",
    };

    return (
      <div
        key={i}
        className={`rounded order-type-lables ${className ? className : ""}`}
        style={appliedStyles}
      >
        {item.name}
      </div>
    );
  });
};

export const renderOrderTypeNormal = (
  ids,
  orderType,
  background,
  color,
  className,
  border,
) => {
  const isArrayOfNumbers =
    Array.isArray(ids) && ids?.every((item) => typeof item === "number");
  const orders = isArrayOfNumbers ? ids : ids?.orderType;
  if (!Array.isArray(orders) || !orderType) return "";
  const typeOfOrder = orders
    .map((id) => orderType.find((o) => o.status_id === id))
    .filter(Boolean);
  const getOrderTypeStyles = (code) => {
    const style = orderType.filter((type) => type.code === code);
    return {
      backgroundColor: style[0].back_ground_colour,
      color: style[0].colour_code,
    };
  };

  return typeOfOrder.map((item, i) => {
    const style = getOrderTypeStyles(item.code);
    const appliedStyles = {
      // ...(background && {
      backgroundColor: style.backgroundColor,
      // }),
      ...(color && { color: style.color }),
      // border: border ? `1px solid ${style.color}` : "none",
      border: "none",
    };

    return (
      <div
        key={i}
        className={`rounded order-type-lables-normal ${className ? className : ""}`}
        style={appliedStyles}
        title={item.name}
      >
        {item.name}
      </div>
    );
  });
};

// used for month name with date format like july 07,2025
export const getMonthNameDate = (inputDate) => {
  if (inputDate) {
    return dayjs(inputDate).format("MMM DD, YYYY");
  }
};

export const isValidFileSelection = (
  allselectedFiles,
  restrictedFileTypes,
  maxSizeMB = 50,
) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  let totalSize = 0;

  const emptyFiles = [];
  const invalidTypeFiles = [];

  for (const file of allselectedFiles) {
    const fileSize = file?.size || 0;
    const fileName = file?.name || "";

    if (fileSize === 0) {
      emptyFiles.push(fileName);
    }

    const extension = fileName.includes(".")
      ? fileName.split(".").pop().toLowerCase()
      : "";

    if (restrictedFileTypes && restrictedFileTypes.includes(extension)) {
      invalidTypeFiles.push({ name: fileName, ext: extension });
    }

    totalSize += fileSize;
  }

  // Check for empty files
  if (emptyFiles.length > 0) {
    return {
      data: [],
      isValid: false,
      reason:
        emptyFiles.length === 1
          ? `File "${emptyFiles[0]}" is empty (0 bytes).`
          : `Files "${emptyFiles.join(", ")}" are empty (0 bytes).`,
    };
  }

  // Check for invalid type files
  if (invalidTypeFiles.length > 0) {
    return {
      data: [],
      isValid: false,
      reason:
        invalidTypeFiles.length === 1
          ? `File "${invalidTypeFiles[0].name}" has unsupported type or malicious. Please choose a different file.`
          : `Files ${invalidTypeFiles
              .map((f) => `"${f.name}" (.${f.ext})`)
              .join(", ")} have unsupported types. Please choose different files.`,
    };
  }

  // Check total size
  if (totalSize > maxSizeBytes) {
    return {
      data: [],
      isValid: false,
      reason: `Total file size exceeds the limit of ${maxSizeMB} MB. Please choose smaller files.`,
    };
  }

  return {
    data: allselectedFiles,
    isValid: true,
    reason: "",
  };
};
export const getValue = (obj, path) => {
  try {
    return path
      .replace(/\[(\d+)\]/g, ".$1") // convert [0] → .0
      .split(".")
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  } catch {
    return undefined;
  }
};

export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};

export const checkMandatoryFields = (
  companyData,
  beforeProcessOrderSalesMandatoryField,
  step = null,
) => {
  const stepsToCheck = step ? [step] : Object.keys(beforeProcessOrderSalesMandatoryField);
  for (const s of stepsToCheck) {
    // normalize key
    const config = beforeProcessOrderSalesMandatoryField[String(s)];
    if (!config) continue;

    // allow fields to be either an array OR a function(companyData)
    const fields =
      typeof config.fields === "function" ? config.fields(companyData) : config.fields;
    if (!fields || fields.length === 0) continue;

    for (const fieldPath of fields) {
      const value = getValue(companyData, fieldPath);
      if (isEmpty(value)) {
        return false; // ❌ some field missing
      }
    }
  }

  return true; // ✅ all filled
};

/**
 * Sentinel used for the separate "Unassigned" assignee filter option.
 * Must be truthy — SelectDropDown skips falsy valueField values (e.g. 0).
 * Combined Me + Unassigned uses API `meAndUnassigned` (never put 0 in assignee — not a Guid).
 */
export const UNASSIGNED_ASSIGNEE_REG_ID = "unassigned";

export const UNASSIGNED_ASSIGNEE_OPTION = {
  regId: UNASSIGNED_ASSIGNEE_REG_ID,
  displayName: "Unassigned",
  isUnassigned: true,
};

const getAssigneeFilterRegId = (item) =>
  typeof item === "object" && item !== null ? item.regId : item;

const sameAssigneeRegId = (a, b) => {
  if (a == null || b == null || a === "" || b === "") return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
};

const isGuidAssigneeId = (id) =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );

export const isUnassignedAssigneeFilterItem = (item) => {
  if (item == null) return false;
  if (typeof item === "object") {
    return (
      item.isUnassigned === true ||
      item.displayName === "Unassigned" ||
      item.regId === UNASSIGNED_ASSIGNEE_REG_ID
    );
  }
  return item === UNASSIGNED_ASSIGNEE_REG_ID;
};

/**
 * Split UI assignee selections into API `assignee` vs `meAndUnassigned`.
 * - Me (and/or other people) → assignee: [guid, ...] (Guid only; never send 0/"unassigned")
 * - Unassigned checked → meAndUnassigned: true, default false
 */
export const splitMeAndUnassignedFilters = (selectedItems, meId) => {
  const list = Array.isArray(selectedItems) ? selectedItems : [];
  // Legacy combined "Me & Unassigned" label counts as both Me and Unassigned.
  const hasCombinedMeUnassignedLabel = list.some(
    (item) =>
      typeof item === "object" && item?.displayName === "Me & Unassigned",
  );
  const hasUnassigned =
    list.some(isUnassignedAssigneeFilterItem) || hasCombinedMeUnassignedLabel;
  const hasMe =
    list.some((item) => sameAssigneeRegId(getAssigneeFilterRegId(item), meId)) ||
    hasCombinedMeUnassignedLabel;
  const otherAssignees = list
    .filter(
      (item) =>
        !isUnassignedAssigneeFilterItem(item) &&
        !sameAssigneeRegId(getAssigneeFilterRegId(item), meId),
    )
    .map(getAssigneeFilterRegId)
    .filter(isGuidAssigneeId);

  const assigneeIds = [
    ...(hasMe && isGuidAssigneeId(meId) ? [meId] : []),
    ...otherAssignees,
  ];

  return {
    assignee: assigneeIds.length ? assigneeIds : null,
    meAndUnassigned: hasUnassigned,
  };
};

/** Prefer Me/Unassigned UI selection; else use direct assignee GUID list (e.g. dashboard filter). */
const resolveApiAssigneeFields = (filterValues, meId) => {
  const { assignee: fromMeAssignee, meAndUnassigned } = splitMeAndUnassignedFilters(
    filterValues?.meAndUnassigned,
    meId,
  );
  if (fromMeAssignee?.length) {
    return {
      assignee: fromMeAssignee,
      meAndUnassigned: Boolean(meAndUnassigned),
    };
  }

  const direct = (Array.isArray(filterValues?.assignee) ? filterValues.assignee : [])
    .map(getAssigneeFilterRegId)
    .filter(isGuidAssigneeId);

  return {
    assignee: direct.length ? direct : null,
    meAndUnassigned: Boolean(meAndUnassigned),
  };
};

/**
 * Build Member-role assignee dropdown options: Me, optional Unassigned, then others.
 * Orders listing API only accepts Guid assignees — pass includeUnassigned: false there.
 */
export const buildMemberAssigneeFilterOptions = (
  assignees = [],
  auth,
  { isAdmin = false, isSuperAdmin = false, includeUnassigned = true } = {},
) => {
  const isUser = !isAdmin && !isSuperAdmin;
  const meId = auth?.details?.regId;

  if (!isUser) {
    return assignees || [];
  }

  const others = (assignees || []).filter(
    (assignee) =>
      String(assignee?.regId || "").toLowerCase() !==
      String(meId || "").toLowerCase(),
  );

  const meFromList = (assignees || []).find(
    (assignee) =>
      String(assignee?.regId || "").toLowerCase() ===
      String(meId || "").toLowerCase(),
  );

  const meOption = meId
    ? {
        ...(meFromList || {}),
        regId: meId,
        displayName: "Me",
      }
    : null;

  const options = meOption ? [meOption, ...others] : [...others];

  if (!includeUnassigned) return options;

  if (options[0]?.displayName === "Me") {
    return [options[0], UNASSIGNED_ASSIGNEE_OPTION, ...options.slice(1)];
  }

  return [UNASSIGNED_ASSIGNEE_OPTION, ...options];
};

/**
 * 🔹 Normalize filters before sending to API
 */
export const normalizeFilters = (
  filterValues,
  activeTaskCodes,
  board,
  meId,
  meUnassigned,
) => {
  const subTaskBoardId = board[0]?.boardID ?? board[0]?.boardId ?? null;
  const mainTaskBoardId =
    board[0]?.mainBoardID ?? board[0]?.mainBoardId ?? subTaskBoardId;

  const defaultDateRange = {
    thisWeek: false,
    thisMonth: false,
    customDate: false,
    overDue: false,
    customDateRange: { from: null, to: null },
  };

  const isValidObject = (obj) =>
    obj && typeof obj === "object" && !Array.isArray(obj) && Object.keys(obj).length > 0;

  // 🔑 normalize any date range input
  const normalizeDateRange = (input) => {
    if (isValidObject(input)) {
      return input;
    }

    if (Array.isArray(input) && input.length) {
      const newRange = { ...defaultDateRange };

      input.forEach((item) => {
        if (!item?.id) return;

        if (newRange.hasOwnProperty(item.id)) {
          newRange[item.id] = true;

          if (
            item.id === "customDateRange" &&
            item.customEntry &&
            filterValues?.selectedDate !== null
          ) {
            newRange.customDateRange = {
              from: dayjs(filterValues?.selectedDate?.startDate).format(
                "YYYY-MM-DDT00:00:00",
              ),
              to: dayjs(filterValues?.selectedDate?.endDate).format(
                "YYYY-MM-DDT00:00:00",
              ),
            };
            newRange.customDate = item.customEntry;
          } else if (item.id === "customDateRange") {
            newRange.customDateRange = { from: null, to: null };
            newRange.customDate = false;
          }
        }
      });
      return newRange;
    }

    return { ...defaultDateRange };
  };

  // Me only → assignee; Me + Unassigned → meAndUnassigned API field.
  // Dashboard Kanban may pass assignee GUIDs directly (meAndUnassigned empty).
  const { assignee, meAndUnassigned } = resolveApiAssigneeFields(filterValues, meId);

  return {
    ...filterValues,
    boardId: activeTaskCodes === "SubTask" ? subTaskBoardId : mainTaskBoardId,

    orderLabels:
      Array.isArray(filterValues?.orderLabels) && filterValues.orderLabels.length
        ? filterValues.orderLabels.map((label) =>
            typeof label === "object" ? label.status_id : label,
          )
        : null,

    orderType:
      Array.isArray(filterValues?.orderType) && filterValues.orderType.length
        ? filterValues.orderType.map((type) =>
            typeof type === "object" ? type.status_id : type,
          )
        : null,
    freeFlowLabelId:
      Array.isArray(filterValues?.freeFlowLabelId) && filterValues.freeFlowLabelId.length
        ? filterValues.freeFlowLabelId.map((label) =>
            typeof label === "object" ? label.status_id : label,
          )
        : null,
    // 👇 updated assignment logic
    assignee: assignee?.length ? assignee : null,
    meAndUnassigned: Boolean(meAndUnassigned),

    // 🔑 date ranges
    deliveryDateRange: normalizeDateRange(filterValues?.dueDateRange),
    dueDateRange: normalizeDateRange(defaultDateRange),
    orderDateRange: normalizeDateRange(filterValues?.orderDateRange),
    subTaskDueDateRange: normalizeDateRange(filterValues?.subTaskDueDateRange),
    stageList:
      Array.isArray(filterValues?.stageList) && filterValues.stageList.length
        ? filterValues.stageList.map((label) =>
            typeof label === "object" ? label.labelId : label,
          )
        : null,
    searchTxt: filterValues?.searchTxt || "",
    selectedDate: [],
    sortBy: filterValues?.sortBy?.length ? filterValues.sortBy : null,
    sortOrder: null,
  };
};

export const normalizeFiltersOrders = (filterValues, selectedDate) => {
  const defaultDateRange = {
    thisWeek: false,
    thisMonth: false,
    customDate: false,
    overDue: false,
    customDateRange: { from: null, to: null },
  };

  const isValidObject = (obj) =>
    obj && typeof obj === "object" && !Array.isArray(obj) && Object.keys(obj).length > 0;

  // 🔑 normalize any daterange input
  const normalizeDateRange = (input) => {
    if (isValidObject(input)) {
      // already normalized object
      return input;
    }

    if (Array.isArray(input) && input.length) {
      // start with default structure
      const newRange = { ...defaultDateRange };

      input.forEach((item) => {
        if (!item?.id) return;

        if (newRange.hasOwnProperty(item.id)) {
          newRange[item.id] = true;

          // ⚡ if customDateRange is selected, reset its from/to
          if (
            item.id === "customDateRange" &&
            item.customEntry &&
            selectedDate !== null
          ) {
            newRange.customDateRange = {
              from: dayjs(selectedDate?.from).format("YYYY-MM-DDT00:00:00"),
              to: dayjs(selectedDate?.to).format("YYYY-MM-DDT00:00:00"),
            };
            newRange.customDate = item.customEntry;
          } else if (item.id === "customDateRange") {
            newRange.customDateRange = { from: null, to: null };
            newRange.customDate = false;
          }
        }
      });
      return newRange;
    }

    // nothing provided → return default
    return { ...defaultDateRange };
  };

  return {
    ...filterValues,
    orderLabels:
      Array.isArray(filterValues?.orderLabels) && filterValues.orderLabels.length
        ? filterValues.orderLabels.map((label) =>
            typeof label === "object" ? label.status_id : label,
          )
        : [],
    orderType:
      Array.isArray(filterValues?.orderType) && filterValues.orderType.length
        ? filterValues.orderType.map((type) =>
            typeof type === "object" ? type.status_id : type,
          )
        : [],
    freeFlowLabelId:
      Array.isArray(filterValues?.freeFlowLabelId) && filterValues.freeFlowLabelId.length
        ? filterValues.freeFlowLabelId.map((label) =>
            typeof label === "object" ? label.status_id : label,
          )
        : null,
    assignee:
      Array.isArray(filterValues?.assignee) && filterValues.assignee.length
        ? filterValues.assignee
            .map((m) => (typeof m === "object" ? m.regId : m))
            // Orders API expects System.Guid[] — drop UI sentinels like "unassigned"
            .filter(isGuidAssigneeId)
        : [],
    orderStatus:
      Array.isArray(filterValues?.orderStatus) && filterValues.orderStatus.length
        ? filterValues.orderStatus.map((m) => (typeof m === "object" ? m.status_id : m))
        : [],
    orderCategory:
      Array.isArray(filterValues?.orderCategory) && filterValues.orderCategory.length
        ? filterValues.orderCategory.map((label) =>
            typeof label === "object" ? label.status_id : label,
          )
        : null,

    // 🔑 date ranges
    dueDateRange: normalizeDateRange(filterValues?.dueDateRange),
    orderDateRange: normalizeDateRange(filterValues?.orderDateRange),
    searchTxt: filterValues?.searchTxt || "",
    sortBy: filterValues?.sortBy?.length ? filterValues.sortBy : "orderDate",
    sortOrder: filterValues?.sortOrder?.length ? filterValues.sortOrder : "desc",
  };
};

/**
 * 🔹 Normalize filters before sending to API
 */
export const normalizeTaskFilters = (filterValues, board, meId, meUnassigned) => {
  const subTaskBoardId = board[0]?.boardID ?? board[0]?.boardId ?? null;

  const defaultDateRange = {
    thisWeek: false,
    thisMonth: false,
    customDate: false,
    overDue: false,
    customDateRange: { from: null, to: null },
  };

  const isValidObject = (obj) =>
    obj && typeof obj === "object" && !Array.isArray(obj) && Object.keys(obj).length > 0;

  // 🔑 normalize any date range input
  const normalizeDateRange = (input) => {
    if (isValidObject(input)) {
      return input;
    }

    if (Array.isArray(input) && input.length) {
      const newRange = { ...defaultDateRange };

      input.forEach((item) => {
        if (!item?.id) return;

        if (newRange.hasOwnProperty(item.id)) {
          newRange[item.id] = true;

          if (
            item.id === "customDateRange" &&
            item.customEntry &&
            filterValues?.selectedDate !== null
          ) {
            newRange.customDateRange = {
              from: dayjs(filterValues?.selectedDate?.startDate).format(
                "YYYY-MM-DDT00:00:00",
              ),
              to: dayjs(filterValues?.selectedDate?.endDate).format(
                "YYYY-MM-DDT00:00:00",
              ),
            };
            newRange.customDate = item.customEntry;
          } else if (item.id === "customDateRange") {
            newRange.customDateRange = { from: null, to: null };
            newRange.customDate = false;
          }
        }
      });
      return newRange;
    }

    return { ...defaultDateRange };
  };

  // Me only → assignee; Me + Unassigned → meAndUnassigned API field.
  // Dashboard Kanban may pass assignee GUIDs directly (meAndUnassigned empty).
  const { assignee, meAndUnassigned } = resolveApiAssigneeFields(filterValues, meId);

  return {
    ...filterValues,
    boardId: subTaskBoardId,

    orderLabels:
      Array.isArray(filterValues?.orderLabels) && filterValues.orderLabels.length
        ? filterValues.orderLabels.map((label) =>
            typeof label === "object" ? label.status_id : label,
          )
        : null,
    freeFlowLabelId:
      Array.isArray(filterValues?.freeFlowLabelId) && filterValues.freeFlowLabelId.length
        ? filterValues.freeFlowLabelId.map((label) =>
            typeof label === "object" ? label.status_id : label,
          )
        : null, 
    // 👇 updated assignment logic
    assignee: assignee?.length ? assignee : null,
    meAndUnassigned: Boolean(meAndUnassigned),

    // // 🔑 date ranges
    // deliveryDateRange: normalizeDateRange(filterValues?.dueDateRange),
    // dueDateRange: normalizeDateRange(defaultDateRange),
    orderDateRange: normalizeDateRange(filterValues?.orderDateRange),
    subTaskDueDateRange: normalizeDateRange(filterValues?.subTaskDueDateRange),
    stageList:
      Array.isArray(filterValues?.stageList) && filterValues.stageList.length
        ? filterValues.stageList.map((label) =>
            typeof label === "object" ? label.labelId : label,
          )
        : null,
    searchTxt: filterValues?.searchTxt || "",
    // selectedDate: [],
    sortBy: filterValues?.sortBy?.length ? filterValues.sortBy : null,
    sortOrder: null,
  };
};
/**
 * 🔹 Get default "Me" assignee filter for Member role
 */
export const getMeAndUnassigned = (
  board,
  auth,
  suggestedMembersList,
  isAdmin,
  isSuperAdmin,
) => {
  if (!auth?.details?.regId) {
    return { meAndUnassignedId: [], meAndUnassignedValue: [] };
  }

  const data = suggestedMembersList?.data || [];
  const currentBoardCode = board[0]?.code;

  const meAndUnassignedId = data
    .filter((bo) => bo.boardCode === currentBoardCode)
    .filter((m) => m?.regId === auth.details.regId)
    .map((m) => m.regId);

  const meAndUnassignedValue = data
    .filter((bo) => bo.boardCode === currentBoardCode)
    .filter((m) => m?.regId === auth.details.regId)
    .map((assignee) => ({
      ...assignee,
      displayName: "Me",
    }));

  return {
    meAndUnassignedId: isAdmin || isSuperAdmin ? [] : meAndUnassignedId,
    meAndUnassignedValue: isAdmin || isSuperAdmin ? [] : meAndUnassignedValue,
  };
};

export const getDueDateColor = (dueDate, isLastStage = false) => {
  if (!dueDate) return "inherit"; // fallback for null/undefined

  const today = dayjs().startOf("day");
  const target = dayjs(dueDate).startOf("day"); // parses "2025-09-24T00:00:00"

  const diff = target.diff(today, "day");
  if (isLastStage) {
    return "#6D6E78";
  } else if (diff < 0) {
    return "red"; // overdue or today
  } else if (diff <= 5) {
    return "orange"; // due within next 5 days
  } else {
    return "green"; // safe
  }
};

export const moveAPIMergeKanbanStages = (oldData = [], newData = []) => {
  // CLEAN HELPERS ----------------------
  const removeSelected = (obj = {}) => {
    if ("selected" in obj) {
      const copy = { ...obj };
      delete copy.selected;
      return copy;
    }
    return obj;
  };

  const cleanTools = (tools = []) => tools.map((tool) => removeSelected(tool));

  const cleanFlows = (flows = []) =>
    flows.map((flow) => ({
      ...removeSelected(flow),
      listOfTools: cleanTools(flow.listOfTools || []),
    }));

  // MERGE TOOL LIST --------------------
  const mergeListOfTools = (tools = []) => {
    const map = new Map();
    tools.forEach((tool) => {
      const cleaned = removeSelected(tool);
      map.set(cleaned.toolTicketId, cleaned);
    });
    return Array.from(map.values());
  };

  // PROCESS TICKET LIST FOR NEW DATA ---
  const processNewTicketList = (tickets = []) => {
    return tickets.map((ticket) => ({
      ...ticket,
      toolList: cleanFlows(
        ticket.toolList?.map((flow) => ({
          ...flow,
          listOfTools: mergeListOfTools(flow.listOfTools || []),
        })) || [],
      ),
    }));
  };

  // MAIN STAGE REPLACEMENT -------------
  return oldData.map((oldStage) => {
    const updatedStage = newData.find(
      (s) => s.labelId === oldStage.labelId || s.code === oldStage.code,
    );

    // No update → keep old
    if (!updatedStage) return oldStage;

    // Replace stage completely, but clean internal data
    const processedTickets = processNewTicketList(updatedStage.ticketList || []);
    return {
      ...updatedStage,
      ticketList: updatedStage.ticketList,
    };
  });
};

export const scrollAPIMergeKanbanStages = (oldData = [], newData = []) => {
  // -------------------------------------
  // HELPERS
  // -------------------------------------

  // Remove "selected" from any object
  const removeSelected = (obj = {}) => {
    if (!obj || typeof obj !== "object") return obj;
    if ("selected" in obj) {
      const copy = { ...obj };
      delete copy.selected;
      return copy;
    }
    return obj;
  };

  // Clean tools
  const cleanTools = (tools = []) => tools.map((tool) => removeSelected(tool));

  // Clean flows, including tools inside flows
  const cleanFlows = (flows = []) =>
    flows.map((flow) => ({
      ...removeSelected(flow),
      listOfTools: cleanTools(flow.listOfTools || []),
    }));

  // -------------------------------------
  // MERGE TOOLS
  // -------------------------------------
  const mergeListOfTools = (oldTools = [], newTools = []) => {
    const map = new Map();

    [...oldTools, ...newTools].forEach((tool) => {
      const cleaned = removeSelected(tool);
      const id = cleaned.toolTicketId;

      map.set(id, map.has(id) ? { ...map.get(id), ...cleaned } : cleaned);
    });

    return Array.from(map.values());
  };

  // -------------------------------------
  // MERGE FLOWS (TOOL LIST)
  // -------------------------------------
  const mergeToolList = (oldFlows = [], newFlows = []) => {
    const map = new Map();

    [...oldFlows, ...newFlows].forEach((flow) => {
      const cleaned = removeSelected(flow);
      const id = cleaned.flowId;

      if (!map.has(id)) {
        // New flow
        map.set(id, {
          ...cleaned,
          listOfTools: cleanTools(cleaned.listOfTools || []),
        });
      } else {
        // Merge with existing flow
        const old = map.get(id);
        map.set(id, {
          ...old,
          ...cleaned,
          listOfTools: mergeListOfTools(old.listOfTools || [], cleaned.listOfTools || []),
        });
      }
    });

    return Array.from(map.values());
  };

  // -------------------------------------
  // MERGE TICKETS
  // -------------------------------------
  const mergeTicketList = (oldTickets = [], newTickets = []) => {
    const map = new Map();

    [...oldTickets, ...newTickets].forEach((ticket) => {
      const id = ticket.orderId;

      if (!map.has(id)) {
        map.set(id, ticket);
      } else {
        const old = map.get(id);
        map.set(id, {
          ...old,
          ...ticket,
          toolList: mergeToolList(old?.toolList || [], ticket?.toolList || []),
        });
      }
    });

    // Clean nested selected properties
    return Array.from(map.values()).map((ticket) => ({
      ...ticket,
      toolList: cleanFlows(ticket?.toolList || []),
    }));
  };

  // -------------------------------------
  // FINAL STAGE MERGE
  // -------------------------------------
  return oldData.map((oldStage) => {
    const updatedStage = newData.find(
      (s) => s?.labelId === oldStage?.labelId || s?.code === oldStage?.code,
    );

    if (!updatedStage) return oldStage;

    const mergedTickets = mergeTicketList(
      oldStage?.ticketList || [],
      updatedStage?.ticketList || [],
    );
    return {
      ...oldStage,
      ...updatedStage,
      ticketList: mergedTickets,
    };
  });
};

export const updateStoreToolSelected = (
  taskDetails,
  labelData,
  ticketData,
  selectedFlow,
  updatedTool,
) => {
  const updatedTaskDetails = structuredClone(taskDetails);

  updatedTaskDetails?.subTaskList?.forEach((label) => {
    if (Number(label.labelId) === Number(labelData?.labelId)) {
      label?.ticketList?.forEach((ticket) => {
        if (Number(ticket.orderId) === Number(ticketData?.orderId)) {
          ticket?.toolList?.forEach((flow) => {
            // 🔹 CASE 1: The flow where the tool was clicked
            if (Number(flow.flowId) === Number(selectedFlow?.flowId)) {
              // Toggle the clicked tool
              flow.listOfTools = flow?.listOfTools?.map((tool) => {
                const isTargetTool =
                  Number(tool.toolTicketId) === Number(updatedTool?.toolTicketId);
                return isTargetTool ? { ...tool, selected: !tool.selected } : tool;
              });

              // Check the selection state
              const allToolsSelected = flow?.listOfTools?.every((t) => t?.selected);
              const anyToolSelected = flow?.listOfTools?.some((t) => t?.selected);

              // Set flow selection status
              flow.selected = allToolsSelected && anyToolSelected;
            }

            // 🔹 CASE 2: Other flows under the same ticket
            else {
              flow.selected = false;
              flow.listOfTools = flow.listOfTools?.map((tool) => ({
                ...tool,
                selected: false,
              }));
            }
          });
        }
      });
    }
  });

  return updatedTaskDetails;
};

export const updateStoreFlowSelected = (
  taskDetails,
  labelData,
  ticketData,
  selectedFlow,
) => {
  const updatedTaskDetails = structuredClone(taskDetails);

  updatedTaskDetails?.subTaskList?.forEach((label) => {
    if (Number(label.labelId) === Number(labelData?.labelId)) {
      label?.ticketList?.forEach((ticket) => {
        if (Number(ticket.orderId) === Number(ticketData?.orderId)) {
          ticket?.toolList?.forEach((flow) => {
            if (Number(flow.flowId) === Number(selectedFlow?.flowId)) {
              // ✅ toggle the selected flow
              const newFlowSelected = !flow.selected; // invert current value
              flow.selected = newFlowSelected;

              // ✅ update all tools accordingly
              flow.listOfTools = flow.listOfTools.map((tool) => ({
                ...tool,
                selected: newFlowSelected,
              }));
            }
          });
        }
      });
    }
  });

  return updatedTaskDetails;
};

export const updateStoreToolDuedateField = (
  taskDetails,
  labelData,
  ticketData,
  selectedTool,
  updatedTools,
  inputType, // "assignee" or "dueDate"
  inputValue,
) => {
  const updatedTaskDetails = structuredClone(taskDetails);

  updatedTaskDetails?.subTaskList?.forEach((label) => {
    if (Number(label.labelId) === Number(labelData?.labelId)) {
      label?.ticketList?.forEach((ticket) => {
        if (Number(ticket.orderId) === Number(ticketData?.orderId)) {
          ticket?.toolList?.forEach((flow) => {
            if (Number(flow.flowId) === Number(selectedTool?.flowId)) {
              // --- REMOVE flow.selected ---
              if (flow.selected) {
                delete flow.selected;
              }

              flow?.listOfTools?.forEach((tool) => {
                const isSelected = updatedTools?.some(
                  (t) => Number(t.toolTicketId) === Number(tool.toolTicketId),
                );

                if (isSelected) {
                  // --- UPDATE FIELDS ---
                  if (inputType === "assignee") {
                    tool.assignee =
                      inputValue && inputValue.length ? [...inputValue] : [];
                  }

                  if (inputType === "dueDate") {
                    tool.dueDate = inputValue ? inputValue : null;
                  }

                  // --- REMOVE tool.selected ---
                  if (tool.selected) {
                    delete tool.selected;
                  }
                }
              });
            }
          });
        }
      });
    }
  });

  return updatedTaskDetails;
};

export const renderLabels = (card, labelList) => {
  if (card?.orderLabels?.length > 0) {
    const result = labelList?.data?.filter((obj) =>
      card.orderLabels.includes(obj.status_id),
    );
    return (
      <div className=" d-flex flex-row flex-wrap gap-2 w-auto">
        {result.map((label, i) => {
          return (
            <div
              className="bg-gray_label rounded-pill"
              style={{ background: label?.colour_code }}
              key={i}
            >
              <span className="label-name-text"> {label?.name || <span className="text-muted fs-12">---</span>}</span>
            </div>
          );
        })}
      </div>
    );
  }
};
export const renderTaskPriority = (card, labelList) => {
  if (card?.priorityId?.length > 0) {
    const result = labelList?.filter((obj) => card?.priorityId?.includes(obj.status_id));
    const getOrderTypeStyles = (code) => {
      const style = labelList?.filter((type) => type.status_id === code);
      return {
        // backgroundColor: style[0].colour_code,
        backgroundColor: `${style[0]?.colour_code}10`,
        color: style[0]?.colour_code,
      };
    };
    return (
      <div className="d-flex flex-row flex-nowrap gap-2 w-auto ticket-priority-labels">
        {result?.length > 0 &&
          result?.map((label, i) => {
            const style = getOrderTypeStyles(label?.status_id);
            const appliedStyles = {
              backgroundColor: style.backgroundColor,
              color: style.color,
              //border: `1px solid ${style.color}`,
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
            };
            return (
              <div
                className="bg-gray_label ticket-priority"
                style={{ ...appliedStyles, padding: "4px 8px" }}
                key={i}
              >
                <span
                  style={{
                    backgroundColor: appliedStyles.color,
                    borderRadius: "50px",
                    padding: "1px",
                    width: "4px",
                    height: "4px",
                  }}
                >
                  &#160;
                </span>
                &#160;&#160;
                {label?.name || <span className="text-muted fs-12">---</span>}
              </div>
            );
          })}
      </div>
    );
  }
};

export const renderTaskListPriority = (card, labelList, className="") => {
  if (card?.priorityId?.length > 0 || card?.freeFlowLabelId?.length > 0) {
    const result = labelList?.filter(
      (obj) =>
        card?.priorityId?.includes(obj.status_id) ||
        card?.freeFlowLabelId?.includes(obj.status_id),
    );
    const getOrderTypeStyles = (code) => {
      const style = labelList?.filter((type) => type.status_id === code) || [];
      return {
        backgroundColor: `${style[0]?.colour_code || "transparent"}`,
        color: style[0]?.colour_code || "#000000",
      };
    };
    return (
      <div className={`d-flex flex-row flex-wrap gap-2 w-auto ${className}`}>
        {result?.length > 0 ?
          result?.map((label, i) => {
            const style = getOrderTypeStyles(label.status_id);
            const appliedStyles = {
              backgroundColor: style.backgroundColor,
              color: "#ffffff",
              //border: `1px solid ${style.color}`,
              border: "none",
              borderRadius: "18px",
              fontSize: "12px",
            };
            return (
              <div
                className="bg-gray_label ticket-priority"
                style={{ ...appliedStyles, padding: "2px 8px" }}
                key={i}
              >
                {label?.name}
              </div>
            );
          }): <span className="text-muted fs-12">---</span>}
      </div>
    );
  }
};
export const updateStoreAllFlowToolSelected = (taskDetails, labelData, ticketData) => {
  const updatedTaskDetails = structuredClone(taskDetails);

  updatedTaskDetails?.subTaskList?.forEach((label) => {
    if (Number(label.labelId) !== Number(labelData?.labelId)) return;

    label?.ticketList?.forEach((ticket) => {
      if (Number(ticket.orderId) !== Number(ticketData?.orderId)) return;

      // ✔ Check if ALL flows AND ALL tools are selected
      const allSelected = ticket?.toolList?.every((flow) => {
        const flowSelected = flow?.selected === true;
        const allToolsSelected = flow?.listOfTools?.every((tool) => tool?.selected === true);
        return flowSelected && allToolsSelected;
      });

      // ✔ Toggle: if ALL selected → false, else → true
      const newSelectedValue = !allSelected;

      // ✔ Apply result to ALL flows + ALL tools
      ticket?.toolList?.forEach((flow) => {
        flow.selected = newSelectedValue;
        flow.listOfTools = flow?.listOfTools?.map((tool) => ({
          ...tool,
          selected: newSelectedValue,
        }));
      });
    });
  });

  return updatedTaskDetails;
};

export const updateStoreAllFlowToolDuedateField = (
  taskDetails,
  labelData,
  ticketData,
  inputType, // "assignee" | "dueDate"
  inputValue, // assignee array OR date string OR empty
) => {
  const updatedTaskDetails = structuredClone(taskDetails);

  updatedTaskDetails?.subTaskList?.forEach((label) => {
    if (Number(label.labelId) !== Number(labelData?.labelId)) return;

    label?.ticketList?.forEach((ticket) => {
      if (Number(ticket.orderId) !== Number(ticketData?.orderId)) return;

      // 🔥 LOOP THROUGH **ALL** FLOWS
      ticket?.toolList?.forEach((flow) => {
        // --- REMOVE flow.selected ---
        if (flow.selected) {
          delete flow.selected;
        }

        // 🔥 LOOP THROUGH **ALL** TOOLS IN EACH FLOW
        flow.listOfTools = flow.listOfTools.map((tool) => {
          const updatedTool = { ...tool };

          // --- REMOVE tool.selected ---
          if (updatedTool.selected) {
            delete updatedTool.selected;
          }

          // --- UPDATE ASSIGNEE ---
          if (inputType === "assignee") {
            updatedTool.assignee = inputValue && inputValue.length ? [...inputValue] : [];
          }

          // --- UPDATE DUE DATE ---
          if (inputType === "dueDate") {
            updatedTool.dueDate = inputValue ? inputValue : null;
          }

          return updatedTool;
        });
      });
    });
  });

  return updatedTaskDetails;
};

export const updateMovedFlowSelectedToolsRemove = (
  taskDetails,
  labelData,
  ticketData,
  flowId,
  toolTicketId,
) => {
  const updatedTaskDetails = structuredClone(taskDetails);

  updatedTaskDetails?.subTaskList?.forEach((label) => {
    if (Number(label.labelId) === Number(labelData?.labelId)) {
      label.ticketList = label?.ticketList
        ?.map((ticket) => {
          if (Number(ticket.orderId) !== Number(ticketData?.orderId)) {
            return ticket; // keep other tickets
          }

          // Update this ticket flows
          const updatedToolList = ticket.toolList
            ?.map((flow) => {
              if (Number(flow.flowId) !== Number(flowId)) return flow;

              // Remove selected tools
              const newList = flow?.listOfTools?.filter(
                (tool) => !toolTicketId.includes(tool.toolTicketId),
              );

              // ❗ If listOfTools becomes empty → REMOVE this flow
              if (newList.length === 0) return null;

              return {
                ...flow,
                listOfTools: newList,
              };
            })
            .filter(Boolean); // remove null flows

          // ❗ If toolList becomes empty → REMOVE the ticket
          if (!updatedToolList || updatedToolList.length === 0) {
            return null;
          }

          return {
            ...ticket,
            toolList: updatedToolList,
          };
        })
        .filter(Boolean); // remove null tickets
    }
  });

  return updatedTaskDetails;
};

export const getValidUserRoles = (auth) => {
  const roles = auth?.details?.userRoleResponseDetail;

  if (!Array.isArray(roles)) return [];

  // remove null / undefined entries
  return roles.filter(Boolean);
};

export const downloadSvgAsPng = async ({
  selector,
  fileName,
  backgroundColor = "#FFFFFF",
  fallbackWidth = 900,
  fallbackHeight = 350,
}) => {
  try {
    const svgElement = document.querySelector(selector);
    if (!svgElement) return false;

    const clonedSvg = svgElement.cloneNode(true);
    const viewBox = svgElement.getAttribute("viewBox");
    const width =
      Number(svgElement.getAttribute("width")) || svgElement.clientWidth || fallbackWidth;
    const height =
      Number(svgElement.getAttribute("height")) ||
      svgElement.clientHeight ||
      fallbackHeight;

    if (!viewBox) {
      clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(svgUrl);
          reject(new Error("Canvas context unavailable"));
          return;
        }

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const pngUrl = canvas.toDataURL("image/png");
        const imageLink = document.createElement("a");
        imageLink.href = pngUrl;
        imageLink.setAttribute("download", fileName);
        document.body.appendChild(imageLink);
        imageLink.click();
        document.body.removeChild(imageLink);
        URL.revokeObjectURL(svgUrl);
        resolve(true);
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error("Failed to load SVG image"));
      };
      img.src = svgUrl;
    });

    return true;
  } catch (error) {
    return false;
  }
};

export const getRowId = (item) => item?.status_id || item?.id || 0;

export const isNewRow = (item) => !getRowId(item);

export const getItemStatusCode = (item) => {
  const code = item?.code || item?.status_code;
  if (code) return String(code).trim().toUpperCase();
  return "";
};

export const buildBaseStatusCode = (name) =>
  String(name ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

export const collectUsedStatusCodes = (tempRows = [], originalRows = [], excludeIndex = -1) => {
  const used = new Set();

  originalRows.forEach((item) => {
    const code = getItemStatusCode(item);
    if (code) used.add(code);
  });

  tempRows.forEach((item, index) => {
    if (index === excludeIndex || !isNewRow(item)) return;
    const code = getItemStatusCode(item);
    if (code) used.add(code);
  });

  return used;
};

export const buildUniqueStatusCode = (name, usedCodes = new Set(), preferredCode = "") => {
  const normalizedPreferred = String(preferredCode || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  if (normalizedPreferred && !usedCodes.has(normalizedPreferred)) {
    return normalizedPreferred;
  }

  const alphanumeric = buildBaseStatusCode(name);
  if (!alphanumeric) return "";

  for (let length = Math.min(2, alphanumeric.length); length <= alphanumeric.length; length++) {
    const code = alphanumeric.slice(0, length);
    if (!usedCodes.has(code)) return code;
  }

  let suffix = 1;
  const base = alphanumeric.slice(0, 2) || "X";
  while (usedCodes.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
};

export const isStatusCodeAvailable = (code, usedCodes = new Set()) => {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  return Boolean(normalized) && !usedCodes.has(normalized);
};

export const normalizeMasterName = (name) => String(name ?? "").trim().toLowerCase();

export const getDuplicateNameError = (name, rows = [], currentIndex = -1) => {
  const normalized = normalizeMasterName(name);
  if (!normalized) return null;

  const isDuplicate = rows.some((row, index) => {
    if (index === currentIndex) return false;
    return normalizeMasterName(row?.name) === normalized;
  });

  return isDuplicate ? "This name is already available!" : null;
};

export const mapToRequestBody = (item, masterType, isDelete = false) => ({
  statusId: getRowId(item),
  statusName: String(item?.name ?? "").trim(),
  statusType: masterType,
  statusCode: getItemStatusCode(item),
  colorCode: item?.colour_code || "#000000",
  isDelete,
});

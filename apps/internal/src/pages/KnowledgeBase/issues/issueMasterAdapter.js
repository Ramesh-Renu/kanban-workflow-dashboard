export const normalizeMasterRow = (item = {}) => ({
  id: item?.status_id ?? item?.id ?? item?.statusId ?? "",
  name: String(item?.name ?? item?.statusName ?? item?.status_name ?? "").trim(),
  code: String(
    item?.code ?? item?.status_code ?? item?.statusCode ?? "",
  )
    .trim()
    .toUpperCase(),
  parentCode: String(
    item?.parentCode ?? item?.parent_code ?? item?.parent_code ?? "",
  )
    .trim()
    .toUpperCase(),
});

export const mapMasterRowsToOptions = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map(normalizeMasterRow)
    .filter((row) => row.name)
    .map((row) => ({
      value: row.name,
      label: row.name,
      code: row.code,
      parentCode: row.parentCode,
    }));

export const mergeLegacyOption = (options = [], legacyValue = "") => {
  const value = String(legacyValue || "").trim();
  if (!value) return options;
  if (options.some((opt) => opt.value === value)) return options;
  return [{ value, label: value, legacy: true }, ...options];
};

export const mergeLegacyOptions = (options = [], legacyValues = []) => {
  const values = Array.isArray(legacyValues)
    ? legacyValues
    : legacyValues
      ? [legacyValues]
      : [];
  return values.reduce(
    (next, value) => mergeLegacyOption(next, value),
    options,
  );
};

export const filterSubtypeOptions = (
  subtypeRows = [],
  typeOptions = [],
  selectedIssueType = "",
) => {
  const selected = typeOptions.find((opt) => opt.value === selectedIssueType);
  const parentCode = selected?.code;
  if (!parentCode) return [];

  return mapMasterRowsToOptions(subtypeRows).filter(
    (opt) => opt.parentCode === parentCode,
  );
};

export const buildIssueMasterOptions = ({
  issueTypeRows = [],
  issueSubtypeRows = [],
  issueTagRows = [],
  selectedIssueType = "",
  legacyIssueType = "",
  legacyIssueSubtype = "",
  legacyTags = [],
} = {}) => {
  const issueTypes = mergeLegacyOption(
    mapMasterRowsToOptions(issueTypeRows),
    legacyIssueType,
  );
  const issueSubtypes = mergeLegacyOption(
    filterSubtypeOptions(issueSubtypeRows, issueTypes, selectedIssueType),
    legacyIssueSubtype,
  );
  const issueTags = mergeLegacyOptions(
    mapMasterRowsToOptions(issueTagRows),
    legacyTags,
  );

  return {
    issueTypes,
    issueSubtypes,
    issueTags,
  };
};

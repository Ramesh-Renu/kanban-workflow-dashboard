const extractLabelId = (item) => {
  if (item == null || item === "") return null;
  if (typeof item === "object") {
    const id = item.status_id ?? item.id;
    return id == null || id === "" ? null : id;
  }
  return item;
};

export const toLabelIdSet = (value) => {
  const list = Array.isArray(value)
    ? value
    : value != null && value !== ""
      ? [value]
      : [];
  return new Set(
    list
      .map(extractLabelId)
      .filter((id) => id != null && id !== "")
      .map(String),
  );
};

export const matchFreeFlowLabels = (labelList, ids) => {
  const idSet = toLabelIdSet(ids);
  if (!idSet.size) return [];
  return (labelList || []).filter((label) =>
    idSet.has(String(label?.status_id ?? label?.id)),
  );
};

export const toChecklistApiItems = (list = []) => {
  const existingIds = list
    .filter((item) => {
      const rawId = item?.id;
      return rawId != null && !String(rawId).startsWith("new_") && Number(rawId) > 0;
    })
    .map((item) => Number(item.id));

  let nextId = existingIds.length ? Math.max(...existingIds) + 1 : 1;

  return list.map((item) => {
    const rawId = item?.id;
    const isNew = rawId == null || String(rawId).startsWith("new_") || !Number(rawId);
    return {
      fieldName: item?.fieldName ?? "",
      fieldValue: item?.fieldValue ?? "",
      id: isNew ? nextId++ : Number(rawId),
      disabled: !!item?.disabled,
      checked: !!item?.checked,
    };
  });
};

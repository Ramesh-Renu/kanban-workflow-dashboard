import { useState, useEffect, useRef } from "react";

const createDefaultOtherData = () => [
  { fieldName: "New field", fieldValue: "", id: 1 },
];

const isSameOtherData = (prev, next) => {
  if (prev === next) return true;
  if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) {
    return false;
  }
  return prev.every(
    (item, index) =>
      item?.id === next[index]?.id &&
      item?.fieldName === next[index]?.fieldName &&
      item?.fieldValue === next[index]?.fieldValue &&
      item?.disabled === next[index]?.disabled,
  );
};

/**
 * Orders often ship `otherData: []` (e.g. order 321). The old logic did:
 *   setOtherData(initial?.length > 0 ? initial : [{ New field }]) // NEW array every time
 * then synced that into formData, which re-fed `[]` or a new default and looped
 * ("Maximum update depth exceeded" under DynamicField).
 *
 * Normalize empty → one stable default and only update when content changes.
 */
const useDynamicOtherData = (initialOtherData, updateParent) => {
  const [otherData, setOtherData] = useState(() =>
    initialOtherData?.length > 0 ? initialOtherData : createDefaultOtherData(),
  );
  const updateParentRef = useRef(updateParent);
  updateParentRef.current = updateParent;
  const emptyNormalizedRef = useRef(false);

  useEffect(() => {
    if (!initialOtherData || initialOtherData.length === 0) {
      setOtherData((prev) => {
        const stable = prev?.length > 0 ? prev : createDefaultOtherData();
        if (!emptyNormalizedRef.current) {
          emptyNormalizedRef.current = true;
          // Defer parent write so it is not inside the setState updater.
          queueMicrotask(() => {
            if (!isSameOtherData(initialOtherData, stable)) {
              updateParentRef.current?.(stable);
            }
          });
        }
        return stable;
      });
      return;
    }

    emptyNormalizedRef.current = false;
    setOtherData((prev) =>
      isSameOtherData(prev, initialOtherData) ? prev : initialOtherData,
    );
  }, [initialOtherData]);

  const handleAddField = () => {
    setOtherData((prevData) => {
      const maxId = prevData.length > 0 ? Math.max(...prevData.map((f) => f.id)) : -1;
      const newField = {
        fieldName: `New Field`,
        fieldValue: "",
        id: maxId + 1,
        disabled: prevData.length === 4,
      };
      const updated = [...prevData, newField];
      updateParentRef.current?.(updated);
      return updated;
    });
  };

  const handleRemoveField = (fieldId) => {
    setOtherData((prevData) => {
      const updated = prevData
        .filter((f) => f.id !== fieldId)
        .map((f) => ({ ...f, disabled: false }));
      updateParentRef.current?.(updated);
      return updated;
    });
  };

  const updateFieldData = (fieldId, newFieldName, newFieldValue) => {
    setOtherData((prevData) => {
      const updated = prevData.map((f) =>
        f.id === fieldId
          ? { ...f, fieldName: newFieldName, fieldValue: newFieldValue }
          : f,
      );
      updateParentRef.current?.(updated);
      return updated;
    });
  };

  return { otherData, handleAddField, handleRemoveField, updateFieldData };
};

export default useDynamicOtherData;

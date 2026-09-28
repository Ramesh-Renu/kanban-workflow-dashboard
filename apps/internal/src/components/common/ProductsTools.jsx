import React, { Fragment, useEffect, useMemo } from "react";
import { SelectDropDown } from "@orion/shared";
import { useGlobalMaster } from "@orion/shared";

/**
 * Products & Tools multi-select.
 * lockedToolIds (optional): ticket edit only — those tools stay selected and disabled.
 */
const ProductsTools = ({
  defaultToolsList,
  setToolsList,
  multiSelect,
  className,
  dropdownPosition,
  placeholder,
  disabled,
  lockedToolIds = [],
}) => {
  const { toolsList, getToolsList } = useGlobalMaster();

  const isLockedId = (toolId) =>
    (lockedToolIds || []).some((id) => Number(id) === Number(toolId));

  // Locked (API) tools are disabled in the list — cannot be deselected
  const options = useMemo(() => {
    const data = Array.isArray(toolsList?.data) ? toolsList.data : [];
    if (!lockedToolIds?.length) return data;
    return data.map((opt) => ({
      ...opt,
      disabled: isLockedId(opt.toolId) ? true : !!opt.disabled,
    }));
  }, [toolsList?.data, lockedToolIds]);

  useEffect(() => {
    if (!toolsList?.loading && options.length === 0) {
      getToolsList();
    }
  }, []);

  const resolveFromOptions = (list = []) => {
    if (!options.length) return [];
    return (list || [])
      .map((item) => {
        const id = item?.toolId ?? item;
        return options.find((opt) => Number(opt.toolId) === Number(id));
      })
      .filter(Boolean);
  };

  const values = useMemo(() => {
    const selected = resolveFromOptions(defaultToolsList);
    if (!lockedToolIds?.length || !options.length) return selected;

    const lockedTools = options.filter((opt) => isLockedId(opt.toolId));
    const unlockedSelected = selected.filter((tool) => !isLockedId(tool.toolId));
    return [...lockedTools, ...unlockedSelected].filter(
      (tool, index, arr) =>
        arr.findIndex((t) => Number(t.toolId) === Number(tool.toolId)) ===
        index,
    );
  }, [defaultToolsList, options, lockedToolIds]);

  const handleChangeTools = (selected = []) => {
    const nextSelected = resolveFromOptions(selected);
    if (!lockedToolIds?.length) {
      setToolsList(nextSelected);
      return;
    }

    const lockedTools = options.filter((opt) => isLockedId(opt.toolId));
    const unlockedSelected = nextSelected.filter(
      (tool) => !isLockedId(tool.toolId),
    );
    setToolsList(
      [...lockedTools, ...unlockedSelected].filter(
        (tool, index, arr) =>
          arr.findIndex((t) => Number(t.toolId) === Number(tool.toolId)) ===
          index,
      ),
    );
  };

  return (
    <Fragment>
      <SelectDropDown
        multi={multiSelect ? multiSelect : false}
        options={options}
        labelField="toolName"
        valueField="toolId"
        values={values}
        searchable={true}
        title={"Select tools"}
        onChange={handleChangeTools}
        placeholder={placeholder ? placeholder : "Select Products & Tools"}
        className={className ? className : "custom-dropdownRenderer"}
        disabled={options.length === 0 || disabled ? true : false}
        optionType="checkbox"
        dropdownPosition={dropdownPosition ? dropdownPosition : "auto"}
        customSearch={true}
        showSelectAll={true}
      />
    </Fragment>
  );
};

export default ProductsTools;

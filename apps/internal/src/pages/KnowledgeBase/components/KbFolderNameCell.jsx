import { classNames } from "@euroland/libs";

const KbFolderNameCell = ({
  name,
  hasChildren,
  expanded,
  onToggleExpand,
  onOpen,
  typeIcon,
  nameCellClass = "knowledge-base-hub__name-cell",
}) => {
  const openFolder = (e) => {
    e?.stopPropagation?.();
    onOpen?.();
  };

  if (!hasChildren) {
    return (
      <button
        type="button"
        className={classNames(
          "btn btn-0 p-0 border-0 text-start knowledge-base-hub__folder-toggle",
          nameCellClass,
        )}
        onClick={openFolder}
      >
        {typeIcon}
        <span className="fw-semibold">{name}</span>
      </button>
    );
  }

  return (
    <span className={nameCellClass}>
      <button
        type="button"
        className="btn btn-0 p-0 border-0 knowledge-base-hub__folder-toggle"
        title={expanded ? "Collapse" : "Expand"}
        aria-expanded={expanded}
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand?.();
        }}
      >
        <span
          className={classNames(
            "icon-chevron-thin-right",
            "knowledge-base-hub__chevron",
            expanded && "is-open",
          )}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        className="btn btn-0 p-0 border-0 text-start knowledge-base-hub__folder-toggle"
        onClick={openFolder}
      >
        {typeIcon}
        <span className="fw-semibold">{name}</span>
      </button>
    </span>
  );
};

export default KbFolderNameCell;

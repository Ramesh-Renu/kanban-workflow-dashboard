import React, { useEffect, useMemo, useState } from "react";
import { trashFull } from "../../../assets/images";

const serializeCheckList = (list = []) =>
  JSON.stringify(
    list.map((item) => ({
      id: String(item?.id ?? ""),
      fieldName: item?.fieldName ?? "",
      checked: !!item?.checked,
    })),
  );

const createNewItem = (fieldName) => ({
  id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  fieldName,
  checked: false,
});

const CheckList = ({
  checkList: checkListProp,
  initialItems = [],
  onChange,
  handleCheckList,
  handleAdd,
  handleDelete,
  onSave,
  title = "Checklist",
}) => {
  const [items, setItems] = useState(
    Array.isArray(checkListProp) ? checkListProp : initialItems,
  );
  const [newItemName, setNewItemName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const serverListKey = useMemo(
    () => serializeCheckList(Array.isArray(checkListProp) ? checkListProp : []),
    [checkListProp],
  );

  useEffect(() => {
    setItems(Array.isArray(checkListProp) ? checkListProp : initialItems);
  }, [serverListKey]);

  const updateList = (newList) => {
    setItems(newList);
    onChange?.(newList);
  };

  const persistList = (newList) => {
    updateList(newList);
    onSave?.(newList);
  };

  const addItem = () => {
    const name = newItemName.trim();
    if (!name) return;

    const newItem = createNewItem(name);
    const newList = [...items, newItem];
    persistList(newList);
    handleAdd?.(newItem, newList);
    setNewItemName("");
  };

  const toggleItem = (id) => {
    handleCheckList?.(id);
    persistList(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              checked: !item.checked,
            }
          : item,
      ),
    );
  };

  const deleteItem = (id) => {
    const newList = items.filter((item) => item.id !== id);
    persistList(newList);
    handleDelete?.(id, newList);
    if (editingId === id) {
      setEditingId(null);
      setEditingName("");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingName(item.fieldName);
  };

  const saveEdit = (id) => {
    const name = editingName.trim();
    if (!name) {
      setEditingId(null);
      setEditingName("");
      return;
    }
    persistList(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              fieldName: name,
            }
          : item,
      ),
    );
    setEditingId(null);
    setEditingName("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <div className="checklist-container">
      <h5 className="p-0 checklist-title">{title}:</h5>
      <div className="checklist-wrapper">
        <div className="checklist-items">
          {items.map((item) => (
            <div key={item.id} className="checklist-item">
              <div className="checklist-item-main">
                <input
                  type="checkbox"
                  checked={!!item.checked}
                  onChange={() => toggleItem(item.id)}
                />
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editingName}
                    autoFocus
                    className="checklist-item-edit"
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEdit(item.id);
                      }
                      if (e.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                    onBlur={() => saveEdit(item.id)}
                  />
                ) : (
                  <span
                    className={`checklist-item-name ${item.checked ? "is-checked" : ""}`}
                    onClick={() => startEdit(item)}
                    title="Click to edit"
                  >
                    {item.fieldName}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="checklist-item-delete"
                onClick={() => deleteItem(item.id)}
                aria-label={`Delete ${item.fieldName}`}
              >
                <img src={trashFull} alt="" />
              </button>
            </div>
          ))}
        </div>

        <input
          type="text"
          className="checklist-add-input"
          placeholder="Add checklist item"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
      </div>
    </div>
  );
};

export default CheckList;

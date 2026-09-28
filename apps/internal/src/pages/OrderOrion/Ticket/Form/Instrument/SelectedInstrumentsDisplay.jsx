import React, { useState } from "react";
import { Badge, Button } from "react-bootstrap";

// Sortable Item Component
const SortableItem = ({
  instrument,
  index,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      className="d-inline-block"
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
    >
      <Badge className="d-flex align-items-center gap-1 p-2 selected-instrument">
        {instrument.name}
        <Button
          variant="link"
          size="sm"
          className="onRemoveid"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instrument);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </Button>
      </Badge>
    </div>
  );
};

const SelectedInstrumentsDisplay = ({
  selectedInstrumentIds,
  onRemoveInstrument,
  onReorderInstruments,
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); // Needed to allow dropping
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    const updatedList = [...selectedInstrumentIds];
    const [draggedItem] = updatedList.splice(draggedIndex, 1);
    const adjustedIndex = draggedIndex < dropIndex ? dropIndex + 1 : dropIndex;
    updatedList.splice(adjustedIndex, 0, draggedItem);
    onReorderInstruments(updatedList);
    setDraggedIndex(null);
  };

  if (!selectedInstrumentIds?.length) {
    return (
      <div className="text-muted">
        <small>
          No instruments selected. Select instruments from the table above.
        </small>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 w-100">
        <h5 className="selected-instruments-head">
          Selected Instruments (drag to reorder):
        </h5>
      </div>
      <div className="dragged-content">
        {selectedInstrumentIds.map((instrument, index) => (
          <SortableItem
            key={instrument.id}
            instrument={instrument}
            index={index}
            onRemove={onRemoveInstrument}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
};

export default SelectedInstrumentsDisplay;

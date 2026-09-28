import React from "react";
import { renderBrandingPreviewValue } from "@orion/shared/src/components/BrandingPreviewValues";
import BrandingExportIconsSectionView from "./BrandingExportIconsSectionView";
import BrandingGuidelinesFieldRow from "./BrandingGuidelinesFieldRow";

/**
 * Renders preview section field rows for ticket view.
 * Preview items are fully prepared by buildBrandingPreviewSections (including export icon attachments).
 */
const BrandingGuidelinesSectionFields = ({ section }) => {
  if (!section?.groups?.length) {
    return <p className="value_field mb-0">—</p>;
  }
  const exportIconEntries =
    section.sectionId === "exportIcons"
      ? section.groups.flatMap((group) =>
        group.items.filter(
          (item) => item.type === "exportIconEntry" && item.key !== "section-notes"
        )
      )
      : [];

  if (exportIconEntries.length > 0) {
    return (
      <div className="branding-guidelines-section-fields">
        <BrandingExportIconsSectionView entries={exportIconEntries} />
      </div>
    );
  }

  return (
    <div className="branding-guidelines-section-fields">
      {section.groups.map((group, gIdx) => (
        <div key={gIdx} className="mb-2">
          {group.title && (
            <p className="label_field fw-semibold mb-2">{group.title}</p>
          )}
          {group.items
            .filter((item) => item.key !== "section-notes")
            .map((item) => (
              <BrandingGuidelinesFieldRow key={item.key} label={item.label}>
                {renderBrandingPreviewValue(item)}
              </BrandingGuidelinesFieldRow>
            ))}
        </div>
      ))}
    </div>
  );
};

export default BrandingGuidelinesSectionFields;

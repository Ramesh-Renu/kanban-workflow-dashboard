/**
 * Branding Guidelines v2 — section-driven field schema + payload helpers.
 *
 * Ticket load (edit existing order):
 * branding: {
 *   customerBranding: [{ typography, colors, buttons, ... }] | { typography, ... },
 *   ...legacy flat keys (primaryColor, fontFamily, etc.)
 * }
 *
 * In-app state after hydration:
 * { sections: { [id]: { fields, apiSectionId } }, commentsBySection: feedback thread, guidelineNotes }
 *
 * Public API: re-exported from feature modules. Import via brandingGuidelinesConfig.js for
 * backward compatibility with existing `@orion/shared/src/utils/brandingGuidelinesConfig` paths.
 */

export * from "./constants.js";
export * from "./inputUtils.js";
export * from "./sections.js";
export * from "./alternatives.js";
export * from "./preview.js";
export * from "./attachments.js";
export * from "./api.js";
export * from "./persistence.js";

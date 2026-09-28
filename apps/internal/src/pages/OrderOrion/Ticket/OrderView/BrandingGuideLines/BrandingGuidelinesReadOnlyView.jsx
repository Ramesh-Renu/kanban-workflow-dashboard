import { t } from "i18next";
import dayjs from "dayjs";
import React, { useMemo } from "react";
import { Col, Row } from "react-bootstrap";
import {
  BRANDING_SECTION_I18N,
  BRANDING_NOTES_SECTION_ID,
  getBrandingGuidelineNotes,
  sanitizeBrandingNotesPreviewHtml,
  brandingSectionUsesInlineAttachments,
} from "@orion/shared/src/utils/brandingGuidelinesConfig";
import BrandingGuidelinesSectionFields from "./BrandingGuidelinesSectionFields";
import BrandingGuidelinesSectionEmpty from "./BrandingGuidelinesSectionEmpty";

/**
 * Read-only branding guidelines layout (ticket view): section nav + detail panel.
 */
const BrandingGuidelinesReadOnlyView = ({
  view,
  designLink,
  ticketLegacyNotesHtml,
  renderAttachments,
}) => {
  const {
    brandingInfo,
    activeSectionId,
    selectSection,
    activePreview,
    viewSectionIds,
    sectionAttachmentsBySection,
    attachmentsLoading,
  } = view;

  const sectionIds = useMemo(() => {
    if (viewSectionIds?.length) return viewSectionIds;
    return [];
  }, [viewSectionIds]);

  const isNotesSection = activeSectionId === BRANDING_NOTES_SECTION_ID;
  const guidelineNotes = getBrandingGuidelineNotes(brandingInfo);
  const guidelineNotesHtml = guidelineNotes
    ? sanitizeBrandingNotesPreviewHtml(guidelineNotes)
    : null;
  const feedbackList = brandingInfo?.commentsBySection?.[activeSectionId] || [];
  const sectionAttachments = sectionAttachmentsBySection[activeSectionId] || [];
  const inlineAttachments = brandingSectionUsesInlineAttachments(activeSectionId);

  const hasPreviewFields =
    !isNotesSection &&
    Boolean(activePreview?.groups?.some((group) => (group.items?.length ?? 0) > 0));
  const hasNotes = isNotesSection && guidelineNotes.length > 0;
  const hasFeedback = !isNotesSection && feedbackList.length > 0;
  const hasFooterAttachments =
    !isNotesSection && !inlineAttachments && sectionAttachments.length > 0;
  const isLoadingAttachments =
    !isNotesSection && attachmentsLoading && !hasFooterAttachments && !inlineAttachments;
  const showSectionEmpty =
    isNotesSection
      ? !guidelineNotes.length
      : !hasPreviewFields &&
        !hasFeedback &&
        !hasFooterAttachments &&
        !isLoadingAttachments;

  const sectionTitle = t(
    `order_view.${BRANDING_SECTION_I18N[activeSectionId]}`,
    BRANDING_SECTION_I18N[activeSectionId]
  );

  if (sectionIds.length === 0) {
    return (
      <div className="branding-guidelines-view branding-guidelines-view--empty px-2 pb-3">
        <BrandingGuidelinesSectionEmpty />
      </div>
    );
  }

  return (
    <div className="branding-guidelines-view branding-guidelines-v2">
      {(designLink || ticketLegacyNotesHtml) && (
        <div className="branding-guidelines-view__meta border rounded-3 bg-white p-3 mb-2">
          {designLink && (
            <div className="d-flex flex-column flex-md-row gap-2 gap-md-3 mb-2">
              <span className="branding-guidelines-view__meta-label flex-shrink-0">
                {t("order_view.design_link", "Design Link")}
              </span>
              <a
                className="branding-guidelines-view__link text-break"
                href={
                  designLink.startsWith("http")
                    ? designLink
                    : `https://${designLink.replace(/^https?:\/\//, "")}`
                }
                target="_blank"
                rel="noreferrer"
              >
                {designLink}
              </a>
            </div>
          )}
          {ticketLegacyNotesHtml && (
            <div>
              <span className="branding-guidelines-view__meta-label d-block mb-2">
                {t("order_view.branding_ticket_notes", "Ticket notes")}
              </span>
              <div
                className="branding-guidelines-view__legacy-notes rounded p-2 fs-14"
                dangerouslySetInnerHTML={{ __html: ticketLegacyNotesHtml }}
              />
            </div>
          )}
        </div>
      )}

      <div className="branding-guidelines-view__panel border rounded-3 overflow-hidden bg-white">
        <Row className="g-0">
          <Col
            xs={12}
            md={3}
            className="branding-guidelines-view__nav-column bg-light border-end p-0"
          >
            <nav
              className="branding-guidelines-view__nav d-flex flex-md-column flex-row flex-wrap"
              aria-label={t("order_view.branding_guidelines", "Branding Guidelines")}
            >
              {sectionIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`branding-guidelines-view__nav-item btn text-start w-100 py-3 px-3 fs-14 rounded-0 border-0 ${
                    activeSectionId === id ? "active" : ""
                  }`}
                  onClick={() => selectSection(id)}
                >
                  {t(`order_view.${BRANDING_SECTION_I18N[id]}`, BRANDING_SECTION_I18N[id])}
                </button>
              ))}
            </nav>
          </Col>

          <Col xs={12} md={9} className="branding-guidelines-view__content companyDetails p-3">
            <h6 className="form-header mb-4">{sectionTitle}</h6>

            {showSectionEmpty ? (
              <BrandingGuidelinesSectionEmpty sectionTitle={sectionTitle} />
            ) : isNotesSection ? (
              <div
                className="value_field mb-0 text-break border rounded-3 p-3 branding-guidelines-view__notes-body"
                dangerouslySetInnerHTML={{ __html: guidelineNotesHtml || "" }}
              />
            ) : hasPreviewFields ? (
              <BrandingGuidelinesSectionFields section={activePreview} />
            ) : null}

            {feedbackList.length > 0 && (
              <div className="branding-guidelines-view__feedback mt-3 pt-2 border-top">
                <p className="branding-guidelines-view__block-label mb-2">
                  {t("order_view.branding_section_feedback", "Feedback")}
                  <span className="badge bg-secondary rounded-pill ms-2">
                    {feedbackList.length}
                  </span>
                </p>
                <div className="d-flex flex-column gap-1">
                  {feedbackList.map((entry) => (
                    <div
                      key={entry.id || `${entry.createdAt}-${entry.message}`}
                      className="branding-guidelines-view__feedback-item rounded p-2"
                    >
                      <div className="d-flex justify-content-between gap-2 mb-1">
                        <span className="fw-semibold fs-14">{entry.author || "—"}</span>
                        <span className="text-muted fs-12 text-nowrap">
                          {entry.createdAt
                            ? dayjs(entry.createdAt).format("DD MMM YYYY, HH:mm")
                            : ""}
                        </span>
                      </div>
                      <p className="mb-0 fs-14 text-break">{entry.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoadingAttachments ? (
              <p className="text-muted fs-14 mb-0 mt-3">
                {t("order_view.branding_attachments_loading", "Loading attachments…")}
              </p>
            ) : null}

            {hasFooterAttachments && renderAttachments
              ? renderAttachments(sectionAttachments)
              : null}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default BrandingGuidelinesReadOnlyView;

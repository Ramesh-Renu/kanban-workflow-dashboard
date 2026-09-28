import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Form, Button, Spinner } from "react-bootstrap";
import { t } from "i18next";
import BrandingPreviewPanel from "@orion/shared/src/components/BrandingPreviewPanel";
import BrandingSectionFeedback from "@orion/shared/src/components/BrandingSectionFeedback";
import { BRANDING_SECTION_I18N } from "@orion/shared/src/utils/brandingGuidelinesConfig";
import "styles/pages/ticketCreationForm.scss";
import "styles/pages/brandingPublicPreview.scss";
import TopProgressBar from "@orion/shared/src/components/TopProgressBar";
import useToast from "@orion/shared/src/hooks/useToast";
import useBrandingPreview from "./useBrandingPreview";
import BrandingPublicSectionContent from "./BrandingPublicSectionContent";
import pencilSimpleLine from "../../assets/images/pencil_simple_line.svg";

const BrandingPublicPreview = () => {
  const PRIVACY_POLICY_URL = "https://www.euroland.com/privacy-policy/";
  const TERMS_AND_CONDITIONS_URL = "https://www.euroland.com/terms-conditions/";
  const navId = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    loading,
    activeSectionId,
    setActiveSectionId,
    sectionFeedbackModalOpen,
    setSectionFeedbackModalOpen,
    sectionFeedbackDraft,
    setSectionFeedbackDraft,
    publicName,
    setPublicName,
    isNameSet,
    setIsNameSet,
    sectionFeedbackList,
    activeSectionTitle,
    previewSections,
    activePreview,
    viewSectionIds,
    sectionCommentCounts,
    sectionAttachmentsBySection,
    metadata,
    addNote,
    editNote,
  } = useBrandingPreview({
    token: navId?.token,
    navigate,
    showToast,
  });

  const hasBrandingContent = viewSectionIds.length > 0;
  const sectionAttachments = sectionAttachmentsBySection[activeSectionId] || [];

  return (
    <div className="branding-public-preview min-vh-100">
      <TopProgressBar loading={loading} />

      <div className="branding-public-preview__hero py-4 py-md-5">
        <Container>
          <div className="branding-public-preview__hero-inner">
            <div className="branding-public-preview__hero-copy">
              <p className="branding-public-preview__eyebrow mb-2">
                {t("order_view.branding_public_eyebrow", "Customer review")}
              </p>
              <h1 className="branding-public-preview__title mb-2">
                {t("order_view.branding_public_preview_title", "Branding Guidelines Preview")}
              </h1>
              <p className="branding-public-preview__subtitle mb-0">
                {t(
                  "order_view.branding_public_preview_subtitle",
                  "Review section-by-section and share feedback with our team."
                )}
              </p>
            </div>

            <div className="branding-public-preview__toolbar">
              <div className="branding-public-preview__identity">
                {!isNameSet ? (
                  <>
                    <Form.Control
                      size="sm"
                      placeholder={t(
                        "order_view.branding_public_name_placeholder",
                        "Enter your name"
                      )}
                      value={publicName}
                      onChange={(e) => setPublicName(e.target.value)}
                      className="branding-public-preview__name-input"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      className="branding-public-preview__toolbar-btn"
                      onClick={() => setIsNameSet(true)}
                      disabled={!publicName.trim()}
                    >
                      {t("order_view.branding_public_set_name", "Set Name")}
                    </Button>
                  </>
                ) : (
                  <div className="branding-public-preview__identity-set">
                    <span className="branding-public-preview__identity-label">
                      {t("order_view.branding_public_commenting_as", "Commenting as")}
                    </span>
                    <span className="branding-public-preview__identity-name">{publicName}</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="branding-public-preview__identity-edit p-0"
                      onClick={() => setIsNameSet(false)}
                    >
                      {t("order_view.branding_public_edit_name", "Edit")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(metadata.orderId || metadata.companyName) && (
            <div className="branding-public-preview__stats">
              {metadata.orderId ? (
                <div className="branding-public-preview__stat">
                  <span className="branding-public-preview__stat-label">
                    {t("order_view.branding_pdf_order_id", "Order ID")}
                  </span>
                  <span className="branding-public-preview__stat-value">{metadata.orderId}</span>
                </div>
              ) : null}

              {metadata.companyName ? (
                <div className="branding-public-preview__stat">
                  <span className="branding-public-preview__stat-label">
                    {t("order_view.company_name", "Company Name")}
                  </span>
                  <span className="branding-public-preview__stat-value">{metadata.companyName}</span>
                </div>
              ) : null}
            </div>
          )}

        </Container>
      </div>

      <Container className="pb-5">
        <Card className="border-0 shadow-sm overflow-hidden branding-public-preview__card">
          <Card.Body className="p-0">
            {!hasBrandingContent && !loading ? (
              <div className="branding-public-preview__empty p-5 text-center text-muted">
                {t(
                  "order_view.branding_view_empty",
                  "No branding guidelines have been saved for this order yet."
                )}
              </div>
            ) : (
              <Row className="g-0 branding-public-preview__workspace">
                <Col xl={3} className="branding-public-preview__sidebar">
                  <div className="branding-public-preview__sidebar-head">
                    <span className="branding-public-preview__sidebar-label">
                      {t("order_view.branding_public_sections", "Sections")}
                    </span>
                  </div>
                  <nav
                    className="branding-public-preview__nav"
                    aria-label={t("order_view.branding_guidelines", "Branding Guidelines")}
                  >
                    {viewSectionIds.map((id) => {
                      const isActive = activeSectionId === id;
                      const commentCount = sectionCommentCounts[id] || 0;

                      return (
                        <button
                          key={id}
                          type="button"
                          className={`branding-public-preview__nav-item${isActive ? " is-active" : ""}`}
                          onClick={() => setActiveSectionId(id)}
                        >
                          <span className="branding-public-preview__nav-text">
                            {t(`order_view.${BRANDING_SECTION_I18N[id]}`, BRANDING_SECTION_I18N[id])}
                          </span>

                          {commentCount > 0 ? (
                            <span className="branding-public-preview__nav-badge">{commentCount}</span>
                          ) : null}

                        </button>
                      );
                    })}
                  </nav>
                </Col>

                <Col xl={9} className="branding-public-preview__main">
                  <div className="branding-public-preview__content-head">
                    <div>
                      <h2 className="branding-public-preview__section-title mb-1">
                        {activeSectionTitle}
                      </h2>

                      <p className="branding-public-preview__section-hint mb-0">
                        {t(
                          "order_view.branding_public_section_hint",
                          "Review the configured values below and leave feedback if changes are needed."
                        )}
                      </p>
                    </div>

                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="branding-public-preview__comments-btn"
                      onClick={() => setSectionFeedbackModalOpen(true)}
                    >
                      {t("order_view.branding_public_view_comments", "View Comments")}
                      <span className="branding-public-preview__comments-count">
                        {sectionFeedbackList.length}
                      </span>
                    </Button>
                  </div>

                  <div className="branding-public-preview__content-body">
                    <div className="branding-public-preview__section-card">
                      <BrandingPublicSectionContent
                        activeSectionId={activeSectionId}
                        activeSectionTitle={activeSectionTitle}
                        activePreview={activePreview}
                        previewSections={previewSections}
                        sectionAttachments={sectionAttachments}
                      />
                    </div>
                  </div>
                </Col>
              </Row>
            )}
          </Card.Body>
        </Card>
      </Container>

      <footer className="branding-public-preview__footer">
        <Container className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 py-3">
          <div className="branding-public-preview__footer-brand d-flex align-items-center gap-2">
            <img
              src="/euroland-investors-logo.png"
              alt="Euroland logo"
              className="branding-public-preview__footer-logo"
            />
          </div>
          <div className="d-flex align-items-center gap-3">
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noreferrer"
              className="branding-public-preview__footer-link"
            >
              Privacy Policy
            </a>
            <span className="branding-public-preview__footer-divider">|</span>
            <a
              href={TERMS_AND_CONDITIONS_URL}
              target="_blank"
              rel="noreferrer"
              className="branding-public-preview__footer-link"
            >
              Terms & Conditions
            </a>
          </div>
        </Container>
      </footer>

      <BrandingSectionFeedback
        show={sectionFeedbackModalOpen}
        onHide={() => setSectionFeedbackModalOpen(false)}
        sectionIndex={Math.max(viewSectionIds.indexOf(activeSectionId), 0) + 1}
        sectionTitle={activeSectionTitle}
        sectionFeedbackList={sectionFeedbackList}
        sectionFeedbackDraft={sectionFeedbackDraft}
        onDraftChange={setSectionFeedbackDraft}
        onAddNote={addNote}
        onEditNote={editNote}
        currentUser={publicName || "Public User"}
        editIcon={pencilSimpleLine}
      />
    </div>
  );
};

export default BrandingPublicPreview;

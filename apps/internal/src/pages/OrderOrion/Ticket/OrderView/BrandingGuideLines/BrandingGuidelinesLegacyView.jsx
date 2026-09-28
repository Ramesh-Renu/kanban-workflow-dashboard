import React from "react";
import { Col, Row } from "react-bootstrap";
import { t } from "i18next";
import DOMPurify from "dompurify";
import ShowMoreLessElement from "components/common/ShowMoreLessElement";

const NIL = "—";

const BrandingGuidelinesLegacyView = ({ companyData, fontFamilyList }) => {
  const branding = companyData?.branding || {};

  const rows = [
    {
      label: t("order_view.primary_colour"),
      value: branding.primaryColor || NIL,
      type: "color",
    },
    {
      label: t("order_view.secondary_colour"),
      value: branding.secondaryColor || NIL,
      type: "color",
    },
    {
      label: t("order_view.font_colour"),
      value: branding.fontColor || NIL,
      type: "color",
    },
    {
      label: t("order_view.font_size"),
      value: branding.fontSize || NIL,
    },
    {
      label: t("order_view.design_link"),
      value: branding.designLink || NIL,
      type: "link",
    },
    {
      label: t("order_view.font_family"),
      value:
        branding.fontFamily?.length > 0 && fontFamilyList?.data
          ? fontFamilyList.data
              .filter((item) => branding.fontFamily?.includes(item.font_id))
              .map((item) => item.name)
              .filter(Boolean)
          : NIL,
    },
  ];

  const otherData = Array.isArray(branding.otherData) ? branding.otherData : [];

  return (
    <div className="branding-guidelines-view branding-guidelines-view--legacy">
      <Row className="g-3">
        {rows.map((row, index) => (
          <Col key={index} xs={12} md={6} lg={4}>
            <div className="branding-guidelines-view__legacy-card border rounded-3 p-3 h-100 bg-white">
              <p className="branding-guidelines-view__meta-label mb-2">{row.label}</p>
              {row.type === "link" && row.value !== NIL ? (
                <a
                  className="branding-guidelines-view__link text-break"
                  href={
                    row.value.startsWith("http")
                      ? row.value
                      : `https://${String(row.value).replace(/^https?:\/\//, "")}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {row.value}
                </a>
              ) : row.type === "color" && row.value !== NIL ? (
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="branding-preview-values-swatch rounded-circle border"
                    style={{ backgroundColor: row.value }}
                  />
                  <span className="fs-14 text-uppercase">{row.value}</span>
                </div>
              ) : (
                <p className="mb-0 fs-14 fw-semibold text-break">
                  {Array.isArray(row.value) ? row.value.join(", ") : row.value}
                </p>
              )}
            </div>
          </Col>
        ))}

        {otherData.map((item, i) => {
          if (item?.fieldValue == null || String(item.fieldValue).trim() === "") return null;
          return (
            <Col key={`other-${i}`} xs={12} md={6}>
              <div className="branding-guidelines-view__legacy-card border rounded-3 p-3 h-100 bg-white">
                <p className="branding-guidelines-view__meta-label mb-2">
                  {item.fieldName || t("order_view.other_data", "Other Data")}
                </p>
                <p className="mb-0 fs-14 fw-semibold text-break">
                  {typeof item.fieldValue === "object"
                    ? JSON.stringify(item.fieldValue)
                    : item.fieldValue}
                </p>
              </div>
            </Col>
          );
        })}

        {branding.notes && (
          <Col xs={12}>
            <div className="branding-guidelines-view__legacy-card border rounded-3 p-3 bg-white">
              <p className="branding-guidelines-view__meta-label mb-2">
                {t("order_view.branding_ticket_notes", "Ticket notes")}
              </p>
              <ShowMoreLessElement
                initialDivHeight="120"
                gettingElements={
                  <div
                    className="fs-14"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(branding.notes, {
                        ALLOWED_ATTR: ["href", "target", "src"],
                      }),
                    }}
                  />
                }
                buttonAlign="right"
                noShowMore={false}
              />
            </div>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default BrandingGuidelinesLegacyView;

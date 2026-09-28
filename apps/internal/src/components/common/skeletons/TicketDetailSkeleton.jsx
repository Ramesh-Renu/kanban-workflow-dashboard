import React, { memo } from "react";
import { Col, Row } from "react-bootstrap";
import { SkeletonBone } from "../SkeletonLoading";

const DetailFieldSkeleton = ({ labelWidth = "88px", valueWidth = "42%" }) => (
  <div className="ticket-detail-skeleton__field">
    <SkeletonBone width={labelWidth} height="12px" />
    <SkeletonBone width={valueWidth} height="14px" />
  </div>
);

const TicketDetailSkeleton = ({
  tabCount = 6,
  fieldCount = 6,
  ariaLabel = "Loading ticket details",
}) => (
  <div
    className="w-100 fluid mx-auto orderOverViewContainer p-0 ticket-detail-skeleton"
    role="status"
    aria-busy="true"
    aria-label={ariaLabel}
  >
    <div className="d-flex align-items-center pb-2 justify-content-between">
      <SkeletonBone width="220px" height="14px" />
    </div>

    <Row xs={12} className="d-flex mx-auto">
      <Col md={3} className="rightSidePanel p-0">
        <div className="bg-white p-0 m-0 h-100 ticket-detail-skeleton__sidebar">
          <div className="ticket-detail-skeleton__header">
            <SkeletonBone width="78px" height="24px" borderRadius="6px" />
            <SkeletonBone width="78%" height="22px" />
          </div>

          <div className="ticket-detail-skeleton__panel">
            {Array.from({ length: fieldCount }, (_, index) => (
              <DetailFieldSkeleton
                key={`ticket-field-skel-${index}`}
                labelWidth={index % 2 === 0 ? "72px" : "104px"}
                valueWidth={index % 3 === 0 ? "56%" : "38%"}
              />
            ))}
            <div className="ticket-detail-skeleton__labels">
              <SkeletonBone width="56px" height="12px" />
              <div className="ticket-detail-skeleton__pills">
                <SkeletonBone width="64px" height="24px" borderRadius="999px" />
                <SkeletonBone width="72px" height="24px" borderRadius="999px" />
                <SkeletonBone width="58px" height="24px" borderRadius="999px" />
              </div>
            </div>
          </div>

          <div className="ticket-detail-skeleton__description">
            <SkeletonBone width="96px" height="12px" />
            <SkeletonBone width="100%" height="64px" borderRadius="8px" />
          </div>
        </div>
      </Col>

      <Col md={9} className="h-100 transition-flex renderContainer">
        <div className="w-100 ps-2 mt-0 ticket-detail-skeleton__main">
          <div className="ticket-detail-skeleton__toolbar">
            <div className="ticket-detail-skeleton__tab-group">
              <SkeletonBone width="88px" height="34px" borderRadius="6px" />
              <SkeletonBone width="88px" height="34px" borderRadius="6px" />
            </div>
            <SkeletonBone width="110px" height="34px" borderRadius="6px" />
          </div>

          <div className="ticket-detail-skeleton__tabs">
            {Array.from({ length: tabCount }, (_, index) => (
              <SkeletonBone
                key={`ticket-tab-skel-${index}`}
                width={`${70 + (index % 3) * 18}px`}
                height="28px"
                borderRadius="6px"
              />
            ))}
          </div>

          <div className="ticket-detail-skeleton__content">
            <div className="ticket-detail-skeleton__form-grid">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={`ticket-form-skel-${index}`} className="ticket-detail-skeleton__form-field">
                  <SkeletonBone width="40%" height="12px" />
                  <SkeletonBone width="100%" height="36px" borderRadius="6px" />
                </div>
              ))}
            </div>
            <div className="ticket-detail-skeleton__activity">
              <SkeletonBone width="140px" height="16px" />
              <SkeletonBone width="100%" height="72px" borderRadius="8px" />
              <SkeletonBone width="92%" height="56px" borderRadius="8px" />
            </div>
          </div>
        </div>
      </Col>
    </Row>
  </div>
);

export default memo(TicketDetailSkeleton);

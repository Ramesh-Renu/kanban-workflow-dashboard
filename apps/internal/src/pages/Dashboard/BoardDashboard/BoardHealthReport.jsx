import React, { memo } from "react";
import { COLORS_VALUES } from "utils/dashboard";
import TotalIcon from "../Widget/Icons/TotalIcon";
import HealthySVGImage from "../Widget/Icons/HealthySVGImage";
import NeedsAttentionSVGImage from "../Widget/Icons/NeedsAttentionSVGImage";
import AtRiskSVGImage from "../Widget/Icons/AtRiskSVGImage";

const BoardHealthReport = ({ workspaceResponse, boardHealthStatusMasterValue }) => {
  const boardGridCount = workspaceResponse?.healthSummaryItem?.boardGridCount;

  return (
    <div className="dashboard-page__content-left-heath-report">
      <div className="dashboard-page__content-left-heath-report-item">
        <div className="dashboard-page__content-left-heath-report-item-content">
          <p>
            <TotalIcon
              color={COLORS_VALUES(boardHealthStatusMasterValue).total}
              isTransparent={true}
              bgColor="transparent"
              needDivElement={false}
              style={{ width: "16px", height: "16px" }}
            />
            <span className="label">Total Board:</span>
            <span className="count">{boardGridCount?.totalBoard || 0}</span>
          </p>
          <p>
            <HealthySVGImage
              color={COLORS_VALUES(boardHealthStatusMasterValue).healthy}
              isTransparent={true}
              bgColor="transparent"
              needDivElement={false}
              style={{ width: "16px", height: "16px" }}
            />
            <span className="label">Healthy Board:</span>
            <span className="count">{boardGridCount?.healthyCount || 0}</span>
          </p>
          <p>
            <NeedsAttentionSVGImage
              color={COLORS_VALUES(boardHealthStatusMasterValue).needsAttention}
              isTransparent={true}
              bgColor="transparent"
              needDivElement={false}
              style={{ width: "16px", height: "16px" }}
            />
            <span className="label">Needs Attention:</span>
            <span className="count">{boardGridCount?.needAttentionCount || 0}</span>
          </p>
          <p>
            <AtRiskSVGImage
              color={COLORS_VALUES(boardHealthStatusMasterValue).atRisk}
              isTransparent={true}
              bgColor="transparent"
              needDivElement={false}
              style={{ width: "16px", height: "16px" }}
            />
            <span className="label">At Risk:</span>
            <span className="count">{boardGridCount?.atRiskCount || 0}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default memo(BoardHealthReport);

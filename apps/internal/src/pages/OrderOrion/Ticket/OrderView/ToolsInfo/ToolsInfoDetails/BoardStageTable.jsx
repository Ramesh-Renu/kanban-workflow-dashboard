import React from "react";

const BoardStageTable = ({ data, companyData }) => {
  return (
    <div className="board-stage-table">
      <div className="header d-flex justify-content-between align-items-center px-4 py-3 border-bottom row">
        {companyData?.workFlowType === 60 ? (
          <>
            <div className="col-4 heading">Board</div>
            <div className="col-4 heading text-center">Stage</div>
            <div className="col-4 heading text-end">Current Assignee</div>
          </>
        ) : (
          <>
            <div className="col-3 heading">Workspace</div>
            <div className="col-3 heading">Board</div>
            <div className="col-3 heading text-center stage-col">Stage</div>
            <div className="col-3 heading text-end">Current Assignee</div>
          </>
        )}
      </div>

      {data?.activeStages?.map((item, index) => (
        <div
          key={index}
          className="row-item d-flex justify-content-between align-items-center px-4 py-3 row"
        >
          {companyData?.workFlowType === 60 ? (
            <>
              <div className="col-4 text-secondary">{item.boardName}</div>
              <div className="col-4 text-center">
                <span
                  className="stage-badge p-2 rounded"
                  style={{
                    color: item?.stage?.colorCode,
                    border: `1px solid ${item?.stage?.colorCode}`,
                    backgroundColor: `${item?.stage?.colorCode}10`,
                    display: "block",
                    minWidth:"100px",
                  }}
                >
                  {item?.stage?.name}
                </span>
              </div>
              <div className="col-4 text-secondary text-end">
                {item.assignee[0]?.displayName}
              </div>
            </>
          ) : (
            <>
              <div className="col-3 text-secondary">
                {item.workspaceName}
              </div>
              <div className="col-3 text-secondary">{item.boardName}</div>
              <div className="col-3 text-center stage-col">
                <span
                  className="stage-badge p-2 rounded"
                  style={{
                    color: item?.stage?.colorCode,
                    border: `1px solid ${item?.stage?.colorCode}`,
                    backgroundColor: `${item?.stage?.colorCode}10`,
                    display: "block",
                    minWidth:"100px",
                  }}
                >
                  {item?.stage?.name}
                </span>
              </div>
              <div className="col-3 text-secondary text-end">
                {item.assignee[0]?.displayName}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default BoardStageTable;

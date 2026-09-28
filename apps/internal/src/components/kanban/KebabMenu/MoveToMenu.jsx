const MoveToMenu = ({
  moveToData,
  openGroups,
  toggleGroup,
  loadingActionId,
  moveToTicket,
  apiLoading,
}) => {
  if (!moveToData?.length) {
    return <div className="movetoCard">No Board Stages</div>;
  }

  return (
    <div className="movetoCard">
      <p>{"Current Board Stages"}</p>
      <hr className="m-auto mt-2" />
      <div className="d-flex flex-column w-100 mt-2 p-2">
        {moveToData.map((group) => (
          <div key={group.action_id} className="bg-white">
            {/* Header row */}
            <div className="d-flex align-items-center justify-content-between groupContainer">
              <div className="d-flex align-items-center gap-2 w-100">
                <button
                  className="toggleGroup"
                  onClick={() => toggleGroup(group.action_id)}
                  title="Expand"
                >
                  {openGroups[group.action_id] ? "−" : "+"}
                </button>
                <button
                  onClick={() => moveToTicket(group)}
                  className={`option-btn ${
                    loadingActionId === group.action_id ? "api-loading" : ""
                  }`}
                  title="Move"
                  disabled={apiLoading}
                >
                  {group.action_name}
                  <span>›</span>
                </button>
              </div>
            </div>

            {/* Details */}
            {openGroups[group.action_id] && group?.targets?.length > 0 && (
              <div
                className="mt-2 ps-3"
                style={{
                  borderLeft: "2px dashed #ddd", // vertical dashed line
                  marginLeft: "12px", // align under toggle
                }}
              >
                {group?.targets?.map((detail, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded mb-1"
                    style={{
                      background: "var(--color-primary-light-12)",
                    }}
                  >
                    <span className="targetNames">
                      {detail?.board_name} {"->"} {detail?.label_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoveToMenu;

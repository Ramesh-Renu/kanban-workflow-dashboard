import React, { useState, Fragment, useEffect } from "react";

function TabComponent({ tabItems, currentTab, ...props }) {
  const [activeTab, setActiveTab] = useState("");
  const activeTabItem = tabItems.find((tab) => tab.id === activeTab);
  useEffect(() => {
    setActiveTab(tabItems[0].id);
  }, []);

  useEffect(() => {
    if (currentTab) {
      currentTab(activeTab);
    }
  }, [activeTab]);

  return (
    <Fragment>
      <div className={`tabs-container ${props.className || ""}`}>
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content p-3">{activeTabItem?.content}</div>
    </Fragment>
  );
}

export default TabComponent;

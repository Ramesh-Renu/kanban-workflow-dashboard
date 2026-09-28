import React, {useRef} from "react";
import { Outlet } from "react-router-dom";

const SettingsHome = () => {
  const sidebarRef = useRef(null);

  return (
    <div className="settings-home d-flex flex-row flex-nowrap justify-content-sart ">
      {/* <div className="bg-white m-0 d-flex settingsSideBar-container">
        <SettingsSideBar sidebarRef={sidebarRef} />
      </div> */}
      <div
        className="m-0 body-content"
        // style={{ width: "calc(100% - 240px)" }}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default SettingsHome;

import { Outlet } from "react-router-dom";
import { Fragment } from "react";
import Header from "./header/header.component";

const DefaultLayout = () => {
  return (
    <Fragment>
      <Header />
      <Outlet />
    </Fragment>
  );
};

export default DefaultLayout;

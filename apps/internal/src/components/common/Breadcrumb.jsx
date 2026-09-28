/** This component created by Sukumar J ***/
import React from "react";
import { Link, useLocation } from "react-router-dom";
function Breadcrumb({
  previousTitle,
  customTitle,
  isParamExist = false,
  addExtra,
  getLocation,
  getTicketId,
}) {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(Boolean);

  const getRoote = (routeTo) => {
    if (getLocation) {
      getLocation(routeTo); // Pass getTicketId along with the routeTo
    }
  };

  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb">
        {pathnames.map((name, index) => {

          if (name === "details") return null;
          if (pathnames[index - 1] === "details") return null;

          const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isPenultimate = index === pathnames.length - 2;
          const isLast = index === pathnames.length - 1 || pathnames
            .slice(index + 1)
            .every(
              (segment, i) =>
                segment === "details" ||
                pathnames[index + 1 + i - 1] === "details"
            );
          if (isParamExist && isPenultimate) {
            return null; // Changed from empty string to null to avoid rendering issues
          }
          return isLast ? (
            <li
              key={`breadcrumb-item-${index}`}
              className={`breadcrumb-item ${!addExtra && `active`} `}
              aria-current="page"
              title={customTitle && isParamExist ? customTitle?.name : name}
            >
              {customTitle && isParamExist ? (
                <Link
                  to={customTitle?.urlPath ? customTitle?.urlPath : routeTo}
                  onClick={() =>
                    getRoote(
                      customTitle?.urlPath ? customTitle?.urlPath : routeTo
                    )
                  }
                  state={
                    getTicketId
                      ? {
                        ticketId: getTicketId?.id,
                        deptName: getTicketId?.name,
                        labelId: getTicketId?.labelId,
                        fromFilter: false,
                      }
                      : location.state
                  }
                >
                  {customTitle?.name}
                </Link>
              ) : customTitle?.name ? (
                addExtra ? (
                  <Link onClick={() => getRoote(routeTo)} >
                    {customTitle?.name}
                  </Link>
                ) : (
                  customTitle?.name
                )
              ) : (
                name
              )}
              {addExtra && (
                <span className="breadcrumb-item-divider">
                  {" "}
                  <span className="icon-chevron-thin-right"></span>{" "}
                </span>
              )}
            </li>
          ) : (
            <li key={`breadcrumb-item-${index}`} className="breadcrumb-item">
              {name !== "detail" && (
                <>
                  {previousTitle &&
                  (isPenultimate || name === "orders" || name === "task") ? (
                    <Link
                      to={routeTo}
                      onClick={() => getRoote(routeTo)}
                      state={
                        (name === "orders" || name === "task") && getTicketId
                          ? {
                            ticketId: getTicketId?.id,
                            deptName: getTicketId?.name,
                            labelId: getTicketId?.labelId,
                            fromFilter: false,
                          }
                          : location.state
                      }
                      title={previousTitle}
                    >
                      {previousTitle}
                    </Link>
                  ) : (
                    <Link
                      to={routeTo}
                      onClick={() => getRoote(routeTo)}
                      state={
                        (name === "orders" || name === "task") && getTicketId
                          ? {
                            ticketId: getTicketId?.id,
                            deptName: getTicketId?.name,
                            labelId: getTicketId?.labelId,
                            fromFilter: false,
                          }
                          : location.state
                      }
                      title={name}
                    >
                      {name === "orders"
                        ? "Orders"
                        : name === "task"
                          ? "Task"
                          : name}
                    </Link>
                  )}
                  <span className="breadcrumb-item-divider">
                    {" "}
                    <span className="icon-chevron-thin-right"></span>{" "}
                  </span>
                </>
              )}
            </li>
          );
        })}
        {addExtra && (
          <li
            className="breadcrumb-item active addExtra"
            title={addExtra}
            key={`breadcrumb-item-addExtra`}
          >
            <Link to="#">{addExtra}</Link>
          </li>
        )}
      </ol>
    </nav>
  );
}

export default Breadcrumb;

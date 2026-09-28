import { Link } from "react-router-dom";

/**
 * Item-driven breadcrumb reusing shared `.breadcrumb` markup/classes.
 * Items may use `to` (Link), `onClick` (button), or plain text.
 */
const KbBreadcrumb = ({ items = [] }) => {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="knowledge-base-hub__breadcrumb mb-2"
    >
      <ol className="breadcrumb mb-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const content =
            !isLast && item.onClick ? (
              <button
                type="button"
                className="btn btn-0 p-0 border-0 knowledge-base-hub__breadcrumb-action"
                onClick={item.onClick}
              >
                {item.label}
              </button>
            ) : !isLast && item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              item.label
            );

          return (
            <li
              key={`${item.label}-${index}`}
              className={`breadcrumb-item ${isLast ? "active" : ""}`}
              aria-current={isLast ? "page" : undefined}
              title={item.label}
            >
              {isLast || (!item.to && !item.onClick) ? (
                content
              ) : (
                <>
                  {content}
                  <span className="breadcrumb-item-divider">
                    {" "}
                    <span className="icon-chevron-thin-right" />{" "}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default KbBreadcrumb;

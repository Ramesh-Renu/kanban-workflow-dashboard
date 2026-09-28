import MandatoryText from "../../components/common/MandatoryText";
import { t } from "i18next";
import { Row, Col } from "react-bootstrap";
// render category selection
const RenderCategory = ({
  selectedOrders,
  selectedCategory,
  orderCategory,
  selectedTypesId,
  upSellCategory,
  reDesignCategory,
  handleCategory
}) => {
  if (selectedOrders?.length === 0) return null;
  const renderSection = (typeId) => {
    let title = "";
    let showDescription = false;
    if (typeId === "NC") {
      title = t("order_orion_v2.select_category");
      showDescription = false;
    } else if (typeId === "UP") {
      title = t("order_orion_v2.up_sell");
      showDescription = true;
    } else if (typeId === "RD") {
      title = t("order_orion_v2.re-design");
      showDescription = true;
    } else {
      return null;
    }

    return (
      <Row
        key={typeId}
        className="d-flex flex-row align-items-center justify-content-between gap-3 p-0 m-0"
      >
        <Col xs={12} className="p-0 m-0 w-100 mt-3">
          <h5 className="m-auto">
            {title} <MandatoryText />
          </h5>
          {showDescription && (
            <p className="category_text m-0">
              {t("order_orion_v2.select_the_needed_category_for") + " " + title}
            </p>
          )}
        </Col>
        {orderCategory?.data?.map((category) => {
          const uniqueId = `${typeId}-${category.code}`;
          return (
            <Col
              key={category.code}
              className="category_col py-2 border rounded d-flex flex-row align-items-center"
            >
              <input
                type="checkbox"
                className="custom-checkbox"
                id={uniqueId}
                checked={
                  !["UP", "RD"].includes(typeId)
                    ? selectedCategory.includes(category.code)
                    : typeId === "UP"
                      ? upSellCategory.includes(category.code)
                      : typeId === "RD"
                        ? reDesignCategory.includes(category.code)
                        : false
                }
                onChange={(e) => handleCategory(e, category, typeId)}
              />

              <label htmlFor={uniqueId} className="option-name">
                &#160;&#160;{category.name}
              </label>
            </Col>
          );
        })}
      </Row>
    );
  };
  // Filter to valid IDs only ("NC", "UP", "RD", "PLG")
  const validTypeIds = ["NC", "UP", "RD", "PLG"].filter((id) =>
    selectedTypesId.includes(id),
  );

  return <>{validTypeIds.map(renderSection)}</>;
};

export default RenderCategory;

import { Fragment, useMemo } from "react";
import { Row, Col } from "react-bootstrap";
import { t } from "i18next";
import TabComponent from "components/common/TabComponent";
import KanbanMasters from "./KanbanMasters";
import KnowledgeBaseMasters from "./KnowledgeBaseMasters";

const MasterData = () => {
  const tabItems = useMemo(
    () => [
      {
        id: "kanban",
        label: t("settings.master_data.kanban_masters"),
        content: <KanbanMasters />,
      },
      {
        id: "knowledgeBase",
        label: t("settings.master_data.knowledge_base_masters"),
        content: <KnowledgeBaseMasters />,
      },
    ],
    [],
  );

  return (
    <Fragment>
      <div className="row mb-3 master-data-container">
        <div className="umasterDataOverViewContainer bg-transparent">
          <Row className="w-100 d-flex flex-row align-items-center justify-content-between border border-1 rounded mx-auto p-4 eu-header-bg">
            <Col>
              <h2 className="master-data-title">{t("settings.master_data.title")}</h2>
              <p className="master-data-subtitle">{t("settings.master_data.subtitle")}</p>
            </Col>
            <Col className="d-flex justify-content-end">
              <p>&#160;</p>
            </Col>
          </Row>
        </div>
        <div className="col-12 master-data-tabs">
          <TabComponent tabItems={tabItems} />
        </div>
      </div>
    </Fragment>
  );
};

export default MasterData;

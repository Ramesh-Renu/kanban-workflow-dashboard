import { Outlet, useLocation } from "react-router-dom";
import { t } from "i18next";
import KbPageHeader from "./components/KbPageHeader";
import KbSearchDock from "./components/KbSearchDock";
import { KbSearchProvider } from "./components/KbSearchContext";

const KnowledgeBaseLayout = () => {
  const { pathname } = useLocation();

  const isLanding =
    pathname === "/knowledge-base" || pathname === "/knowledge-base/";

  return (
    <KbSearchProvider>
      <div className="knowledge-base-hub settings-workspace-user userOverViewContainer bg-transparent knowledge-base-hub--with-kb-search">

        <KbPageHeader
          title={t("knowledge_base.title")}
          subtitle={
            isLanding
              ? t("knowledge_base.subtitle")
              : t("knowledge_base.subtitle_nested")
          }
            actions={<KbSearchDock />}
        />

        {/* <KbSearchDock /> */}
        <Outlet />

      </div>
    </KbSearchProvider>
  );
};

export default KnowledgeBaseLayout;
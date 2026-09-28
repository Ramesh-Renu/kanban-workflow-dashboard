import { Fragment, useEffect, useState } from "react";
import { t } from "i18next";
import { useNavigate } from "react-router-dom";
import KbCard from "./components/KbCard";
import KbHomeEmpty, { KbHomeLoading } from "./components/KbHomeStates";
import { useKbSearch } from "./components/KbSearchContext";
import KbSearchResultsPanel from "./components/KbSearchResultsPanel";
import useKnowledgeBase from "hooks/useKnowledgeBase";
// import KbSearchDock from "./components/KbSearchDock";

const KnowledgeBaseHome = () => {
  const navigate = useNavigate();
  const { isSearchActive } = useKbSearch();
  const [{ rows, loading, loaded, error }, { getKnowledgeBaseList }] =
    useKnowledgeBase({
      applyPermissions: true,
    });
  const [didAutoRedirect, setDidAutoRedirect] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (isSearchActive) return;
    if (didAutoRedirect) return;
    if (loading) return;
    if (!loaded) return;
    if (error) return;
    if (rows.length === 1 && rows[0]?.id != null) {
      setDidAutoRedirect(true);
      navigate(`/knowledge-base/${rows[0].id}`, { replace: true });
    }
  }, [didAutoRedirect, error, isSearchActive, loaded, loading, navigate, rows]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await getKnowledgeBaseList?.({ force: true });
    } catch {
      // Error state is driven by master data slice.
    } finally {
      setRetrying(false);
    }
  };

  const showLoading = (loading || !loaded) && !error;
  const showError = Boolean(error) && !loading;
  const showEmpty = loaded && !error && !loading && rows.length === 0;
  const showGrid = loaded && !error && !loading && rows.length > 0;

  if (isSearchActive) {
    return (
      <Fragment>
        <KbSearchResultsPanel />
      </Fragment>
    );
  }

 return (
  <Fragment>
    {/* <KbSearchDock /> */}

    {showLoading || retrying ? (
      <KbHomeLoading count={4} />
    ) : null}

    {showError && !retrying ? (
      <KbHomeEmpty
        variant="error"
        title={t("knowledge_base.load_failed")}
        message={t("knowledge_base.load_failed_message")}
        actionLabel={t("knowledge_base.search_retry")}
        onAction={handleRetry}
      />
    ) : null}

    {showEmpty ? (
      <KbHomeEmpty
        title={t("knowledge_base.empty_title")}
        message={t("knowledge_base.empty_message")}
      />
    ) : null}

    {showGrid ? (
      <div className="knowledge-base-hub__grid">
        {rows.map((kb) => (
          <KbCard
            key={kb.id}
            knowledgeBase={kb}
            onClick={() => navigate(`/knowledge-base/${kb.id}`)}
          />
        ))}
      </div>
    ) : null}
  </Fragment>
);
};

export default KnowledgeBaseHome;

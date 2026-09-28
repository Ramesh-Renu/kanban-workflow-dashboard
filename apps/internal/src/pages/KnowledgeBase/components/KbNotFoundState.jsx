import { t } from "i18next";
import NotFound from "pages/NotFound/NotFound";

/**
 * Knowledge Base not-found state — reuses the shared NotFound screen.
 * Always returns to the Knowledge Base home to avoid chaining 404s
 * (e.g. missing issue → missing folder).
 */
const KbNotFoundState = () => (
  <NotFound
    title={t("knowledge_base.not_found")}
    description={t("knowledge_base.not_found_message")}
    actionLabel={t("knowledge_base.go_back_to_knowledge_base")}
    actionTo="/knowledge-base"
  />
);

export default KbNotFoundState;

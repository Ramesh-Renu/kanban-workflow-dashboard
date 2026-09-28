import { t } from "i18next";
import { KnowledgeBase, inactiveKnowledgeBase } from "assets/images";

const KbCard = ({ knowledgeBase, onClick }) => {
  const name = knowledgeBase?.name || t("knowledge_base.title");
  const description = knowledgeBase?.description?.trim();

  return (
    <button
      type="button"
      className="knowledge-base-hub__card"
      onClick={onClick}
      aria-label={t("knowledge_base.open_kb_aria", { name })}
    >
      <span className="knowledge-base-hub__card-icon" aria-hidden="true">
        <img src={inactiveKnowledgeBase} alt="" width={26} height={26} />
      </span>
      <span className="knowledge-base-hub__card-body">
        <span className="knowledge-base-hub__card-title">{name}</span>
        <span className="knowledge-base-hub__card-desc">
          {description || t("knowledge_base.no_description")}
        </span>
      </span>
    </button>
  );
};

export default KbCard;

import React, { memo } from "react";

const formatChange = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "— 0%";
  const num = Number(value);
  const sign = num > 0 ? "+" : "";
  return `${sign}${num}%`;
};

const BulletList = ({ items = [], className = "" }) => (
  <ul className={`orion-ai-response__list ${className}`.trim()}>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const NumberedList = ({ items = [] }) => (
  <ol className="orion-ai-response__numbered-list">
    {items.map((item, index) => (
      <li key={item}>
        <span className="orion-ai-response__numbered-index">{index + 1}</span>
        <span>{item}</span>
      </li>
    ))}
  </ol>
);

const ProgressRow = ({ label, value, percent = 0, tone = "neutral" }) => (
  <div className="orion-ai-response__progress-row">
    <div className="orion-ai-response__progress-head">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
    <div className="orion-ai-response__progress-track">
      <span
        className={`orion-ai-response__progress-fill orion-ai-response__progress-fill--${tone}`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  </div>
);

export const OrionSummarizationView = memo(({ data }) => {
  const {
    boardSummary,
    orders,
    subtasks,
    boards,
    summary,
    insights,
    risks,
    bottlenecks,
    actions,
    impact,
  } = data;

  return (
    <div className="orion-ai-response orion-ai-response--summary">
      <div className="orion-ai-response__summary-head">
        <div>
          <h4 className="orion-ai-response__title">Executive summary</h4>
          <p className="orion-ai-response__subtitle">{summary}</p>
        </div>
        {boardSummary && (
          <span className="orion-ai-response__badge orion-ai-response__badge--warning">
            {boardSummary.atRisk} of {boardSummary.totalBoards} boards at risk
          </span>
        )}
      </div>

      <div className="orion-ai-response__metric-cards">
        <div className="orion-ai-response__metric-card">
          <p className="orion-ai-response__metric-card-title">
            Orders · created {orders?.created} (
            {formatChange(orders?.createdChangePercent)})
          </p>
          <ProgressRow
            label="Active"
            value={orders?.active}
            percent={orders?.active ? 100 : 0}
            tone="healthy"
          />
          <ProgressRow
            label="Completed"
            value={orders?.completed}
            percent={orders?.completed ? 100 : 4}
            tone="danger"
          />
        </div>
        <div className="orion-ai-response__metric-card">
          <p className="orion-ai-response__metric-card-title">
            Sub-tasks · created {subtasks?.created} (
            {formatChange(subtasks?.createdChangePercent)})
          </p>
          <ProgressRow
            label="Active"
            value={subtasks?.active}
            percent={subtasks?.active ? 100 : 0}
            tone="healthy"
          />
          <ProgressRow
            label="Overdue"
            value={subtasks?.overdue}
            percent={subtasks?.active ? (subtasks.overdue / subtasks.active) * 100 : 0}
            tone="danger"
          />
        </div>
      </div>

      <div className="orion-ai-response__board-tags">
        {boards?.map((board) => (
          <span
            key={board.name}
            className={`orion-ai-response__board-tag orion-ai-response__board-tag--${
              board.health === "Healthy" ? "healthy" : "risk"
            }`}
          >
            <span className="orion-ai-response__board-dot" aria-hidden />
            {board.name}
            {board.overdue > 0 ? ` · ${board.overdue} overdue` : ""}
          </span>
        ))}
      </div>

      <div className="orion-ai-response__section">
        <h5 className="orion-ai-response__section-title">Key insights</h5>
        <BulletList items={insights} />
      </div>

      <div className="orion-ai-response__section">
        <h5 className="orion-ai-response__section-title">Risks identified</h5>
        <BulletList items={risks} className="orion-ai-response__list--risk" />
      </div>

      <div className="orion-ai-response__callout orion-ai-response__callout--warning">
        <h5 className="orion-ai-response__callout-title">Bottlenecks</h5>
        {bottlenecks?.map((item) => (
          <p key={item} className="orion-ai-response__callout-text">
            {item}
          </p>
        ))}
      </div>

      <div className="orion-ai-response__section">
        <h5 className="orion-ai-response__section-title">Recommended actions</h5>
        <NumberedList items={actions} />
      </div>

      {impact && (
        <div className="orion-ai-response__callout orion-ai-response__callout--success">
          <p className="orion-ai-response__callout-text">{impact}</p>
        </div>
      )}
    </div>
  );
});

export const OrionMetricView = memo(({ data }) => {
  const { caption, kpis, explain, findings, actions, impact } = data;

  return (
    <div className="orion-ai-response orion-ai-response--metric">
      <div className="orion-ai-response__metric-head">
        <span className="orion-ai-response__metric-icon" aria-hidden>
          📊
        </span>
        <h4 className="orion-ai-response__title orion-ai-response__title--purple">
          Metric overview — {caption}
        </h4>
      </div>

      <div className="orion-ai-response__kpi-grid">
        {kpis?.map((kpi) => (
          <div key={kpi.label} className="orion-ai-response__kpi-card">
            <span className="orion-ai-response__kpi-label">{kpi.label}</span>
            <strong className="orion-ai-response__kpi-value">{kpi.count}</strong>
            <span
              className={`orion-ai-response__kpi-change orion-ai-response__kpi-change--${kpi.polarity}`}
            >
              {kpi.trend === "Ideal" ? "—" : kpi.trend === "Increase" ? "↑" : "↓"}{" "}
              {formatChange(kpi.changePercent)}
            </span>
          </div>
        ))}
      </div>

      <div className="orion-ai-response__section">
        <h5 className="orion-ai-response__section-title orion-ai-response__section-title--purple">
          What this data shows
        </h5>
        <p className="orion-ai-response__paragraph">{explain}</p>
      </div>

      <div className="orion-ai-response__section">
        <h5 className="orion-ai-response__section-title orion-ai-response__section-title--purple">
          Key findings
        </h5>
        <BulletList items={findings} />
      </div>

      <div className="orion-ai-response__section">
        <h5 className="orion-ai-response__section-title orion-ai-response__section-title--purple">
          Recommended actions
        </h5>
        <NumberedList items={actions} />
      </div>

      {impact && (
        <div className="orion-ai-response__callout orion-ai-response__callout--purple">
          <p className="orion-ai-response__callout-text">{impact}</p>
        </div>
      )}
    </div>
  );
});

const priorityClassMap = {
  P1: "p1",
  P2: "p2",
  P3: "p3",
};

export const OrionActionPointsView = memo(({ data }) => {
  const { actions, risks, recommendation } = data;

  return (
    <div className="orion-ai-response orion-ai-response--actions">
      <h4 className="orion-ai-response__title">Recommended next actions</h4>
      <p className="orion-ai-response__subtitle">
        Based on 7-day velocity trend · Jun 18–24
      </p>

      <div className="orion-ai-response__priority-list">
        {actions?.map((action) => (
          <article
            key={action.title}
            className={`orion-ai-response__priority-card orion-ai-response__priority-card--${
              priorityClassMap[action.priority] || "p3"
            }`}
          >
            <span className="orion-ai-response__priority-tag">{action.priority}</span>
            <h5 className="orion-ai-response__priority-title">{action.title}</h5>
            <p className="orion-ai-response__priority-reason">{action.reason}</p>
            <p className="orion-ai-response__priority-result">{action.result}</p>
          </article>
        ))}
      </div>

      <div className="orion-ai-response__callout orion-ai-response__callout--risk">
        <h5 className="orion-ai-response__callout-title">Risks if no action</h5>
        <BulletList items={risks} className="orion-ai-response__list--risk" />
      </div>

      {recommendation && (
        <div className="orion-ai-response__callout orion-ai-response__callout--neutral">
          <h5 className="orion-ai-response__callout-title">Overall recommendation</h5>
          <p className="orion-ai-response__callout-text orion-ai-response__callout-text--strong">
            {recommendation}
          </p>
        </div>
      )}
    </div>
  );
});

const PerformancePersonCard = ({ person, tone }) => {
  const maxWorkload = 33;
  const percent = maxWorkload > 0 ? (person.workload / maxWorkload) * 100 : 0;

  return (
    <article
      className={`orion-ai-response__person-card orion-ai-response__person-card--${tone}`}
    >
      <div className="orion-ai-response__person-head">
        {person.photo ? (
          <img
            src={person.photo}
            alt={person.name}
            className="orion-ai-response__person-photo"
          />
        ) : (
          <span className="orion-ai-response__person-fallback">
            {person.name?.charAt(0)}
          </span>
        )}
        <div className="orion-ai-response__person-meta">
          <strong>{person.name}</strong>
          <span>
            {person.workload} {person.unit}
          </span>
        </div>
      </div>
      <div className="orion-ai-response__progress-track">
        <span
          className={`orion-ai-response__progress-fill orion-ai-response__progress-fill--${
            tone === "top" ? "healthy" : "danger"
          }`}
          style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
        />
      </div>
      <p className="orion-ai-response__person-reason">{person.reason}</p>
    </article>
  );
};

export const OrionPerformanceView = memo(({ data }) => {
  const { status, statusNote, top, attention, footer } = data;
  const statusTone = status === "At Risk" ? "warning" : "healthy";

  return (
    <div className="orion-ai-response orion-ai-response--performance">
      <div className="orion-ai-response__performance-head">
        <div>
          <h4 className="orion-ai-response__title">Team performance</h4>
          <p className="orion-ai-response__subtitle">{statusNote}</p>
        </div>
        <span
          className={`orion-ai-response__badge orion-ai-response__badge--${statusTone}`}
        >
          {status}
        </span>
      </div>

      <div className="orion-ai-response__section">
        <h5 className="orion-ai-response__section-title orion-ai-response__section-title--healthy">
          Top performers
        </h5>
        {top?.map((person) => (
          <PerformancePersonCard key={person.name} person={person} tone="top" />
        ))}
      </div>

      <div className="orion-ai-response__section">
        <h5 className="orion-ai-response__section-title orion-ai-response__section-title--risk">
          Needs attention
        </h5>
        {attention?.map((person) => (
          <PerformancePersonCard key={person.name} person={person} tone="attention" />
        ))}
      </div>

      {footer && (
        <div className="orion-ai-response__callout orion-ai-response__callout--neutral">
          <p className="orion-ai-response__callout-text">{footer}</p>
        </div>
      )}
    </div>
  );
});

export const ORION_RESPONSE_TYPES = {
  summarization: "summarization",
  metric: "metric",
  actions: "actions",
  performance: "performance",
};

export const OrionAIResponseRenderer = memo(({ type, data }) => {
  if (!data) return null;

  switch (type) {
    case ORION_RESPONSE_TYPES.summarization:
      return <OrionSummarizationView data={data} />;
    case ORION_RESPONSE_TYPES.metric:
      return <OrionMetricView data={data} />;
    case ORION_RESPONSE_TYPES.actions:
      return <OrionActionPointsView data={data} />;
    case ORION_RESPONSE_TYPES.performance:
      return <OrionPerformanceView data={data} />;
    default:
      return null;
  }
});

export const nextStage = (stages, current) => {
  const i = stages.findIndex((s) => s.name === current);
  return i >= 0 && i < stages.length - 1 ? stages[i + 1] : current;
};

export const moveWholeCard = (tasks, cardId, toStage) =>
  tasks.map((c) => (c.id === cardId ? { ...c, stage: toStage } : c));

export const moveSingleTool = (tasks, fromCardId, toolId, toStage) => {
  let source = tasks.find((c) => c.id === fromCardId);
  if (!source) return tasks;

  const tool = source.tools.find((t) => t.id === toolId);
  if (!tool) return tasks;

  // remove tool from source
  let updated = tasks.map((c) =>
    c.id === fromCardId
      ? { ...c, tools: c.tools.filter((t) => t.id !== toolId) }
      : c
  );

  // remove card if no tools left
  if (updated.find((c) => c.id === fromCardId)?.tools.length === 0) {
    updated = updated.filter((c) => c.id !== fromCardId);
  }

  // merge into existing card in target stage
  const target = updated.find(
    (c) => c.stage === toStage && c.orderId === source.orderId
  );
  if (target) {
    if (!target.tools.some((t) => t.id === tool.id)) {
      updated = updated.map((c) =>
        c.id === target.id
          ? { ...c, tools: [...c.tools, { ...tool, selected: false }] }
          : c
      );
    }
  } else {
    updated.push({
      id: `${fromCardId}_${toolId}_${Date.now()}`,
      company: source.company,
      orderId: source.orderId,
      dates: source.dates,
      stage: toStage,
      tools: [{ ...tool, selected: false }],
    });
  }

  return updated;
};

export const moveSelectedToolsFromCard = (tasks, fromCardId, toStage) => {
  const card = tasks.find((c) => c.id === fromCardId);
  if (!card) return tasks;
  const selected = card.tools.filter((t) => t.selected);
  let result = tasks;
  selected.forEach((t) => {
    result = moveSingleTool(result, fromCardId, t.id, toStage.name);
  });
  return result;
};

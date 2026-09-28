import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const DashboardAIModeContext = createContext(null);

export const useDashboardAIMode = () => {
  const ctx = useContext(DashboardAIModeContext);
  if (!ctx) {
    throw new Error("useDashboardAIMode must be used within DashboardAIModeProvider");
  }
  return ctx;
};

export const useDashboardAIModeOptional = () => useContext(DashboardAIModeContext);

export const DashboardAIModeProvider = ({ children }) => {
  const [aiMode, setAiMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | loading | summary
  const loadTimerRef = useRef(null);
  const msgTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
    if (msgTimerRef.current) {
      clearTimeout(msgTimerRef.current);
      msgTimerRef.current = null;
    }
  }, []);

  const deselect = useCallback(() => {
    clearTimers();
    setSelectedId(null);
    setSelectedMeta(null);
    setSelectedAnchor(null);
    setPhase("idle");
  }, [clearTimers]);

  const exitAIMode = useCallback(() => {
    setAiMode(false);
    deselect();
  }, [deselect]);

  const enterAIMode = useCallback(() => {
    setAiMode(true);
  }, []);

  const toggleAIMode = useCallback(() => {
    setAiMode((prev) => {
      if (prev) {
        deselect();
        return false;
      }
      return true;
    });
  }, [deselect]);

  const selectHotspot = useCallback(
    (id, meta, anchorEl) => {
      if (!aiMode || !id) return;
      if (selectedId === id) return;

      clearTimers();
      setSelectedId(id);
      setSelectedMeta(meta);
      setSelectedAnchor(anchorEl || null);
      setPhase("loading");

      loadTimerRef.current = setTimeout(() => {
        setPhase("summary");
      }, 1600);
    },
    [aiMode, selectedId, clearTimers],
  );

  useEffect(() => {
    const root = document.body;
    if (aiMode) {
      root.classList.add("ai-dashboard-mode");
    } else {
      root.classList.remove("ai-dashboard-mode");
    }
    return () => root.classList.remove("ai-dashboard-mode");
  }, [aiMode]);

  useEffect(() => {
    if (!aiMode) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (selectedId) deselect();
        else exitAIMode();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aiMode, selectedId, deselect, exitAIMode]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const value = useMemo(
    () => ({
      aiMode,
      selectedId,
      selectedMeta,
      selectedAnchor,
      phase,
      enterAIMode,
      exitAIMode,
      toggleAIMode,
      selectHotspot,
      deselect,
    }),
    [
      aiMode,
      selectedId,
      selectedMeta,
      selectedAnchor,
      phase,
      enterAIMode,
      exitAIMode,
      toggleAIMode,
      selectHotspot,
      deselect,
    ],
  );

  return (
    <DashboardAIModeContext.Provider value={value}>
      {children}
    </DashboardAIModeContext.Provider>
  );
};

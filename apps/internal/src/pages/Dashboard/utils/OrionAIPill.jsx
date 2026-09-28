import { useState, useCallback, useRef, useEffect } from "react";
import CloseIcon from "../Widget/Icons/CloseIcon";
import { ORION_QUESTION_TAGS, resolveOrionQuestionType } from "./AIAPITempalte";
import { OrionAIResponseRenderer } from "./OrionAIResponseViews";

const CLOSE_ANIMATION_MS = 300;
const THINKING_DELAY_MS = 600;

const OrionAIPill = () => {
  const [expanded, setExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [input, setInput] = useState("");
  const [questionAnswerMap, setQuestionAnswerMap] = useState([]);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const pillRef = useRef(null);
  const questionRefs = useRef({});
  const pendingScrollIdRef = useRef(null);
  const thinkingTimeoutRef = useRef(null);
  const questionAnswerMapRef = useRef([]);

  useEffect(() => {
    questionAnswerMapRef.current = questionAnswerMap;
  }, [questionAnswerMap]);

  const clearThinkingTimeout = useCallback(() => {
    if (thinkingTimeoutRef.current) {
      window.clearTimeout(thinkingTimeoutRef.current);
      thinkingTimeoutRef.current = null;
    }
  }, []);

  const resetConversation = useCallback(() => {
    clearThinkingTimeout();
    setInput("");
    setQuestionAnswerMap([]);
  }, [clearThinkingTimeout]);

  const scrollToQuestion = useCallback((entryId) => {
    if (!entryId) return;

    requestAnimationFrame(() => {
      const body = bodyRef.current;
      const questionEl = questionRefs.current[entryId];
      if (body && questionEl) {
        const bodyTop = body.getBoundingClientRect().top;
        const questionTop = questionEl.getBoundingClientRect().top;
        const offset = questionTop - bodyTop + body.scrollTop;
        body.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
      }
      inputRef.current?.focus();
    });
  }, []);

  const queueScrollToQuestion = useCallback((entryId) => {
    pendingScrollIdRef.current = entryId;
  }, []);

  useEffect(() => {
    const entryId = pendingScrollIdRef.current;
    if (!entryId) return undefined;

    pendingScrollIdRef.current = null;
    scrollToQuestion(entryId);
    return undefined;
  }, [questionAnswerMap, scrollToQuestion]);

  const orionOpen = useCallback(() => {
    if (isClosing) return;

    setExpanded((prev) => {
      if (prev) {
        resetConversation();
        setIsPanelOpen(false);
        return false;
      }
      return true;
    });
  }, [isClosing, resetConversation]);

  const orionClose = useCallback(
    (event) => {
      event?.stopPropagation?.();
      if (!expanded || isClosing) return;

      resetConversation();
      setIsPanelOpen(false);
      setIsClosing(true);
      window.setTimeout(() => {
        setExpanded(false);
        setIsClosing(false);
      }, CLOSE_ANIMATION_MS);
    },
    [expanded, isClosing, resetConversation],
  );

  const isPanelVisible = expanded || isClosing;

  useEffect(() => {
    if (expanded && !isClosing) {
      const frameId = requestAnimationFrame(() => {
        setIsPanelOpen(true);
      });
      return () => cancelAnimationFrame(frameId);
    }

    setIsPanelOpen(false);
    return undefined;
  }, [expanded, isClosing]);

  useEffect(() => () => clearThinkingTimeout(), [clearThinkingTimeout]);

  useEffect(() => {
    if (!expanded || isClosing) return undefined;

    const handleOutsideClick = (event) => {
      if (pillRef.current?.contains(event.target)) return;
      orionClose();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [expanded, isClosing, orionClose]);

  const appendStructuredResponse = useCallback(
    (tag) => {
      const existing = questionAnswerMapRef.current.find((item) => item.type === tag.id);

      if (existing) {
        setQuestionAnswerMap((prev) => {
          if (prev[prev.length - 1]?.id === existing.id) return prev;
          return [...prev.filter((item) => item.id !== existing.id), existing];
        });
        queueScrollToQuestion(existing.id);
        return;
      }

      const entryId = `${tag.id}-${Date.now()}`;

      setQuestionAnswerMap((prev) => [
        ...prev,
        {
          id: entryId,
          question: tag.label,
          type: tag.id,
          data: null,
          status: "thinking",
        },
      ]);

      queueScrollToQuestion(entryId);

      clearThinkingTimeout();
      thinkingTimeoutRef.current = window.setTimeout(() => {
        setQuestionAnswerMap((prev) =>
          prev.map((item) =>
            item.id === entryId ? { ...item, data: tag.template, status: "ready" } : item,
          ),
        );
      }, THINKING_DELAY_MS);
    },
    [clearThinkingTimeout, queueScrollToQuestion],
  );

  const handleTagClick = useCallback(
    (event, tag) => {
      event?.stopPropagation?.();
      appendStructuredResponse(tag);
    },
    [appendStructuredResponse],
  );

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
  }, []);

  const handleSendClick = useCallback(() => {
    const question = input.trim();
    if (!question) return;

    const matchedType = resolveOrionQuestionType(question);
    const matchedTag =
      ORION_QUESTION_TAGS.find((tag) => tag.id === matchedType) ||
      ORION_QUESTION_TAGS.find(
        (tag) => tag.label.toLowerCase() === question.toLowerCase(),
      );

    setInput("");

    if (matchedTag) {
      appendStructuredResponse(matchedTag);
    } else {
      const normalizedQuestion = question.toLowerCase();
      const existingText = questionAnswerMapRef.current.find(
        (item) =>
          item.type === "text" &&
          item.question.trim().toLowerCase() === normalizedQuestion,
      );

      if (existingText) {
        setQuestionAnswerMap((prev) => {
          if (prev[prev.length - 1]?.id === existingText.id) return prev;
          return [...prev.filter((item) => item.id !== existingText.id), existingText];
        });
        queueScrollToQuestion(existingText.id);
      } else {
        const entryId = `text-${Date.now()}`;
        setQuestionAnswerMap((prev) => [
          ...prev,
          {
            id: entryId,
            question,
            type: "text",
            data: "I can help with executive summary, metric overview, recommended actions, or team performance. Try one of the tags above.",
            status: "ready",
          },
        ]);
        queueScrollToQuestion(entryId);
      }
    }
  }, [appendStructuredResponse, input, queueScrollToQuestion]);

  const handleInputKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSendClick();
      }
    },
    [handleSendClick],
  );

  return (
    <section
      ref={pillRef}
      className={`orion-ai-pill-section ${isPanelVisible ? "expanded" : ""} ${
        isClosing ? "is-collapsing" : ""
      }`}
    >
      <div className="orion-ai-pill-container">
        <div className="orion-ai-pill-content" onClick={orionOpen}>
          <div className="orion-ai-pill-content-left">
            <p className="orion-ai-pill-content-brain">🧠</p>
            <p className="orion-ai-pill-content-text-container">
              <span
                className="orion-ai-pill-content-text"
                style={{ fontSize: isPanelVisible ? "15px" : "13px" }}
              >
                Orion IQ
              </span>
            </p>
          </div>
          {isPanelVisible && (
            <div className="orion-ai-pill-content-right">
              <button
                type="button"
                className="orion-ai-pill-content-close"
                onClick={orionClose}
              >
                <CloseIcon color="#ffffff" style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
          )}
        </div>
      </div>
      {isPanelVisible && (
        <div
          className={`orion-ai-pill-content-expanded-wrapper ${
            isPanelOpen ? "is-open" : ""
          }`}
        >
          <div className="orion-ai-pill-content-expanded">
            <div className="orion-ai-pill-content-expanded-header">
              <h3 className="orion-ai-pill-content-expanded-header-text">
                Ask Orion IQ anything
              </h3>
              <p className="orion-ai-pill-content-expanded-header-text-sub">
                Orion IQ is a tool that helps you track your risks and score.
              </p>
              <div
                className="orion-ai-pill__question-tags"
                role="tablist"
                aria-label="Quick questions"
              >
                {ORION_QUESTION_TAGS.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="orion-ai-pill__question-tag"
                    onClick={(event) => handleTagClick(event, tag)}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="orion-ai-pill-content-expanded-body" ref={bodyRef}>
              <div className="orion-ai-pill-content-expanded-user-questions-answers">
                {questionAnswerMap.length === 0 && (
                  <p className="orion-ai-pill__empty-hint">
                    Select a question tag or type your own question below.
                  </p>
                )}
                {questionAnswerMap.map((item) => (
                  <div
                    key={item.id}
                    className="orion-ai-pill-content-expanded-user-questions-answers-item"
                  >
                    <div
                      className="orion-ai-pill__chat-question-wrap"
                      ref={(el) => {
                        if (el) {
                          questionRefs.current[item.id] = el;
                        } else {
                          delete questionRefs.current[item.id];
                        }
                      }}
                    >
                      <span className="orion-ai-pill-content-expanded-user-questions-text">
                        {item.question}
                        <span className="orion-ai-pill__chat-question-tail" aria-hidden />
                      </span>
                    </div>
                    <div className="orion-ai-pill-content-expanded-user-answers-text">
                      {item.status === "thinking" ? (
                        <span className="orion-ai-pill__thinking">Thinking...</span>
                      ) : item.type === "text" ? (
                        item.data
                      ) : (
                        <OrionAIResponseRenderer type={item.type} data={item.data} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="orion-ai-pill-content-expanded-footer">
              <input
                ref={inputRef}
                className="orion-ai-pill-content-expanded-footer-input"
                onChange={handleInputChange}
                type="text"
                placeholder="Ask Orion IQ anything"
                value={input}
                onKeyDown={handleInputKeyDown}
              />
              <button
                type="button"
                className="orion-ai-pill-content-expanded-footer-button"
                onClick={handleSendClick}
                disabled={!input.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OrionAIPill;

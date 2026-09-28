import { useCallback, useEffect, useRef } from "react";
import { t } from "i18next";
import useClickAway from "hooks/useClickAway";
import { KB_SEARCH_OPEN } from "../utils";
import { useKbSearch } from "./KbSearchContext";

const SearchGlyph = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="7"
      cy="7"
      r="4.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M10.5 10.5L13.5 13.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ChevronDownGlyph = ({ className }) => (
  <svg
    className={className}
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3.5 5.25L7 8.75L10.5 5.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const KbSearchDock = () => {
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const {
    query,
    setQuery,
    loading,
    slow,
    commitSearch,
    clearSearch,
    isSearchActive,
  } = useKbSearch();

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const minimizeSearch = useCallback(() => {
    if (isSearchActive) return;

    inputRef.current?.blur();
  }, [isSearchActive]);

  useClickAway([rootRef], () => {
    if (isSearchActive) return;

    if (document.activeElement === inputRef.current) {
      inputRef.current?.blur();
    }
  });

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (isSearchActive) {
      focusInput();
    }
  }, [focusInput, isSearchActive]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isModK =
        (event.ctrlKey || event.metaKey) &&
        String(event.key || "").toLowerCase() === "k";

      if (isModK) {
        event.preventDefault();
        focusInput();
        return;
      }

      if (event.key === "Escape") {
        if (document.activeElement === inputRef.current) {
          event.preventDefault();

          if (query) {
            clearSearch();
            inputRef.current?.blur();
            return;
          }

          minimizeSearch();
        }
      }
    };

    const onExternalOpen = () => {
      focusInput();
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(KB_SEARCH_OPEN, onExternalOpen);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(KB_SEARCH_OPEN, onExternalOpen);
    };
  }, [clearSearch, focusInput, minimizeSearch, query]);

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitSearch(query);
    }
  };

  return (
    <div
      ref={rootRef}
      className="kb-search-dock kb-search-dock--expanded"
    >
      <div className="kb-search-dock__shell">
        <span className="kb-search-dock__icon-wrap" aria-hidden="true">
          <SearchGlyph className="kb-search-dock__search-icon" />
        </span>

        <input
          ref={inputRef}
          type="search"
          className="kb-search-dock__input"
          value={query}
          placeholder={t("knowledge_base.search_placeholder")}
          aria-label={t("knowledge_base.search_placeholder")}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />

        {/* <div className="kb-search-dock__trailing">
          {loading ? (
            <span
              className="kb-search-dock__spinner"
              aria-hidden="true"
            />
          ) : null}

          {query ? (
            <button
              type="button"
              className="kb-search-dock__clear"
              onClick={clearSearch}
              aria-label={t("knowledge_base.clear_filters")}
            >
              ×
            </button>
          ) : null}

          <button
            type="button"
            className="kb-search-dock__minimize"
            onClick={minimizeSearch}
            aria-label={t("knowledge_base.search_minimize")}
            title={t("knowledge_base.search_minimize")}
          >
            <ChevronDownGlyph className="kb-search-dock__minimize-icon" />
          </button>
        </div> */}
      </div>

      {isSearchActive && slow ? (
        <p className="kb-search-dock__slow" role="status">
          {t("knowledge_base.search_searching")}
        </p>
      ) : null}

      <span className="visually-hidden">
        {t("knowledge_base.search_hotkey_hint")}
      </span>
    </div>
  );
};

export default KbSearchDock;
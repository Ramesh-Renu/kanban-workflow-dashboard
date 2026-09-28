import { useEffect, useRef } from "react";

const defaultEvents = ["mousedown", "touchstart"];

/**
 *
 * @param {{RefObject<HTMLElement | null>}[]} refs
 * @param {(event: E) => void} onClickAway
 * @param { string[]} events
 */
const useClickAway = (refs, onClickAway, events = defaultEvents) => {
  const savedCallback = useRef(onClickAway);
  useEffect(() => {
    savedCallback.current = onClickAway;
  }, [onClickAway]);
  useEffect(() => {
    const handler = event => {
      const possibleExec = refs.every(ref => {
        const { current: el } = ref;
        return el && !el.contains(event.target);
      });
      possibleExec && savedCallback.current(event);
    };
    for (const eventName of events) {
      document.addEventListener(eventName, handler);
    }
    return () => {
      for (const eventName of events) {
        document.removeEventListener(eventName, handler);
      }
    };
  }, [events, refs]);
};

export default useClickAway;

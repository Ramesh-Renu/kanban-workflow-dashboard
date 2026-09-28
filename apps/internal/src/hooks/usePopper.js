import { useCallback, useEffect, useRef } from "react";
import { createPopper } from "@popperjs/core";

/**
 *
 * @param {{
 *  enable: boolean,
 *  placement: import("@popperjs/core").Placement
 *  modifiers: import("@popperjs/core").Modifier
 * }} param
 * @returns
 */
const usePopper = ({
  placement = "bottom",
  enable = true,
  offset,
  modifiers = [],
}) => {
  const reference = useRef(null);
  const popper = useRef(null);
  const instance = useRef(null);

  const setupPopper = useCallback(() => {
    if (!enable || !reference.current || !popper.current) return;
    instance.current?.destroy();
    instance.current = createPopper(reference.current, popper.current, {
      placement,
      modifiers: [
        {
          name: "offset",
          options: {
            offset: offset ?? [0, 8],
          },
        },
        {
          name: "flip",
          options: {
            allowedAutoPlacements: ["right", "left", "top", "bottom"],
            rootBoundary: "viewport",
          },
        },
        ...modifiers,
      ],
    });
    instance.current.forceUpdate();
  }, [enable, modifiers]);

  const referenceRef = useCallback(
    (node) => {
      reference.current = node;
      setupPopper();
    },
    [setupPopper]
  );

  const popperRef = useCallback(
    (node) => {
      popper.current = node;
      setupPopper();
    },
    [setupPopper]
  );

  useEffect(() => {
    return () => {
      if (!reference.current && !popper.current) {
        instance.current?.destroy();
        instance.current = null;
      }
    };
  }, []);

  return {
    reference,
    popper,
    referenceRef,
    popperRef,
  };
};
export default usePopper;

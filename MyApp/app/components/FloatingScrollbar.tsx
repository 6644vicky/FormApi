"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";

// Put this on the scrolling element itself. It hides the native bar outright,
// so the browser reserves no gutter and the content keeps its full width.
export const HIDE_NATIVE_SCROLLBAR_SX = {
  scrollbarWidth: "none" as const,
  msOverflowStyle: "none" as const,
  "&::-webkit-scrollbar": { display: "none" },
};

/**
 * A scrollbar that floats over a scroll container instead of living inside it.
 *
 * Render it as a *sibling* of the scrolling element, inside a `position:
 * relative` parent — it positions itself against that parent, so it never
 * takes part in the scroller's layout and can't inset its content.
 *
 * Chakra has no scrollbar component, so this is built from Box primitives.
 */
export function FloatingScrollbar({
  scrollRef,
  width = "6px",
  inset = "4px",
  hideAfterMs = 900,
}: {
  scrollRef: React.RefObject<HTMLElement | null>;
  width?: string;
  inset?: string;
  hideAfterMs?: number;
}) {
  const [thumb, setThumb] = useState({ height: 0, top: 0, scrollable: false });
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef({ pointerY: 0, scrollTop: 0 });

  const measure = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const { clientHeight, scrollHeight, scrollTop } = element;
    if (scrollHeight <= clientHeight) {
      setThumb({ height: 0, top: 0, scrollable: false });
      return;
    }
    // A minimum height keeps the thumb grabbable on very long lists.
    const height = Math.max(28, (clientHeight / scrollHeight) * clientHeight);
    const top = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height);
    setThumb({ height, top, scrollable: true });
  }, [scrollRef]);

  const flash = useCallback(() => {
    setIsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setIsVisible(false), hideAfterMs);
  }, [hideAfterMs]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const onScroll = () => {
      measure();
      flash();
    };
    element.addEventListener("scroll", onScroll, { passive: true });

    // Re-measure when the container resizes or its rows change, so the thumb
    // stays proportional as the list is filtered or the panel is resized.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(element, { childList: true, subtree: true });

    measure();
    return () => {
      element.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [scrollRef, measure, flash]);

  // Dragging the thumb scrolls the container by the same proportion.
  useEffect(() => {
    if (!isDragging) return;
    const onPointerMove = (event: PointerEvent) => {
      const element = scrollRef.current;
      if (!element) return;
      const { clientHeight, scrollHeight } = element;
      const trackTravel = clientHeight - thumb.height;
      if (trackTravel <= 0) return;
      const delta = event.clientY - dragStart.current.pointerY;
      const ratio = (scrollHeight - clientHeight) / trackTravel;
      element.scrollTop = dragStart.current.scrollTop + delta * ratio;
    };
    const onPointerUp = () => setIsDragging(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDragging, thumb.height, scrollRef]);

  if (!thumb.scrollable) return null;

  return (
    <Box
      position="absolute"
      top={inset}
      bottom={inset}
      right={inset}
      w={width}
      zIndex={2}
      // Only the thumb is interactive, so the track never swallows clicks
      // meant for the rows underneath.
      pointerEvents="none"
    >
      <Box
        position="absolute"
        right="0"
        w={width}
        h={`${thumb.height}px`}
        top={`${thumb.top}px`}
        borderRadius="full"
        bg={isDragging ? "customGray.500" : "customGray.400"}
        opacity={isVisible || isDragging ? 1 : 0}
        transition="opacity 0.35s ease"
        pointerEvents="auto"
        cursor="default"
        _hover={{ bg: "customGray.500" }}
        onPointerDown={(event) => {
          const element = scrollRef.current;
          if (!element) return;
          event.preventDefault();
          dragStart.current = { pointerY: event.clientY, scrollTop: element.scrollTop };
          setIsDragging(true);
          flash();
        }}
      />
    </Box>
  );
}

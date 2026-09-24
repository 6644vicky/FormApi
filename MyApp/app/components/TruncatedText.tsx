"use client";

import { useEffect, useRef, useState } from "react";
import { Text, Tooltip, type TextProps } from "@chakra-ui/react";

// Single-line text that ellipsises when it runs out of room, and only then
// offers a tooltip with the full string — a tooltip that repeats text already
// fully visible is just noise, so it's attached conditionally.
export function TruncatedText({ children, ...textProps }: { children: string } & TextProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClipped, setIsClipped] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    // scrollWidth exceeds clientWidth exactly when the ellipsis is showing.
    const measure = () => setIsClipped(element.scrollWidth > element.clientWidth);
    measure();
    // Re-measure as the panel resizes, so the tooltip appears and disappears
    // with the truncation rather than being decided once on mount.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);

  const text = (
    <Text ref={textRef} isTruncated {...textProps}>
      {children}
    </Text>
  );

  if (!isClipped) return text;

  return (
    <Tooltip
      label={children}
      placement="top"
      hasArrow
      openDelay={200}
      bg="customGray.800"
      color="white"
      fontSize="12px"
      maxW="280px"
    >
      {text}
    </Tooltip>
  );
}

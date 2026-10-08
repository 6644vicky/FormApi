"use client";

import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";

// One gradient per agent, so a wall of cards isn't a wall of the same face.
const MARK_PALETTES = [
  { pale: "#ECDDFD", soft: "#D6BAFD", mid: "#AA6FFA", deep: "#6A0CEB" }, // violet
  { pale: "#DDEAFD", soft: "#BAD2FD", mid: "#6F9FFA", deep: "#0C54EB" }, // blue
  { pale: "#D8F7F1", soft: "#A9ECE1", mid: "#4FD1C5", deep: "#0E9488" }, // teal
  { pale: "#DFF7E3", soft: "#B4ECC0", mid: "#6FD98A", deep: "#0CA33E" }, // green
  { pale: "#FDF0DD", soft: "#FBDDB4", mid: "#FAB86F", deep: "#EB8B0C" }, // amber
  { pale: "#FDDDE8", soft: "#FBB9CE", mid: "#FA6F9B", deep: "#EB0C4C" }, // rose
];

/**
 * The agent's face: a gradient disc whose two "eyes" follow the pointer.
 *
 * Position is written straight to the node each frame — going through React
 * state (and a CSS transition that restarts on every update) makes it stutter.
 * `animate={false}` leaves the eyes still, which is what a grid of cards wants.
 */
export function AgentMark({
  size = 44,
  variant = 0,
  animate = true,
}: {
  size?: number;
  /** Any number — it picks a palette, so an agent id works directly. */
  variant?: number;
  animate?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const palette = MARK_PALETTES[Math.abs(Math.trunc(variant)) % MARK_PALETTES.length];
  // Unique per instance, so two marks on one page don't share filter ids.
  const uid = useRef(`agent-mark-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const onMove = (event: MouseEvent) => {
      const element = rootRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      // Full travel once the pointer is ~200px away, so the eyes keep
      // responding across the whole page rather than pinning early.
      const travel = Math.min(distance / 200, 1) * 3.5;
      target.x = (dx / distance) * travel;
      target.y = (dy / distance) * travel;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;
      const node = eyesRef.current;
      if (node) node.style.transform = `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [animate]);

  return (
    <Box ref={rootRef} w={`${size}px`} h={`${size}px`} flexShrink={0}>
      <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath={`url(#${uid}-clip)`}>
          <rect width="44" height="44" rx="22" fill="white"/>
          <g filter={`url(#${uid}-inner-1)`}>
            <rect width="44" height="44.44" rx="22" fill={`url(#${uid}-fill-1)`}/>
          </g>
          <g filter={`url(#${uid}-inner-2)`} style={{ mixBlendMode: "overlay" }}>
            <rect width="44" height="44.44" rx="22" fill={`url(#${uid}-fill-2)`}/>
          </g>
          <g ref={eyesRef} filter={`url(#${uid}-bars-shadow)`}>
            <rect x="18" y="17" width="6" height="14" rx="3" fill="white"/>
            <rect x="30" y="17" width="6" height="14" rx="3" fill="white"/>
          </g>
        </g>
        <defs>
          <filter id={`${uid}-inner-1`} x="0" y="0" width="44" height="44.4399" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset/>
            <feGaussianBlur stdDeviation="2.20536"/>
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
            <feBlend mode="normal" in2="shape" result="innerShadow"/>
          </filter>
          <filter id={`${uid}-inner-2`} x="0" y="0" width="44" height="44.4399" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset/>
            <feGaussianBlur stdDeviation="2.20536"/>
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
            <feBlend mode="normal" in2="shape" result="innerShadow"/>
          </filter>
          <filter id={`${uid}-bars-shadow`} x="14" y="17" width="26" height="22" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dy="4"/>
            <feGaussianBlur stdDeviation="2"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="dropShadow"/>
            <feBlend mode="normal" in="SourceGraphic" in2="dropShadow" result="shape"/>
          </filter>
          <linearGradient id={`${uid}-fill-1`} x1="22" y1="0" x2="22" y2="44.44" gradientUnits="userSpaceOnUse">
            <stop stopColor={palette.pale}/>
            <stop offset="1" stopColor={palette.mid}/>
          </linearGradient>
          <linearGradient id={`${uid}-fill-2`} x1="-3.52" y1="-9.46" x2="35.0623" y2="36.8966" gradientUnits="userSpaceOnUse">
            <stop offset="0.206993" stopColor={palette.soft}/>
            <stop offset="0.644231" stopColor={palette.mid}/>
            <stop offset="1" stopColor={palette.deep}/>
          </linearGradient>
          <clipPath id={`${uid}-clip`}>
            <rect width="44" height="44" rx="22" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    </Box>
  );
}

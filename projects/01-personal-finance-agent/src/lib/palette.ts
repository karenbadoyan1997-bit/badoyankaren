"use client";

import { useSyncExternalStore } from "react";

// Валидированная референсная палитра (см. dataviz skill) — light/dark пары.
export const PALETTE = {
  light: {
    surface: "#fcfcfb",
    textPrimary: "#0b0b0b",
    textSecondary: "#52514e",
    muted: "#898781",
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    series1: "#2a78d6", // blue
    series2: "#eb6834", // orange
    good: "#0ca30c",
    warning: "#fab219",
    serious: "#ec835a",
    critical: "#d03b3b",
  },
  dark: {
    surface: "#1a1a19",
    textPrimary: "#ffffff",
    textSecondary: "#c3c2b7",
    muted: "#898781",
    grid: "#2c2c2a",
    axis: "#383835",
    series1: "#3987e5",
    series2: "#d95926",
    good: "#0ca30c",
    warning: "#fab219",
    serious: "#ec835a",
    critical: "#e66767",
  },
} as const;

function subscribe(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerSnapshot() {
  return false;
}

export function usePalette() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return isDark ? PALETTE.dark : PALETTE.light;
}

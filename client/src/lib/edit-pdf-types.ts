export type ToolType = "select" | "text" | "draw" | "image" | "sign" | "rect" | "circle" | "line" | "highlight" | "eraser";
export type DrawColor = "#1a1a1a" | "#e53e3e" | "#3182ce" | "#38a169" | "#facc15";
export type TextAlignOption = "left" | "center" | "right" | "justify";

export interface PageDims { width: number; height: number }

export interface TextSegmentMetric {
  top: number;
  bottom: number;
  left: number;
  right: number;
  centerY: number;
  height: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

export interface TextLineMetric {
  top: number;
  bottom: number;
  left: number;
  right: number;
  centerY: number;
  height: number;
  text: string;
  segments: TextSegmentMetric[];
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

export interface TextInsertionStyle {
  left: number;
  top: number;
  maxWidth: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

export interface FindMatch {
  lineIdx: number;
  segStart: number;
  segEnd: number;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ActiveTextEditor {
  pageNumber: number;
  left: number;
  top: number;
  baselineY: number | null;
  width: number;
  maxWidth: number;
  minHeight: number;
  lineHeight: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  underline: boolean;
  textAlign: TextAlignOption;
  color: string;
  backgroundColor: string;
  text: string;
  sourceObject?: any | null;
}

export const DISPLAY_SCALE = 1.5;
export const THUMB_SCALE = 0.15;

export const EDITOR_COLORS: DrawColor[] = ["#1a1a1a", "#e53e3e", "#3182ce", "#38a169", "#facc15"];

export const EDITOR_FONT_FAMILIES = ["Arial", "Calibri", "Cambria", "Times New Roman", "Georgia", "Garamond", "Courier New"] as const;

export const DISALLOWED_FONT_FAMILIES = new Set([
  "Clock2017L_v0.4_170118",
  "Clock2017R_v0.4_170118",
  "clock2016_v1.1",
  "AndroidClock",
  "Noto Color Emoji",
  "Noto Naskh Arabic",
  "Noto Naskh Arabic UI",
  "Noto Sans Symbols",
  "Noto Sans Symbols2",
  "Noto Sans Mono",
  "SamsungKhmerUI",
  "SamsungMyanmarUI",
  "SamsungMyanmarZawgyiUI",
  "SamsungThaiUI",
  "SECFallback",
]);

export const PDFX_TEXT_CUSTOM_PROPS = ["pdfxBaseFontSize", "pdfxMaxWidth", "pdfxBaseTop", "pdfxBaseLineHeight", "pdfxBaselineY", "pdfxAutoWidth"] as const;
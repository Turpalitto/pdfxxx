import type { LucideIcon } from "lucide-react";
import {
  Minimize2,
  Sun,
  Droplets,
  Hash,
  RotateCw,
  AlignLeft,
  FileX,
  Layers,
  Shield,
  ImageOff,
  FlipHorizontal,
  ScanLine,
  Wrench,
  Lock,
} from "lucide-react";
import {
  WORKFLOW_PRESETS,
  pickCopy,
  type WorkflowCopy as Copy,
  type WorkflowPreset,
} from "./workflow-presets";
import {
  mergePdfs,
  compressPdf,
  grayscalePdf,
  addWatermark,
  addPageNumbers,
  rotatePdf,
  addHeaderFooter,
  removeBlankPages,
  flattenPdf,
  sanitizePdf,
  removeImages,
  invertColors,
  scannerEffect,
  repairPdf,
  protectPdf,
} from "./pdf-utils";

/**
 * Workflow engine — связывает несколько PDF→PDF операций в один проход.
 * Выход каждого шага становится входом следующего; промежуточные файлы
 * никуда не выгружаются (100% в браузере). См. ADR-011.
 */

export { WORKFLOW_PRESETS, pickCopy };
export type { WorkflowPreset };

export type OptionValue = string | number;
export type StepOptions = Record<string, OptionValue>;

export type StepOptionChoice = { value: string; label: Copy };

export type StepOption =
  | { key: string; kind: "select"; label: Copy; default: string; choices: StepOptionChoice[] }
  | { key: string; kind: "text"; label: Copy; default: string; placeholder?: Copy }
  | { key: string; kind: "password"; label: Copy; default: string; placeholder?: Copy }
  | { key: string; kind: "range"; label: Copy; default: number; min: number; max: number; step: number };

export type WorkflowStepDef = {
  id: string;
  label: Copy;
  summary: Copy;
  icon: LucideIcon;
  /** Tailwind text color class from the existing palette — НЕ вводить новые цвета. */
  accent: string;
  options: StepOption[];
  run: (file: File, opts: StepOptions) => Promise<Uint8Array>;
};

function str(opts: StepOptions, key: string, fallback: string): string {
  const v = opts[key];
  return typeof v === "string" ? v : fallback;
}

function num(opts: StepOptions, key: string, fallback: number): number {
  const v = opts[key];
  if (typeof v === "number") return v;
  const parsed = typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const WORKFLOW_STEPS: WorkflowStepDef[] = [
  {
    id: "compress",
    label: { en: "Compress", ru: "Сжать" },
    summary: { en: "Reduce file size", ru: "Уменьшить размер файла" },
    icon: Minimize2,
    accent: "text-emerald-500",
    options: [
      {
        key: "level",
        kind: "select",
        label: { en: "Level", ru: "Уровень" },
        default: "medium",
        choices: [
          { value: "low", label: { en: "Light (best quality)", ru: "Лёгкое (макс. качество)" } },
          { value: "medium", label: { en: "Recommended", ru: "Рекомендуемое" } },
          { value: "high", label: { en: "Extreme (rasterize)", ru: "Максимум (растеризация)" } },
        ],
      },
    ],
    run: (file, opts) =>
      compressPdf(file, str(opts, "level", "medium") as "low" | "medium" | "high"),
  },
  {
    id: "watermark",
    label: { en: "Watermark", ru: "Водяной знак" },
    summary: { en: "Stamp text over pages", ru: "Текст поверх страниц" },
    icon: Droplets,
    accent: "text-sky-500",
    options: [
      {
        key: "text",
        kind: "text",
        label: { en: "Text", ru: "Текст" },
        default: "CONFIDENTIAL",
        placeholder: { en: "Watermark text", ru: "Текст водяного знака" },
      },
      {
        key: "position",
        kind: "select",
        label: { en: "Position", ru: "Позиция" },
        default: "center",
        choices: [
          { value: "center", label: { en: "Center", ru: "По центру" } },
          { value: "tile", label: { en: "Tiled", ru: "Плиткой" } },
          { value: "top-left", label: { en: "Top left", ru: "Сверху слева" } },
          { value: "top-right", label: { en: "Top right", ru: "Сверху справа" } },
          { value: "bottom-left", label: { en: "Bottom left", ru: "Снизу слева" } },
          { value: "bottom-right", label: { en: "Bottom right", ru: "Снизу справа" } },
        ],
      },
    ],
    run: (file, opts) =>
      addWatermark(
        file,
        str(opts, "text", "CONFIDENTIAL"),
        0.3,
        45,
        str(opts, "position", "center") as
          | "center"
          | "top-left"
          | "top-right"
          | "bottom-left"
          | "bottom-right"
          | "tile",
      ),
  },
  {
    id: "page-numbers",
    label: { en: "Page numbers", ru: "Нумерация" },
    summary: { en: "Add page numbers", ru: "Добавить номера страниц" },
    icon: Hash,
    accent: "text-indigo-500",
    options: [
      {
        key: "position",
        kind: "select",
        label: { en: "Position", ru: "Позиция" },
        default: "bottom-center",
        choices: [
          { value: "bottom-center", label: { en: "Bottom center", ru: "Снизу по центру" } },
          { value: "bottom-right", label: { en: "Bottom right", ru: "Снизу справа" } },
          { value: "bottom-left", label: { en: "Bottom left", ru: "Снизу слева" } },
          { value: "top-center", label: { en: "Top center", ru: "Сверху по центру" } },
        ],
      },
      {
        key: "format",
        kind: "select",
        label: { en: "Format", ru: "Формат" },
        default: "number",
        choices: [
          { value: "number", label: { en: "1, 2, 3", ru: "1, 2, 3" } },
          { value: "x-of-y", label: { en: "1 / N", ru: "1 / N" } },
        ],
      },
    ],
    run: (file, opts) =>
      addPageNumbers(
        file,
        str(opts, "position", "bottom-center") as
          | "bottom-center"
          | "bottom-right"
          | "bottom-left"
          | "top-center",
        1,
        str(opts, "format", "number") as "number" | "x-of-y",
      ),
  },
  {
    id: "rotate",
    label: { en: "Rotate", ru: "Повернуть" },
    summary: { en: "Rotate every page", ru: "Повернуть все страницы" },
    icon: RotateCw,
    accent: "text-orange-500",
    options: [
      {
        key: "angle",
        kind: "select",
        label: { en: "Angle", ru: "Угол" },
        default: "90",
        choices: [
          { value: "90", label: { en: "90° right", ru: "90° вправо" } },
          { value: "180", label: { en: "180°", ru: "180°" } },
          { value: "270", label: { en: "90° left", ru: "90° влево" } },
        ],
      },
    ],
    run: (file, opts) => rotatePdf(file, num(opts, "angle", 90) as 90 | 180 | 270),
  },
  {
    id: "header-footer",
    label: { en: "Header / footer", ru: "Колонтитулы" },
    summary: { en: "Add header and footer text", ru: "Добавить верхний и нижний текст" },
    icon: AlignLeft,
    accent: "text-teal-500",
    options: [
      {
        key: "header",
        kind: "text",
        label: { en: "Header", ru: "Верхний" },
        default: "",
        placeholder: { en: "Header text (optional)", ru: "Текст сверху (необязательно)" },
      },
      {
        key: "footer",
        kind: "text",
        label: { en: "Footer", ru: "Нижний" },
        default: "",
        placeholder: { en: "Footer text (optional)", ru: "Текст снизу (необязательно)" },
      },
    ],
    run: (file, opts) => addHeaderFooter(file, str(opts, "header", ""), str(opts, "footer", "")),
  },
  {
    id: "grayscale",
    label: { en: "Grayscale", ru: "Оттенки серого" },
    summary: { en: "Convert to black & white", ru: "Перевести в ч/б" },
    icon: Sun,
    accent: "text-slate-500",
    options: [],
    run: (file) => grayscalePdf(file),
  },
  {
    id: "scanner",
    label: { en: "Scanner effect", ru: "Эффект сканера" },
    summary: { en: "Make it look scanned", ru: "Имитация скана" },
    icon: ScanLine,
    accent: "text-amber-500",
    options: [
      {
        key: "intensity",
        kind: "range",
        label: { en: "Intensity", ru: "Интенсивность" },
        default: 0.5,
        min: 0.1,
        max: 1,
        step: 0.1,
      },
    ],
    run: (file, opts) => scannerEffect(file, num(opts, "intensity", 0.5)),
  },
  {
    id: "invert",
    label: { en: "Invert colors", ru: "Инверсия цветов" },
    summary: { en: "Invert page colors", ru: "Инвертировать цвета" },
    icon: FlipHorizontal,
    accent: "text-violet-500",
    options: [],
    run: (file) => invertColors(file),
  },
  {
    id: "remove-blank",
    label: { en: "Remove blank pages", ru: "Удалить пустые" },
    summary: { en: "Drop empty pages", ru: "Убрать пустые страницы" },
    icon: FileX,
    accent: "text-rose-500",
    options: [],
    run: (file) => removeBlankPages(file),
  },
  {
    id: "remove-images",
    label: { en: "Remove images", ru: "Удалить картинки" },
    summary: { en: "Strip embedded images", ru: "Убрать встроенные изображения" },
    icon: ImageOff,
    accent: "text-rose-500",
    options: [],
    run: (file) => removeImages(file),
  },
  {
    id: "flatten",
    label: { en: "Flatten forms", ru: "Закрепить формы" },
    summary: { en: "Lock form fields", ru: "Зафиксировать поля форм" },
    icon: Layers,
    accent: "text-indigo-500",
    options: [],
    run: (file) => flattenPdf(file),
  },
  {
    id: "sanitize",
    label: { en: "Sanitize", ru: "Очистить метаданные" },
    summary: { en: "Strip metadata & scripts", ru: "Удалить метаданные и скрипты" },
    icon: Shield,
    accent: "text-emerald-500",
    options: [],
    run: (file) => sanitizePdf(file),
  },
  {
    id: "repair",
    label: { en: "Repair", ru: "Починить" },
    summary: { en: "Rebuild a damaged PDF", ru: "Восстановить повреждённый PDF" },
    icon: Wrench,
    accent: "text-amber-500",
    options: [],
    run: (file) => repairPdf(file),
  },
  {
    id: "protect",
    label: { en: "Protect", ru: "Защитить паролем" },
    summary: { en: "Encrypt with a password", ru: "Зашифровать паролем" },
    icon: Lock,
    accent: "text-orange-500",
    options: [
      {
        key: "password",
        kind: "password",
        label: { en: "Password", ru: "Пароль" },
        default: "",
        placeholder: { en: "At least 4 characters", ru: "Минимум 4 символа" },
      },
    ],
    run: (file, opts) => protectPdf(file, str(opts, "password", "")),
  },
];

const STEP_MAP = new Map(WORKFLOW_STEPS.map((step) => [step.id, step]));

export function getWorkflowStep(id: string): WorkflowStepDef | undefined {
  return STEP_MAP.get(id);
}

export function defaultStepOptions(def: WorkflowStepDef): StepOptions {
  const out: StepOptions = {};
  for (const opt of def.options) out[opt.key] = opt.default;
  return out;
}

/** Один элемент пайплайна: ссылка на шаг + его настройки + стабильный uid для React. */
export type WorkflowItem = {
  uid: string;
  stepId: string;
  options: StepOptions;
};

export type StepStatus = "pending" | "running" | "done" | "error";

export type StepProgress = {
  index: number;
  stepId: string;
  status: StepStatus;
  outputBytes?: number;
  error?: string;
};

function bytesToFile(bytes: Uint8Array, name: string): File {
  return new File([bytes as BlobPart], name, { type: "application/pdf" });
}

export type WorkflowRunResult = {
  bytes: Uint8Array;
  inputBytes: number;
  outputBytes: number;
};

export class WorkflowAbortError extends Error {
  constructor() {
    super("Workflow cancelled.");
    this.name = "WorkflowAbortError";
  }
}

export interface RunWorkflowOptions {
  signal?: AbortSignal;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new WorkflowAbortError();
  }
}

/**
 * Прогоняет файлы через пайплайн. При нескольких файлах они неявно
 * объединяются (merge) первым шагом. Бросает при первой ошибке шага,
 * сообщая статус через onProgress.
 */
export async function runWorkflow(
  files: File[],
  items: WorkflowItem[],
  onProgress?: (info: StepProgress) => void,
  options: RunWorkflowOptions = {},
): Promise<WorkflowRunResult> {
  throwIfAborted(options.signal);

  if (files.length === 0) {
    throw new Error("No files to process.");
  }
  if (items.length === 0) {
    throw new Error("Add at least one step to the workflow.");
  }

  let bytes: Uint8Array =
    files.length > 1
      ? await mergePdfs(files)
      : new Uint8Array(await files[0].arrayBuffer());
  const inputBytes = bytes.byteLength;

  for (let i = 0; i < items.length; i++) {
    throwIfAborted(options.signal);

    const item = items[i];
    const def = getWorkflowStep(item.stepId);
    if (!def) continue;

    onProgress?.({ index: i, stepId: item.stepId, status: "running" });
    try {
      const file = bytesToFile(bytes, `workflow-step-${i + 1}.pdf`);
      bytes = await def.run(file, { ...defaultStepOptions(def), ...item.options });
      throwIfAborted(options.signal);
      onProgress?.({
        index: i,
        stepId: item.stepId,
        status: "done",
        outputBytes: bytes.byteLength,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onProgress?.({ index: i, stepId: item.stepId, status: "error", error: message });
      throw new Error(message);
    }
  }

  return { bytes, inputBytes, outputBytes: bytes.byteLength };
}

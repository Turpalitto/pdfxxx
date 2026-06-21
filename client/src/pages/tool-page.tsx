import { useState, useCallback, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Lock,
  ArrowRight,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/file-upload";
import { ProgressRing } from "@/components/progress-ring";
import { KeyboardHelpDialog } from "@/components/keyboard-help";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useRecentFiles } from "@/hooks/use-recent-files";
import { ToolCard } from "@/components/tool-card";
import {
  getToolBySlug,
  tools,
  categoryColors,
  getToolMaturity,
  getToolMaturityLabel,
  isToolLaunchReady,
} from "@/lib/tools";
import { getToolTranslation } from "@/lib/tool-translations";
import { DEFAULT_MAX_FILE_SIZE_MB } from "@/lib/upload-limits";
import {
  mergePdfs,
  splitPdf,
  splitPdfEveryN,
  splitPdfAllPages,
  splitResultsToZip,
  rotatePdf,
  deletePages,
  extractPages,
  reorderPages,
  compressPdf,
  addWatermark,
  addPageNumbers,
  batesNumbering,
  imagesToPdf,
  textToPdf,
  addHeaderFooter,
  repairPdf,
  flattenPdf,
  protectPdf,
  unlockPdf,
  signPdf,
  redactPdf,
  wordToPdf,
  pdfToWord,
  pdfToExcel,
  excelToPdf,
  pdfToText,
  pdfToImages,
  pdfToHtml,
  ocrPdf,
  pdfImagesAsZip,
  downloadBlob,
  downloadText,
  downloadHtml,
  formatBytes,
  getPdfPageCount,
  parsePageSelection,
  invertColors,
  toSinglePage,
  removeImages,
  getPdfFormFields,
  fillPdfForm,
  type PdfFormField,
  splitByChapters,
  bookletImposition,
  scannerEffect,
  cropPdf,
  getPdfMetadata,
  setPdfMetadata,
  comparePdf,
  removeBlankPages,
  resizePages,
  grayscalePdf,
  pdfBookmarks,
  autoRedactPdf,
  nUpPdf,
  splitBySize,
  overlayPdf,
  sanitizePdf,
  extractFormFields,
  convertToPdfA,
  addBlankPages,
  pdfToMarkdown,
  addBackground,
  pdfDiff,
  pdfToAudio as pdfToAudioFn,
  pdfToPptx,
} from "@/lib/pdf-utils";
import { WorkerAbortError } from "@/workers/worker-client";
import { cn } from "@/lib/utils";
import { getWorkflowSuggestionsForTool, rememberRecentTool } from "@/lib/tool-experience";
import { preloadToolRoute } from "@/lib/route-preload";
import { getToolRegistryEntry } from "@/tools/registry";
import {
  createToolResultReport,
  validateToolOutput,
  type ToolResultReport,
} from "@/tools/shared/output";
import { createToolDownloadPlan } from "@/tools/shared/download";
import {
  createToolNamedPartsResult,
  createToolTextResult,
  runToolAudioSideEffectTask,
  runToolMainThreadTask,
  runToolWorkerTask,
  shouldSimulateToolProgress,
} from "@/tools/shared/process";

type ProcessingState = "idle" | "processing" | "done" | "error";

export default function ToolPage() {
  const [, params] = useRoute("/tools/:slug");
  const slug = params?.slug || "";
  const tool = getToolBySlug(slug);
  const isLaunchReady = tool ? isToolLaunchReady(tool) : false;
  const { t, lang } = useLang();
  const toolTr = tool ? getToolTranslation(tool.slug, lang) : null;
  const _toolName = toolTr?.name ?? tool?.name ?? "";
  const _toolDesc = toolTr?.description ?? tool?.description ?? "";
  const maxSizeMb = tool?.maxFilesMb ?? DEFAULT_MAX_FILE_SIZE_MB;
  const maturity = tool ? getToolMaturity(tool) : "experimental";
  const registryEntry = tool ? getToolRegistryEntry(tool.slug) : undefined;

  useSeo({
    title: tool
      ? isLaunchReady
        ? `${_toolName} — PDFX | ${lang === "ru" ? "Бесплатно онлайн" : "Free Online"}`
        : `${_toolName} — PDFX | Roadmap`
      : "PDFX — PDF Tools",
    description: tool
      ? isLaunchReady
        ? _toolDesc || "Free online PDF tools — merge, compress, convert, split."
        : lang === "ru"
          ? `${_toolName} пока остаётся в roadmap и ещё не запущен в публичный каталог PDFX.`
          : `${_toolName} is currently on the PDFX roadmap and is not yet in the public launch catalog.`
      : "Free online PDF tools — merge, compress, convert, split.",
    path: slug ? `/tools/${slug}` : "/",
    schemaOrg: tool ? {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": `PDFX — ${_toolName}`,
      "url": `https://pdfx.tools/tools/${slug}`,
      "description": _toolDesc,
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "Web Browser",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "inLanguage": ["en","ru","es","fr","de","zh","ja","ko","ar","hi","pt","it","tr","pl","nl","uk","vi","id","th","cs"],
    } : undefined,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [resultReport, setResultReport] = useState<ToolResultReport | null>(null);

  const [splitStart, setSplitStart] = useState("1");
  const [splitEnd, setSplitEnd] = useState("");
  const [splitMode, setSplitMode] = useState<"range" | "every-n" | "all">("range");
  const [splitEveryN, setSplitEveryN] = useState("2");
  const [splitPartsCount, setSplitPartsCount] = useState<number | null>(null);
  const [rotation, setRotation] = useState<"90" | "180" | "270">("90");
  const [pagesToDelete, setPagesToDelete] = useState("");
  const [pagesToExtract, setPagesToExtract] = useState("");
  const [compressionLevel, setCompressionLevel] = useState<"low" | "medium" | "high">("medium");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState([0.3]);
  const [pageNumPosition, setPageNumPosition] = useState<"bottom-center" | "bottom-right" | "bottom-left" | "top-center">("bottom-center");
  const [watermarkPosition, setWatermarkPosition] = useState<"center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tile">("center");
  const [pageNumFormat, setPageNumFormat] = useState<"number" | "x-of-y">("number");
  const [batesPrefix, setBatesPrefix] = useState("");
  const [batesStart, setBatesStart] = useState(1);
  const [batesDigits, setBatesDigits] = useState(6);
  const [batesSuffix, setBatesSuffix] = useState("");
  const [batesPosition, setBatesPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left" | "center">("bottom-right");
  const [batesFontSize, setBatesFontSize] = useState(10);
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [freeTextContent, setFreeTextContent] = useState("");
  const [password, setPassword] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [redactSearchText, setRedactSearchText] = useState("");
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultHtml, setResultHtml] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<"1" | "2" | "3">("2");
  const [ocrLanguages, setOcrLanguages] = useState<string[]>([lang === "ru" ? "rus" : "eng"]);
  // scanner-effect
  const [scannerIntensity, setScannerIntensity] = useState(0.5);
  // form-fill
  const [formFields, setFormFields] = useState<PdfFormField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  // crop-pdf
  const [cropTop, setCropTop] = useState("0");
  const [cropRight, setCropRight] = useState("0");
  const [cropBottom, setCropBottom] = useState("0");
  const [cropLeft, setCropLeft] = useState("0");
  const [cropAutoMode, setCropAutoMode] = useState(false);
  // pdf-metadata
  const [metadataFields, setMetadataFields] = useState<Record<string, string>>({});
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  // compare-pdf
  const [compareFile2, setCompareFile2] = useState<File | null>(null);
  // remove-blank-pages
  const [blankThreshold, setBlankThreshold] = useState(240);
  // resize-pages
  const [resizeTarget, setResizeTarget] = useState<"a4" | "a3" | "letter" | "legal" | "a5">("a4");
  // grayscale-pdf (no extra state needed)
  // pdf-bookmarks (no extra state needed)
  // auto-redact
  const [redactEmails, setRedactEmails] = useState(true);
  const [redactPhones, setRedactPhones] = useState(true);
  const [redactSsn, setRedactSsn] = useState(false);
  const [redactIban, setRedactIban] = useState(false);
  const [redactCustomRegex, setRedactCustomRegex] = useState("");
  // n-up-pdf
  const [nUpValue, setNUpValue] = useState<2 | 4>(2);
  // split-by-size
  const [splitMaxMb, setSplitMaxMb] = useState("5");
  // overlay-pdf
  const [overlayFile2, setOverlayFile2] = useState<File | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState([0.5]);
  // add-background
  const [bgColor, setBgColor] = useState("#ffffcc");
  const [bgOpacity, setBgOpacity] = useState([15]);
  // pdf-diff
  const [diffFile2, setDiffFile2] = useState<File | null>(null);
  // pdf-to-audio
  const [audioLang, setAudioLang] = useState("en-US");
  const [audioRate, setAudioRate] = useState([1]);
  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts(
    {
      help: () => setHelpOpen((v) => !v),
      process: () => { if (state === "idle" && files.length > 0) process(); },
      download: () => { if (state === "done" && resultBytes) handleDownload(); },
    },
    state !== "processing"
  );

  const { addRecentFile } = useRecentFiles();

  useEffect(() => {
    if (files.length > 0 && slug) {
      addRecentFile({ name: files[0].name, size: files[0].size, lastOpened: Date.now(), slug });
    }
  }, [files[0]?.name, files[0]?.size, slug]);

  const ocrLanguageOptions = [
    { value: "eng", label: lang === "ru" ? "Английский" : "English" },
    { value: "rus", label: lang === "ru" ? "Русский" : "Russian" },
    { value: "ukr", label: lang === "ru" ? "Украинский" : "Ukrainian" },
    { value: "spa", label: lang === "ru" ? "Испанский" : "Spanish" },
    { value: "fra", label: lang === "ru" ? "Французский" : "French" },
    { value: "deu", label: lang === "ru" ? "Немецкий" : "German" },
    { value: "ita", label: lang === "ru" ? "Итальянский" : "Italian" },
    { value: "por", label: lang === "ru" ? "Португальский" : "Portuguese" },
    { value: "pol", label: lang === "ru" ? "Польский" : "Polish" },
    { value: "nld", label: lang === "ru" ? "Нидерландский" : "Dutch" },
    { value: "tur", label: lang === "ru" ? "Турецкий" : "Turkish" },
    { value: "ces", label: lang === "ru" ? "Чешский" : "Czech" },
    { value: "ara", label: lang === "ru" ? "Арабский" : "Arabic" },
    { value: "chi_sim", label: lang === "ru" ? "Китайский (упр.)" : "Chinese (Simpl.)" },
    { value: "jpn", label: lang === "ru" ? "Японский" : "Japanese" },
    { value: "kor", label: lang === "ru" ? "Корейский" : "Korean" },
  ];

  const toggleOcrLanguage = (value: string) => {
    setOcrLanguages((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const normalizeToolError = useCallback((err: unknown) => {
    const raw = err instanceof Error ? err.message : String(err || "");

    if (!raw) {
      return t.tool.errorOccurred;
    }

    if (raw.includes("No PDF header found") || raw.includes("Failed to parse PDF document")) {
      return lang === "ru"
        ? files.length > 1
          ? "Один из выбранных файлов не является корректным PDF или поврежден. Проверьте каждый файл и попробуйте снова."
          : "Файл не является корректным PDF или поврежден. Проверьте файл и попробуйте снова."
        : files.length > 1
          ? "One of the selected files is not a valid PDF or is corrupted. Please check each file and try again."
          : "The selected file is not a valid PDF or is corrupted. Please check the file and try again.";
    }

    if (raw.includes("No text was found in this PDF")) {
      return lang === "ru"
        ? "В этом PDF не найден текст. Для сканов попробуйте инструмент OCR PDF."
        : "No text was found in this PDF. Try OCR PDF for scanned documents.";
    }

    if (raw.includes("encrypted") || (raw.includes("password") && slug !== "protect-pdf" && slug !== "unlock-pdf")) {
      return lang === "ru"
        ? "PDF защищен паролем. Сначала снимите защиту или введите корректный пароль."
        : "This PDF is password-protected. Unlock it first or provide the correct password.";
    }

    return raw;
  }, [files.length, lang, slug, t.tool.errorOccurred]);

  const generatePreview = useCallback(async (pdfBytes: Uint8Array) => {
    try {
      const pdfjs = await import("pdfjs-dist");
      
      // Use the same approach as Stirling-PDF for worker path
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
      }
      
      const loadingTask = pdfjs.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const dataUrl = canvas.toDataURL("image/png");
      setPreviewDataUrl(dataUrl);
    } catch {
      setPreviewDataUrl(null);
    }
  }, []);

  const handleFiles = useCallback(
    (newFiles: File[]) => {
      if (tool?.multiple) {
        setFiles((prev) => [...prev, ...newFiles]);
      } else {
        setFiles(newFiles);
      }
      setState("idle");
      setError(null);
      setResultBytes(null);
      // Clear metadata cache so switching files never writes a previous file's
      // metadata into the new one.
      setMetadataLoaded(false);
      setMetadataFields({});
    },
    [tool]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setState("idle");
    setError(null);
    setResultBytes(null);
    setResultText(null);
    setResultHtml(null);
    setMetadataLoaded(false);
    setMetadataFields({});
  }, []);

  const moveFile = useCallback((index: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setState("idle");
    setProgress(0);
    setError(null);
    setResultBytes(null);
    setResultSize(null);
    setResultReport(null);
    setResultText(null);
    setResultHtml(null);
    setSplitPartsCount(null);
    setPagesToDelete("");
    setPagesToExtract("");
    setMetadataLoaded(false);
    setMetadataFields({});
  }, []);

  // AbortController текущей обработки — для кнопки «Отменить».
  // Воркер-операции прерываются мгновенно (terminate); main-thread операции
  // не прерываются кооперативно, но результат отбрасывается по signal.aborted.
  const abortRef = useRef<AbortController | null>(null);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setProgress(0);
  }, []);

  const process = useCallback(async () => {
    if (!tool || (files.length === 0 && slug !== "text-to-pdf")) {
      setError(t.tool.selectFile);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState("processing");
    setProgress(10);
    setError(null);

    try {
      let result: Uint8Array | null = null;
      const simulateProgress = (start: number, end: number) => {
        const steps = 8;
        const step = (end - start) / steps;
        for (let i = 1; i <= steps; i++) {
          setTimeout(() => {
            // не двигаем прогресс после отмены/завершения
            if (!controller.signal.aborted) setProgress(start + Math.round(step * i));
          }, i * 200);
        }
      };
      if (!registryEntry) {
        throw new Error("Missing tool registry metadata for process runner.");
      }

      const applyTextLikeResult = (content: string) => {
        const textResult = createToolTextResult(registryEntry, content);

        if (textResult.target === "html") {
          setResultHtml(textResult.content);
        } else {
          setResultText(textResult.content);
        }

        return textResult.bytes;
      };

      if (shouldSimulateToolProgress(registryEntry)) {
        simulateProgress(10, 85);
      }

      switch (slug) {
        case "merge-pdf":
          result = await runToolMainThreadTask(registryEntry, () => mergePdfs(files));
          break;
        case "split-pdf": {
          const origName = files[0].name.replace(/\.[^.]+$/, "");
          if (splitMode === "all") {
            const parts = await splitPdfAllPages(files[0]);
            setSplitPartsCount(parts.length);
            result = await splitResultsToZip(parts, origName);
          } else if (splitMode === "every-n") {
            const n = Math.max(1, parseInt(splitEveryN) || 1);
            const parts = await splitPdfEveryN(files[0], n);
            setSplitPartsCount(parts.length);
            result = await splitResultsToZip(parts, origName);
          } else {
            const totalPages = await getPdfPageCount(files[0]);
            const start = parseInt(splitStart) || 1;
            const end = parseInt(splitEnd) || totalPages;
            const results = await splitPdf(files[0], [{ start, end }]);
            setSplitPartsCount(1);
            result = results[0];
          }
          break;
        }
        case "rotate-pdf":
          result = await runToolMainThreadTask(
            registryEntry,
            () => rotatePdf(files[0], parseInt(rotation) as 90 | 180 | 270)
          );
          break;
        case "delete-pages": {
          const pageCount = await getPdfPageCount(files[0]);
          const indices = parsePageSelection(pagesToDelete, pageCount, { allowDuplicates: false });
          result = await runToolMainThreadTask(registryEntry, () => deletePages(files[0], indices));
          break;
        }
        case "extract-pages":
        case "reorder-pages": {
          const pageCount = await getPdfPageCount(files[0]);
          const indices = parsePageSelection(pagesToExtract, pageCount, {
            allowDuplicates: slug === "reorder-pages",
          });
          result = await runToolMainThreadTask(registryEntry, () => (
            slug === "reorder-pages"
              ? reorderPages(files[0], indices)
              : extractPages(files[0], indices)
          ));
          break;
        }
        case "compress-pdf":
          result = await runToolMainThreadTask(registryEntry, () => compressPdf(files[0], compressionLevel));
          break;
        case "watermark-pdf":
          result = await runToolMainThreadTask(
            registryEntry,
            () => addWatermark(files[0], watermarkText, watermarkOpacity[0], 45, watermarkPosition)
          );
          break;
        case "pdf-page-numbers":
          result = await runToolMainThreadTask(
            registryEntry,
            () => addPageNumbers(files[0], pageNumPosition, 1, pageNumFormat)
          );
          break;
        case "bates-numbering":
          result = await runToolMainThreadTask(
            registryEntry,
            () => batesNumbering(files[0], {
              prefix: batesPrefix,
              startNumber: batesStart,
              digits: batesDigits,
              suffix: batesSuffix,
              position: batesPosition,
              fontSize: batesFontSize,
            })
          );
          break;
        case "images-to-pdf":
        case "photo-to-pdf":
          result = await runToolMainThreadTask(registryEntry, () => imagesToPdf(files));
          break;
        case "text-to-pdf": {
          const text = files.length > 0
            ? await files[0].text()
            : freeTextContent;
          result = await runToolMainThreadTask(registryEntry, () => textToPdf(text));
          break;
        }
        case "pdf-header-footer":
          result = await runToolMainThreadTask(
            registryEntry,
            () => addHeaderFooter(files[0], headerText, footerText)
          );
          break;
        case "repair-pdf":
          result = await runToolMainThreadTask(registryEntry, () => repairPdf(files[0]));
          break;
        case "flatten-pdf":
          result = await runToolMainThreadTask(registryEntry, () => flattenPdf(files[0]));
          break;
        case "protect-pdf":
          result = await runToolMainThreadTask(registryEntry, () => protectPdf(files[0], password));
          break;
        case "unlock-pdf":
          result = await runToolMainThreadTask(registryEntry, () => unlockPdf(files[0], password));
          break;
        case "sign-pdf":
          result = await runToolMainThreadTask(registryEntry, () => signPdf(files[0], signatureText));
          break;
        case "redact-pdf":
          result = await runToolWorkerTask(
            registryEntry,
            () => redactPdf(files[0], redactSearchText, setProgress),
            { file: files[0], args: [redactSearchText], onProgress: setProgress, signal: controller.signal }
          );
          break;
        case "word-to-pdf":
          result = await runToolMainThreadTask(registryEntry, () => wordToPdf(files[0]));
          break;
        case "excel-to-pdf":
          result = await runToolMainThreadTask(registryEntry, () => excelToPdf(files[0]));
          break;
        case "pdf-to-word":
          result = await runToolMainThreadTask(registryEntry, () => pdfToWord(files[0]));
          break;
        case "pdf-to-excel":
          result = await runToolMainThreadTask(registryEntry, () => pdfToExcel(files[0]));
          break;
        case "pdf-to-text": {
          const text = await runToolMainThreadTask(registryEntry, () => pdfToText(files[0]));
          result = applyTextLikeResult(text);
          break;
        }
        case "pdf-to-html": {
          const html = await runToolMainThreadTask(registryEntry, () => pdfToHtml(files[0]));
          result = applyTextLikeResult(html);
          break;
        }
        case "pdf-to-jpg":
        case "pdf-to-png": {
          const fmt = slug === "pdf-to-jpg" ? "jpg" : "png";
          const scale = parseInt(imageScale) || 2;
          const images = await runToolWorkerTask<{ dataUrl: string; page: number }[]>(
            registryEntry,
            () => pdfToImages(files[0], fmt, scale),
            { file: files[0], args: [fmt, scale], signal: controller.signal }
          );
          const origName = files[0].name.replace(/\.[^.]+$/, "");
          result = await pdfImagesAsZip(images, fmt, origName);
          break;
        }
        case "ocr-pdf":
          // OCR остаётся на main thread: tesseract создаёт вложенные воркеры,
          // которые не запускаются внутри нашего module-воркера (проверено e2e —
          // worker-путь всегда уходил в fallback). Прямой вызов без доомного
          // worker-спавна.
          result = await ocrPdf(files[0], ocrLanguages.join("+") || "eng", setProgress);
          break;
        case "invert-colors":
          result = await runToolWorkerTask(
            registryEntry,
            () => invertColors(files[0], setProgress),
            { file: files[0], onProgress: setProgress, signal: controller.signal }
          );
          break;
        case "to-single-page":
          result = await runToolWorkerTask(
            registryEntry,
            () => toSinglePage(files[0], setProgress),
            { file: files[0], onProgress: setProgress, signal: controller.signal }
          );
          break;
        case "remove-images":
          result = await runToolMainThreadTask(registryEntry, () => removeImages(files[0]));
          break;
        case "form-fill":
          result = await runToolMainThreadTask(registryEntry, () => fillPdfForm(files[0], formValues));
          break;
        case "split-by-chapters": {
          const parts = await runToolMainThreadTask(registryEntry, () => splitByChapters(files[0], setProgress));
          result = await createToolNamedPartsResult(registryEntry, parts);
          break;
        }
        case "booklet-imposition":
          result = await runToolWorkerTask(
            registryEntry,
            () => bookletImposition(files[0], setProgress),
            { file: files[0], onProgress: setProgress, signal: controller.signal }
          );
          break;
        case "scanner-effect":
          result = await runToolWorkerTask(
            registryEntry,
            () => scannerEffect(files[0], scannerIntensity, setProgress),
            { file: files[0], args: [scannerIntensity], onProgress: setProgress, signal: controller.signal }
          );
          break;
        case "crop-pdf":
          result = await runToolMainThreadTask(
            registryEntry,
            () => cropPdf(files[0], {
              topMm: parseFloat(cropTop) || 0,
              rightMm: parseFloat(cropRight) || 0,
              bottomMm: parseFloat(cropBottom) || 0,
              leftMm: parseFloat(cropLeft) || 0,
              autoCrop: cropAutoMode,
            })
          );
          break;
        case "pdf-metadata": {
          if (!metadataLoaded) {
            const meta = await getPdfMetadata(files[0]);
            setMetadataFields(meta);
            setMetadataLoaded(true);
            setState("idle");
            setProgress(0);
            return;
          }
          result = await setPdfMetadata(files[0], metadataFields);
          break;
        }
        case "compare-pdf": {
          if (!compareFile2) {
            setError(lang === "ru" ? "Выберите второй PDF для сравнения." : "Select a second PDF to compare.");
            setState("error");
            return;
          }
          const file2 = compareFile2;
          result = await runToolWorkerTask(
            registryEntry,
            () => comparePdf(files[0], file2, setProgress),
            { file: files[0], args: [file2], onProgress: setProgress, signal: controller.signal }
          );
          break;
        }
        case "remove-blank-pages":
          result = await runToolWorkerTask(
            registryEntry,
            () => removeBlankPages(files[0], blankThreshold, setProgress),
            { file: files[0], args: [blankThreshold], onProgress: setProgress, signal: controller.signal }
          );
          break;
        case "resize-pages":
          result = await runToolMainThreadTask(
            registryEntry,
            () => resizePages(files[0], resizeTarget, setProgress)
          );
          break;
        case "grayscale-pdf":
          result = await runToolWorkerTask(
            registryEntry,
            () => grayscalePdf(files[0], setProgress),
            { file: files[0], onProgress: setProgress, signal: controller.signal }
          );
          break;
        case "pdf-bookmarks": {
          const text = await runToolMainThreadTask(registryEntry, () => pdfBookmarks(files[0]));
          result = applyTextLikeResult(text);
          break;
        }
        case "sanitize-pdf":
          result = await runToolMainThreadTask(registryEntry, () => sanitizePdf(files[0]));
          break;
        case "extract-forms": {
          const json = await runToolMainThreadTask(registryEntry, () => extractFormFields(files[0]));
          result = applyTextLikeResult(json);
          break;
        }
        case "pdf-to-pdfa":
          result = await runToolMainThreadTask(registryEntry, () => convertToPdfA(files[0]));
          break;
        case "add-blank-pages": {
          const positions = pagesToExtract.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 0);
          result = await runToolMainThreadTask(registryEntry, () => addBlankPages(files[0], positions));
          break;
        }
        case "auto-redact": {
          const redactOptions = {
            emails: redactEmails,
            phones: redactPhones,
            ssn: redactSsn,
            iban: redactIban,
            customRegex: redactCustomRegex || undefined,
          };
          result = await runToolWorkerTask(
            registryEntry,
            () => autoRedactPdf(files[0], redactOptions, setProgress),
            { file: files[0], args: [redactOptions], onProgress: setProgress, signal: controller.signal }
          );
          break;
        }
        case "n-up-pdf":
          result = await runToolWorkerTask(
            registryEntry,
            () => nUpPdf(files[0], nUpValue, setProgress),
            { file: files[0], args: [nUpValue], onProgress: setProgress, signal: controller.signal }
          );
          break;
        case "split-by-size": {
          const maxMb = parseFloat(splitMaxMb) || 5;
          result = await runToolMainThreadTask(
            registryEntry,
            () => splitBySize(files[0], maxMb, setProgress)
          );
          break;
        }
        case "overlay-pdf": {
          if (!overlayFile2) {
            setError(lang === "ru" ? "Выберите PDF для наложения." : "Select a PDF to overlay.");
            setState("error");
            return;
          }
          result = await runToolMainThreadTask(
            registryEntry,
            () => overlayPdf(files[0], overlayFile2, overlayOpacity[0], setProgress)
          );
          break;
        }
        case "extract-images": {
          const images = await runToolWorkerTask<{ dataUrl: string; page: number }[]>(
            registryEntry,
            () => pdfToImages(files[0], "png", 2),
            { file: files[0], args: ["png", 2], signal: controller.signal }
          );
          const origName = files[0].name.replace(/\.[^.]+$/, "");
          result = await pdfImagesAsZip(images, "png", origName);
          break;
        }
        case "pdf-to-markdown": {
          const md = await runToolMainThreadTask(registryEntry, () => pdfToMarkdown(files[0]));
          result = applyTextLikeResult(md);
          break;
        }
        case "add-background": {
          const hex = bgColor.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          result = await runToolMainThreadTask(
            registryEntry,
            () => addBackground(files[0], { r, g, b }, bgOpacity[0] / 100)
          );
          break;
        }
        case "pdf-diff": {
          if (!diffFile2) {
            setError(lang === "ru" ? "Выберите второй PDF для сравнения." : "Select a second PDF to compare.");
            setState("error");
            return;
          }
          const file2 = diffFile2;
          result = await runToolWorkerTask(
            registryEntry,
            () => pdfDiff(files[0], file2, setProgress),
            { file: files[0], args: [file2], onProgress: setProgress, signal: controller.signal }
          );
          break;
        }
        case "pdf-to-audio": {
          await runToolAudioSideEffectTask(registryEntry, async () => {
            const text = await pdfToText(files[0]);
            pdfToAudioFn(text, audioLang, audioRate[0]);
          });
          setState("idle");
          setProgress(0);
          return;
        }
        case "pdf-to-pptx": {
          result = await runToolWorkerTask(
            registryEntry,
            () => pdfToPptx(files[0], setProgress),
            { file: files[0], onProgress: setProgress, signal: controller.signal }
          );
          break;
        }
        default:
          throw new Error(t.tool.proOnlyError);
      }

      // Операцию отменили, пока она доделывалась — отбрасываем результат.
      if (controller.signal.aborted) return;

      const validation = validateToolOutput(result, registryEntry.output);
      if (!validation.ok) {
        throw new Error(validation.reason ?? "The tool produced an invalid output file.");
      }

      setProgress(100);
      setResultBytes(result);
      setResultSize(result?.length ?? null);
      setResultReport(createToolResultReport(files[0]?.size ?? 0, result.length, registryEntry.output));
      setState("done");
      
      if (result && tool?.outputExt === "pdf") {
        generatePreview(result).catch(() => {});
      }
    } catch (err: any) {
      // Отмена — это не ошибка: UI уже переведён в idle в handleCancel.
      if (err instanceof WorkerAbortError || controller.signal.aborted) return;
      setError(normalizeToolError(err));
      setState("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [
    tool, files, slug, splitStart, splitEnd, splitMode, splitEveryN, rotation,
    pagesToDelete, pagesToExtract, compressionLevel,
    watermarkText, watermarkOpacity, watermarkPosition, pageNumPosition, pageNumFormat,
    batesPrefix, batesStart, batesDigits, batesSuffix, batesPosition, batesFontSize,
    headerText, footerText, freeTextContent,
    password, signatureText, redactSearchText, imageScale, ocrLanguages,
    cropTop, cropRight, cropBottom, cropLeft, cropAutoMode, metadataFields, metadataLoaded,
    compareFile2, blankThreshold, resizeTarget,
    redactEmails, redactPhones, redactSsn, redactIban, redactCustomRegex,
    nUpValue, splitMaxMb, overlayFile2, overlayOpacity, scannerIntensity, formValues,
    bgColor, bgOpacity, diffFile2, audioLang, audioRate,
    t, lang, setProgress, normalizeToolError, registryEntry,
    generatePreview,
  ]);

  const handleDownload = useCallback(() => {
    if (!tool || !registryEntry) return;

    const plan = createToolDownloadPlan({
      slug,
      originalFilename: files[0]?.name,
      output: registryEntry.output,
      resultBytes,
      resultText,
      resultHtml,
      splitMode,
    });

    if (!plan) return;

    if (plan.kind === "text") {
      downloadText(plan.text, plan.filename);
      return;
    }

    if (plan.kind === "html") {
      downloadHtml(plan.html, plan.filename);
      return;
    }

    downloadBlob(plan.bytes, plan.filename, plan.mimeType);
  }, [files, registryEntry, resultBytes, resultText, resultHtml, tool, slug, splitMode]);

  // ВАЖНО: хуки должны вызываться безусловно, ДО любых ранних return,
  // иначе при переходе между launch-ready и не-launch-ready инструментами
  // React падает с "Rendered fewer hooks than expected".
  useEffect(() => {
    if (tool) rememberRecentTool(tool.slug);
  }, [tool?.slug]);

  // form-fill: auto-load fields when file is uploaded
  useEffect(() => {
    if (slug !== "form-fill" || files.length === 0) return;
    setFormLoading(true);
    setFormFields([]);
    setFormValues({});
    getPdfFormFields(files[0]).then((fields) => {
      setFormFields(fields);
      const init: Record<string, string> = {};
      fields.forEach(f => { init[f.name] = f.value ?? ""; });
      setFormValues(init);
      setFormLoading(false);
    }).catch(() => setFormLoading(false));
  }, [slug, files]);

  if (!tool) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h1 className="text-2xl font-bold">{t.tool.notFound}</h1>
        <Button asChild variant="outline">
          <Link href="/">{t.tool.backHome}</Link>
        </Button>
      </div>
    );
  }

  if (!isLaunchReady) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="pdfx-panel-strong w-full max-w-2xl rounded-3xl p-8 md:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-500">
            <Lock className="size-3.5" />
            {lang === "ru" ? "Ещё не запущено" : "Not launched yet"}
          </div>
          <h1 className="mb-3 text-3xl font-bold text-foreground">{toolTr?.name ?? tool.name}</h1>
          <p className="mb-6 leading-7 text-muted-foreground">
            {lang === "ru"
              ? "Эта функция остаётся в roadmap и не продаётся как уже доступная. Если вам нужен ранний доступ или вы хотите повлиять на приоритет, используйте страницу контактов."
              : "This feature is still on the roadmap and is not being sold as already available. If you need early access or want to influence its priority, use the contact page."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/contact">{lang === "ru" ? "Запросить ранний доступ" : "Request early access"}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing#roadmap">{lang === "ru" ? "Открыть roadmap" : "Open roadmap"}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">{lang === "ru" ? "Вернуться в каталог" : "Back to catalog"}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const colors = categoryColors[tool.color] || categoryColors.blue;
  const Icon = tool.icon;
  const relatedTools = tools
    .filter((t) => t.category === tool.category && t.slug !== slug && isToolLaunchReady(t))
    .slice(0, 4);
  const workflowSuggestions = getWorkflowSuggestionsForTool(tool.slug, lang);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.tool.backToAll}
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${colors.gradient}, ${colors.gradient.replace("0.18","0.05")})`,
                  border: `1px solid ${colors.gradient.replace("0.18","0.2")}`,
                }}
              >
                {tool.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold">{_toolName}</h1>
                  {tool.pro && (
                    <Badge variant="secondary">
                      <Lock className="w-3 h-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                  <Badge variant="outline">{getToolMaturityLabel(maturity, lang)}</Badge>
                </div>
                <p className="text-muted-foreground">{_toolDesc}</p>
              </div>
            </div>

            <div className="pdfx-panel-strong space-y-5 rounded-xl p-5">
              <FileUpload
                accept={tool.accept}
                multiple={tool.multiple}
                maxSizeMb={maxSizeMb}
                onFiles={handleFiles}
                onValidationError={(message) => {
                  setState("idle");
                  setError(message);
                }}
                files={files}
                onRemoveFile={removeFile}
                onMoveFile={moveFile}
                onReorderFiles={setFiles}
                label={tool.accept?.includes(".pdf") ? t.tool.dropPdf : t.tool.chooseFile}
                description={`${tool.multiple ? t.tool.multipleFiles : t.tool.singleFile} • ${t.tool.maxSize} ${maxSizeMb}MB`}
                slug={slug}
              />

              {slug === "text-to-pdf" && files.length === 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t.tool.orPasteText}</Label>
                  <textarea
                    value={freeTextContent}
                    onChange={(e) => setFreeTextContent(e.target.value)}
                    placeholder={t.tool.pasteTextPlaceholder}
                    className="w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="input-text-content"
                  />
                </div>
              )}

              {slug === "split-pdf" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Режим разбивки" : "Split mode"}
                    </Label>
                    <Select value={splitMode} onValueChange={(value) => setSplitMode(value as "range" | "every-n" | "all")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="range">{lang === "ru" ? "Диапазон страниц" : "Page range"}</SelectItem>
                        <SelectItem value="every-n">{lang === "ru" ? "Каждые N страниц" : "Every N pages"}</SelectItem>
                        <SelectItem value="all">{lang === "ru" ? "Каждую страницу отдельно (ZIP)" : "Individual pages (ZIP)"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {splitMode === "range" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">{t.tool.fromPage}</Label>
                        <Input
                          type="number"
                          min="1"
                          value={splitStart}
                          onChange={(e) => setSplitStart(e.target.value)}
                          data-testid="input-split-start"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">{t.tool.toPage}</Label>
                        <Input
                          type="number"
                          min="1"
                          value={splitEnd}
                          onChange={(e) => setSplitEnd(e.target.value)}
                          placeholder={t.tool.lastPage}
                          data-testid="input-split-end"
                        />
                      </div>
                    </div>
                  )}
                  {splitMode === "every-n" && (
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {lang === "ru" ? "Страниц в каждой части" : "Pages per part"}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={splitEveryN}
                        onChange={(e) => setSplitEveryN(e.target.value)}
                        placeholder="2"
                      />
                    </div>
                  )}
                  {splitMode === "all" && (
                    <p className="text-xs text-muted-foreground">
                      {lang === "ru"
                        ? "Каждая страница будет сохранена как отдельный PDF внутри ZIP-архива."
                        : "Each page will be saved as a separate PDF inside a ZIP archive."}
                    </p>
                  )}
                </div>
              )}

              {slug === "rotate-pdf" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.tool.rotationAngle}</Label>
                  <Select value={rotation} onValueChange={(v) => setRotation(v as any)} data-testid="select-rotation">
                    <SelectTrigger data-testid="select-rotation-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">{t.tool.rot90}</SelectItem>
                      <SelectItem value="180">{t.tool.rot180}</SelectItem>
                      <SelectItem value="270">{t.tool.rot270}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(slug === "delete-pages") && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.tool.pagesDelete}</Label>
                  <Input
                    value={pagesToDelete}
                    onChange={(e) => setPagesToDelete(e.target.value)}
                    placeholder="1, 3, 5-8"
                    data-testid="input-pages-delete"
                  />
                </div>
              )}

              {(slug === "extract-pages" || slug === "reorder-pages") && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {slug === "reorder-pages" ? t.tool.pagesReorder : t.tool.pagesExtract}
                  </Label>
                  <Input
                    value={pagesToExtract}
                    onChange={(e) => setPagesToExtract(e.target.value)}
                    placeholder="1, 2, 5-7"
                    data-testid="input-pages-extract"
                  />
                </div>
              )}

              {slug === "crop-pdf" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={cropAutoMode} onChange={(e) => setCropAutoMode(e.target.checked)} className="rounded" />
                      <span className="font-medium">{lang === "ru" ? "Авто-обрезка по содержимому" : "Auto-crop to content"}</span>
                    </label>
                  </div>
                  {!cropAutoMode && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {lang === "ru" ? "Укажите отступы обрезки в миллиметрах для каждой стороны:" : "Set crop margins in millimeters for each side:"}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium mb-1.5 block">{lang === "ru" ? "Сверху (мм)" : "Top (mm)"}</Label>
                          <Input type="number" min="0" value={cropTop} onChange={(e) => setCropTop(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-sm font-medium mb-1.5 block">{lang === "ru" ? "Справа (мм)" : "Right (mm)"}</Label>
                          <Input type="number" min="0" value={cropRight} onChange={(e) => setCropRight(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-sm font-medium mb-1.5 block">{lang === "ru" ? "Снизу (мм)" : "Bottom (mm)"}</Label>
                          <Input type="number" min="0" value={cropBottom} onChange={(e) => setCropBottom(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-sm font-medium mb-1.5 block">{lang === "ru" ? "Слева (мм)" : "Left (mm)"}</Label>
                          <Input type="number" min="0" value={cropLeft} onChange={(e) => setCropLeft(e.target.value)} />
                        </div>
                      </div>
                    </>
                  )}
                  {cropAutoMode && (
                    <p className="text-xs text-muted-foreground">
                      {lang === "ru" ? "Автоматически обрезает пустые поля вокруг содержимого каждой страницы." : "Automatically trims blank margins around content on each page."}
                    </p>
                  )}
                </div>
              )}

              {slug === "pdf-metadata" && metadataLoaded && (
                <div className="space-y-3">
                  {["title", "author", "subject", "keywords", "creator"].map((field) => (
                    <div key={field}>
                      <Label className="text-sm font-medium mb-1.5 block capitalize">{field}</Label>
                      <Input
                        value={metadataFields[field] || ""}
                        onChange={(e) => setMetadataFields({ ...metadataFields, [field]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}

              {slug === "compare-pdf" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Второй PDF для сравнения" : "Second PDF to compare"}
                    </Label>
                    {compareFile2 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground truncate">{compareFile2.name}</span>
                        <Button variant="outline" size="sm" onClick={() => setCompareFile2(null)}>
                          {lang === "ru" ? "Убрать" : "Remove"}
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{lang === "ru" ? "Выбрать второй PDF" : "Choose second PDF"}</span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          data-testid="input-compare-file2"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setCompareFile2(f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {slug === "remove-blank-pages" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Порог яркости (0–255)" : "Brightness threshold (0–255)"}
                    </Label>
                    <Slider
                      min={200}
                      max={255}
                      step={5}
                      value={[blankThreshold]}
                      onValueChange={([v]) => setBlankThreshold(v)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {lang === "ru" ? "Страницы, где >95% пикселей ярче порога, считаются пустыми." : "Pages where >95% of pixels are brighter than the threshold are considered blank."}
                    </p>
                  </div>
                </div>
              )}

              {slug === "resize-pages" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {lang === "ru" ? "Целевой размер" : "Target size"}
                  </Label>
                  <Select value={resizeTarget} onValueChange={(v) => setResizeTarget(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4 (210 × 297 мм)</SelectItem>
                      <SelectItem value="a3">A3 (297 × 420 мм)</SelectItem>
                      <SelectItem value="a5">A5 (148 × 210 мм)</SelectItem>
                      <SelectItem value="letter">{lang === "ru" ? "Letter (216 × 279 мм)" : "Letter (8.5 × 11 in)"}</SelectItem>
                      <SelectItem value="legal">{lang === "ru" ? "Legal (216 × 356 мм)" : "Legal (8.5 × 14 in)"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {slug === "grayscale-pdf" && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)" }}
                >
                  <span className="mt-0.5 text-slate-400">ℹ</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Все страницы будут конвертированы в оттенки серого. Цветные элементы станут чёрно-белыми."
                      : "All pages will be converted to grayscale. Color elements will become black and white."}
                  </span>
                </div>
              )}

              {slug === "pdf-bookmarks" && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(72,145,104,0.08)", border: "1px solid rgba(72,145,104,0.2)" }}
                >
                  <span className="mt-0.5 text-emerald-400">ℹ</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Нажмите «Обработать», чтобы извлечь закладки и оглавление из PDF."
                      : "Click Process to extract bookmarks and table of contents from the PDF."}
                  </span>
                </div>
              )}

              {slug === "auto-redact" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {lang === "ru" ? "Выберите типы данных для автоматического скрытия:" : "Select data types to auto-redact:"}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={redactEmails} onChange={(e) => setRedactEmails(e.target.checked)} className="rounded" />
                      {lang === "ru" ? "Email" : "Emails"}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={redactPhones} onChange={(e) => setRedactPhones(e.target.checked)} className="rounded" />
                      {lang === "ru" ? "Телефоны" : "Phones"}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={redactSsn} onChange={(e) => setRedactSsn(e.target.checked)} className="rounded" />
                      SSN
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={redactIban} onChange={(e) => setRedactIban(e.target.checked)} className="rounded" />
                      IBAN
                    </label>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Свой regex (необязательно)" : "Custom regex (optional)"}
                    </Label>
                    <Input
                      value={redactCustomRegex}
                      onChange={(e) => setRedactCustomRegex(e.target.value)}
                      placeholder={lang === "ru" ? "например: \\d{4}" : "e.g. \\d{4}"}
                    />
                  </div>
                </div>
              )}

              {slug === "n-up-pdf" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {lang === "ru" ? "Страниц на лист" : "Pages per sheet"}
                  </Label>
                  <Select value={String(nUpValue)} onValueChange={(v) => setNUpValue(Number(v) as 2 | 4)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 {lang === "ru" ? "страницы" : "pages"}</SelectItem>
                      <SelectItem value="4">4 {lang === "ru" ? "страницы" : "pages"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {slug === "split-by-size" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {lang === "ru" ? "Максимальный размер части (МБ)" : "Max part size (MB)"}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={splitMaxMb}
                    onChange={(e) => setSplitMaxMb(e.target.value)}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === "ru" ? "PDF будет разделён на части, каждая не больше указанного размера." : "The PDF will be split into parts, each under the specified size."}
                  </p>
                </div>
              )}

              {slug === "overlay-pdf" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "PDF для наложения" : "PDF to overlay"}
                    </Label>
                    {overlayFile2 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground truncate">{overlayFile2.name}</span>
                        <Button variant="outline" size="sm" onClick={() => setOverlayFile2(null)}>
                          {lang === "ru" ? "Убрать" : "Remove"}
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{lang === "ru" ? "Выбрать PDF для наложения" : "Choose overlay PDF"}</span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setOverlayFile2(f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {lang === "ru" ? "Прозрачность" : "Opacity"}: {Math.round(overlayOpacity[0] * 100)}%
                    </Label>
                    <Slider
                      min={10}
                      max={100}
                      step={5}
                      value={[overlayOpacity[0] * 100]}
                      onValueChange={([v]) => setOverlayOpacity([v / 100])}
                    />
                  </div>
                </div>
              )}

              {slug === "add-blank-pages" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {lang === "ru" ? "Позиции вставки (0 = начало, через запятую)" : "Insert positions (0 = beginning, comma-separated)"}
                  </Label>
                  <Input
                    value={pagesToExtract}
                    onChange={(e) => setPagesToExtract(e.target.value)}
                    placeholder="0, 3, 5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === "ru" ? "Например: 0,3,5 — вставит пустые страницы перед 1-й, после 3-й и после 5-й." : "E.g. 0,3,5 — inserts blank pages before page 1, after page 3, and after page 5."}
                  </p>
                </div>
              )}

              {slug === "extract-images" && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)" }}
                >
                  <span className="mt-0.5 text-pink-400">ℹ</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Все страницы будут отрендерены как PNG и упакованы в ZIP-архив."
                      : "All pages will be rendered as PNG and packed into a ZIP archive."}
                  </span>
                </div>
              )}

              {slug === "sanitize-pdf" && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}
                >
                  <span className="mt-0.5 text-orange-400">🛡️</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Удаляются: заголовок, автор, тема, ключевые слова, продюсер, создатель. JavaScript и встроенные скрипты также удаляются."
                      : "Removes: title, author, subject, keywords, producer, creator. JavaScript and embedded scripts are also stripped."}
                  </span>
                </div>
              )}

              {slug === "pdf-to-pdfa" && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
                >
                  <span className="mt-0.5 text-blue-400">ℹ</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Конвертирует PDF в формат PDF/A-1b для долгосрочного архивирования. Метаданные очищаются, объекты оптимизируются."
                      : "Converts PDF to PDF/A-1b format for long-term archiving. Metadata is cleaned and objects are optimized."}
                  </span>
                </div>
              )}

              {slug === "extract-forms" && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}
                >
                  <span className="mt-0.5 text-cyan-400">ℹ</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Извлекает данные всех полей форм из PDF и экспортирует в JSON."
                      : "Extracts all form field data from the PDF and exports as JSON."}
                  </span>
                </div>
              )}

              {slug === "pdf-to-markdown" && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
                >
                  <span className="mt-0.5 text-green-500">📝</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Извлекает текст из PDF с заголовками, списками и структурой страницы."
                      : "Extracts text from PDF with headings, lists, and page structure."}
                  </span>
                </div>
              )}

              {slug === "add-background" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Цвет фона" : "Background color"}
                    </Label>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-12 h-8 rounded border cursor-pointer"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {lang === "ru" ? "Непрозрачность" : "Opacity"}: {bgOpacity[0]}%
                    </Label>
                    <Slider
                      min={5}
                      max={100}
                      step={5}
                      value={bgOpacity}
                      onValueChange={(v) => setBgOpacity(v)}
                    />
                  </div>
                </div>
              )}

              {slug === "pdf-diff" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Второй PDF для сравнения" : "Second PDF to compare"}
                    </Label>
                    {diffFile2 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground truncate">{diffFile2.name}</span>
                        <Button variant="outline" size="sm" onClick={() => setDiffFile2(null)}>
                          {lang === "ru" ? "Убрать" : "Remove"}
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{lang === "ru" ? "Выбрать второй PDF" : "Choose second PDF"}</span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          data-testid="input-diff-file2"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setDiffFile2(f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {slug === "pdf-to-audio" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Язык" : "Language"}
                    </Label>
                    <Select value={audioLang} onValueChange={setAudioLang}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="ru-RU">Русский</SelectItem>
                        <SelectItem value="de-DE">Deutsch</SelectItem>
                        <SelectItem value="fr-FR">Français</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {lang === "ru" ? "Скорость" : "Speed"}: {audioRate[0].toFixed(1)}x
                    </Label>
                    <Slider
                      min={0.5}
                      max={2}
                      step={0.1}
                      value={audioRate}
                      onValueChange={(v) => setAudioRate(v)}
                    />
                  </div>
                </div>
              )}

              {slug === "pdf-to-pptx" && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}
                >
                  <span className="mt-0.5 text-orange-400">📊</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Каждая страница PDF станет слайдом в презентации PowerPoint."
                      : "Each PDF page will become a slide in the PowerPoint presentation."}
                  </span>
                </div>
              )}
              {/* ==================== INVERT COLORS ==================== */}
              {slug === "invert-colors" && (
                <div className="flex items-start gap-3 rounded-lg p-3 text-sm" style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)" }}>
                  <span className="mt-0.5 text-slate-400">🌙</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Инвертирует все цвета в PDF — создаёт версию для тёмного фона или снижает нагрузку на глаза."
                      : "Inverts all colors in the PDF to create a dark-mode version or reduce eye strain."}
                  </span>
                </div>
              )}

              {/* ==================== TO SINGLE PAGE ==================== */}
              {slug === "to-single-page" && (
                <div className="flex items-start gap-3 rounded-lg p-3 text-sm" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}>
                  <span className="mt-0.5 text-teal-400">📜</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Объединяет все страницы в одну длинную непрерывную страницу — удобно для веб-публикации или скролл-просмотра."
                      : "Combines all pages into one tall continuous page — great for web publishing or scrollable viewing."}
                  </span>
                </div>
              )}

              {/* ==================== REMOVE IMAGES ==================== */}
              {slug === "remove-images" && (
                <div className="flex items-start gap-3 rounded-lg p-3 text-sm" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
                  <span className="mt-0.5 text-rose-400">🚫</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Удаляет все изображения (XObject Image) из PDF, оставляя текст и векторную графику без изменений."
                      : "Removes all images (XObject Image resources) from the PDF while keeping text and vector graphics intact."}
                  </span>
                </div>
              )}

              {/* ==================== FORM FILL ==================== */}
              {slug === "form-fill" && (
                <div className="space-y-3">
                  {formLoading && (
                    <p className="text-sm text-muted-foreground">{lang === "ru" ? "Загрузка полей формы…" : "Loading form fields…"}</p>
                  )}
                  {!formLoading && formFields.length === 0 && files.length > 0 && (
                    <p className="text-sm text-muted-foreground">{lang === "ru" ? "Поля формы не найдены в этом PDF." : "No form fields found in this PDF."}</p>
                  )}
                  {formFields.map((field) => (
                    <div key={field.name} className="space-y-1">
                      <Label className="text-sm font-medium">{field.name}</Label>
                      {field.type === "checkbox" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formValues[field.name] === "true"}
                            onChange={(e) => setFormValues(v => ({ ...v, [field.name]: e.target.checked ? "true" : "false" }))}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-muted-foreground">{lang === "ru" ? "Отмечен" : "Checked"}</span>
                        </div>
                      ) : field.type === "select" || field.type === "radio" ? (
                        <Select value={formValues[field.name] || ""} onValueChange={(v) => setFormValues(fv => ({ ...fv, [field.name]: v }))}>
                          <SelectTrigger><SelectValue placeholder={field.name} /></SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={formValues[field.name] || ""}
                          onChange={(e) => setFormValues(v => ({ ...v, [field.name]: e.target.value }))}
                          placeholder={field.value || field.name}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ==================== SPLIT BY CHAPTERS ==================== */}
              {slug === "split-by-chapters" && (
                <div className="flex items-start gap-3 rounded-lg p-3 text-sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <span className="mt-0.5 text-amber-400">📖</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Разбивает PDF на отдельные файлы по закладкам верхнего уровня. Если закладок нет — возвращает исходный файл."
                      : "Splits PDF into separate files at top-level bookmark boundaries. If no bookmarks exist, returns the original file."}
                  </span>
                </div>
              )}

              {/* ==================== BOOKLET IMPOSITION ==================== */}
              {slug === "booklet-imposition" && (
                <div className="flex items-start gap-3 rounded-lg p-3 text-sm" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <span className="mt-0.5 text-indigo-400">📚</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Переупорядочивает страницы для печати в виде брошюры. Страницы размещаются попарно на листах формата A3 (2×A4) для сложения и скрепления."
                      : "Reorders pages for booklet printing. Pages are arranged in pairs on A3-sized sheets (2×A4) for folding and stapling."}
                  </span>
                </div>
              )}

              {/* ==================== SCANNER EFFECT ==================== */}
              {slug === "scanner-effect" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {lang === "ru" ? "Интенсивность эффекта" : "Effect intensity"}: {Math.round(scannerIntensity * 100)}%
                    </Label>
                    <Slider
                      min={10}
                      max={100}
                      step={5}
                      value={[scannerIntensity * 100]}
                      onValueChange={([v]) => setScannerIntensity(v / 100)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {lang === "ru"
                        ? "Добавляет желтоватый тон бумаги, шум и небольшое размытие — имитирует отсканированный документ."
                        : "Adds paper yellowing, noise and slight blur — simulates a scanned physical document."}
                    </p>
                  </div>
                </div>
              )}


              {slug === "compress-pdf" && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
                >
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  <span className="text-muted-foreground">
                    {lang === "ru"
                      ? "Оптимизирует структуру PDF. Если новый файл больше оригинала, возвращается оригинал."
                      : "Optimises PDF structure with object streams. If the result is larger than the original, the original is returned unchanged."}
                  </span>
                </div>
              )}

              {slug === "watermark-pdf" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{t.tool.watermarkText}</Label>
                    <Input
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="CONFIDENTIAL"
                      data-testid="input-watermark-text"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t.tool.opacity}: {Math.round(watermarkOpacity[0] * 100)}%
                    </Label>
                    <Slider
                      min={5}
                      max={80}
                      step={5}
                      value={[watermarkOpacity[0] * 100]}
                      onValueChange={([v]) => setWatermarkOpacity([v / 100])}
                      data-testid="slider-watermark-opacity"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Позиция" : "Position"}
                    </Label>
                    <Select value={watermarkPosition} onValueChange={(v) => setWatermarkPosition(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">{lang === "ru" ? "По центру" : "Center"}</SelectItem>
                        <SelectItem value="top-left">{lang === "ru" ? "Вверху слева" : "Top left"}</SelectItem>
                        <SelectItem value="top-right">{lang === "ru" ? "Вверху справа" : "Top right"}</SelectItem>
                        <SelectItem value="bottom-left">{lang === "ru" ? "Внизу слева" : "Bottom left"}</SelectItem>
                        <SelectItem value="bottom-right">{lang === "ru" ? "Внизу справа" : "Bottom right"}</SelectItem>
                        <SelectItem value="tile">{lang === "ru" ? "Плиткой" : "Tile"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {slug === "pdf-page-numbers" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{t.tool.position}</Label>
                    <Select value={pageNumPosition} onValueChange={(v) => setPageNumPosition(v as any)}>
                      <SelectTrigger data-testid="select-page-num-position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-center">{t.tool.posBottomCenter}</SelectItem>
                        <SelectItem value="bottom-right">{t.tool.posBottomRight}</SelectItem>
                        <SelectItem value="bottom-left">{t.tool.posBottomLeft}</SelectItem>
                        <SelectItem value="top-center">{t.tool.posTopCenter}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Формат" : "Format"}
                    </Label>
                    <Select value={pageNumFormat} onValueChange={(v) => setPageNumFormat(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">{lang === "ru" ? "1, 2, 3..." : "1, 2, 3..."}</SelectItem>
                        <SelectItem value="x-of-y">{lang === "ru" ? "1 / 10, 2 / 10..." : "1 / 10, 2 / 10..."}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {slug === "bates-numbering" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {lang === "ru" ? "Префикс" : "Prefix"}
                      </Label>
                      <Input
                        value={batesPrefix}
                        onChange={(e) => setBatesPrefix(e.target.value)}
                        placeholder="CASE-"
                        data-testid="input-bates-prefix"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {lang === "ru" ? "Суффикс" : "Suffix"}
                      </Label>
                      <Input
                        value={batesSuffix}
                        onChange={(e) => setBatesSuffix(e.target.value)}
                        placeholder=""
                        data-testid="input-bates-suffix"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {lang === "ru" ? "Старт" : "Start"}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={batesStart}
                        onChange={(e) => setBatesStart(Math.max(1, Number(e.target.value) || 1))}
                        data-testid="input-bates-start"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {lang === "ru" ? "Цифр" : "Digits"}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={batesDigits}
                        onChange={(e) => setBatesDigits(Math.max(1, Math.min(10, Number(e.target.value) || 6)))}
                        data-testid="input-bates-digits"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {lang === "ru" ? "Размер" : "Size"}
                      </Label>
                      <Input
                        type="number"
                        min={6}
                        max={72}
                        value={batesFontSize}
                        onChange={(e) => setBatesFontSize(Math.max(6, Math.min(72, Number(e.target.value) || 10)))}
                        data-testid="input-bates-fontsize"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{t.tool.position}</Label>
                    <Select value={batesPosition} onValueChange={(v) => setBatesPosition(v as any)}>
                      <SelectTrigger data-testid="select-bates-position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">{lang === "ru" ? "Внизу справа" : "Bottom right"}</SelectItem>
                        <SelectItem value="bottom-left">{lang === "ru" ? "Внизу слева" : "Bottom left"}</SelectItem>
                        <SelectItem value="top-right">{lang === "ru" ? "Вверху справа" : "Top right"}</SelectItem>
                        <SelectItem value="top-left">{lang === "ru" ? "Вверху слева" : "Top left"}</SelectItem>
                        <SelectItem value="center">{lang === "ru" ? "По центру" : "Center"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div
                    className="flex items-start gap-3 rounded-lg p-3 text-sm"
                    style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.25)" }}
                  >
                    <span className="mt-0.5 text-slate-400">ℹ</span>
                    <span className="text-muted-foreground">
                      {lang === "ru"
                        ? `Пример: ${batesPrefix || ""}${String(batesStart).padStart(batesDigits, "0")}${batesSuffix}`
                        : `Preview: ${batesPrefix || ""}${String(batesStart).padStart(batesDigits, "0")}${batesSuffix}`}
                    </span>
                  </div>
                </div>
              )}

              {(slug === "protect-pdf" || slug === "unlock-pdf") && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{t.tool.password}</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.tool.passwordPlaceholder}
                      data-testid="input-password"
                    />
                  </div>
                  <div
                    className="flex items-start gap-3 rounded-lg p-3 text-sm"
                    style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.25)" }}
                  >
                    <span className="mt-0.5 text-sky-400">ℹ</span>
                    <span className="text-muted-foreground">
                      {slug === "protect-pdf"
                        ? (lang === "ru"
                            ? "Результат будет сохранён как AES-256 protected PDF и откроется только после ввода этого пароля."
                            : "The result will be saved as an AES-256 protected PDF and will open only after this password is entered.")
                        : (lang === "ru"
                            ? "Введите пароль от исходного PDF, чтобы снять защиту и сохранить новую незашифрованную копию."
                            : "Enter the current PDF password to remove protection and save a new unencrypted copy.")}
                    </span>
                  </div>
                </div>
              )}

              {slug === "sign-pdf" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.tool.signatureText}</Label>
                  <Input
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    placeholder={t.tool.signaturePlaceholder}
                    data-testid="input-signature-text"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">{t.tool.signatureHint}</p>
                </div>
              )}

              {slug === "redact-pdf" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {lang === "ru" ? "Текст для затирания" : "Text to redact"}
                  </Label>
                  <Input
                    value={redactSearchText}
                    onChange={(e) => setRedactSearchText(e.target.value)}
                    placeholder={lang === "ru" ? "например: SECRET-123" : "e.g. SECRET-123"}
                    data-testid="input-redact-text"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {lang === "ru"
                      ? "Страницы с найденным текстом растеризируются — текст нельзя будет извлечь из PDF."
                      : "Pages containing the text are rasterised — the text cannot be extracted from the output PDF."}
                  </p>
                </div>
              )}

              {slug === "ocr-pdf" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {lang === "ru" ? "Языки OCR" : "OCR languages"}
                    </Label>
                    <div
                      className="grid grid-cols-2 gap-2 rounded-lg border p-3 max-h-64 overflow-y-auto"
                    >
                      {ocrLanguageOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={ocrLanguages.includes(option.value)}
                            onCheckedChange={() => toggleOcrLanguage(option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div
                    className="flex items-start gap-3 rounded-lg p-3 text-sm"
                    style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.22)" }}
                  >
                    <span className="mt-0.5 text-pink-400">ℹ</span>
                    <span className="text-muted-foreground">
                      {lang === "ru"
                        ? "OCR создаёт новый searchable PDF. Для длинных документов обработка может занять больше времени."
                        : "OCR creates a new searchable PDF. Long documents can take more time to process."}
                    </span>
                  </div>
                </div>
              )}

              {(slug === "pdf-to-jpg" || slug === "pdf-to-png") && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.tool.qualityScale}</Label>
                  <Select value={imageScale} onValueChange={(v) => setImageScale(v as any)} data-testid="select-image-scale">
                    <SelectTrigger data-testid="select-image-scale-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t.tool.qualityStandard}</SelectItem>
                      <SelectItem value="2">{t.tool.qualityHigh}</SelectItem>
                      <SelectItem value="3">{t.tool.qualityUltra}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">{t.tool.outputZip}</p>
                </div>
              )}

              {slug === "pdf-header-footer" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{t.tool.headerText}</Label>
                    <Input
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      placeholder={t.tool.headerPlaceholder}
                      data-testid="input-header-text"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{t.tool.footerText}</Label>
                    <Input
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      placeholder={t.tool.footerPlaceholder}
                      data-testid="input-footer-text"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <AnimatePresence mode="wait">
                  {state === "processing" ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3"
                    >
                      <ProgressRing progress={progress} size={48} />
                      <div>
                        <span className="text-sm text-muted-foreground block">{t.tool.processing}</span>
                        {slug === "redact-pdf" && (
                          <span className="text-xs text-slate-500">
                            {lang === "ru" ? "Для многостраничных PDF это может занять минуту…" : "Multi-page PDFs may take a minute…"}
                          </span>
                        )}
                        {slug === "ocr-pdf" && (
                          <span className="text-xs text-slate-500">
                            {lang === "ru" ? "OCR идёт постранично, поэтому подождите завершения обработки…" : "OCR runs page by page, so please wait for processing to finish…"}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        className="gap-2 ml-auto"
                        data-testid="button-cancel"
                      >
                        <X className="w-4 h-4" />
                        {lang === "ru" ? "Отменить" : "Cancel"}
                      </Button>
                    </motion.div>
                  ) : state === "done" ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 flex-wrap"
                    >
                      <Button
                        onClick={handleDownload}
                        className="gap-2 shadow-lg shadow-primary/20"
                        data-testid="button-download"
                      >
                        <Download className="w-4 h-4" />
                        {t.tool.download}{" "}
                        {slug === "pdf-to-word"
                          ? "DOCX"
                          : (slug === "split-pdf" && (splitMode === "all" || splitMode === "every-n")) ||
                            slug === "pdf-to-jpg" || slug === "pdf-to-png"
                            ? "ZIP"
                            : tool.outputExt?.toUpperCase() || "PDF"}
                        {resultSize && (
                          <span className="text-xs opacity-70">({formatBytes(resultSize)})</span>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={reset}
                        className="gap-2"
                        data-testid="button-reset"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {t.tool.processAnother}
                      </Button>
                      {files[0] && (
                        <div className="flex items-center gap-1.5 text-sm text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>{t.tool.doneLabel} {resultSize && files[0] && (
                            <span className="text-muted-foreground">
                              {formatBytes(files[0].size)} → {formatBytes(resultSize)}
                              {files[0].size > (resultSize || 0) && (
                                <span className="text-emerald-400 ml-1">
                                  (-{Math.round((1 - (resultSize || 0) / files[0].size) * 100)}%)
                                </span>
                              )}
                            </span>
                          )}</span>
                        </div>
                      )}
                      {resultReport && (
                        <div className="w-full rounded-lg border border-border bg-card/60 p-3 text-xs text-muted-foreground">
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span>
                              {lang === "ru" ? "Вход" : "Input"}: {formatBytes(resultReport.inputBytes)}
                            </span>
                            <span>
                              {lang === "ru" ? "Выход" : "Output"}: {formatBytes(resultReport.outputBytes)}
                            </span>
                            <span>
                              {lang === "ru" ? "Формат" : "Format"}: {resultReport.outputExtension.toUpperCase()}
                            </span>
                            {resultReport.reductionPercent !== null && (
                              <span className="text-emerald-400">
                                {lang === "ru" ? "Сэкономлено" : "Saved"}: {resultReport.reductionPercent}%
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Preview */}
                      {previewDataUrl && (
                        <div className="w-full mt-4 p-4 rounded-lg border border-border bg-card">
                          <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                            {lang === "ru" ? "Предпросмотр результата (первая страница)" : "Result Preview (first page)"}
                          </h4>
                          <div className="flex justify-center">
                            <img 
                              src={previewDataUrl} 
                              alt="Preview" 
                              className="max-w-full h-auto rounded shadow-lg"
                              style={{ maxHeight: "400px" }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : state === "error" ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                      <Button variant="outline" size="sm" onClick={reset}>{t.tool.tryAgain}</Button>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Button
                        onClick={process}
                        disabled={
                          (files.length === 0 && slug !== "text-to-pdf") ||
                          ((slug === "protect-pdf" || slug === "unlock-pdf") && !password.trim())
                        }
                        className="gap-2 shadow-lg shadow-primary/20"
                        data-testid="button-process"
                      >
                        <Icon className="w-4 h-4" />
                        {toolTr?.name ?? tool.name}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pdfx-panel-muted rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-sm font-medium">{t.tool.privacy}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.tool.privacyDesc}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                {t.tool.howToUse}
              </h3>
              <div className="pdfx-panel space-y-4 rounded-xl p-4">
                {[
                  { step: 1, text: t.tool.step1 },
                  { step: 2, text: t.tool.step2 },
                  { step: 3, text: t.tool.step3 },
                  { step: 4, text: t.tool.step4 },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step}
                    </div>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {relatedTools.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  {t.tool.related}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {relatedTools.map((rel) => (
                    <ToolCard key={rel.slug} tool={rel} />
                  ))}
                </div>
              </div>
            )}

            {workflowSuggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  {lang === "ru" ? "Следующий шаг" : "Next step"}
                </h3>
                <div className="space-y-3">
                  {workflowSuggestions.map((workflow) => (
                    <div
                      key={workflow.id}
                      className={cn(
                        "rounded-md border p-5",
                        workflow.accentClass === "from-sky-500/15 to-cyan-500/10" && "border-sky-200/50 bg-sky-50/70",
                        workflow.accentClass === "from-emerald-500/15 to-teal-500/10" && "border-emerald-200/50 bg-emerald-50/70",
                        workflow.accentClass === "from-violet-500/15 to-indigo-500/10" && "border-violet-200/50 bg-violet-50/70",
                        workflow.accentClass === "from-amber-500/15 to-orange-500/10" && "border-amber-200/50 bg-amber-50/70",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          {lang === "ru" ? "Workflow" : "Workflow"}
                        </span>
                      </div>
                      <div className="text-base font-semibold text-foreground">{workflow.title}</div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{workflow.description}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {[tool, ...workflow.remainingTools].map((stepTool, index) => (
                          <span
                            key={`${workflow.id}-${stepTool.slug}`}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium",
                              index === 0
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground"
                            )}
                          >
                            {index === 0
                              ? (lang === "ru" ? "Сейчас" : "Now")
                              : (lang === "ru" ? "Далее" : "Next")}{" "}
                            {getToolTranslation(stepTool.slug, lang).name}
                          </span>
                        ))}
                      </div>

                      <Button size="sm" className="mt-4 w-full gap-2" asChild>
                        <Link
                          href={`/tools/${workflow.nextTool.slug}`}
                          onMouseEnter={() => preloadToolRoute(workflow.nextTool.slug)}
                          onFocus={() => preloadToolRoute(workflow.nextTool.slug)}
                        >
                          {lang === "ru" ? "Открыть следующий инструмент" : "Open next tool"}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-teal-500/10 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{t.tool.goPro}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {t.tool.goProDesc}
              </p>
              <Button size="sm" className="w-full" asChild>
                <Link href="/pricing">{t.tool.viewPlans}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <KeyboardHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}


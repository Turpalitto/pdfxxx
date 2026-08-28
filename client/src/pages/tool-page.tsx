import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRoute, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/lang-context';
import { LANGUAGES } from '@/lib/i18n';
import { useSeo } from '@/hooks/use-seo';
import { ArrowLeft, Download, CheckCircle, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/file-upload';
import { ProgressRing } from '@/components/progress-ring';
import { ToolCard } from '@/components/tool-card';
import { getToolBySlug, tools, categoryColors } from '@/lib/tools';
import { getToolTranslation } from '@/lib/tool-translations';
import { DEFAULT_MAX_FILE_SIZE_MB } from '@/lib/upload-limits';
import { getToolRegistryEntry } from '@/tools/registry';
import type { ToolOutputDefinition } from '@/tools/types';
import {
  runToolWorkerTask,
  runToolMainThreadTask,
  runToolAudioSideEffectTask,
  runToolMetadataEditTask,
  createToolTextResult,
  createToolNamedPartsResult,
  createToolNumberedPartsResult,
  createToolImageArchiveResult,
} from '@/tools/shared/process';
import {
  validateToolOutput,
  createToolResultReport,
  type ToolResultReport,
} from '@/tools/shared/output';
import { createToolDownloadPlan } from '@/tools/shared/download';
import { WorkerAbortError } from '@/workers/worker-client';
import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  deletePages,
  extractPages,
  reorderPages,
  compressPdf,
  addWatermark,
  addPageNumbers,
  imagesToPdf,
  textToPdf,
  addHeaderFooter,
  repairPdf,
  flattenPdf,
  unlockPdf,
  signPdf,
  redactPdf,
  wordToPdf,
  excelToPdf,
  pdfToWord,
  pdfToExcel,
  pdfToText,
  pdfToHtml,
  pdfToMarkdown,
  pdfBookmarks,
  extractFormFields,
  fillPdfForm,
  getPdfMetadata,
  setPdfMetadata,
  getPdfPageCount,
  parsePageSelection,
  formatBytes,
  splitPdfEveryN,
  splitPdfAllPages,
  splitBySize,
  splitByChapters,
  overlayPdf,
  cropPdf,
  resizePages,
  addBlankPages,
  batesNumbering,
  addBackground,
  sanitizePdf,
  convertToPdfA,
  removeImages,
  extractImages,
  grayscalePdf,
  invertColors,
  scannerEffect,
  removeBlankPages,
  nUpPdf,
  toSinglePage,
  bookletImposition,
  comparePdf,
  pdfDiff,
  autoRedactPdf,
  ocrPdf,
  pdfToImages,
  pdfToAudio,
  pdfToPptx,
  downloadBlob,
  downloadText,
  downloadHtml,
} from '@/lib/pdf-utils';

type ProcessingState = 'idle' | 'processing' | 'done' | 'error';
type SplitModeState = 'range' | 'every-n' | 'all';
type PageNumberFormat = 'number' | 'x-of-y';

const FALLBACK_OUTPUT: ToolOutputDefinition = {
  kind: 'pdf',
  extension: 'pdf',
  mimeType: 'application/pdf',
};

const PAGE_SIZE_OPTIONS = ['a4', 'a3', 'a5', 'letter', 'legal', 'tabloid'] as const;
const OCR_LANG_OPTIONS = ['eng', 'rus', 'spa', 'fra', 'deu', 'por', 'ita', 'nld'] as const;
const BATES_POSITIONS = [
  'bottom-right',
  'bottom-center',
  'bottom-left',
  'top-right',
  'top-center',
  'top-left',
] as const;

export default function ToolPage() {
  const [, params] = useRoute('/tools/:slug');
  const slug = params?.slug || '';
  const tool = getToolBySlug(slug);
  const { t, lang } = useLang();
  const { toast } = useToast();
  const toolTr = tool ? getToolTranslation(tool.slug, lang) : null;
  const _toolName = toolTr?.name ?? tool?.name ?? '';
  const _toolDesc = toolTr?.description ?? tool?.description ?? '';
  const maxSizeMb = tool?.maxFilesMb ?? DEFAULT_MAX_FILE_SIZE_MB;

  const entry = useMemo(() => getToolRegistryEntry(slug), [slug]);
  const output = entry?.output ?? FALLBACK_OUTPUT;

  useSeo({
    title: tool
      ? `${_toolName} — PDFX | ${lang === 'ru' ? 'Бесплатно онлайн' : 'Free Online'}`
      : 'PDFX — PDF Tools',
    description: _toolDesc || 'Free online PDF tools — merge, compress, convert, split.',
    path: slug ? `/tools/${slug}` : '/',
    schemaOrg: tool
      ? {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: `PDFX — ${_toolName}`,
          url: `https://pdfx.tools/tools/${slug}`,
          description: _toolDesc,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Web Browser',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          inLanguage: LANGUAGES.map((l) => l.code),
        }
      : undefined,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [fileB, setFileB] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultHtml, setResultHtml] = useState<string | null>(null);
  const [report, setReport] = useState<ToolResultReport | null>(null);
  const [audioSpoken, setAudioSpoken] = useState<{ chars: number; lang: string } | null>(null);

  // --- Controls ---
  const [splitMode, setSplitMode] = useState<SplitModeState>('range');
  const [splitStart, setSplitStart] = useState('1');
  const [splitEnd, setSplitEnd] = useState('');
  const [splitEveryN, setSplitEveryN] = useState('2');
  const [splitMaxMb, setSplitMaxMb] = useState('10');
  const [rotation, setRotation] = useState<'90' | '180' | '270'>('90');
  const [pagesToDelete, setPagesToDelete] = useState('');
  const [pagesToExtract, setPagesToExtract] = useState('');
  const [compressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState([0.3]);
  const [watermarkPosition, setWatermarkPosition] = useState<
    'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  >('center');
  const [pageNumPosition, setPageNumPosition] = useState<
    'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center'
  >('bottom-center');
  const [pageNumFormat, setPageNumFormat] = useState<PageNumberFormat>('number');
  const [pageNumStart, setPageNumStart] = useState('1');
  const [headerText] = useState('');
  const [footerText] = useState('');
  const [freeTextContent, setFreeTextContent] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [redactSearchText, setRedactSearchText] = useState('');
  const [imageScale, setImageScale] = useState<'1' | '2' | '3'>('2');
  const [autoCrop, setAutoCrop] = useState(false);
  const [cropTop, setCropTop] = useState('0');
  const [cropRight, setCropRight] = useState('0');
  const [cropBottom, setCropBottom] = useState('0');
  const [cropLeft, setCropLeft] = useState('0');
  const [targetPageSize, setTargetPageSize] = useState<string>('a4');
  const [scannerIntensity, setScannerIntensity] = useState([50]);
  const [nUpCount, setUpCount] = useState<'2' | '4'>('2');
  const [redactEmails, setRedactEmails] = useState(true);
  const [redactPhones, setRedactPhones] = useState(false);
  const [redactSsn, setRedactSsn] = useState(false);
  const [redactRegex, setRedactRegex] = useState('');
  const [ocrLanguage, setOcrLanguage] = useState<string>('eng');
  const [batesPrefix, setBatesPrefix] = useState('');
  const [batesStart, setBatesStart] = useState('1');
  const [batesDigits, setBatesDigits] = useState('6');
  const [batesPosition, setBatesPosition] = useState<string>('bottom-right');
  const [bgColor, setBgColor] = useState('#fff7cc');
  const [bgOpacity, setBgOpacity] = useState([60]);
  const [blankPositions, setBlankPositions] = useState('');
  const [overlayOpacity, setOverlayOpacity] = useState([100]);
  const [formValuesJson, setFormValuesJson] = useState('{}');
  const [metadataFields, setMetadataFields] = useState<Record<string, string> | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      abortRef.current?.abort();
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const simulateProgress = useCallback((start: number, end: number) => {
    const steps = 8;
    const step = (end - start) / steps;
    for (let i = 1; i <= steps; i++) {
      timersRef.current.push(setTimeout(() => setProgress(start + Math.round(step * i)), i * 200));
    }
  }, []);

  const handleFiles = useCallback(
    (newFiles: File[]) => {
      if (tool?.multiple) {
        setFiles((prev) => [...prev, ...newFiles]);
      } else {
        setFiles(newFiles);
      }
      setState('idle');
      setResultBytes(null);
      setResultText(null);
      setResultHtml(null);
      setReport(null);
      setAudioSpoken(null);
      setMetadataFields(null);
    },
    [tool],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    abortRef.current = null;
    clearTimers();
    setFiles([]);
    setFileB(null);
    setState('idle');
    setProgress(0);
    setError(null);
    setResultBytes(null);
    setResultSize(null);
    setResultText(null);
    setResultHtml(null);
    setReport(null);
    setAudioSpoken(null);
    setMetadataFields(null);
  }, [clearTimers]);

  /** Отмена: прерываем воркер/задачу и возвращаемся в idle без ошибки. */
  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    clearTimers();
    setState('idle');
    setProgress(0);
  }, [clearTimers]);

  const finishWithBytes = useCallback(
    (bytes: Uint8Array | null) => {
      if (cancelledRef.current) return;
      clearTimers();

      if (output.kind !== 'audio') {
        const validation = validateToolOutput(bytes, output);
        if (!validation.ok) {
          throw new Error(validation.reason || t.tool.errorOccurred);
        }
      }

      setProgress(100);
      setResultBytes(bytes);
      setResultSize(bytes?.length ?? null);
      if (files[0] && bytes) {
        setReport(createToolResultReport(files[0].size, bytes.length, output));
      }
      setState('done');
    },
    [clearTimers, files, output, t.tool.errorOccurred],
  );

  const finishWithText = useCallback(
    (text: ToolTextLike) => {
      if (cancelledRef.current) return;
      setProgress(100);
      setResultBytes(text.bytes);
      setResultSize(text.bytes.length);
      if (text.target === 'html') {
        setResultHtml(text.content);
        setResultText(null);
      } else {
        setResultText(text.content);
        setResultHtml(null);
      }
      if (files[0]) {
        setReport(createToolResultReport(files[0].size, text.bytes.length, output));
      }
      setState('done');
    },
    [files, output],
  );

  const process = useCallback(async () => {
    if (!tool || !entry) {
      setError(t.tool.notFound);
      return;
    }
    if (files.length === 0 && slug !== 'text-to-pdf') {
      setError(t.tool.selectFile);
      return;
    }

    const needSecond = slug === 'compare-pdf' || slug === 'pdf-diff' || slug === 'overlay-pdf';
    if (needSecond && !fileB) {
      setError(t.tool.needSecondFile);
      setState('error');
      return;
    }
    if ((slug === 'form-fill' || slug === 'extract-forms') && !files[0]) {
      setError(t.tool.selectFile);
      setState('error');
      return;
    }

    if (slug === 'protect-pdf') {
      setState('error');
      setError(
        lang === 'ru'
          ? 'PDF-шифрование в браузере не поддерживается. Используйте Adobe Acrobat, LibreOffice или 7-Zip.'
          : 'Browser-side PDF encryption is not supported. Use Adobe Acrobat, LibreOffice, or 7-Zip.',
      );
      return;
    }

    if (slug === 'form-fill') {
      try {
        JSON.parse(formValuesJson);
      } catch {
        setState('error');
        setError(t.tool.invalidJson);
        return;
      }
    }

    cancelledRef.current = false;
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setState('processing');
    setProgress(5);
    setError(null);

    const useRealProgress =
      entry.execution.progress === 'callback' &&
      (entry.execution.workerOp != null || slug === 'ocr-pdf');
    if (!useRealProgress && slug !== 'pdf-metadata') {
      simulateProgress(10, 85);
    }

    try {
      let result: Uint8Array | null = null;

      switch (slug) {
        case 'merge-pdf':
          result = await mergePdfs(files);
          break;

        case 'split-pdf': {
          const baseName = files[0].name.replace(/\.[^.]+$/, '');
          if (splitMode === 'range') {
            const pageCount = await getPdfPageCount(files[0]);
            const start = Math.max(1, parseInt(splitStart) || 1);
            const endInput = parseInt(splitEnd);
            const end = Number.isNaN(endInput) ? pageCount : Math.min(endInput, pageCount);
            if (start > end) {
              throw new Error(
                lang === 'ru'
                  ? 'Начальная страница должна быть меньше или равна конечной.'
                  : 'Start page must be less than or equal to end page.',
              );
            }
            const results = await splitPdf(files[0], [{ start, end }]);
            result = await createToolNumberedPartsResult(entry, results, baseName, {
              singlePartMode: 'bytes',
            });
          } else if (splitMode === 'every-n') {
            const everyN = Math.max(1, parseInt(splitEveryN) || 2);
            const parts = await splitPdfEveryN(files[0], everyN);
            result = await createToolNumberedPartsResult(entry, parts, baseName, {
              singlePartMode: 'zip',
            });
          } else {
            const parts = await splitPdfAllPages(files[0]);
            result = await createToolNumberedPartsResult(entry, parts, baseName, {
              singlePartMode: 'zip',
            });
          }
          break;
        }

        case 'rotate-pdf':
          result = await rotatePdf(files[0], parseInt(rotation) as 90 | 180 | 270);
          break;

        case 'delete-pages': {
          const pageCount = await getPdfPageCount(files[0]);
          const indices = parsePageSelection(pagesToDelete, pageCount, { allowDuplicates: false });
          result = await deletePages(files[0], indices);
          break;
        }

        case 'extract-pages': {
          const pageCount = await getPdfPageCount(files[0]);
          const indices = parsePageSelection(pagesToExtract, pageCount, { allowDuplicates: false });
          result = await extractPages(files[0], indices);
          break;
        }

        case 'reorder-pages': {
          const pageCount = await getPdfPageCount(files[0]);
          const indices = parsePageSelection(pagesToExtract, pageCount, { allowDuplicates: true });
          if (indices.length !== pageCount) {
            throw new Error(
              lang === 'ru'
                ? `Укажите все ${pageCount} страниц в новом порядке.`
                : `List all ${pageCount} pages in the new order.`,
            );
          }
          result = await reorderPages(
            files[0],
            indices.map((n) => n - 1),
          );
          break;
        }

        case 'compress-pdf':
          result = await compressPdf(files[0], compressionLevel);
          break;

        case 'watermark-pdf':
          result = await addWatermark(
            files[0],
            watermarkText,
            watermarkOpacity[0],
            45,
            watermarkPosition,
          );
          break;

        case 'pdf-page-numbers':
          result = await addPageNumbers(
            files[0],
            pageNumPosition,
            Math.max(1, parseInt(pageNumStart) || 1),
            pageNumFormat,
          );
          break;

        case 'images-to-pdf':
        case 'photo-to-pdf':
          result = await imagesToPdf(files);
          break;

        case 'text-to-pdf': {
          const text = files.length > 0 ? await files[0].text() : freeTextContent;
          result = await textToPdf(text);
          break;
        }

        case 'pdf-header-footer':
          result = await addHeaderFooter(files[0], headerText, footerText);
          break;

        case 'repair-pdf':
          result = await repairPdf(files[0]);
          break;

        case 'flatten-pdf':
          result = await flattenPdf(files[0]);
          break;

        case 'unlock-pdf':
          result = await unlockPdf(files[0]);
          break;

        case 'sign-pdf':
          result = await signPdf(files[0], signatureText);
          break;

        case 'word-to-pdf':
          result = await wordToPdf(files[0]);
          break;

        case 'excel-to-pdf':
          result = await runToolMainThreadTask(entry, () => excelToPdf(files[0]));
          break;

        case 'pdf-to-word':
          result = await runToolMainThreadTask(entry, () => pdfToWord(files[0]));
          break;

        case 'pdf-to-excel':
          result = await runToolMainThreadTask(entry, () => pdfToExcel(files[0]));
          break;

        case 'pdf-to-text': {
          const text = await pdfToText(files[0]);
          finishWithText(createToolTextResult(entry, text));
          return;
        }

        case 'pdf-to-html': {
          const html = await pdfToHtml(files[0]);
          finishWithText(createToolTextResult(entry, html));
          return;
        }

        case 'pdf-to-markdown': {
          const md = await pdfToMarkdown(files[0]);
          finishWithText(createToolTextResult(entry, md));
          return;
        }

        case 'pdf-bookmarks': {
          const text = await pdfBookmarks(files[0]);
          finishWithText(createToolTextResult(entry, text));
          return;
        }

        case 'extract-forms': {
          const fields = await runToolMainThreadTask(entry, () => extractFormFields(files[0]));
          finishWithText(createToolTextResult(entry, JSON.stringify(fields, null, 2)));
          return;
        }

        case 'pdf-to-jpg':
        case 'pdf-to-png': {
          const fmt = slug === 'pdf-to-jpg' ? 'jpg' : 'png';
          const scale = parseInt(imageScale) || 2;
          const baseName = files[0].name.replace(/\.[^.]+$/, '');
          const fallback = async () => await pdfToImages(files[0], fmt, scale);
          const images = entry.execution.workerOp
            ? await runToolWorkerTask(entry, fallback, {
                file: files[0],
                args: [fmt, scale],
                signal,
              })
            : await fallback();
          result = await createToolImageArchiveResult(entry, images, fmt, baseName);
          break;
        }

        case 'extract-images': {
          const images = await runToolMainThreadTask(entry, () => extractImages(files[0]));
          result = await createToolNamedPartsResult(entry, images, { singlePartMode: 'zip' });
          break;
        }

        case 'remove-images':
          result = await runToolMainThreadTask(entry, () => removeImages(files[0]));
          break;

        case 'grayscale-pdf': {
          const fallback = () => grayscalePdf(files[0], setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'invert-colors': {
          const fallback = () => invertColors(files[0], setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'scanner-effect': {
          const intensity = scannerIntensity[0] / 100;
          const fallback = () => scannerEffect(files[0], intensity, setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            args: [intensity],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'remove-blank-pages': {
          const fallback = () => removeBlankPages(files[0], undefined, setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'n-up-pdf': {
          const n = (parseInt(nUpCount) || 2) as 2 | 4;
          const fallback = () => nUpPdf(files[0], n, setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            args: [n],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'to-single-page': {
          const fallback = () => toSinglePage(files[0], setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'booklet-imposition': {
          const fallback = () => bookletImposition(files[0], setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'compare-pdf': {
          const second = fileB as File;
          const fallback = () => comparePdf(files[0], second, setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            args: [second],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'pdf-diff': {
          const second = fileB as File;
          const fallback = () => pdfDiff(files[0], second, setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            args: [second],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'overlay-pdf': {
          const second = fileB as File;
          const opacity = overlayOpacity[0] / 100;
          result = await overlayPdf(files[0], second, opacity, setProgress);
          break;
        }

        case 'redact-pdf': {
          const text = redactSearchText.trim();
          if (!text) {
            throw new Error(
              lang === 'ru' ? 'Введите текст для затирания.' : 'Enter the text to redact.',
            );
          }
          const fallback = () => redactPdf(files[0], text, setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            args: [text],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'auto-redact': {
          const raw = redactRegex.trim();
          let customRegex: string | undefined;
          if (raw) {
            try {
              new RegExp(raw, 'gi');
              customRegex = raw;
            } catch {
              throw new Error('Invalid regular expression.');
            }
          }
          const options = {
            redactEmails: redactEmails,
            redactPhones: redactPhones,
            redactSsn: redactSsn,
            customRegex,
          };
          const fallback = () => autoRedactPdf(files[0], options, setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            args: [options],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'ocr-pdf':
          result = await runToolMainThreadTask(entry, () =>
            ocrPdf(files[0], ocrLanguage, setProgress),
          );
          break;

        case 'pdf-to-pptx': {
          const fallback = () => pdfToPptx(files[0], setProgress);
          result = await runOrFallback(entry, fallback, {
            file: files[0],
            onProgress: setProgress,
            signal,
          });
          break;
        }

        case 'crop-pdf': {
          const num = (v: string) => Math.max(0, parseFloat(v) || 0);
          result = await cropPdf(files[0], {
            top: num(cropTop),
            right: num(cropRight),
            bottom: num(cropBottom),
            left: num(cropLeft),
            autoCrop,
          });
          break;
        }

        case 'resize-pages':
          result = await resizePages(files[0], targetPageSize);
          break;

        case 'add-blank-pages':
          result = await addBlankPages(files[0], blankPositions.trim() || 'end');
          break;

        case 'bates-numbering':
          result = await batesNumbering(
            files[0],
            {
              prefix: batesPrefix,
              start: Math.max(0, parseInt(batesStart) || 1),
              digits: Math.min(12, Math.max(1, parseInt(batesDigits) || 6)),
              position: batesPosition as
                | 'bottom-right'
                | 'bottom-center'
                | 'bottom-left'
                | 'top-right'
                | 'top-center'
                | 'top-left',
            },
            setProgress,
          );
          break;

        case 'add-background':
          result = await addBackground(files[0], bgColor, bgOpacity[0] / 100);
          break;

        case 'sanitize-pdf':
          result = await sanitizePdf(files[0]);
          break;

        case 'pdf-to-pdfa':
          result = await convertToPdfA(files[0]);
          break;

        case 'split-by-size': {
          const maxMb = parseFloat(splitMaxMb) || 10;
          const parts = await splitBySize(files[0], maxMb, setProgress);
          const baseName = files[0].name.replace(/\.[^.]+$/, '');
          result = await createToolNumberedPartsResult(entry, parts, baseName, {
            singlePartMode: 'zip',
          });
          break;
        }

        case 'split-by-chapters': {
          const parts = await splitByChapters(files[0], setProgress);
          result = await createToolNamedPartsResult(entry, parts, { singlePartMode: 'zip' });
          break;
        }

        case 'form-fill': {
          const values = JSON.parse(formValuesJson) as Record<string, string | boolean>;
          result = await fillPdfForm(files[0], values);
          break;
        }

        case 'pdf-metadata': {
          const metaResult = await runToolMetadataEditTask(
            entry,
            metadataFields !== null,
            async () => {
              const fields = (await getPdfMetadata(files[0])) as unknown as Record<string, string>;
              setMetadataFields(fields);
              return fields;
            },
            async () => {
              const clean = Object.fromEntries(
                Object.entries(metadataFields ?? {}).filter(([, v]) => v !== ''),
              );
              return setPdfMetadata(files[0], clean);
            },
          );
          if (metaResult.status === 'loaded') {
            if (!cancelledRef.current) {
              clearTimers();
              setProgress(0);
              setState('idle');
              toast({ title: t.tool.metaLoaded });
            }
            return;
          }
          result = metaResult.bytes;
          break;
        }

        case 'pdf-to-audio': {
          await runToolAudioSideEffectTask(entry, async () => {
            const spoken = await pdfToAudio(files[0], { langHint: ocrLanguage });
            if (!cancelledRef.current) {
              setAudioSpoken({ chars: spoken.spokenChars, lang: spoken.lang });
            }
          });
          if (cancelledRef.current) return;
          clearTimers();
          setProgress(100);
          setState('done');
          return;
        }

        default:
          throw new Error(t.tool.errorOccurred);
      }

      finishWithBytes(result);
    } catch (err: unknown) {
      clearTimers();
      if (cancelledRef.current || err instanceof WorkerAbortError || signal.aborted) {
        setState('idle');
        setProgress(0);
        return;
      }
      setError(err instanceof Error ? err.message : t.tool.errorOccurred);
      setState('error');
    }
  }, [
    tool,
    entry,
    files,
    fileB,
    slug,
    lang,
    t,
    splitMode,
    splitStart,
    splitEnd,
    splitEveryN,
    splitMaxMb,
    rotation,
    pagesToDelete,
    pagesToExtract,
    compressionLevel,
    watermarkText,
    watermarkOpacity,
    watermarkPosition,
    pageNumPosition,
    pageNumFormat,
    pageNumStart,
    headerText,
    footerText,
    freeTextContent,
    signatureText,
    redactSearchText,
    imageScale,
    autoCrop,
    cropTop,
    cropRight,
    cropBottom,
    cropLeft,
    targetPageSize,
    scannerIntensity,
    nUpCount,
    redactEmails,
    redactPhones,
    redactSsn,
    redactRegex,
    ocrLanguage,
    batesPrefix,
    batesStart,
    batesDigits,
    batesPosition,
    bgColor,
    bgOpacity,
    blankPositions,
    overlayOpacity,
    formValuesJson,
    metadataFields,
    simulateProgress,
    clearTimers,
    finishWithBytes,
    finishWithText,
    toast,
  ]);

  const handleDownload = useCallback(() => {
    const plan = createToolDownloadPlan({
      slug,
      originalFilename: files[0]?.name,
      output,
      resultBytes,
      resultText,
      resultHtml,
      splitMode: splitMode === 'every-n' ? 'every-n' : splitMode === 'all' ? 'all' : 'range',
    });
    if (!plan) return;
    if (plan.kind === 'text') {
      downloadText(plan.text, plan.filename);
      return;
    }
    if (plan.kind === 'html') {
      downloadHtml(plan.html, plan.filename);
      return;
    }
    downloadBlob(plan.bytes, plan.filename, plan.mimeType);
  }, [slug, files, output, resultBytes, resultText, resultHtml, splitMode]);

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

  const colors = categoryColors[tool.color] || categoryColors.blue;
  const Icon = tool.icon;
  const relatedTools = tools
    .filter((rel) => rel.category === tool.category && rel.slug !== slug)
    .slice(0, 4);
  const isAudioTool = slug === 'pdf-to-audio';
  const steps = isAudioTool
    ? [t.tool.step1, t.tool.step2, t.tool.step3]
    : [t.tool.step1, t.tool.step2, t.tool.step3, t.tool.step4];

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
                  background: `linear-gradient(135deg, ${colors.gradient}, ${colors.gradient.replace('0.18', '0.05')})`,
                  border: `1px solid ${colors.gradient.replace('0.18', '0.2')}`,
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
                </div>
                <p className="text-muted-foreground">{_toolDesc}</p>
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-5 space-y-5">
              <FileUpload
                accept={tool.accept}
                multiple={tool.multiple}
                maxSizeMb={maxSizeMb}
                onFiles={handleFiles}
                onError={(count) => {
                  toast({
                    title: lang === 'ru' ? 'Файл отклонён' : 'File rejected',
                    description:
                      lang === 'ru'
                        ? `Отклонено: ${count}. Проверьте формат (${tool.accept || 'любой'}) и размер (до ${maxSizeMb} МБ).`
                        : `Rejected: ${count}. Check format (${tool.accept || 'any'}) and size (up to ${maxSizeMb} MB).`,
                    variant: 'destructive',
                  });
                }}
                files={files}
                onRemoveFile={removeFile}
                label={tool.accept?.includes('.pdf') ? t.tool.dropPdf : t.tool.chooseFile}
                description={`${tool.multiple ? t.tool.multipleFiles : t.tool.singleFile} • ${t.tool.maxSize} ${maxSizeMb}MB`}
              />

              {(slug === 'compare-pdf' || slug === 'pdf-diff' || slug === 'overlay-pdf') && (
                <SecondFileInput
                  label={t.tool.secondFile}
                  testId={
                    slug === 'compare-pdf'
                      ? 'input-compare-file2'
                      : slug === 'pdf-diff'
                        ? 'input-diff-file2'
                        : 'input-overlay-file2'
                  }
                  accept={tool.accept || '.pdf'}
                  file={fileB}
                  onChange={setFileB}
                />
              )}

              {isAudioTool && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.25)',
                  }}
                >
                  <span className="mt-0.5 text-blue-500">ℹ</span>
                  <span className="text-foreground/90">
                    {t.tool.audioNotice}{' '}
                    {lang === 'ru'
                      ? 'Если это скан, сначала запустите '
                      : 'If this is a scan, run '}
                    <Link href="/tools/ocr-pdf" className="underline font-medium">
                      OCR PDF
                    </Link>
                    {lang === 'ru'
                      ? ', чтобы текст стал выделяемым.'
                      : ' first to make the text selectable.'}
                  </span>
                </div>
              )}

              {slug === 'text-to-pdf' && files.length === 0 && (
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

              {slug === 'split-pdf' && (
                <Tabs value={splitMode} onValueChange={(v) => setSplitMode(v as SplitModeState)}>
                  <TabsList>
                    <TabsTrigger value="range">{t.tool.splitModeRange}</TabsTrigger>
                    <TabsTrigger value="every-n">{t.tool.splitEveryN}</TabsTrigger>
                    <TabsTrigger value="all">{t.tool.splitAllPages}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="range" className="pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">
                          {t.tool.fromPage}
                        </Label>
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
                  </TabsContent>
                  <TabsContent value="every-n" className="pt-3">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {t.tool.everyNPages}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={splitEveryN}
                        onChange={(e) => setSplitEveryN(e.target.value)}
                        data-testid="input-split-every-n"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="all" className="pt-3" />
                </Tabs>
              )}

              {slug === 'split-by-size' && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {t.tool.maxSizeMbLabel}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.5"
                    value={splitMaxMb}
                    onChange={(e) => setSplitMaxMb(e.target.value)}
                    data-testid="input-max-size-mb"
                  />
                </div>
              )}

              {slug === 'rotate-pdf' && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.tool.rotationAngle}</Label>
                  <Select
                    value={rotation}
                    onValueChange={(v) => setRotation(v as any)}
                    data-testid="select-rotation"
                  >
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

              {slug === 'delete-pages' && (
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

              {(slug === 'extract-pages' || slug === 'reorder-pages') && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {slug === 'reorder-pages' ? t.tool.pagesReorder : t.tool.pagesExtract}
                  </Label>
                  <Input
                    value={pagesToExtract}
                    onChange={(e) => setPagesToExtract(e.target.value)}
                    placeholder={slug === 'reorder-pages' ? '3, 1, 2' : '1, 2, 5-7'}
                    data-testid="input-pages-extract"
                  />
                </div>
              )}

              {slug === 'compress-pdf' && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
                  <span className="text-foreground/85">
                    {lang === 'ru'
                      ? 'Оптимизирует структуру PDF. Если новый файл больше оригинала, возвращается оригинал.'
                      : 'Optimises PDF structure with object streams. If the result is larger than the original, the original is returned unchanged.'}
                  </span>
                </div>
              )}

              {slug === 'watermark-pdf' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {t.tool.watermarkText}
                    </Label>
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
                    <Label className="text-sm font-medium mb-1.5 block">{t.tool.position}</Label>
                    <Select
                      value={watermarkPosition}
                      onValueChange={(v) => setWatermarkPosition(v as any)}
                      data-testid="select-watermark-position"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">
                          {lang === 'ru' ? 'По центру' : 'Center'}
                        </SelectItem>
                        <SelectItem value="tile">{t.tool.posTile}</SelectItem>
                        <SelectItem value="top-left">
                          {lang === 'ru' ? 'Сверху слева' : 'Top Left'}
                        </SelectItem>
                        <SelectItem value="top-right">
                          {lang === 'ru' ? 'Сверху справа' : 'Top Right'}
                        </SelectItem>
                        <SelectItem value="bottom-left">
                          {lang === 'ru' ? 'Снизу слева' : 'Bottom Left'}
                        </SelectItem>
                        <SelectItem value="bottom-right">
                          {lang === 'ru' ? 'Снизу справа' : 'Bottom Right'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {slug === 'pdf-page-numbers' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{t.tool.position}</Label>
                    <Select
                      value={pageNumPosition}
                      onValueChange={(v) => setPageNumPosition(v as any)}
                    >
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {t.tool.numberFormat}
                      </Label>
                      <Select
                        value={pageNumFormat}
                        onValueChange={(v) => setPageNumFormat(v as PageNumberFormat)}
                        data-testid="select-page-num-format"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="number">{t.tool.formatNumber}</SelectItem>
                          <SelectItem value="x-of-y">{t.tool.formatXofY}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {t.tool.startNumber}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={pageNumStart}
                        onChange={(e) => setPageNumStart(e.target.value)}
                        data-testid="input-page-num-start"
                      />
                    </div>
                  </div>
                </div>
              )}

              {slug === 'protect-pdf' && (
                <div
                  className="flex items-start gap-3 rounded-lg p-3 text-sm"
                  style={{
                    background: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.25)',
                  }}
                >
                  <span className="mt-0.5 text-orange-500">⚠</span>
                  <span className="text-foreground/85">
                    {lang === 'ru'
                      ? 'PDF-шифрование в браузере не поддерживается. Используйте Adobe Acrobat, LibreOffice или 7-Zip.'
                      : 'Browser-side PDF encryption is not supported. Use Adobe Acrobat, LibreOffice, or 7-Zip to add passwords.'}
                  </span>
                </div>
              )}

              {slug === 'sign-pdf' && (
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

              {slug === 'redact-pdf' && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {lang === 'ru' ? 'Текст для затирания' : 'Text to redact'}
                  </Label>
                  <Input
                    value={redactSearchText}
                    onChange={(e) => setRedactSearchText(e.target.value)}
                    placeholder={lang === 'ru' ? 'например: SECRET-123' : 'e.g. SECRET-123'}
                    data-testid="input-redact-text"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {lang === 'ru'
                      ? 'Страницы с найденным текстом растеризируются — текст нельзя будет извлечь из PDF.'
                      : 'Pages containing the text are rasterised — the text cannot be extracted from the output PDF.'}
                  </p>
                </div>
              )}

              {slug === 'auto-redact' && (
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium">
                    {lang === 'ru' ? 'Что искать и затирать' : 'What to find and redact'}
                  </Label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={redactEmails}
                      onCheckedChange={(v) => setRedactEmails(v === true)}
                      data-testid="checkbox-redact-emails"
                    />
                    {t.tool.redactEmails}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={redactPhones}
                      onCheckedChange={(v) => setRedactPhones(v === true)}
                      data-testid="checkbox-redact-phones"
                    />
                    {t.tool.redactPhones}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={redactSsn}
                      onCheckedChange={(v) => setRedactSsn(v === true)}
                      data-testid="checkbox-redact-ssn"
                    />
                    {t.tool.redactSsn}
                  </label>
                  <div className="pt-1">
                    <Label className="text-sm font-medium mb-1.5 block">{t.tool.customRegex}</Label>
                    <Input
                      value={redactRegex}
                      onChange={(e) => setRedactRegex(e.target.value)}
                      placeholder={t.tool.regexPlaceholder}
                      data-testid="input-redact-regex"
                    />
                  </div>
                </div>
              )}

              {(slug === 'pdf-to-jpg' || slug === 'pdf-to-png') && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.tool.qualityScale}</Label>
                  <Select
                    value={imageScale}
                    onValueChange={(v) => setImageScale(v as any)}
                    data-testid="select-image-scale"
                  >
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

              {slug === 'ocr-pdf' && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.tool.ocrLanguage}</Label>
                  <Select
                    value={ocrLanguage}
                    onValueChange={setOcrLanguage}
                    data-testid="select-ocr-language"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OCR_LANG_OPTIONS.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {lang === 'ru'
                      ? 'OCR работает на вашем устройстве и может занять несколько минут.'
                      : 'OCR runs locally on your device and may take a few minutes.'}
                  </p>
                </div>
              )}

              {slug === 'crop-pdf' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Checkbox
                      checked={autoCrop}
                      onCheckedChange={(v) => setAutoCrop(v === true)}
                      data-testid="checkbox-auto-crop"
                    />
                    {t.tool.autoCrop}
                  </label>
                  <p className="text-xs text-muted-foreground">{t.tool.cropMargins}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-medium mb-1 block">{t.tool.mTop}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={cropTop}
                        onChange={(e) => setCropTop(e.target.value)}
                        disabled={autoCrop}
                        data-testid="input-crop-top"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1 block">{t.tool.mRight}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={cropRight}
                        onChange={(e) => setCropRight(e.target.value)}
                        disabled={autoCrop}
                        data-testid="input-crop-right"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1 block">{t.tool.mBottom}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={cropBottom}
                        onChange={(e) => setCropBottom(e.target.value)}
                        disabled={autoCrop}
                        data-testid="input-crop-bottom"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1 block">{t.tool.mLeft}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={cropLeft}
                        onChange={(e) => setCropLeft(e.target.value)}
                        disabled={autoCrop}
                        data-testid="input-crop-left"
                      />
                    </div>
                  </div>
                </div>
              )}

              {slug === 'resize-pages' && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.tool.targetSize}</Label>
                  <Select
                    value={targetPageSize}
                    onValueChange={setTargetPageSize}
                    data-testid="select-resize-size"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {slug === 'scanner-effect' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t.tool.intensity}: {scannerIntensity[0]}%
                  </Label>
                  <Slider
                    min={10}
                    max={100}
                    step={5}
                    value={scannerIntensity}
                    onValueChange={setScannerIntensity}
                    data-testid="slider-intensity"
                  />
                </div>
              )}

              {slug === 'n-up-pdf' && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.tool.pagesPerSheet}</Label>
                  <Select
                    value={nUpCount}
                    onValueChange={(v) => setUpCount(v as any)}
                    data-testid="select-nup-count"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {slug === 'bates-numbering' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {t.tool.prefixLabel}
                      </Label>
                      <Input
                        value={batesPrefix}
                        onChange={(e) => setBatesPrefix(e.target.value)}
                        placeholder="DOC-2024-"
                        data-testid="input-bates-prefix"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {t.tool.startNumber}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={batesStart}
                        onChange={(e) => setBatesStart(e.target.value)}
                        data-testid="input-bates-start"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {t.tool.digitsLabel}
                      </Label>
                      <Select
                        value={batesDigits}
                        onValueChange={setBatesDigits}
                        data-testid="select-bates-digits"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['3', '4', '5', '6', '7', '8'].map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">{t.tool.position}</Label>
                      <Select
                        value={batesPosition}
                        onValueChange={setBatesPosition}
                        data-testid="select-bates-position"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BATES_POSITIONS.map((pos) => (
                            <SelectItem key={pos} value={pos}>
                              {pos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {slug === 'add-background' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {t.tool.backgroundColor}
                    </Label>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-14 h-10 rounded-md border border-input bg-transparent cursor-pointer"
                      data-testid="input-bg-color"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t.tool.opacity}: {bgOpacity[0]}%
                    </Label>
                    <Slider
                      min={10}
                      max={100}
                      step={5}
                      value={bgOpacity}
                      onValueChange={setBgOpacity}
                      data-testid="slider-bg-opacity"
                    />
                  </div>
                </div>
              )}

              {slug === 'add-blank-pages' && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {t.tool.blankPositions}
                  </Label>
                  <Input
                    value={blankPositions}
                    onChange={(e) => setBlankPositions(e.target.value)}
                    placeholder={lang === 'ru' ? 'например: 1, 3, end' : 'e.g. 1, 3, end'}
                    data-testid="input-blank-positions"
                  />
                </div>
              )}

              {slug === 'overlay-pdf' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t.tool.opacity}: {overlayOpacity[0]}%
                  </Label>
                  <Slider
                    min={10}
                    max={100}
                    step={5}
                    value={overlayOpacity}
                    onValueChange={setOverlayOpacity}
                    data-testid="slider-overlay-opacity"
                  />
                </div>
              )}

              {slug === 'form-fill' && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {t.tool.formValuesJson}
                  </Label>
                  <textarea
                    value={formValuesJson}
                    onChange={(e) => setFormValuesJson(e.target.value)}
                    placeholder={t.tool.formValuesPlaceholder}
                    className="w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm resize-y font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="textarea-form-values"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {lang === 'ru'
                      ? 'Заполните только те поля, имена которых совпадают с формой PDF.'
                      : 'Only fields whose names match the PDF form are filled.'}
                  </p>
                </div>
              )}

              {slug === 'pdf-metadata' && metadataFields !== null && (
                <div className="space-y-3">
                  {(['title', 'author', 'subject', 'keywords'] as const).map((field) => (
                    <div key={field}>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {field === 'title'
                          ? t.tool.metaTitle
                          : field === 'author'
                            ? t.tool.metaAuthor
                            : field === 'subject'
                              ? t.tool.metaSubject
                              : t.tool.metaKeywords}
                      </Label>
                      <Input
                        value={metadataFields[field] ?? ''}
                        onChange={(e) =>
                          setMetadataFields((prev) => ({
                            ...(prev ?? {}),
                            [field]: e.target.value,
                          }))
                        }
                        data-testid={`input-meta-${field}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <AnimatePresence mode="wait">
                  {state === 'processing' ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3"
                    >
                      <ProgressRing progress={progress} size={48} />
                      <div>
                        <span className="text-sm text-muted-foreground block">
                          {t.tool.processing}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                          className="mt-1"
                          data-testid="button-cancel"
                        >
                          {t.tool.cancel}
                        </Button>
                      </div>
                    </motion.div>
                  ) : state === 'done' ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col gap-3"
                    >
                      {!isAudioTool && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <Button
                            onClick={handleDownload}
                            className="gap-2 shadow-lg shadow-primary/20"
                            data-testid="button-download"
                          >
                            <Download className="w-4 h-4" />
                            {t.tool.download} {output.extension.toUpperCase()}
                            {resultSize && (
                              <span className="text-xs opacity-70">
                                ({formatBytes(resultSize)})
                              </span>
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
                          <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-4 h-4" />
                            <span>{t.tool.doneLabel}</span>
                          </div>
                        </div>
                      )}
                      {isAudioTool && audioSpoken && (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            {lang === 'ru'
                              ? `Зачитано символов: ${audioSpoken.chars} (${audioSpoken.lang}).`
                              : `Read ${audioSpoken.chars} characters aloud (${audioSpoken.lang}).`}
                          </span>
                        </div>
                      )}
                      {report && report.reductionPercent !== null && (
                        <p className="text-xs text-muted-foreground" data-testid="result-report">
                          {formatBytes(report.inputBytes)} → {formatBytes(report.outputBytes)} (-
                          {report.reductionPercent}%)
                        </p>
                      )}
                    </motion.div>
                  ) : state === 'error' ? (
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
                      <Button variant="outline" size="sm" onClick={reset}>
                        {t.tool.tryAgain}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Button
                        onClick={process}
                        disabled={
                          slug === 'protect-pdf' || (files.length === 0 && slug !== 'text-to-pdf')
                        }
                        className="gap-2 shadow-lg shadow-primary/20"
                        data-testid="button-process"
                      >
                        <Icon className="w-4 h-4" />
                        {slug === 'pdf-metadata' && metadataFields !== null
                          ? t.tool.saveMetadata
                          : (toolTr?.name ?? tool.name)}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="rounded-md border border-border/50 bg-muted/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium">{t.tool.privacy}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.tool.privacyDesc}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                {t.tool.howToUse}
              </h3>
              <div className="rounded-md border border-card-border bg-card p-4 space-y-4">
                {steps.map((text, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
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

            <div className="rounded-md border border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{t.tool.goPro}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{t.tool.goProDesc}</p>
              <Button size="sm" className="w-full" asChild>
                <Link href="/pricing">{t.tool.viewPlans}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToolTextLike {
  bytes: Uint8Array;
  content: string;
  target: 'text' | 'html';
}

type Entry = NonNullable<ReturnType<typeof getToolRegistryEntry>>;

/**
 * Единая точка запуска гибридного инструмента: воркер, если доступен,
 * иначе та же функция в main thread (fallback гарантирует результат).
 */
function runOrFallback<T>(
  entry: Entry,
  fallback: () => Promise<T>,
  opts: { file: File; args?: unknown[]; onProgress?: (pct: number) => void; signal?: AbortSignal },
): Promise<T> {
  if (!entry.execution.workerOp) {
    return fallback();
  }
  return runToolWorkerTask(entry, fallback, opts);
}

function SecondFileInput({
  label,
  testId,
  accept,
  file,
  onChange,
}: {
  label: string;
  testId: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputId = `${testId}-control`;
  return (
    <div>
      {/* Visually hidden input + label-as-button: a stray page click no longer
          hits a native file control, while setInputFiles/testid keeps working. */}
      <Label
        htmlFor={inputId}
        className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        {file ? `${file.name} • ${formatBytes(file.size)}` : label}
      </Label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        data-testid={testId}
        className="sr-only"
      />
    </div>
  );
}

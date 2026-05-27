import { useState, useCallback, useEffect } from "react";
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
  Scissors,
  RotateCw,
  Hash,
  AlignLeft,
  Droplets,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/file-upload";
import { ProgressRing } from "@/components/progress-ring";
import { ToolCard } from "@/components/tool-card";
import { getToolBySlug, tools, categoryColors, isToolLaunchReady } from "@/lib/tools";
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
} from "@/lib/pdf-utils";
import { cn } from "@/lib/utils";
import { getWorkflowSuggestionsForTool, rememberRecentTool } from "@/lib/tool-experience";
import { preloadToolRoute } from "@/lib/route-preload";

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
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "14200" },
      "inLanguage": ["en","ru","es","fr","de","zh","ja","ko","ar","hi","pt","it","tr","pl","nl","uk","vi","id","th","cs"],
    } : undefined,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

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
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [freeTextContent, setFreeTextContent] = useState("");
  const [password, setPassword] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [redactSearchText, setRedactSearchText] = useState("");
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultHtml, setResultHtml] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<"1" | "2" | "3">("2");
  const [ocrLanguage, setOcrLanguage] = useState(lang === "ru" ? "rus" : "eng");

  const ocrLanguageOptions = [
    { value: "eng", label: lang === "ru" ? "Английский" : "English" },
    { value: "rus", label: lang === "ru" ? "Русский" : "Russian" },
    { value: "spa", label: lang === "ru" ? "Испанский" : "Spanish" },
    { value: "fra", label: lang === "ru" ? "Французский" : "French" },
    { value: "deu", label: lang === "ru" ? "Немецкий" : "German" },
    { value: "ita", label: lang === "ru" ? "Итальянский" : "Italian" },
    { value: "por", label: lang === "ru" ? "Португальский" : "Portuguese" },
    { value: "ara", label: lang === "ru" ? "Арабский" : "Arabic" },
  ];

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
    },
    [tool]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setState("idle");
    setProgress(0);
    setError(null);
    setResultBytes(null);
    setResultSize(null);
    setResultText(null);
    setResultHtml(null);
    setSplitPartsCount(null);
    setPagesToDelete("");
    setPagesToExtract("");
  }, []);

  const process = useCallback(async () => {
    if (!tool || (files.length === 0 && slug !== "text-to-pdf")) {
      setError(t.tool.selectFile);
      return;
    }

    setState("processing");
    setProgress(10);
    setError(null);

    try {
      let result: Uint8Array | null = null;
      const simulateProgress = (start: number, end: number) => {
        const steps = 8;
        const step = (end - start) / steps;
        for (let i = 1; i <= steps; i++) {
          setTimeout(() => setProgress(start + Math.round(step * i)), i * 200);
        }
      };
      if (slug !== "redact-pdf") simulateProgress(10, 85);

      switch (slug) {
        case "merge-pdf":
          result = await mergePdfs(files);
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
            const start = parseInt(splitStart) || 1;
            const pageCount = parseInt(splitEnd) || 999;
            const results = await splitPdf(files[0], [{ start, end: pageCount }]);
            setSplitPartsCount(1);
            result = results[0];
          }
          break;
        }
        case "rotate-pdf":
          result = await rotatePdf(files[0], parseInt(rotation) as 90 | 180 | 270);
          break;
        case "delete-pages": {
          const pageCount = await getPdfPageCount(files[0]);
          const indices = parsePageSelection(pagesToDelete, pageCount, { allowDuplicates: false });
          result = await deletePages(files[0], indices);
          break;
        }
        case "extract-pages":
        case "reorder-pages": {
          const pageCount = await getPdfPageCount(files[0]);
          const indices = parsePageSelection(pagesToExtract, pageCount, {
            allowDuplicates: slug === "reorder-pages",
          });
          result = slug === "reorder-pages"
            ? await reorderPages(files[0], indices)
            : await extractPages(files[0], indices);
          break;
        }
        case "compress-pdf":
          result = await compressPdf(files[0], compressionLevel);
          break;
        case "watermark-pdf":
          result = await addWatermark(files[0], watermarkText, watermarkOpacity[0], 45, watermarkPosition);
          break;
        case "pdf-page-numbers":
          result = await addPageNumbers(files[0], pageNumPosition, 1, pageNumFormat);
          break;
        case "images-to-pdf":
        case "photo-to-pdf":
          result = await imagesToPdf(files);
          break;
        case "text-to-pdf": {
          const text = files.length > 0
            ? await files[0].text()
            : freeTextContent;
          result = await textToPdf(text);
          break;
        }
        case "pdf-header-footer":
          result = await addHeaderFooter(files[0], headerText, footerText);
          break;
        case "repair-pdf":
          result = await repairPdf(files[0]);
          break;
        case "flatten-pdf":
          result = await flattenPdf(files[0]);
          break;
        case "protect-pdf":
          result = await protectPdf(files[0], password);
          break;
        case "unlock-pdf":
          result = await unlockPdf(files[0], password);
          break;
        case "sign-pdf":
          result = await signPdf(files[0], signatureText);
          break;
        case "redact-pdf":
          result = await redactPdf(files[0], redactSearchText, setProgress);
          break;
        case "word-to-pdf":
          result = await wordToPdf(files[0]);
          break;
        case "excel-to-pdf":
          result = await excelToPdf(files[0]);
          break;
        case "pdf-to-word":
          result = await pdfToWord(files[0]);
          break;
        case "pdf-to-excel":
          result = await pdfToExcel(files[0]);
          break;
        case "pdf-to-text": {
          const text = await pdfToText(files[0]);
          setResultText(text);
          result = new Uint8Array(new TextEncoder().encode(text));
          break;
        }
        case "pdf-to-html": {
          const html = await pdfToHtml(files[0]);
          setResultHtml(html);
          result = new Uint8Array(new TextEncoder().encode(html));
          break;
        }
        case "pdf-to-jpg":
        case "pdf-to-png": {
          const fmt = slug === "pdf-to-jpg" ? "jpg" : "png";
          const scale = parseInt(imageScale) || 2;
          const images = await pdfToImages(files[0], fmt, scale);
          const origName = files[0].name.replace(/\.[^.]+$/, "");
          result = await pdfImagesAsZip(images, fmt, origName);
          break;
        }
        case "ocr-pdf":
          result = await ocrPdf(files[0], ocrLanguage, setProgress);
          break;
        default:
          throw new Error(t.tool.proOnlyError);
      }

      setProgress(100);
      setResultBytes(result);
      setResultSize(result?.length ?? null);
      setState("done");
    } catch (err: any) {
      setError(normalizeToolError(err));
      setState("error");
    }
  }, [
    tool, files, slug, splitStart, splitEnd, splitMode, splitEveryN, rotation,
    pagesToDelete, pagesToExtract, compressionLevel,
    watermarkText, watermarkOpacity, watermarkPosition, pageNumPosition, pageNumFormat,
    headerText, footerText, freeTextContent,
    password, signatureText, redactSearchText, imageScale, ocrLanguage, t, lang, setProgress, normalizeToolError,
  ]);

  const handleDownload = useCallback(() => {
    if (!tool) return;
    const origName = files[0]?.name?.replace(/\.[^.]+$/, "") || "output";
    if (resultText !== null && (slug === "pdf-to-text")) {
      downloadText(resultText, `${origName}-pdfx.txt`);
      return;
    }
    if (resultHtml !== null && slug === "pdf-to-html") {
      downloadHtml(resultHtml, `${origName}-pdfx.html`);
      return;
    }
    if (!resultBytes) return;
    if (slug === "pdf-to-jpg" || slug === "pdf-to-png") {
      downloadBlob(resultBytes, `${origName}-pdfx-images.zip`, "application/zip");
      return;
    }
    if (slug === "split-pdf" && (splitMode === "all" || splitMode === "every-n")) {
      downloadBlob(resultBytes, `${origName}-split.zip`, "application/zip");
      return;
    }
    const mimeType =
      tool.outputExt === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : tool.outputExt === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";
    downloadBlob(resultBytes, `${origName}-pdfx.${tool.outputExt || "pdf"}`, mimeType);
  }, [resultBytes, resultText, resultHtml, files, tool, slug, splitMode]);

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

  useEffect(() => {
    rememberRecentTool(tool.slug);
  }, [tool.slug]);

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
                label={tool.accept?.includes(".pdf") ? t.tool.dropPdf : t.tool.chooseFile}
                description={`${tool.multiple ? t.tool.multipleFiles : t.tool.singleFile} • ${t.tool.maxSize} ${maxSizeMb}MB`}
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
                      {lang === "ru" ? "Язык OCR" : "OCR language"}
                    </Label>
                    <Select value={ocrLanguage} onValueChange={setOcrLanguage}>
                      <SelectTrigger data-testid="select-ocr-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ocrLanguageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
    </div>
  );
}


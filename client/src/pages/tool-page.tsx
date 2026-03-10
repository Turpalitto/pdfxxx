import { useState, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/lang-context";
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
import { getToolBySlug, tools, categoryColors } from "@/lib/tools";
import { getToolTranslation } from "@/lib/tool-translations";
import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  deletePages,
  extractPages,
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
  pdfToText,
  pdfToImages,
  pdfToHtml,
  pdfImagesAsZip,
  downloadBlob,
  downloadText,
  downloadHtml,
  formatBytes,
} from "@/lib/pdf-utils";
import { cn } from "@/lib/utils";

type ProcessingState = "idle" | "processing" | "done" | "error";

export default function ToolPage() {
  const [, params] = useRoute("/tools/:slug");
  const slug = params?.slug || "";
  const tool = getToolBySlug(slug);
  const { t, lang } = useLang();
  const toolTr = tool ? getToolTranslation(tool.slug, lang) : null;

  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const [splitStart, setSplitStart] = useState("1");
  const [splitEnd, setSplitEnd] = useState("");
  const [rotation, setRotation] = useState<"90" | "180" | "270">("90");
  const [pagesToDelete, setPagesToDelete] = useState("");
  const [pagesToExtract, setPagesToExtract] = useState("");
  const [compressionLevel, setCompressionLevel] = useState<"low" | "medium" | "high">("medium");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState([0.3]);
  const [pageNumPosition, setPageNumPosition] = useState<"bottom-center" | "bottom-right" | "bottom-left" | "top-center">("bottom-center");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [freeTextContent, setFreeTextContent] = useState("");
  const [pdfPassword, setPdfPassword] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultHtml, setResultHtml] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<"1" | "2" | "3">("2");

  const handleFiles = useCallback(
    (newFiles: File[]) => {
      if (tool?.multiple) {
        setFiles((prev) => [...prev, ...newFiles]);
      } else {
        setFiles(newFiles);
      }
      setState("idle");
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
  }, []);

  const process = useCallback(async () => {
    if (!tool || (files.length === 0 && slug !== "text-to-pdf")) {
      setError("Please select a file first.");
      return;
    }

    setState("processing");
    setProgress(10);
    setError(null);

    try {
      let result: Uint8Array | null = null;
      const simulateProgress = (start: number, end: number) => {
        const steps = 5;
        const step = (end - start) / steps;
        for (let i = 1; i <= steps; i++) {
          setTimeout(() => setProgress(start + step * i), i * 100);
        }
      };
      simulateProgress(10, 80);

      switch (slug) {
        case "merge-pdf":
          result = await mergePdfs(files);
          break;
        case "split-pdf": {
          const start = parseInt(splitStart) || 1;
          const pageCount = parseInt(splitEnd) || 999;
          const results = await splitPdf(files[0], [{ start, end: pageCount }]);
          result = results[0];
          break;
        }
        case "rotate-pdf":
          result = await rotatePdf(files[0], parseInt(rotation) as 90 | 180 | 270);
          break;
        case "delete-pages": {
          const indices = pagesToDelete
            .split(",")
            .map((s) => parseInt(s.trim()) - 1)
            .filter((n) => !isNaN(n) && n >= 0);
          result = await deletePages(files[0], indices);
          break;
        }
        case "extract-pages":
        case "reorder-pages": {
          const indices = pagesToExtract
            .split(",")
            .map((s) => parseInt(s.trim()) - 1)
            .filter((n) => !isNaN(n) && n >= 0);
          result = await extractPages(files[0], indices);
          break;
        }
        case "compress-pdf":
          result = await compressPdf(files[0], compressionLevel);
          break;
        case "watermark-pdf":
          result = await addWatermark(files[0], watermarkText, watermarkOpacity[0]);
          break;
        case "pdf-page-numbers":
          result = await addPageNumbers(files[0], pageNumPosition);
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
          result = await protectPdf(files[0], pdfPassword);
          break;
        case "unlock-pdf":
          result = await unlockPdf(files[0]);
          break;
        case "sign-pdf":
          result = await signPdf(files[0], signatureText);
          break;
        case "redact-pdf":
          result = await redactPdf(files[0]);
          break;
        case "word-to-pdf":
          result = await wordToPdf(files[0]);
          break;
        case "excel-to-pdf":
          throw new Error("Excel to PDF conversion requires cloud processing. Available in Pro plan.");
        case "pdf-to-word":
          throw new Error("PDF to Word conversion requires cloud processing. Available in Pro plan.");
        case "pdf-to-excel":
          throw new Error("PDF to Excel conversion requires cloud processing. Available in Pro plan.");
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
          throw new Error("OCR processing requires cloud infrastructure. Available in Pro plan.");
        default:
          throw new Error(`Tool "${slug}" is not yet implemented.`);
      }

      setProgress(100);
      setResultBytes(result);
      setResultSize(result?.length ?? null);
      setState("done");
    } catch (err: any) {
      setError(err?.message || "An error occurred during processing.");
      setState("error");
    }
  }, [
    tool, files, slug, splitStart, splitEnd, rotation,
    pagesToDelete, pagesToExtract, compressionLevel,
    watermarkText, watermarkOpacity, pageNumPosition,
    headerText, footerText, freeTextContent,
    pdfPassword, signatureText, imageScale,
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
    downloadBlob(resultBytes, `${origName}-pdfx.${tool.outputExt || "pdf"}`);
  }, [resultBytes, resultText, resultHtml, files, tool, slug]);

  if (!tool) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h1 className="text-2xl font-bold">Tool not found</h1>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  const colors = categoryColors[tool.color] || categoryColors.blue;
  const Icon = tool.icon;
  const relatedTools = tools
    .filter((t) => t.category === tool.category && t.slug !== slug)
    .slice(0, 4);

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
              <div className={cn("w-12 h-12 rounded-md flex items-center justify-center shrink-0", colors.bg)}>
                <Icon className={cn("w-6 h-6", colors.text)} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold">{toolTr?.name ?? tool.name}</h1>
                  {tool.pro && (
                    <Badge variant="secondary">
                      <Lock className="w-3 h-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{toolTr?.description ?? tool.description}</p>
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-5 space-y-5">
              <FileUpload
                accept={tool.accept}
                multiple={tool.multiple}
                onFiles={handleFiles}
                files={files}
                onRemoveFile={removeFile}
                label={`Drop your ${tool.accept?.includes(".pdf") ? "PDF" : "file"} here`}
                description={`${tool.multiple ? "Multiple files supported" : "Single file"} • Max 25MB`}
              />

              {slug === "text-to-pdf" && files.length === 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Or paste text content</Label>
                  <textarea
                    value={freeTextContent}
                    onChange={(e) => setFreeTextContent(e.target.value)}
                    placeholder="Type or paste your text here..."
                    className="w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="input-text-content"
                  />
                </div>
              )}

              {slug === "split-pdf" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">From page</Label>
                    <Input
                      type="number"
                      min="1"
                      value={splitStart}
                      onChange={(e) => setSplitStart(e.target.value)}
                      data-testid="input-split-start"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">To page</Label>
                    <Input
                      type="number"
                      min="1"
                      value={splitEnd}
                      onChange={(e) => setSplitEnd(e.target.value)}
                      placeholder="Last page"
                      data-testid="input-split-end"
                    />
                  </div>
                </div>
              )}

              {slug === "rotate-pdf" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Rotation angle</Label>
                  <Select value={rotation} onValueChange={(v) => setRotation(v as any)} data-testid="select-rotation">
                    <SelectTrigger data-testid="select-rotation-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90° Clockwise</SelectItem>
                      <SelectItem value="180">180°</SelectItem>
                      <SelectItem value="270">270° (90° Counter-clockwise)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(slug === "delete-pages") && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    Pages to delete (e.g. 1, 3, 5)
                  </Label>
                  <Input
                    value={pagesToDelete}
                    onChange={(e) => setPagesToDelete(e.target.value)}
                    placeholder="1, 3, 5-7"
                    data-testid="input-pages-delete"
                  />
                </div>
              )}

              {(slug === "extract-pages" || slug === "reorder-pages") && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {slug === "reorder-pages" ? "New page order (e.g. 3, 1, 2)" : "Pages to extract (e.g. 1, 3, 5)"}
                  </Label>
                  <Input
                    value={pagesToExtract}
                    onChange={(e) => setPagesToExtract(e.target.value)}
                    placeholder="1, 2, 3"
                    data-testid="input-pages-extract"
                  />
                </div>
              )}

              {slug === "compress-pdf" && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Compression level</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setCompressionLevel(level)}
                        className={cn(
                          "py-2 px-3 rounded-md text-sm font-medium border transition-all",
                          compressionLevel === level
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                        data-testid={`button-compression-${level}`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {slug === "watermark-pdf" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Watermark text</Label>
                    <Input
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="CONFIDENTIAL"
                      data-testid="input-watermark-text"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Opacity: {Math.round(watermarkOpacity[0] * 100)}%
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
                </div>
              )}

              {slug === "pdf-page-numbers" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Position</Label>
                  <Select value={pageNumPosition} onValueChange={(v) => setPageNumPosition(v as any)}>
                    <SelectTrigger data-testid="select-page-num-position">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-center">Bottom Center</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="top-center">Top Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {slug === "protect-pdf" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Password</Label>
                  <Input
                    type="password"
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    data-testid="input-pdf-password"
                  />
                </div>
              )}

              {slug === "sign-pdf" && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Signature text</Label>
                  <Input
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    placeholder="Your Name"
                    data-testid="input-signature-text"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Will be placed in the bottom-right of the last page.</p>
                </div>
              )}

              {(slug === "pdf-to-jpg" || slug === "pdf-to-png") && (
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Quality / Scale</Label>
                  <Select value={imageScale} onValueChange={(v) => setImageScale(v as any)} data-testid="select-image-scale">
                    <SelectTrigger data-testid="select-image-scale-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Standard (72 DPI)</SelectItem>
                      <SelectItem value="2">High (150 DPI)</SelectItem>
                      <SelectItem value="3">Ultra (300 DPI)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">Output: ZIP file containing one image per page.</p>
                </div>
              )}

              {slug === "pdf-header-footer" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Header text</Label>
                    <Input
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      placeholder="Document header"
                      data-testid="input-header-text"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Footer text</Label>
                    <Input
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      placeholder="Document footer"
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
                      <span className="text-sm text-muted-foreground">{t.tool.processing}</span>
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
                        {t.tool.download} {tool.outputExt?.toUpperCase() || "PDF"}
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
                          <span>Done! {resultSize && files[0] && (
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
                      <Button variant="outline" size="sm" onClick={reset}>Try again</Button>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Button
                        onClick={process}
                        disabled={files.length === 0 && slug !== "text-to-pdf"}
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

            <div className="rounded-md border border-border/50 bg-muted/20 p-5">
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
              <div className="rounded-md border border-card-border bg-card p-4 space-y-4">
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

            <div className="rounded-md border border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5 p-5">
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

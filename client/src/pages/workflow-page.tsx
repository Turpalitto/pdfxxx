import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Plus,
  Play,
  ArrowUp,
  ArrowDown,
  X,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Workflow as WorkflowIcon,
  ArrowDownToLine,
  Merge,
  Save,
  FolderOpen,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";
import { downloadBlob, formatBytes } from "@/lib/pdf-utils";
import {
  WORKFLOW_STEPS,
  WORKFLOW_PRESETS,
  getWorkflowStep,
  defaultStepOptions,
  pickCopy,
  runWorkflow,
  WorkflowAbortError,
  type WorkflowItem,
  type StepOption,
  type StepStatus,
  type WorkflowRunResult,
} from "@/lib/workflow-engine";
import {
  deleteSavedWorkflowChain,
  loadSavedWorkflowChains,
  saveWorkflowChain,
  savedItemsToWorkflowItems,
  type SavedWorkflowChain,
} from "@/lib/workflow-storage";

export default function WorkflowPage() {
  const { lang } = useLang();
  const [location, navigate] = useLocation();
  const ru = lang === "ru";

  useSeo({
    title: ru ? "PDF Workflow — цепочки инструментов | PDFX" : "PDF Workflow — chain tools | PDFX",
    description: ru
      ? "Свяжите несколько PDF-операций в один проход: объединение, сжатие, водяной знак и больше — полностью в браузере."
      : "Chain several PDF operations into a single pass: merge, compress, watermark and more — fully in your browser.",
    path: "/workflow",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [statuses, setStatuses] = useState<Record<number, StepStatus>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<WorkflowRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedChains, setSavedChains] = useState<SavedWorkflowChain[]>(() =>
    loadSavedWorkflowChains(),
  );
  const [chainName, setChainName] = useState("");
  const uidRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const appliedPresetRef = useRef<string | null>(null);

  const nextUid = useCallback(() => `wf-${uidRef.current++}`, []);

  const resetRun = useCallback(() => {
    setResult(null);
    setError(null);
    setStatuses({});
  }, []);

  const addStep = useCallback(
    (stepId: string) => {
      const def = getWorkflowStep(stepId);
      if (!def) return;
      setItems((prev) => [...prev, { uid: nextUid(), stepId, options: defaultStepOptions(def) }]);
      resetRun();
    },
    [nextUid, resetRun],
  );

  const removeStep = useCallback(
    (uid: string) => {
      setItems((prev) => prev.filter((item) => item.uid !== uid));
      resetRun();
    },
    [resetRun],
  );

  const moveStep = useCallback(
    (index: number, dir: -1 | 1) => {
      setItems((prev) => {
        const target = index + dir;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        return next;
      });
      resetRun();
    },
    [resetRun],
  );

  const updateOption = useCallback(
    (uid: string, key: string, value: string | number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.uid === uid ? { ...item, options: { ...item.options, [key]: value } } : item,
        ),
      );
      resetRun();
    },
    [resetRun],
  );

  const applyPreset = useCallback(
    (stepIds: string[]) => {
      setItems(
        stepIds
          .map((stepId) => {
            const def = getWorkflowStep(stepId);
            if (!def) return null;
            return { uid: nextUid(), stepId, options: defaultStepOptions(def) };
          })
          .filter((item): item is WorkflowItem => item !== null),
      );
      resetRun();
    },
    [nextUid, resetRun],
  );

  useEffect(() => {
    const query = typeof window === "undefined" ? "" : window.location.search;
    const presetId = new URLSearchParams(query).get("preset");

    if (!presetId || appliedPresetRef.current === presetId) {
      return;
    }

    const preset = WORKFLOW_PRESETS.find((item) => item.id === presetId);

    if (!preset) {
      return;
    }

    appliedPresetRef.current = presetId;
    applyPreset(preset.stepIds);
    navigate("/workflow", { replace: true });
  }, [applyPreset, location, navigate]);

  const clearAll = useCallback(() => {
    setItems([]);
    resetRun();
  }, [resetRun]);

  const handleSaveChain = useCallback(() => {
    if (items.length === 0 || running) return;

    const fallbackName = ru ? "Моя цепочка" : "My workflow";
    const next = saveWorkflowChain({
      name: chainName || fallbackName,
      items,
    });
    setSavedChains(next);
    setChainName("");
  }, [chainName, items, ru, running]);

  const handleLoadChain = useCallback(
    (chain: SavedWorkflowChain) => {
      if (running) return;

      setItems(savedItemsToWorkflowItems(chain.items, nextUid));
      resetRun();
    },
    [nextUid, resetRun, running],
  );

  const handleDeleteChain = useCallback((id: string) => {
    setSavedChains(deleteSavedWorkflowChain(id));
  }, []);

  const handleRun = useCallback(async () => {
    if (files.length === 0 || items.length === 0 || running) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setError(null);
    setResult(null);
    setStatuses(Object.fromEntries(items.map((_, i) => [i, "pending" as StepStatus])));
    try {
      const runResult = await runWorkflow(files, items, (info) => {
        setStatuses((prev) => ({ ...prev, [info.index]: info.status }));
      }, { signal: controller.signal });
      setResult(runResult);
    } catch (e) {
      if (e instanceof WorkflowAbortError || controller.signal.aborted) {
        resetRun();
        return;
      }

      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      setRunning(false);
    }
  }, [files, items, resetRun, running]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleDownload = useCallback(() => {
    if (!result) return;
    downloadBlob(result.bytes, "workflow.pdf");
  }, [result]);

  const canRun = files.length > 0 && items.length > 0 && !running;
  const savedPct =
    result && result.inputBytes > 0
      ? Math.round(((result.inputBytes - result.outputBytes) / result.inputBytes) * 100)
      : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <WorkflowIcon className="h-3.5 w-3.5" />
          {ru ? "Цепочки" : "Workflow"}
        </div>
        <h1 className="paper-title text-2xl font-bold text-foreground sm:text-3xl">
          {ru ? "Соберите цепочку из инструментов" : "Build a chain of tools"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {ru
            ? "Свяжите несколько операций в один проход — например объединить, сжать и поставить водяной знак. Результат каждого шага идёт на вход следующему. Всё в браузере, без загрузки на сервер."
            : "Chain several operations into one pass — for example merge, compress and watermark. Each step's output feeds the next. Everything runs in your browser, no upload."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column: upload + pipeline + run + result */}
        <div className="flex flex-col gap-6">
          {/* Upload */}
          <section className="pdfx-panel rounded-2xl p-5 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {ru ? "1. Загрузите PDF" : "1. Upload PDF"}
            </h2>
            <FileUpload
              accept=".pdf"
              multiple
              onFiles={(incoming) => {
                setFiles((prev) => [...prev, ...incoming]);
                resetRun();
              }}
              files={files}
              onRemoveFile={(index) => {
                setFiles((prev) => prev.filter((_, i) => i !== index));
                resetRun();
              }}
              onReorderFiles={(next) => {
                setFiles(next);
                resetRun();
              }}
              onValidationError={setValidationError}
              label={ru ? "Перетащите PDF сюда" : "Drop your PDF here"}
              description={ru ? "Один или несколько PDF" : "One or more PDF files"}
            />
            {validationError && (
              <p className="mt-2 text-xs text-rose-500">{validationError}</p>
            )}
            {files.length > 1 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Merge className="h-3.5 w-3.5" />
                {ru
                  ? `${files.length} файла будут объединены первым шагом.`
                  : `${files.length} files will be merged as the first step.`}
              </p>
            )}
          </section>

          {/* Pipeline */}
          <section className="pdfx-panel rounded-2xl p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {ru ? "2. Ваша цепочка" : "2. Your pipeline"}
              </h2>
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {ru ? "Очистить" : "Clear"}
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {ru
                  ? "Пока пусто. Добавьте шаги справа или выберите готовый сценарий."
                  : "Nothing yet. Add steps from the right or pick a ready-made preset."}
              </p>
            ) : (
              <ol className="flex flex-col gap-2.5" data-testid="workflow-pipeline">
                {files.length > 1 && (
                  <li className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold text-muted-foreground">
                      0
                    </span>
                    <Merge className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">
                      {ru ? "Объединить файлы" : "Merge files"}
                    </span>
                  </li>
                )}
                {items.map((item, index) => {
                  const def = getWorkflowStep(item.stepId);
                  if (!def) return null;
                  const StepIcon = def.icon;
                  const status = statuses[index];
                  return (
                    <li
                      key={item.uid}
                      className={cn(
                        "rounded-xl border bg-card px-3 py-3 transition-colors",
                        status === "running" && "border-primary/60",
                        status === "done" && "border-emerald-500/40",
                        status === "error" && "border-rose-500/50",
                        !status && "border-border",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                        <StepIcon className={cn("h-4 w-4 shrink-0", def.accent)} />
                        <span className="flex-1 text-sm font-medium text-foreground">
                          {pickCopy(def.label, lang)}
                        </span>
                        <StatusBadge status={status} ru={ru} />
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => moveStep(index, -1)}
                            disabled={index === 0 || running}
                            aria-label={ru ? "Выше" : "Move up"}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => moveStep(index, 1)}
                            disabled={index === items.length - 1 || running}
                            aria-label={ru ? "Ниже" : "Move down"}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                            onClick={() => removeStep(item.uid)}
                            disabled={running}
                            aria-label={ru ? "Удалить" : "Remove"}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {def.options.length > 0 && (
                        <div className="mt-3 grid gap-3 pl-9 sm:grid-cols-2">
                          {def.options.map((opt) => (
                            <OptionControl
                              key={opt.key}
                              option={opt}
                              value={item.options[opt.key]}
                              lang={lang}
                              disabled={running}
                              onChange={(value) => updateOption(item.uid, opt.key, value)}
                            />
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Run */}
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleRun}
                  disabled={!canRun}
                  data-testid="workflow-run"
                >
                  {running ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {ru ? "Обработка…" : "Processing…"}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      {ru ? "Запустить цепочку" : "Run workflow"}
                    </>
                  )}
                </Button>
                {running && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 sm:w-40"
                    onClick={handleCancel}
                    data-testid="workflow-cancel"
                  >
                    <X className="h-4 w-4" />
                    {ru ? "Отмена" : "Cancel"}
                  </Button>
                )}
              </div>
              {files.length === 0 && items.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {ru ? "Загрузите PDF, чтобы запустить." : "Upload a PDF to run."}
                </p>
              )}
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {ru ? "Готово" : "Done"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBytes(result.inputBytes)} → {formatBytes(result.outputBytes)}
                  {savedPct > 0 && (
                    <span className="text-emerald-600">
                      {" "}
                      ({ru ? "−" : "−"}
                      {savedPct}%)
                    </span>
                  )}
                </p>
                <Button className="mt-3 w-full gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  {ru ? "Скачать PDF" : "Download PDF"}
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: presets + palette */}
        <aside className="flex flex-col gap-6">
          {/* Presets */}
          <section className="pdfx-panel rounded-2xl p-5">
            <h2 className="mb-1 text-sm font-semibold text-foreground">
              {ru ? "Готовые сценарии" : "Ready-made presets"}
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {ru ? "Один клик — собрать цепочку." : "One click to build a chain."}
            </p>
            <div className="flex flex-col gap-2">
              {WORKFLOW_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.stepIds)}
                  disabled={running}
                  className="rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
                >
                  <span className="block text-sm font-medium text-foreground">
                    {pickCopy(preset.title, lang)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {pickCopy(preset.description, lang)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Saved chains */}
          <section className="pdfx-panel rounded-2xl p-5">
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Save className="h-3.5 w-3.5 text-muted-foreground" />
              {ru ? "Сохранённые цепочки" : "Saved chains"}
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {ru
                ? "Сохраняются только шаги и настройки. PDF и имена файлов не записываются."
                : "Only steps and options are saved. PDFs and file names are never stored."}
            </p>
            <div className="flex flex-col gap-2">
              <input
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
                value={chainName}
                placeholder={ru ? "Название цепочки" : "Chain name"}
                disabled={running}
                data-testid="workflow-save-name"
                onChange={(event) => setChainName(event.target.value)}
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSaveChain}
                disabled={items.length === 0 || running}
                data-testid="workflow-save-chain"
              >
                <Save className="h-4 w-4" />
                {ru ? "Сохранить цепочку" : "Save chain"}
              </Button>
            </div>

            {savedChains.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                {ru ? "Пока нет сохранённых цепочек." : "No saved chains yet."}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2" data-testid="workflow-saved-chains">
                {savedChains.map((chain) => (
                  <div
                    key={chain.id}
                    className="rounded-xl border border-border bg-card px-3 py-2.5"
                    data-testid="workflow-saved-chain"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {chain.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {chain.items.length} {ru ? "шаг(а)" : "step(s)"}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-rose-500"
                        onClick={() => handleDeleteChain(chain.id)}
                        disabled={running}
                        aria-label={ru ? "Удалить цепочку" : "Delete chain"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full justify-start gap-2 px-0 text-xs"
                      onClick={() => handleLoadChain(chain)}
                      disabled={running}
                      data-testid="workflow-load-chain"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      {ru ? "Загрузить в конструктор" : "Load into builder"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Palette */}
          <section className="pdfx-panel rounded-2xl p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground" />
              {ru ? "Добавить шаг" : "Add a step"}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {WORKFLOW_STEPS.map((def) => {
                const StepIcon = def.icon;
                return (
                  <button
                    key={def.id}
                    onClick={() => addStep(def.id)}
                    disabled={running}
                    title={pickCopy(def.summary, lang)}
                    data-testid={`workflow-add-${def.id}`}
                    className="group flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
                  >
                    <StepIcon className={cn("h-4 w-4 shrink-0", def.accent)} />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                      {pickCopy(def.label, lang)}
                    </span>
                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status, ru }: { status: StepStatus | undefined; ru: boolean }) {
  if (!status || status === "pending") return null;
  if (status === "running") {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
  }
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-rose-500">
      <AlertCircle className="h-3.5 w-3.5" />
      {ru ? "Ошибка" : "Error"}
    </span>
  );
}

function OptionControl({
  option,
  value,
  lang,
  disabled,
  onChange,
}: {
  option: StepOption;
  value: string | number | undefined;
  lang: "ru" | "en" | string;
  disabled: boolean;
  onChange: (value: string | number) => void;
}) {
  const ru = lang === "ru";
  const labelText = ru ? option.label.ru : option.label.en;
  const inputClass =
    "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-50";

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{labelText}</span>
      {option.kind === "select" && (
        <select
          className={inputClass}
          value={String(value ?? option.default)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {option.choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {ru ? choice.label.ru : choice.label.en}
            </option>
          ))}
        </select>
      )}
      {(option.kind === "text" || option.kind === "password") && (
        <input
          type={option.kind === "password" ? "password" : "text"}
          className={inputClass}
          value={String(value ?? option.default)}
          placeholder={option.placeholder ? (ru ? option.placeholder.ru : option.placeholder.en) : undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {option.kind === "range" && (
        <span className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1 accent-primary disabled:opacity-50"
            min={option.min}
            max={option.max}
            step={option.step}
            value={Number(value ?? option.default)}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
            {Number(value ?? option.default).toFixed(1)}
          </span>
        </span>
      )}
    </label>
  );
}

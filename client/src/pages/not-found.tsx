import { Link } from "wouter";
import { FileX, ArrowLeft, Home } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";

export default function NotFound() {
  const { lang } = useLang();
  const isRu = lang === "ru";

  useSeo({
    title: isRu ? "404 — Страница не найдена | PDFX" : "404 — Page Not Found | PDFX",
    description: isRu
      ? "Запрашиваемая страница не существует. Вернитесь на главную и найдите нужный PDF инструмент."
      : "The page you're looking for doesn't exist. Go back to find the PDF tool you need.",
    path: "/404",
  });

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div
        className="mb-8 flex size-24 items-center justify-center rounded-3xl"
        style={{
          background: "linear-gradient(145deg, rgba(59,130,246,0.12) 0%, rgba(124,58,237,0.08) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <FileX className="size-10 text-slate-500" />
      </div>

      {/* Status code */}
      <p
        className="mb-3 text-8xl font-black leading-none tracking-tight"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.06) 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        404
      </p>

      <h1 className="mb-3 text-2xl font-bold text-white">
        {isRu ? "Страница не найдена" : "Page not found"}
      </h1>

      <p className="mb-10 max-w-sm text-sm leading-relaxed text-slate-500">
        {isRu
          ? "Страница, которую вы ищете, не существует или была перемещена."
          : "The page you're looking for doesn't exist or has been moved."}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <button
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
            }}
          >
            <Home className="size-4" />
            {isRu ? "На главную" : "Go home"}
          </button>
        </Link>

        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:-translate-y-0.5 hover:border-white/14 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          {isRu ? "Назад" : "Go back"}
        </button>
      </div>
    </div>
  );
}

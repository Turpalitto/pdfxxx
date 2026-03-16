import { Link } from "wouter";
import { FileCheck2, Scale, ShieldAlert } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";

export default function TermsPage() {
  const { lang } = useLang();
  const isRu = lang === "ru";

  useSeo({
    title: isRu ? "Условия использования — PDFX" : "Terms of Service — PDFX",
    description: isRu
      ? "Основные правила использования PDFX, ограничения ответственности и статус roadmap-функций."
      : "Core rules for using PDFX, limitation of liability, and roadmap feature status.",
    path: "/terms",
  });

  const sections = isRu
    ? [
        ["1. Доступность продукта", "PDFX публикует только launch-ready инструменты как активные. Функции, отмеченные как roadmap или coming soon, не считаются доступной частью сервиса до отдельного релиза."],
        ["2. Ответственность пользователя", "Вы отвечаете за законность документов, которые обрабатываете, и за проверку результата перед отправкой клиентам, в суд, банк или госорганы."],
        ["3. Ограничение ответственности", "PDFX предоставляется по принципу as is. Мы не гарантируем пригодность для высокорисковых юридических, медицинских или финансовых сценариев без вашей дополнительной проверки."],
        ["4. Контакты", "Вопросы по условиям использования можно отправить на hello@pdfx.tools."],
      ]
    : [
        ["1. Product availability", "PDFX only publishes launch-ready tools as active. Features labeled roadmap or coming soon are not considered available parts of the service until a separate release."],
        ["2. User responsibility", "You are responsible for the legality of the documents you process and for reviewing output before sending it to clients, courts, banks, or regulators."],
        ["3. Limitation of liability", "PDFX is provided as is. We do not guarantee fitness for high-risk legal, medical, or financial workflows without your own verification."],
        ["4. Contact", "Questions about these terms can be sent to hello@pdfx.tools."],
      ];

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-6">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            {isRu ? "← На главную" : "← Back home"}
          </Link>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
              <FileCheck2 className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{isRu ? "Условия использования" : "Terms of Service"}</h1>
              <p className="text-slate-400 mt-1">{isRu ? "Последнее обновление: 13 марта 2026" : "Last updated: March 13, 2026"}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Scale className="size-5 text-sky-300 mb-2" />
              <p className="text-sm text-slate-300">{isRu ? "Публично обещаем только то, что уже работает." : "We only promise what is already working."}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldAlert className="size-5 text-amber-300 mb-2" />
              <p className="text-sm text-slate-300">{isRu ? "Результат нужно проверять перед важным использованием." : "Output should be reviewed before important use."}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <FileCheck2 className="size-5 text-emerald-300 mb-2" />
              <p className="text-sm text-slate-300">{isRu ? "Roadmap-функции не считаются частью SLA." : "Roadmap items are not part of the SLA."}</p>
            </div>
          </div>

          <div className="space-y-6">
            {sections.map(([title, body]) => (
              <section key={title}>
                <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
                <p className="text-slate-300 leading-7">{body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from "wouter";
import { Mail, Rocket, Users } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";

export default function ContactPage() {
  const { lang } = useLang();
  const isRu = lang === "ru";

  useSeo({
    title: isRu ? "Контакты — PDFX" : "Contact — PDFX",
    description: isRu
      ? "Связь по запуску Pro, командному доступу, партнёрствам и вопросам по roadmap."
      : "Contact PDFX about Pro launch, team access, partnerships, and roadmap questions.",
    path: "/contact",
  });

  const items = isRu
    ? ["Запуск Pro и ранний доступ", "Командной тариф и пилоты", "Партнёрства и white-label запросы"]
    : ["Pro launch and early access", "Team plan and pilot requests", "Partnerships and white-label discussions"];

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
            <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
              <Mail className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{isRu ? "Контакты" : "Contact"}</h1>
              <p className="text-slate-400 mt-1">
                {isRu ? "Ответим по запуску продукта, roadmap и коммерческим вопросам." : "Reach out about launch, roadmap, and commercial questions."}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Rocket className="size-5 text-violet-300 mb-2" />
              <p className="text-sm text-slate-300">{isRu ? "Ранний доступ к платным функциям" : "Early access to paid features"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Users className="size-5 text-sky-300 mb-2" />
              <p className="text-sm text-slate-300">{isRu ? "Командные сценарии и пилоты" : "Team workflows and pilots"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Mail className="size-5 text-emerald-300 mb-2" />
              <p className="text-sm text-slate-300">{isRu ? "Ответ по email без пустых форм" : "Direct email, no placeholder forms"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-slate-300 mb-4">{isRu ? "Пишите на основной адрес. Подходит для:" : "Email our main inbox. Use it for:"}</p>
            <ul className="space-y-2 text-slate-300 mb-6">
              {items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <a
              href="mailto:hello@pdfx.tools?subject=PDFX%20launch"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
              }}
            >
              <Mail className="size-4" />
              hello@pdfx.tools
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

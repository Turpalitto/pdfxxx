import { motion } from "framer-motion";
import { Link } from "wouter";
import { CheckCircle2, ShieldCheck, Users, Zap } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { DEFAULT_MAX_FILE_SIZE_MB } from "@/lib/upload-limits";
import { getLaunchReadyTools } from "@/lib/tools";

export default function Pricing() {
  const { lang } = useLang();
  const isRu = lang === "ru";
  const tools = getLaunchReadyTools();

  useSeo({
    title: isRu ? "Тарифы — PDFX" : "Pricing — PDFX",
    description: isRu
      ? "Тарифы PDFX для браузерной PDF-обработки: все основные инструменты, локальная обработка и командные сценарии."
      : "PDFX pricing for browser-based PDF processing: core tools, local processing, and team workflows.",
    path: "/pricing",
  });

  const faq = isRu
    ? [
        ["Все инструменты доступны сразу?", `Да. В публичном каталоге доступны ${tools.length} PDF-инструментов без скрытого roadmap-раздела на главной.`],
        ["Какой лимит по размеру файла?", `Базовый сценарий рассчитан на файлы до ${DEFAULT_MAX_FILE_SIZE_MB} МБ за загрузку.`],
        ["Есть ли командный тариф?", "Да. Для команд и пилотов сейчас используется контактный сценарий через страницу связи."],
      ]
    : [
        ["Are all tools available right away?", `Yes. The public catalog includes ${tools.length} PDF tools without hiding them behind a roadmap section on the home page.`],
        ["What is the file size limit?", `The base workflow supports files up to ${DEFAULT_MAX_FILE_SIZE_MB} MB per upload.`],
        ["Is there a team plan?", "Yes. Team and pilot access currently go through the contact page."],
      ];

  const cards = [
    {
      title: "Free",
      price: "0",
      subtitle: isRu ? "Для повседневной PDF-работы" : "For everyday PDF work",
      caption: isRu ? "без регистрации" : "no signup",
      features: [
        `${tools.length} ${isRu ? "инструментов" : "tools"}`,
        isRu ? "Локальная обработка в браузере" : "Browser-side processing",
        isRu ? `Файлы до ${DEFAULT_MAX_FILE_SIZE_MB} МБ` : `Files up to ${DEFAULT_MAX_FILE_SIZE_MB} MB`,
        isRu ? "Конвертация, защита, OCR и редактор" : "Conversion, protection, OCR, and editor",
      ],
      href: "/",
      cta: isRu ? "Открыть инструменты" : "Open tools",
      accent: "border-white/10 bg-white/5",
    },
    {
      title: "Pro",
      price: isRu ? "По запросу" : "By request",
      subtitle: isRu ? "Для активного использования и расширенной поддержки" : "For heavier use and advanced support",
      caption: isRu ? "через контакт" : "via contact",
      features: [
        isRu ? "Приоритетная помощь" : "Priority support",
        isRu ? "Разбор сложных кейсов" : "Complex workflow help",
        isRu ? "Обратная связь по продукту" : "Direct product feedback",
        isRu ? "Подключение командных сценариев" : "Team workflow setup",
      ],
      href: "/contact",
      cta: isRu ? "Связаться" : "Contact us",
      accent: "border-violet-400/30 bg-gradient-to-br from-violet-500/10 to-sky-500/10",
    },
    {
      title: isRu ? "Team" : "Team",
      price: isRu ? "Пилот" : "Pilot",
      subtitle: isRu ? "Для компаний и внутренних процессов" : "For companies and internal workflows",
      caption: isRu ? "индивидуально" : "custom",
      features: [
        isRu ? "Обсуждение rollout-плана" : "Rollout planning",
        isRu ? "Приоритет по интеграциям" : "Integration prioritization",
        isRu ? "Поддержка командного внедрения" : "Team onboarding support",
        isRu ? "Контакт с командой продукта" : "Direct product-team access",
      ],
      href: "/contact",
      cta: isRu ? "Обсудить пилот" : "Discuss pilot",
      accent: "border-white/10 bg-white/5",
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-300 mb-6">
            <ShieldCheck className="size-4" />
            {isRu ? "Простые тарифы" : "Simple pricing"}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            {isRu ? "PDFX для личной и командной работы" : "PDFX for personal and team workflows"}
          </h1>
          <p className="text-lg text-slate-400 leading-8">
            {isRu
              ? "Все основные инструменты уже доступны в каталоге. Для расширенной поддержки и командных сценариев используется прямой контакт."
              : "All core tools are already available in the catalog. Advanced support and team workflows are handled directly through contact."}
          </p>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid gap-5 lg:grid-cols-3">
          {cards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className={`rounded-3xl border p-8 ${card.accent}`}
            >
              <div className="text-2xl font-bold text-white mb-2">{card.title}</div>
              <div className="text-slate-400 mb-5">{card.subtitle}</div>
              <div className="text-4xl font-black text-white mb-1">{card.price}</div>
              <div className="text-sm text-slate-500 mb-6">{card.caption}</div>
              <ul className="space-y-3 mb-8">
                {card.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-slate-200">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-300" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={card.href}
                className="inline-flex w-full items-center justify-center rounded-xl px-5 py-3 font-semibold text-white"
                style={card.title === "Pro" ? {
                  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
                } : { background: "rgba(15,23,42,0.8)" }}
              >
                {card.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <Zap className="size-5 text-sky-300 mb-3" />
            <div className="text-white font-semibold mb-1.5">{isRu ? "Быстрый старт" : "Fast start"}</div>
            <div className="text-sm text-slate-400 leading-6">
              {isRu ? "Основные сценарии доступны без регистрации и без установки софта." : "Core workflows are available without signup and without installing software."}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <ShieldCheck className="size-5 text-emerald-300 mb-3" />
            <div className="text-white font-semibold mb-1.5">{isRu ? "Локальная обработка" : "Local processing"}</div>
            <div className="text-sm text-slate-400 leading-6">
              {isRu ? "Базовые PDF-операции выполняются прямо в браузере на вашем устройстве." : "Core PDF operations run directly in your browser on your device."}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <Users className="size-5 text-violet-300 mb-3" />
            <div className="text-white font-semibold mb-1.5">{isRu ? "Командные сценарии" : "Team workflows"}</div>
            <div className="text-sm text-slate-400 leading-6">
              {isRu ? "Для пилотов и командного внедрения используйте прямой контакт с командой PDFX." : "For pilots and team rollout, use direct contact with the PDFX team."}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-white mb-6">FAQ</h2>
        <div className="space-y-4">
          {faq.map(([question, answer]) => (
            <details key={question} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <summary className="cursor-pointer text-white font-semibold">{question}</summary>
              <p className="text-slate-400 mt-3 leading-7">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

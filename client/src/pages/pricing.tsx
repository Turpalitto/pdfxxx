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
      accent: "pdfx-panel",
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
      accent: "border-primary/30 bg-gradient-to-br from-primary/10 to-teal-500/10",
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
      accent: "pdfx-panel",
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="premium-grid mx-auto max-w-6xl px-6 pb-12 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl"
        >
          <div className="premium-kicker mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
            <ShieldCheck className="size-4" />
            {isRu ? "Простые тарифы" : "Simple pricing"}
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-[0.98] text-foreground md:text-6xl">
            {isRu ? "PDFX для личной и командной работы" : "PDFX for personal and team workflows"}
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
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
              className={`rounded-xl border p-7 ${card.accent}`}
            >
              <div className="mb-2 text-2xl font-bold text-foreground">{card.title}</div>
              <div className="mb-5 text-muted-foreground">{card.subtitle}</div>
              <div className="mb-1 text-4xl font-black text-foreground">{card.price}</div>
              <div className="mb-6 text-sm text-muted-foreground">{card.caption}</div>
              <ul className="space-y-3 mb-8">
                {card.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-foreground">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={card.href}
                className="inline-flex w-full items-center justify-center rounded-lg px-5 py-3 font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={card.title === "Pro" ? {
                  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
                } : { background: "linear-gradient(135deg, #1f4a3a 0%, #17382c 100%)" }}
              >
                {card.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="pdfx-panel rounded-xl p-5">
            <Zap className="size-5 text-sky-300 mb-3" />
            <div className="mb-1.5 font-semibold text-foreground">{isRu ? "Быстрый старт" : "Fast start"}</div>
            <div className="text-sm leading-6 text-muted-foreground">
              {isRu ? "Основные сценарии доступны без регистрации и без установки софта." : "Core workflows are available without signup and without installing software."}
            </div>
          </div>
          <div className="pdfx-panel rounded-xl p-5">
            <ShieldCheck className="size-5 text-emerald-300 mb-3" />
            <div className="mb-1.5 font-semibold text-foreground">{isRu ? "Локальная обработка" : "Local processing"}</div>
            <div className="text-sm leading-6 text-muted-foreground">
              {isRu ? "Базовые PDF-операции выполняются прямо в браузере на вашем устройстве." : "Core PDF operations run directly in your browser on your device."}
            </div>
          </div>
          <div className="pdfx-panel rounded-xl p-5">
            <Users className="size-5 text-violet-300 mb-3" />
            <div className="mb-1.5 font-semibold text-foreground">{isRu ? "Командные сценарии" : "Team workflows"}</div>
            <div className="text-sm leading-6 text-muted-foreground">
              {isRu ? "Для пилотов и командного внедрения используйте прямой контакт с командой PDFX." : "For pilots and team rollout, use direct contact with the PDFX team."}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="mb-6 text-3xl font-bold text-foreground">FAQ</h2>
        <div className="space-y-4">
          {faq.map(([question, answer]) => (
            <details key={question} className="pdfx-panel rounded-xl p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{question}</summary>
              <p className="mt-3 leading-7 text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

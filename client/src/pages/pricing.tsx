import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

function Check({ variant = "green" }: { variant?: "green" | "purple" | "gold" }) {
  const colors: Record<string, { bg: string; color: string }> = {
    green: { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
    purple: { bg: "rgba(108,92,231,0.12)", color: "#a78bfa" },
    gold: { bg: "rgba(234,179,8,0.12)", color: "#eab308" },
  };
  const c = colors[variant];
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-full text-[10px] font-bold mt-[1px]"
      style={{ width: 18, height: 18, background: c.bg, color: c.color }}
    >
      ✓
    </span>
  );
}

function AiBadge() {
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-[1px] rounded ml-1 align-middle tracking-wider"
      style={{
        background: "linear-gradient(135deg, rgba(108,92,231,0.12), rgba(6,182,212,0.12))",
        border: "1px solid rgba(108,92,231,0.18)",
        color: "#a78bfa",
      }}
    >
      AI
    </span>
  );
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { lang } = useLang();

  const proMonthly = 499;
  const teamMonthly = 1490;
  const proAnnual = Math.round(proMonthly * 0.75);
  const teamAnnual = Math.round(teamMonthly * 0.75);

  const isRu = lang === "ru";
  const T = {
    badge: isRu ? "Более 2 000 000 файлов обработано" : "Over 2,000,000 files processed",
    title: isRu ? "Выберите идеальный план" : "Choose your perfect plan",
    sub: isRu
      ? "Бесплатные инструменты без ограничений по качеству. Pro — для тех, кто работает с PDF каждый день."
      : "Free tools with no quality limits. Pro — for those who work with PDFs every day.",
    monthly: isRu ? "Ежемесячно" : "Monthly",
    annual: isRu ? "Ежегодно" : "Annually",
    save: isRu ? "−25%" : "−25%",
    currency: "₽",
    free: {
      name: "Free",
      desc: isRu ? "Все основные инструменты без водяных знаков" : "All core tools without watermarks",
      price: "0",
      period: isRu ? "навсегда бесплатно" : "free forever",
      cta: isRu ? "Начать бесплатно" : "Start for free",
      featuresTitle: isRu ? "Что включено" : "What's included",
      features: isRu
        ? ["28 PDF инструментов", "Файлы до 25 МБ", "5 файлов в день", "Обработка в браузере", "Без водяных знаков", "3 AI-запроса в день"]
        : ["28 PDF tools", "Files up to 25 MB", "5 files per day", "In-browser processing", "No watermarks", "3 AI requests/day"],
    },
    pro: {
      name: "Pro",
      popular: isRu ? "✦ Популярный выбор" : "✦ Most popular",
      desc: isRu ? "Безлимитная работа с PDF + мощные AI-инструменты" : "Unlimited PDF work + powerful AI tools",
      period: isRu ? "в месяц" : "per month",
      trialCta: isRu ? "Попробовать 7 дней бесплатно" : "Try 7 days free",
      featuresTitle: isRu ? "Всё из Free, плюс" : "Everything in Free, plus",
      features: isRu
        ? [
            ["Безлимит — файлы любого размера", false],
            ["Без ограничений на количество", false],
            ["Пакетная обработка (до 50 файлов)", false],
            ["OCR — распознавание текста", true],
            ["Суммаризация PDF", true],
            ["Перевод PDF (20 языков)", true],
            ["Чат с документом", true],
            ["Приоритетная обработка", false],
            ["Без рекламы", false],
          ]
        : [
            ["Unlimited — any file size", false],
            ["No quantity limits", false],
            ["Batch processing (up to 50 files)", false],
            ["OCR — text recognition", true],
            ["PDF Summarization", true],
            ["PDF Translation (20 languages)", true],
            ["Chat with document", true],
            ["Priority processing", false],
            ["No ads", false],
          ],
    },
    team: {
      name: "Team",
      desc: isRu ? "Для команд и компаний с общим аккаунтом" : "For teams and companies with shared accounts",
      period: isRu ? "в месяц, до 5 человек" : "per month, up to 5 people",
      cta: isRu ? "Связаться с нами" : "Contact us",
      featuresTitle: isRu ? "Всё из Pro, плюс" : "Everything in Pro, plus",
      features: isRu
        ? ["До 5 пользователей", "Общий аккаунт и биллинг", "500 AI-запросов / мес на команду", "Приоритетная поддержка", "Брендирование (убрать лого PDFX)", "API-доступ"]
        : ["Up to 5 users", "Shared account & billing", "500 AI requests/month for team", "Priority support", "Branding (remove PDFX logo)", "API access"],
    },
    comparison: {
      title: isRu ? "Детальное сравнение" : "Detailed comparison",
      sub: isRu ? "Полный список функций каждого плана" : "Full feature list for each plan",
      categories: {
        core: isRu ? "Основные инструменты" : "Core tools",
        ai: isRu ? "AI-функции" : "AI features",
        convenience: isRu ? "Удобство" : "Convenience",
      },
      rows: isRu
        ? [
            { cat: "core", label: "PDF инструменты", vals: ["28", "28", "28"] },
            { cat: "core", label: "Макс. размер файла", vals: ["25 МБ", "Безлимит", "Безлимит"] },
            { cat: "core", label: "Файлов в день", vals: ["5", "Безлимит", "Безлимит"] },
            { cat: "core", label: "Пакетная обработка", vals: [null, "До 50", "До 50"] },
            { cat: "core", label: "Водяные знаки", vals: ["Нет", "Нет", "Нет"] },
            { cat: "ai", label: "AI-запросов", vals: ["3 / день", "100 / день", "500 / мес"] },
            { cat: "ai", label: "Суммаризация PDF", vals: [null, "✓", "✓"] },
            { cat: "ai", label: "Перевод PDF", vals: [null, "✓", "✓"] },
            { cat: "ai", label: "Чат с документом", vals: [null, "✓", "✓"] },
            { cat: "ai", label: "OCR распознавание", vals: [null, "✓", "✓"] },
            { cat: "convenience", label: "Реклама", vals: ["Есть", "Нет", "Нет"] },
            { cat: "convenience", label: "Приоритетная обработка", vals: [null, "✓", "✓"] },
            { cat: "convenience", label: "Поддержка", vals: ["Email", "Email", "Приоритет"] },
            { cat: "convenience", label: "API-доступ", vals: [null, null, "✓"] },
            { cat: "convenience", label: "Брендирование", vals: [null, null, "✓"] },
          ]
        : [
            { cat: "core", label: "PDF tools", vals: ["28", "28", "28"] },
            { cat: "core", label: "Max file size", vals: ["25 MB", "Unlimited", "Unlimited"] },
            { cat: "core", label: "Files per day", vals: ["5", "Unlimited", "Unlimited"] },
            { cat: "core", label: "Batch processing", vals: [null, "Up to 50", "Up to 50"] },
            { cat: "core", label: "Watermarks", vals: ["None", "None", "None"] },
            { cat: "ai", label: "AI requests", vals: ["3 / day", "100 / day", "500 / mo"] },
            { cat: "ai", label: "PDF Summarization", vals: [null, "✓", "✓"] },
            { cat: "ai", label: "PDF Translation", vals: [null, "✓", "✓"] },
            { cat: "ai", label: "Chat with document", vals: [null, "✓", "✓"] },
            { cat: "ai", label: "OCR recognition", vals: [null, "✓", "✓"] },
            { cat: "convenience", label: "Ads", vals: ["Yes", "No", "No"] },
            { cat: "convenience", label: "Priority processing", vals: [null, "✓", "✓"] },
            { cat: "convenience", label: "Support", vals: ["Email", "Email", "Priority"] },
            { cat: "convenience", label: "API access", vals: [null, null, "✓"] },
            { cat: "convenience", label: "Branding", vals: [null, null, "✓"] },
          ],
    },
    faq: {
      title: isRu ? "Частые вопросы" : "FAQ",
      items: isRu
        ? [
            {
              q: "Безопасно ли использовать PDFX?",
              a: "Абсолютно. Все PDF обрабатываются прямо в вашем браузере. Файлы никогда не загружаются на наши серверы. Это значит, что ваши документы остаются только у вас — мы физически не имеем к ним доступа.",
            },
            {
              q: "Как работают AI-инструменты?",
              a: "AI-инструменты (суммаризация, перевод, чат) используют облачный API. Текст из PDF отправляется на обработку, но не сохраняется. Файл по-прежнему остаётся на вашем устройстве — передаётся только извлечённый текст.",
            },
            {
              q: "Можно ли отменить подписку?",
              a: "Да, в любой момент без объяснения причин. Подписка продолжает действовать до конца оплаченного периода. Мы гарантируем возврат средств в течение 7 дней после первой оплаты.",
            },
            {
              q: "Есть ли ограничения у бесплатного плана?",
              a: "Бесплатный план включает все 28 инструментов без водяных знаков. Ограничения: 5 файлов в день, до 25 МБ на файл, 3 AI-запроса в день. Для безлимитной работы — план Pro.",
            },
            {
              q: "Как оплатить? Принимаете ли карты РФ?",
              a: "Принимаем карты российских банков через ЮKassa, а также международные карты Visa/Mastercard. Оплата в рублях, никаких скрытых комиссий.",
            },
          ]
        : [
            {
              q: "Is PDFX safe to use?",
              a: "Absolutely. All PDFs are processed directly in your browser. Files are never uploaded to our servers — your documents stay only with you.",
            },
            {
              q: "How do AI tools work?",
              a: "AI tools (summarization, translation, chat) use a cloud API. Only the extracted text is sent for processing — never the file itself. Nothing is stored.",
            },
            {
              q: "Can I cancel my subscription?",
              a: "Yes, at any time without explanation. Your subscription remains active until the end of the paid period. We guarantee a refund within 7 days of the first payment.",
            },
            {
              q: "What are the free plan limits?",
              a: "The free plan includes all 28 tools without watermarks. Limits: 5 files per day, up to 25 MB per file, 3 AI requests per day. For unlimited work — Pro plan.",
            },
            {
              q: "What payment methods are accepted?",
              a: "We accept major credit cards via Stripe. Payment in USD. No hidden fees.",
            },
          ],
    },
    trust: isRu
      ? ["🔒 Данные не сохраняются", "⚡ Мгновенная обработка", "🛡️ 7 дней — возврат денег", "❌ Отмена в любой момент"]
      : ["🔒 No data stored", "⚡ Instant processing", "🛡️ 7-day money back", "❌ Cancel anytime"],
    guarantee: {
      title: isRu ? "Гарантия возврата 7 дней" : "7-day money-back guarantee",
      sub: isRu
        ? "Не понравилось? Вернём деньги в течение 7 дней — без вопросов."
        : "Not happy? We'll refund you within 7 days — no questions asked.",
    },
  };

  T.comparison.rows.forEach((row, index) => {
    if (row.cat !== prevCat) {
      prevCat = row.cat;
      const catLabel = row.cat === "core"
        ? T.comparison.categories.core
        : row.cat === "ai"
        ? T.comparison.categories.ai
        : T.comparison.categories.convenience;
      tableRows.push({ type: "cat", label: catLabel });
    }
    tableRows.push({ type: "row", row, index });
  });

  return (
    <div className="min-h-screen">
      {/* ─── HERO ─── */}
      <section className="text-center px-6 pt-20 pb-10 relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{ height: 600, background: "radial-gradient(ellipse at 50% -100px, rgba(108,92,231,0.08) 0%, transparent 70%)" }}
        />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative">
          <div
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.18)", color: "#a78bfa" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse inline-block" />
            {T.badge}
          </div>
          <h1
            className="font-extrabold mb-4"
            style={{ fontSize: "clamp(32px, 5vw, 52px)", letterSpacing: "-0.03em", lineHeight: 1.15 }}
          >
            {T.title.split("идеальный план").length > 1 ? (
              <>
                {T.title.split("идеальный план")[0]}
                <span style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a78bfa 50%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  идеальный план
                </span>
              </>
            ) : T.title.split("perfect plan").length > 1 ? (
              <>
                {T.title.split("perfect plan")[0]}
                <span style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a78bfa 50%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  perfect plan
                </span>
              </>
            ) : T.title}
          </h1>
          <p className="text-muted-foreground max-w-[540px] mx-auto mb-10" style={{ fontSize: 17 }}>{T.sub}</p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3.5 mb-12">
            <span
              className={cn("text-sm font-medium transition-colors", !annual ? "text-foreground" : "text-muted-foreground")}
              data-testid="label-monthly"
            >
              {T.monthly}
            </span>
            <label className="relative w-[52px] h-7 cursor-pointer" data-testid="toggle-billing">
              <input
                type="checkbox"
                className="sr-only"
                checked={annual}
                onChange={(e) => setAnnual(e.target.checked)}
              />
              <span
                className="absolute inset-0 rounded-full transition-colors duration-300"
                style={{ background: annual ? "#6c5ce7" : "rgba(255,255,255,0.1)" }}
              />
              <span
                className="absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white transition-transform duration-300"
                style={{ transform: annual ? "translateX(24px)" : "translateX(0)" }}
              />
            </label>
            <span
              className={cn("text-sm font-medium transition-colors", annual ? "text-foreground" : "text-muted-foreground")}
              data-testid="label-annual"
            >
              {T.annual}
            </span>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-md"
              style={{ color: "#10b981", background: "rgba(16,185,129,0.12)" }}
            >
              {T.save}
            </span>
          </div>
        </motion.div>
      </section>

      {/* ─── PRICING CARDS ─── */}
      <section className="max-w-[1100px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[420px] md:max-w-none mx-auto">

          {/* FREE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-[20px] border p-9 relative transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5" style={{ background: "#1a2e1a" }}>🆓</div>
            <div className="text-xl font-bold mb-1.5">{T.free.name}</div>
            <div className="text-muted-foreground mb-6 leading-snug" style={{ fontSize: 14 }}>{T.free.desc}</div>
            <div className="mb-6">
              <div className="font-black leading-none" style={{ fontSize: 44, letterSpacing: "-0.04em" }}>
                <span className="align-super font-semibold text-muted-foreground" style={{ fontSize: 22 }}>{T.currency}</span>
                {T.free.price}
              </div>
              <div className="text-muted-foreground mt-1" style={{ fontSize: 14 }}>{T.free.period}</div>
            </div>
            <Link
              href="/"
              className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-250 mb-7 border hover:border-muted-foreground"
              data-testid="button-start-free"
            >
              {T.free.cta}
            </Link>
            <div className="text-muted-foreground font-semibold uppercase tracking-[0.08em] mb-3.5" style={{ fontSize: 12 }}>{T.free.featuresTitle}</div>
            <ul className="flex flex-col gap-2.5">
              {T.free.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-muted-foreground" style={{ fontSize: 14, lineHeight: 1.45 }}>
                  <Check variant="green" />
                  {f}
                  {i === 5 && <AiBadge />}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* PRO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-[20px] p-9 relative transition-all duration-300"
            style={{
              border: "1px solid #6c5ce7",
              background: "#1a1a2e",
              boxShadow: "0 0 0 1px #6c5ce7, 0 8px 40px rgba(108,92,231,0.15)",
              transform: "scale(1.03)",
            }}
            data-testid="card-plan-pro"
          >
            <div
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold py-1.5 px-5 rounded-lg tracking-[0.04em] uppercase whitespace-nowrap"
              style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a78bfa 50%, #06b6d4 100%)" }}
            >
              {T.pro.popular}
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5" style={{ background: "#1a1a3e" }}>⚡</div>
            <div className="text-xl font-bold mb-1.5">{T.pro.name}</div>
            <div className="text-muted-foreground mb-6 leading-snug" style={{ fontSize: 14 }}>{T.pro.desc}</div>
            <div className="mb-6">
              <div className="font-black leading-none" style={{ fontSize: 44, letterSpacing: "-0.04em" }}>
                <span className="align-super font-semibold text-muted-foreground" style={{ fontSize: 22 }}>{T.currency}</span>
                <span data-testid="pro-price">{annual ? proAnnual : proMonthly}</span>
              </div>
              <div className="text-muted-foreground mt-1" style={{ fontSize: 14 }} data-testid="pro-period">{T.pro.period}</div>
              {annual && (
                <div className="mt-1 text-sm" style={{ color: "#10b981" }}>
                  = {T.currency}{proAnnual * 12} {isRu ? "в год" : "per year"}
                </div>
              )}
            </div>
            <button
              className="block w-full text-center py-3 rounded-xl font-semibold text-sm text-white transition-all duration-250 mb-7 border-none"
              style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a78bfa 50%, #06b6d4 100%)", boxShadow: "0 4px 20px rgba(108,92,231,0.35)" }}
              data-testid="button-get-pro"
            >
              {T.pro.trialCta}
            </button>
            <div className="text-muted-foreground font-semibold uppercase tracking-[0.08em] mb-3.5" style={{ fontSize: 12 }}>{T.pro.featuresTitle}</div>
            <ul className="flex flex-col gap-2.5">
              {(T.pro.features as [string, boolean][]).map(([text, isAi], i) => (
                <li key={i} className="flex items-start gap-2.5 text-muted-foreground" style={{ fontSize: 14, lineHeight: 1.45 }}>
                  <Check variant="purple" />
                  <span>
                    {i < 3 ? <strong className="text-foreground">{text.split(" — ")[0]}</strong> : null}
                    {i < 3 && text.includes(" — ") ? " — " + text.split(" — ")[1] : i >= 3 ? text : null}
                    {isAi && <AiBadge />}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* TEAM */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-[20px] border p-9 relative transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5" style={{ background: "#2e1a2e" }}>🏢</div>
            <div className="text-xl font-bold mb-1.5">{T.team.name}</div>
            <div className="text-muted-foreground mb-6 leading-snug" style={{ fontSize: 14 }}>{T.team.desc}</div>
            <div className="mb-6">
              <div className="font-black leading-none" style={{ fontSize: 44, letterSpacing: "-0.04em" }}>
                <span className="align-super font-semibold text-muted-foreground" style={{ fontSize: 22 }}>{T.currency}</span>
                <span data-testid="team-price">{annual ? teamAnnual : teamMonthly}</span>
              </div>
              <div className="text-muted-foreground mt-1" style={{ fontSize: 14 }} data-testid="team-period">{T.team.period}</div>
              {annual && (
                <div className="mt-1 text-sm" style={{ color: "#10b981" }}>
                  = {T.currency}{teamAnnual * 12} {isRu ? "в год" : "per year"}
                </div>
              )}
            </div>
            <button
              className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-250 mb-7 border"
              style={{ background: "rgba(255,255,255,0.04)" }}
              data-testid="button-contact-team"
            >
              {T.team.cta}
            </button>
            <div className="text-muted-foreground font-semibold uppercase tracking-[0.08em] mb-3.5" style={{ fontSize: 12 }}>{T.team.featuresTitle}</div>
            <ul className="flex flex-col gap-2.5">
              {T.team.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-muted-foreground" style={{ fontSize: 14, lineHeight: 1.45 }}>
                  <Check variant="gold" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section className="max-w-[900px] mx-auto px-6 pb-20">
        <h2 className="text-center font-bold mb-2" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>{T.comparison.title}</h2>
        <p className="text-center text-muted-foreground mb-9" style={{ fontSize: 15 }}>{T.comparison.sub}</p>

        <table className="w-full border-collapse" style={{ fontSize: 14 }}>
          <thead>
            <tr>
              <th className="text-left pb-3.5 border-b border-border text-muted-foreground font-semibold" style={{ padding: "14px 16px" }} />
              <th className="text-center pb-3.5 border-b border-border text-muted-foreground font-semibold" style={{ padding: "14px 16px" }}>Free</th>
              <th
                className="text-center pb-3.5 font-semibold border-b"
                style={{
                  padding: "14px 16px",
                  color: "#a78bfa",
                  background: "rgba(108,92,231,0.08)",
                  borderColor: "rgba(108,92,231,0.15)",
                  borderRadius: "12px 12px 0 0",
                }}
              >Pro</th>
              <th className="text-center pb-3.5 border-b border-border text-muted-foreground font-semibold" style={{ padding: "14px 16px" }}>Team</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((entry) =>
              entry.type === "cat" ? (
                <tr key={`cat-${entry.label}`}>
                  <td
                    colSpan={4}
                    className="text-muted-foreground font-bold uppercase tracking-[0.08em] border-b border-border"
                    style={{ fontSize: 12, padding: "24px 16px 12px" }}
                  >
                    {entry.label}
                  </td>
                </tr>
              ) : (
                <tr key={`row-${entry.index}`}>
                  <td className="text-left font-medium border-b" style={{ padding: "13px 16px", borderColor: "#1a1a28" }}>{entry.row.label}</td>
                  <td className="text-center text-muted-foreground border-b" style={{ padding: "13px 16px", borderColor: "#1a1a28" }}>
                    {entry.row.vals[0] === null ? <span style={{ color: "#55556a" }}>—</span> : <span className={entry.row.vals[0] === "✓" ? "text-[#10b981] font-bold" : ""}>{entry.row.vals[0]}</span>}
                  </td>
                  <td className="text-center border-b" style={{ padding: "13px 16px", borderColor: "#1a1a28", background: "rgba(108,92,231,0.05)" }}>
                    {entry.row.vals[1] === null ? <span style={{ color: "#55556a" }}>—</span> : <span className={entry.row.vals[1] === "✓" ? "text-[#10b981] font-bold" : "text-muted-foreground"}>{entry.row.vals[1]}</span>}
                  </td>
                  <td className="text-center text-muted-foreground border-b" style={{ padding: "13px 16px", borderColor: "#1a1a28" }}>
                    {entry.row.vals[2] === null ? <span style={{ color: "#55556a" }}>—</span> : <span className={entry.row.vals[2] === "✓" ? "text-[#10b981] font-bold" : ""}>{entry.row.vals[2]}</span>}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-[680px] mx-auto px-6 pb-20">
        <h2 className="text-center font-bold mb-9" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>{T.faq.title}</h2>
        <div>
          {T.faq.items.map((item, i) => (
            <div key={i} className="border-b border-border" data-testid={`faq-item-${i}`}>
              <button
                className="w-full flex items-center justify-between gap-4 text-left py-5 font-semibold"
                style={{ fontSize: 16 }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                data-testid={`faq-toggle-${i}`}
              >
                <span>{item.q}</span>
                <span
                  className="text-muted-foreground text-xl shrink-0 transition-transform duration-300"
                  style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)", color: openFaq === i ? "#a78bfa" : undefined }}
                >
                  +
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-350"
                style={{ maxHeight: openFaq === i ? 200 : 0, paddingBottom: openFaq === i ? 16 : 0 }}
              >
                <p className="text-muted-foreground leading-relaxed" style={{ fontSize: 14 }}>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <div className="flex justify-center gap-10 flex-wrap border-t border-border py-10 px-6 max-w-[900px] mx-auto">
        {T.trust.map((item) => (
          <div key={item} className="flex items-center gap-2.5 text-muted-foreground" style={{ fontSize: 14 }}>
            {item}
          </div>
        ))}
      </div>

      {/* ─── GUARANTEE ─── */}
      <div className="text-center px-6 pb-20">
        <div
          className="inline-flex items-center gap-3.5 border rounded-2xl px-8 py-5"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <span style={{ fontSize: 32 }}>🛡️</span>
          <div className="text-left">
            <h3 className="font-bold mb-0.5" style={{ fontSize: 16 }}>{T.guarantee.title}</h3>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>{T.guarantee.sub}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

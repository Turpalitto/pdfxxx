import { Link } from "wouter";
import { Shield, LockKeyhole, EyeOff } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";

export default function PrivacyPage() {
  const { lang } = useLang();
  const isRu = lang === "ru";

  useSeo({
    title: isRu ? "Политика конфиденциальности — PDFX" : "Privacy Policy — PDFX",
    description: isRu
      ? "Как PDFX обрабатывает файлы, какие данные хранит и чего не делает с вашими документами."
      : "How PDFX handles files, what data is stored, and what never leaves your device.",
    path: "/privacy",
  });

  const sections = isRu
    ? [
        ["1. Обработка файлов", "Базовые PDF-инструменты PDFX работают локально в браузере. Мы не загружаем ваши документы на сервер для merge, split, compress, convert, watermark, page numbers и edit PDF."],
        ["2. Что хранится", "Мы можем хранить только технические настройки интерфейса, например выбранный язык, тему и историю последних инструментов, в localStorage браузера. Эти данные не содержат содержимое ваших PDF и не включают загруженные файлы."],
        ["3. Чего мы не делаем", "Мы не продаём файлы пользователей, не индексируем содержимое документов и не используем ваши PDF для обучения моделей."],
        ["4. Контакт", "По вопросам приватности пишите на hello@pdfx.tools."],
      ]
    : [
        ["1. File processing", "PDFX core tools run locally in the browser. We do not upload your documents to our server for merge, split, compress, convert, watermark, page numbers, or edit flows."],
        ["2. What is stored", "We may store interface preferences such as language, theme, and recent tool history in browser localStorage. Those values never include the contents of your PDF files or the files themselves."],
        ["3. What we do not do", "We do not sell user files, index document contents, or use your PDFs for model training."],
        ["4. Contact", "For privacy questions, email hello@pdfx.tools."],
      ];

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {isRu ? "← На главную" : "← Back home"}
          </Link>
        </div>
        <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Shield className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{isRu ? "Политика конфиденциальности" : "Privacy Policy"}</h1>
              <p className="text-muted-foreground mt-1">{isRu ? "Последнее обновление: 13 марта 2026" : "Last updated: March 13, 2026"}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-border bg-muted/50 p-4">
              <LockKeyhole className="size-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">{isRu ? "Файлы по умолчанию остаются на устройстве." : "Files stay on your device by default."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/50 p-4">
              <EyeOff className="size-5 text-sky-400 mb-2" />
              <p className="text-sm text-muted-foreground">{isRu ? "Мы не читаем содержимое ваших PDF." : "We do not inspect the contents of your PDFs."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/50 p-4">
              <Shield className="size-5 text-violet-400 mb-2" />
              <p className="text-sm text-muted-foreground">{isRu ? "Маркетинговые обещания приведены к фактическим возможностям продукта." : "Marketing copy is aligned with the product's actual capabilities."}</p>
            </div>
          </div>

          <div className="space-y-6">
            {sections.map(([title, body]) => (
              <section key={title}>
                <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
                <p className="text-muted-foreground leading-7">{body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

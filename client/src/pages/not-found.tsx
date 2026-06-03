import { Link } from "wouter";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";

export default function NotFound() {
  const { lang } = useLang();
  const isRu = lang === "ru";

  useSeo({
    title: isRu ? "Страница не найдена — PDFX" : "Page not found — PDFX",
    description: isRu ? "Запрашиваемая страница не существует." : "The page you're looking for doesn't exist.",
    path: "/404",
  });

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="pdfx-panel-strong flex flex-col items-center rounded-3xl p-8 md:p-10">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <FileQuestion className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="paper-title mb-2 text-3xl font-bold text-foreground">
          {isRu ? "Страница не найдена" : "Page not found"}
        </h1>

        <p className="mb-6 max-w-sm text-sm leading-6 text-muted-foreground">
          {isRu
            ? "Запрашиваемая страница не существует или была перемещена. Попробуйте вернуться на главную."
            : "The page you're looking for doesn't exist or has been moved. Try going back to the home page."}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isRu ? "На главную" : "Back to home"}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">
              {isRu ? "Связаться" : "Contact us"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

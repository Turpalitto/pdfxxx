import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Shield,
  Zap,
  Globe,
  ArrowRight,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolCard } from "@/components/tool-card";
import { tools, categories } from "@/lib/tools";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Are my files safe when using PDFX?",
    a: "Absolutely. All PDF processing happens directly in your browser using your device's computing power. Your files never leave your device or get uploaded to any server.",
  },
  {
    q: "Is PDFX really free?",
    a: "Yes! All basic tools are completely free with no watermarks on your output files. The free tier has usage limits of 3 operations per hour and 25MB per file.",
  },
  {
    q: "What's the file size limit?",
    a: "Free users can process files up to 25MB each, with up to 3 files per batch. Pro users enjoy 500MB limits and unlimited batch processing.",
  },
  {
    q: "Can I use PDFX on mobile?",
    a: "Yes! PDFX is fully responsive and works on any device — phone, tablet, or desktop. The interface adapts to your screen size for the best experience.",
  },
  {
    q: "What languages does OCR support?",
    a: "Our OCR engine supports English, Russian, Spanish, French, German, Chinese, Arabic, and more. You can select your language from the OCR tool settings.",
  },
];

const stats = [
  { value: "2M+", label: "Files Processed" },
  { value: "180+", label: "Countries" },
  { value: "28", label: "PDF Tools" },
  { value: "100%", label: "Free to Start" },
];

export default function Home() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const activeCategory = searchParams.get("category") || "all";
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredTools =
    activeCategory === "all"
      ? tools
      : tools.filter((t) => t.category === activeCategory);

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden py-20 md:py-32 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div
          className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6 text-xs px-3 py-1">
              <Zap className="w-3 h-3 mr-1" />
              All Processing Happens In Your Browser
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            All PDF Tools.{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Free.
            </span>
            <br />
            No Watermarks.
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            28 powerful PDF tools. Merge, split, compress, convert, and protect your PDFs — 
            all processed locally in your browser. Your files never touch our servers.
          </motion.p>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button size="lg" className="shadow-lg shadow-primary/25 gap-2" asChild>
              <Link href="/tools/merge-pdf">
                Start for Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">View Pro Plans</Link>
            </Button>
          </motion.div>

          <motion.div
            className="mt-12 flex flex-wrap items-center justify-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {[
              { icon: Shield, text: "No file uploads" },
              { icon: Zap, text: "Instant processing" },
              { icon: Globe, text: "Works offline" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-10 border-y border-border/50 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className="text-2xl md:text-3xl font-bold text-primary mb-1"
                  data-testid={`stat-value-${i}`}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Every PDF Tool You'll Ever Need
            </h2>
            <p className="text-muted-foreground">
              28 tools across 7 categories. Free to use, no sign-up required.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <Link
              href="/"
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
              data-testid="filter-all"
            >
              All Tools
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
                data-testid={`filter-${cat.id}`}
              >
                {cat.label}
              </Link>
            ))}
          </div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
            layout
          >
            {filteredTools.map((tool, i) => (
              <motion.div
                key={tool.slug}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                layout
              >
                <ToolCard tool={tool} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 bg-muted/20 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Choose PDFX?</h2>
            <p className="text-muted-foreground">Built with privacy and performance as the top priority.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "100% Private",
                description:
                  "All PDF processing happens in your browser using WebAssembly. No file uploads, no server storage — your documents stay on your device.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description:
                  "Client-side processing means zero upload/download wait times. Large files process instantly because they never leave your device.",
                color: "text-yellow-400",
                bg: "bg-yellow-500/10",
              },
              {
                icon: Globe,
                title: "Works Offline",
                description:
                  "Once loaded, PDFX tools continue to work without an internet connection. Process confidential documents anywhere, anytime.",
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
            ].map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 p-6 rounded-md border border-card-border bg-card">
                <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", feature.bg)}>
                  <feature.icon className={cn("w-5 h-5", feature.color)} />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 bg-muted/10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Frequently Asked Questions</h2>
          </div>
          <div className="flex flex-col gap-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-card overflow-hidden"
                data-testid={`faq-item-${i}`}
              >
                <button
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`faq-toggle-${i}`}
                >
                  <span className="font-medium text-sm">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-md border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-violet-500/10 p-10 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 pointer-events-none" />
            <div className="relative">
              <div className="flex justify-center gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Ready for unlimited PDF power?
              </h2>
              <p className="text-muted-foreground mb-6">
                Go Pro for $4.99/month and unlock unlimited operations, AI tools, 500MB files, and no ads.
              </p>
              <Button size="lg" className="shadow-xl shadow-primary/30 gap-2" asChild>
                <Link href="/pricing">
                  See Pro Plans
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

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
  Lock,
  Cpu,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolCard } from "@/components/tool-card";
import { tools, categories } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

export default function Home() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const activeCategory = searchParams.get("category") || "all";
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { t } = useLang();

  const filteredTools =
    activeCategory === "all"
      ? tools
      : tools.filter((tool) => tool.category === activeCategory);

  const faqs = [
    { q: t.faq.q1, a: t.faq.a1 },
    { q: t.faq.q2, a: t.faq.a2 },
    { q: t.faq.q3, a: t.faq.a3 },
    { q: t.faq.q4, a: t.faq.a4 },
    { q: t.faq.q5, a: t.faq.a5 },
  ];

  const stats = [
    { value: "2M+", label: t.stats.filesProcessed },
    { value: "180+", label: t.stats.countries },
    { value: "28", label: t.stats.pdfTools },
    { value: "100%", label: t.stats.freeToStart },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.15),transparent)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-10 w-64 h-64 bg-violet-500/8 rounded-full blur-3xl" />
          <div className="absolute top-40 left-10 w-48 h-48 bg-cyan-500/6 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-6"
          >
            <Badge
              variant="secondary"
              className="text-xs px-3 py-1.5 gap-1.5 border border-primary/20 bg-primary/8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              {t.hero.badge}
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="block">{t.hero.headline1}</span>
            <span className="block bg-gradient-to-r from-primary via-blue-400 to-violet-500 bg-clip-text text-transparent">
              {t.hero.headline2}
            </span>
            <span className="block">{t.hero.headline3}</span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {t.hero.sub}
          </motion.p>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 mb-12"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              size="lg"
              className="shadow-xl shadow-primary/30 gap-2 text-sm px-6 h-11"
              asChild
            >
              <Link href="/tools/merge-pdf">
                {t.hero.startFree}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-sm px-6 h-11" asChild>
              <Link href="/pricing">{t.hero.viewPro}</Link>
            </Button>
          </motion.div>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {[
              { icon: Lock, text: t.hero.feat1 },
              { icon: Zap, text: t.hero.feat2 },
              { icon: WifiOff, text: t.hero.feat3 },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-3 h-3 text-primary" />
                </div>
                {text}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-8 border-y border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div
                  className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent mb-1"
                  data-testid={`stat-value-${i}`}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{t.tools.title}</h2>
            <p className="text-sm text-muted-foreground">{t.tools.sub}</p>
          </motion.div>

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <Link
              href="/"
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
              data-testid="filter-all"
            >
              {t.tools.allTools}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
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
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.015 }}
                layout
              >
                <ToolCard tool={tool} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 border-y border-border/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{t.why.title}</h2>
            <p className="text-sm text-muted-foreground">{t.why.sub}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Shield,
                title: t.why.privateTitle,
                description: t.why.privateDesc,
                gradient: "from-emerald-500/10 to-emerald-500/5",
                iconColor: "text-emerald-400",
                iconBg: "bg-emerald-500/15",
                glow: "shadow-emerald-500/10",
              },
              {
                icon: Cpu,
                title: t.why.fastTitle,
                description: t.why.fastDesc,
                gradient: "from-yellow-500/10 to-yellow-500/5",
                iconColor: "text-yellow-400",
                iconBg: "bg-yellow-500/15",
                glow: "shadow-yellow-500/10",
              },
              {
                icon: WifiOff,
                title: t.why.offlineTitle,
                description: t.why.offlineDesc,
                gradient: "from-blue-500/10 to-blue-500/5",
                iconColor: "text-blue-400",
                iconBg: "bg-blue-500/15",
                glow: "shadow-blue-500/10",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "flex flex-col gap-4 p-6 rounded-md border border-card-border bg-gradient-to-br shadow-xl",
                  feature.gradient, feature.glow
                )}
              >
                <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", feature.iconBg)}>
                  <feature.icon className={cn("w-5 h-5", feature.iconColor)} />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 bg-gradient-to-b from-transparent to-muted/10">
        <div className="max-w-2xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{t.faq.title}</h2>
          </motion.div>
          <div className="flex flex-col gap-2">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-md border border-border bg-card overflow-hidden"
                data-testid={`faq-item-${i}`}
              >
                <button
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`faq-toggle-${i}`}
                >
                  <span className="font-semibold text-sm">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border/50 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-md border border-primary/20 p-10 text-center"
            style={{
              background: "radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 70%)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-violet-500/8 pointer-events-none" />
            <div className="relative">
              <div className="flex justify-center gap-0.5 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.cta.title}</h2>
              <p className="text-muted-foreground mb-7 max-w-md mx-auto">{t.cta.sub}</p>
              <Button size="lg" className="shadow-xl shadow-primary/30 gap-2 px-8" asChild>
                <Link href="/pricing">
                  {t.cta.btn}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

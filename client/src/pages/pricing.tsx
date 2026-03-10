import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle,
  X,
  Zap,
  Shield,
  Infinity,
  Star,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const freeFeatures = [
  { text: "28 PDF tools", included: true },
  { text: "3 operations per hour", included: true },
  { text: "25 MB max file size", included: true },
  { text: "3 files per batch", included: true },
  { text: "No watermarks on output", included: true },
  { text: "Files auto-deleted after 1 hour", included: true },
  { text: "Ad-supported", included: true },
  { text: "AI PDF tools", included: false },
  { text: "Unlimited operations", included: false },
  { text: "500 MB max file size", included: false },
  { text: "Batch processing (50 files)", included: false },
  { text: "Priority processing", included: false },
];

const proFeatures = [
  { text: "All 28 PDF tools", included: true },
  { text: "Unlimited operations", included: true },
  { text: "500 MB max file size", included: true },
  { text: "Batch processing (50 files)", included: true },
  { text: "No watermarks on output", included: true },
  { text: "Files stored for 24 hours", included: true },
  { text: "No ads", included: true },
  { text: "AI PDF Summary", included: true },
  { text: "AI PDF Chat", included: true },
  { text: "AI PDF Translation", included: true },
  { text: "Priority processing", included: true },
  { text: "Email support", included: true },
];

const testimonials = [
  {
    name: "Sarah K.",
    role: "Lawyer",
    text: "PDFX saves me hours every week. The merge and protect tools are essential for my practice.",
    stars: 5,
  },
  {
    name: "Marcus T.",
    role: "Designer",
    text: "The fact that files never leave my device is a huge plus for client confidentiality.",
    stars: 5,
  },
  {
    name: "Elena R.",
    role: "Student",
    text: "Free tier is genuinely useful. Compress PDF went from 48MB to 8MB instantly!",
    stars: 5,
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const price = billing === "monthly" ? "4.99" : "3.33";
  const yearlyTotal = billing === "yearly" ? "39.99" : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="secondary" className="mb-4 text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Simple, transparent pricing
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Start free. Scale when you need to.
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            All basic PDF tools are completely free forever. Upgrade to Pro for
            unlimited processing and AI features.
          </p>
        </motion.div>

        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex items-center gap-0 p-1 rounded-full border border-border bg-muted">
            <button
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                billing === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
              onClick={() => setBilling("monthly")}
              data-testid="button-billing-monthly"
            >
              Monthly
            </button>
            <button
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                billing === "yearly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
              onClick={() => setBilling("yearly")}
              data-testid="button-billing-yearly"
            >
              Yearly
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                Save 33%
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <motion.div
            className="rounded-md border border-card-border bg-card p-8 flex flex-col"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Free</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Perfect for occasional use
              </p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground mb-1">/month</span>
              </div>
            </div>

            <Button variant="outline" className="w-full mb-6" asChild>
              <Link href="/" data-testid="button-start-free">
                Start for Free
              </Link>
            </Button>

            <div className="flex flex-col gap-3 flex-1">
              {freeFeatures.map((feature) => (
                <div key={feature.text} className="flex items-center gap-2.5">
                  {feature.included ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      feature.included
                        ? "text-foreground"
                        : "text-muted-foreground/60"
                    )}
                  >
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative rounded-md border-2 border-primary bg-gradient-to-br from-card via-card to-primary/5 p-8 flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="absolute -top-3 left-6">
              <Badge className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 text-xs px-3">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Pro</h2>
              <p className="text-muted-foreground text-sm mb-4">
                For power users and professionals
              </p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">${price}</span>
                <span className="text-muted-foreground mb-1">/month</span>
              </div>
              {yearlyTotal && (
                <p className="text-sm text-muted-foreground mt-1">
                  Billed as ${yearlyTotal}/year
                </p>
              )}
            </div>

            <Button className="w-full mb-6 shadow-lg shadow-primary/30 gap-2" data-testid="button-get-pro">
              Get Pro
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="flex flex-col gap-3 flex-1">
              {proFeatures.map((feature) => (
                <div key={feature.text} className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-xl font-bold mb-2">What PDFX Pro includes</h2>
          <p className="text-muted-foreground text-sm mb-8">Everything you need to work with PDFs professionally</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Infinity,
                title: "Unlimited Operations",
                description: "No hourly limits. Process as many files as you need, whenever you need.",
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                icon: Shield,
                title: "AI-Powered Tools",
                description: "Summarize, chat with, and translate your PDFs using advanced AI.",
                color: "text-violet-400",
                bg: "bg-violet-500/10",
              },
              {
                icon: Zap,
                title: "Priority Processing",
                description: "Your files are processed first with dedicated resources for faster results.",
                color: "text-yellow-400",
                bg: "bg-yellow-500/10",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center gap-3 p-5 rounded-md border border-card-border bg-card"
              >
                <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", item.bg)}>
                  <item.icon className={cn("w-5 h-5", item.color)} />
                </div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground text-center">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-center mb-8">What users say</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-5 rounded-md border border-card-border bg-card"
                data-testid={`testimonial-${i}`}
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.stars)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-center rounded-md border border-border bg-muted/30 p-8">
          <h2 className="text-xl font-bold mb-2">Have questions?</h2>
          <p className="text-muted-foreground text-sm mb-4">
            All plans come with a 7-day money-back guarantee. No questions asked.
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              7-day money back
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              No contracts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

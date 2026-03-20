import Link from "next/link";
import { Check, ShieldCheck, Sparkles, Zap } from "lucide-react";

// Auth pages use the Supabase client and cannot be statically prerendered
// because the Supabase SDK requires project URL + anon key at SSR time.
export const dynamic = "force-dynamic";

const highlights = [
  "Bring your own OpenAI, Anthropic, or Gemini key",
  "Run research, build, and growth workflows in one place",
  "Keep structured outputs saved as reusable tasks",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fcfcfb_0%,#f4f6f1_50%,#ffffff_100%)] text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(245,158,11,0.12),transparent_22%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_480px] lg:px-10">
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e,#14b8a6)] text-white shadow-sm shadow-emerald-950/20">
              <Zap className="size-4" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              TaskLyne
            </span>
          </Link>

          <div className="mt-10 max-w-xl animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 shadow-sm">
              <Sparkles className="size-3.5" />
              Founder workspace
            </div>

            <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-tight text-foreground">
              Build startup momentum from a single professional AI workspace.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              Connect your models, run structured agent workflows, and turn scattered founder work into saved deliverables your team can actually use.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="animate-fade-up animation-delay-100 rounded-[28px] border border-border/70 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eef7f4] text-emerald-800">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">Secure by default</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Keys stay encrypted, outputs stay organized, and your model spend remains transparent.
              </p>
            </div>

            <div className="animate-fade-up animation-delay-200 rounded-[28px] border border-border/70 bg-[#13231f] p-6 text-white shadow-[0_24px_90px_-30px_rgba(15,23,42,0.45)]">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                What you get
              </p>
              <div className="mt-4 space-y-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/6 px-4 py-3">
                    <Check className="mt-0.5 size-4 text-emerald-300" />
                    <p className="text-sm leading-6 text-emerald-50/90">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full animate-fade-up lg:justify-self-end">
          {children}
        </div>
      </div>
    </div>
  );
}

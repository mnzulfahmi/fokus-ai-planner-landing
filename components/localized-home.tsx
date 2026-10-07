"use client";

import { HeroSection } from "@/components/hero-section";
import { LanguageProvider, useLanguage } from "@/components/language-provider";
import { WaitlistForm } from "@/components/waitlist-form";
import PricingSectionDemo from "@/components/ui/demo";
import { BellRing, BrainCircuit, Filter, Sparkles } from "lucide-react";
import Link from "next/link";

const featureIcons = [BrainCircuit, BellRing, Filter];

function LanguageSwitch() {
  const { locale, setLocale, text } = useLanguage();

  return (
    <div
      className="flex shrink-0 items-center border border-foreground p-0.5 text-[11px] font-black"
      role="group"
      aria-label={text.nav.languageLabel}
    >
      {(["en", "id"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={locale === option}
          onClick={() => setLocale(option)}
          className={
            locale === option
              ? "min-h-8 min-w-8 bg-foreground px-2 uppercase text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              : "min-h-8 min-w-8 px-2 uppercase transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          }
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function HomeContent() {
  const { text } = useLanguage();

  return (
    <main>
      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-16">
        <nav
          aria-label={text.nav.ariaLabel}
          className="flex h-20 items-center justify-between gap-4 border-b border-border"
        >
          <Link href="#top" className="inline-flex shrink-0 items-center gap-3 text-lg font-black tracking-[-0.045em]">
            <span className="grid size-8 -rotate-6 place-items-center rounded-full bg-foreground text-xs text-primary shadow-[4px_4px_0_var(--primary)]">
              F
            </span>
            FOKUS
          </Link>
          <div className="flex items-center gap-3 text-sm font-extrabold sm:gap-6 lg:gap-8">
            <Link className="hidden underline-offset-4 hover:underline md:block" href="#features">
              {text.nav.features}
            </Link>
            <Link className="hidden underline-offset-4 hover:underline md:block" href="#pricing">
              {text.nav.pricing}
            </Link>
            <Link className="hidden whitespace-nowrap underline-offset-4 hover:underline sm:block" href="#join">
              {text.nav.waitlist}
            </Link>
            <LanguageSwitch />
          </div>
        </nav>

        <HeroSection />
      </div>

      <section id="features" aria-labelledby="features-title" className="border-t border-border py-24 sm:py-32">
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-16">
          <h2
            id="features-title"
            className="max-w-[11ch] text-5xl font-black leading-[0.92] tracking-[-0.065em] sm:text-6xl lg:text-7xl"
          >
            {text.features.title}
          </h2>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
            {text.features.intro}
          </p>

          <div className="mt-16 grid gap-px border border-foreground bg-foreground lg:grid-cols-[1.15fr_0.85fr]">
            <article className="flex min-h-[32rem] flex-col justify-between bg-card p-7 sm:p-12">
              <div>
                <Sparkles aria-hidden="true" className="size-8 text-foreground" strokeWidth={1.8} />
                <h3 className="mt-8 max-w-[12ch] text-4xl font-black leading-[0.95] tracking-[-0.055em] sm:text-5xl">
                  {text.features.mainTitle}
                </h3>
                <p className="mt-6 max-w-[46ch] leading-relaxed text-muted-foreground">
                  {text.features.mainCopy}
                </p>
              </div>
              <div className="mt-12 grid gap-3 sm:grid-cols-2">
                <div className="border border-border bg-primary p-5 text-primary-foreground">
                  <strong className="block text-sm font-black">{text.features.upside}</strong>
                  <p className="mt-2 text-sm leading-relaxed">{text.features.upsideCopy}</p>
                </div>
                <div className="border border-border bg-secondary p-5">
                  <strong className="block text-sm font-black">{text.features.watchOut}</strong>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {text.features.watchOutCopy}
                  </p>
                </div>
              </div>
            </article>

            <div className="grid bg-card">
              {text.features.rows.map((row, index) => {
                const Icon = featureIcons[index];
                return (
                  <article key={row.title} className="grid grid-cols-[auto_1fr] gap-5 border-b border-border p-7 last:border-b-0 sm:p-9">
                    <Icon aria-hidden="true" className="mt-1 size-6" strokeWidth={1.9} />
                    <div>
                      <h3 className="text-xl font-black tracking-[-0.035em]">{row.title}</h3>
                      <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">{row.copy}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <PricingSectionDemo />

      <section id="join" aria-labelledby="join-title" className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto grid w-full max-w-[1400px] border-y border-foreground bg-primary text-primary-foreground sm:border lg:grid-cols-[0.95fr_1.05fr]">
          <div className="p-8 sm:p-12 lg:p-16">
            <h2 id="join-title" className="max-w-[10ch] text-5xl font-black leading-[0.88] tracking-[-0.07em] sm:text-6xl lg:text-7xl">
              {text.waitlist.title}
            </h2>
            <p className="mt-7 max-w-[42ch] text-lg leading-relaxed text-primary-foreground/75">
              {text.waitlist.intro}
            </p>
          </div>
          <div className="border-t border-foreground bg-card p-8 text-card-foreground sm:p-12 lg:border-l lg:border-t-0 lg:p-16">
            <WaitlistForm />
          </div>
        </div>

        <footer className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-5 pt-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-16">
          <span>{text.footer.first}</span>
          <span>{text.footer.second}</span>
        </footer>
      </section>
    </main>
  );
}

export function LocalizedHome() {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  );
}

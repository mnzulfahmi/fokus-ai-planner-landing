"use client";

import { useLanguage } from "@/components/language-provider";
import NumberFlow from "@number-flow/react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import confetti from "canvas-confetti";
import { clsx, type ClassValue } from "clsx";
import {
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border border-input bg-background hover:bg-secondary hover:text-secondary-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

const stars = Array.from({ length: 56 }, (_, index) => ({
  id: index,
  left: (index * 47 + 13) % 100,
  top: (index * 71 + 7) % 100,
  size: 1 + (index % 3),
  duration: 2.4 + (index % 5) * 0.45,
  delay: (index % 9) * 0.3,
}));

function InteractiveStarfield({
  pointerX,
  pointerY,
}: {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}) {
  const reducedMotion = useReducedMotion();
  const x = useSpring(pointerX, { stiffness: 90, damping: 18, mass: 0.2 });
  const y = useSpring(pointerY, { stiffness: 90, damping: 18, mass: 0.2 });

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={reducedMotion ? undefined : { x, y }}
    >
      {stars.map((star) => (
        <motion.span
          key={star.id}
          className="absolute rounded-full bg-foreground"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
          }}
          initial={reducedMotion ? { opacity: 0.18 } : { opacity: 0.08 }}
          animate={reducedMotion ? { opacity: 0.18 } : { opacity: [0.08, 0.38, 0.08] }}
          transition={
            reducedMotion
              ? undefined
              : {
                  duration: star.duration,
                  repeat: Infinity,
                  delay: star.delay,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </motion.div>
  );
}

export interface PricingPlan {
  name: string;
  price: number;
  yearlyPrice: number;
  period: string;
  description: string[];
  features: string[];
  buttonText: string;
  href: string;
  isPopular?: boolean;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

interface PricingSectionProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

const PricingContext = createContext<{
  isMonthly: boolean;
  setIsMonthly: (value: boolean) => void;
}>({
  isMonthly: true,
  setIsMonthly: () => undefined,
});

export function PricingSection({
  plans,
  title = "A plan for the way you focus",
  description = "Start free, then add deeper planning when your days demand it.",
}: PricingSectionProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  return (
    <PricingContext.Provider value={{ isMonthly, setIsMonthly }}>
      <section
        id="pricing"
        aria-labelledby="pricing-title"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          pointerX.set((event.clientX - rect.left - rect.width / 2) * 0.025);
          pointerY.set((event.clientY - rect.top - rect.height / 2) * 0.025);
        }}
        onPointerLeave={() => {
          pointerX.set(0);
          pointerY.set(0);
        }}
        className="relative isolate overflow-hidden border-t border-border bg-background py-20 sm:py-24"
      >
        <InteractiveStarfield pointerX={pointerX} pointerY={pointerY} />
        <div className="relative mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <h2
              id="pricing-title"
              className="text-4xl font-black tracking-[-0.05em] text-foreground sm:text-5xl"
            >
              {title}
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <PricingToggle />

          <div
            className={cn(
              "mx-auto mt-12 grid max-w-5xl grid-cols-1 items-start gap-8 lg:grid-cols-2",
              plans.length >= 3 && "max-w-none lg:grid-cols-3",
            )}
          >
            {plans.map((plan, index) => (
              <PricingCard key={plan.name} plan={plan} index={index} />
            ))}
          </div>
        </div>
      </section>
    </PricingContext.Provider>
  );
}

function PricingToggle() {
  const { isMonthly, setIsMonthly } = useContext(PricingContext);
  const { text } = useLanguage();
  const annualButtonRef = useRef<HTMLButtonElement>(null);

  const selectBilling = (monthly: boolean) => {
    if (isMonthly === monthly) return;
    setIsMonthly(monthly);

    if (!monthly && annualButtonRef.current) {
      const rect = annualButtonRef.current.getBoundingClientRect();
      confetti({
        particleCount: 70,
        spread: 72,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ["#e9ff54", "#171717", "#fffef9"],
        ticks: 220,
        gravity: 1.15,
        decay: 0.94,
        startVelocity: 28,
        disableForReducedMotion: true,
      });
    }
  };

  return (
    <div className="mt-8 flex justify-center">
      <div
        className="relative flex w-fit items-center rounded-full bg-muted p-1"
        role="group"
        aria-label={text.pricing.billingLabel}
      >
        {[
          { monthly: true, label: text.pricing.monthly },
          { monthly: false, label: text.pricing.annual, detail: text.pricing.save },
        ].map((option) => {
          const selected = isMonthly === option.monthly;
          return (
            <button
              key={option.label}
              ref={option.monthly ? undefined : annualButtonRef}
              type="button"
              aria-pressed={selected}
              onClick={() => selectBilling(option.monthly)}
              className={cn(
                "relative min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6",
                selected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {selected && (
                <motion.span
                  layoutId="billing-selection"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 450, damping: 36 }}
                />
              )}
              <span className="relative">
                {option.label}
                {option.detail && <span className="hidden sm:inline"> ({option.detail})</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PricingCard({ plan, index }: { plan: PricingPlan; index: number }) {
  const { isMonthly } = useContext(PricingContext);
  const { text } = useLanguage();
  const reducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <motion.article
      initial={reducedMotion ? false : { y: 50, opacity: 0 }}
      whileInView={{ y: plan.isPopular && isDesktop ? -20 : 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{
        duration: 0.6,
        type: "spring",
        stiffness: 100,
        damping: 20,
        delay: reducedMotion ? 0 : index * 0.15,
      }}
      className={cn(
        "relative flex min-h-[610px] flex-col rounded-2xl bg-background/70 p-8 text-card-foreground backdrop-blur-sm",
        plan.isPopular ? "border-2 border-primary shadow-xl" : "border border-border",
      )}
    >
      {plan.isPopular && (
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-primary-foreground">
            <Star aria-hidden="true" className="size-4 fill-current" strokeWidth={2} />
            <span className="text-sm font-bold">{text.pricing.mostPopular}</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col text-center">
        <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>

        <ul className="mx-auto mt-4 grid max-w-sm gap-2 text-left text-sm leading-relaxed text-muted-foreground">
          {plan.description.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.72em] size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-baseline justify-center gap-x-1">
          <div className="text-5xl font-bold tracking-tight text-foreground">
            <NumberFlow
              value={isMonthly ? plan.price : plan.yearlyPrice}
              format={{
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }}
              className="[font-variant-numeric:tabular-nums]"
            />
          </div>
          <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
            / {plan.period}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {plan.price === 0
            ? text.pricing.freeForever
            : isMonthly
              ? text.pricing.billedMonthly
              : text.pricing.billedAnnually}
        </p>

        <ul className="mt-8 grid gap-3 text-left text-sm leading-6 text-muted-foreground">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-3">
              <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-foreground" strokeWidth={2.4} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <Link
            href={plan.href}
            className={cn(
              buttonVariants({ variant: plan.isPopular ? "default" : "outline", size: "lg" }),
              "w-full",
            )}
          >
            {plan.buttonText}
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

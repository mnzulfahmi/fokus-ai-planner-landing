"use client";

import { useLanguage } from "@/components/language-provider";
import { PricingSection, type PricingPlan } from "@/components/ui/pricing";

export default function PricingSectionDemo() {
  const { text } = useLanguage();
  const plans: PricingPlan[] = text.pricing.plans.map((plan) => ({
    ...plan,
    description: [...plan.description],
    features: [...plan.features],
  }));

  return (
    <PricingSection
      plans={plans}
      title={text.pricing.title}
      description={text.pricing.intro}
    />
  );
}

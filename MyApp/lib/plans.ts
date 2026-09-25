// The subscription catalogue. Kept server-side too (the checkout route reads
// the same list) so the amount charged never comes from the browser.

export type BillingCycle = "Monthly" | "Yearly";

export type Plan = {
  id: "plus" | "pro" | "max";
  name: string;
  tagline: string;
  /** Monthly list price, in whole rupees. */
  monthly: number;
  marks: number;
  popular?: boolean;
  features: string[];
};

export const CURRENCY = "inr";
export const CURRENCY_SYMBOL = "₹";

// Two months free on the annual plan.
export const YEARLY_DISCOUNT = 0.8;

export const PLANS: Plan[] = [
  {
    id: "plus",
    name: "Plus",
    tagline: "Easy to start, simple to scale",
    monthly: 1,
    marks: 1,
    features: [
      "500 AI messages/mo",
      "2 teammates",
      "2 custom emails",
      "5 AI actions",
      "Basic lead forms",
      "Basic reports",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Built for fast-growing teams",
    monthly: 149,
    marks: 3,
    popular: true,
    features: [
      "5,000 AI messages/mo",
      "3 teammates",
      "3 custom emails",
      "10 AI actions",
      "Advanced lead forms",
      "Advanced reports",
      "Automatic agent retraining",
      "Standard integrations",
    ],
  },
  {
    id: "max",
    name: "Max",
    tagline: "Full power and autonomy",
    monthly: 449,
    marks: 5,
    features: [
      "20,000 AI messages/mo",
      "5 teammates",
      "5 custom emails",
      "25 AI actions",
      "Advanced lead forms",
      "Custom reports",
      "Scheduled agent retraining",
      "Advanced integrations",
    ],
  },
];

/** The per-month figure shown on the card for a given cycle. */
export function monthlyPrice(plan: Plan, cycle: BillingCycle): number {
  return cycle === "Yearly" ? Math.round(plan.monthly * YEARLY_DISCOUNT) : plan.monthly;
}

/** What Stripe actually charges per interval, in paise. */
export function chargeAmount(plan: Plan, cycle: BillingCycle): number {
  const perMonth = monthlyPrice(plan, cycle);
  return (cycle === "Yearly" ? perMonth * 12 : perMonth) * 100;
}

export function findPlan(planId: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === planId);
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getVerifiedUser } from "@/lib/serverAuth";
import { CURRENCY, chargeAmount, findPlan, type BillingCycle } from "@/lib/plans";

// Override if the Stripe account can't present rupees (STRIPE_CURRENCY=usd).
const currency = (process.env.STRIPE_CURRENCY || CURRENCY).toLowerCase();

// Creates a Stripe Checkout session for one of the plans in lib/plans.ts and
// hands the browser the URL to redirect to. The amount is looked up from that
// catalogue server-side — the client only names a plan and a cycle, so it
// can't ask to be charged a different price.
export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe isn't configured yet. Add STRIPE_SECRET_KEY to .env.local and restart the server." },
      { status: 503 }
    );
  }

  const user = await getVerifiedUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  }

  let body: { planId?: string; cycle?: BillingCycle };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const plan = findPlan(body.planId || "");
  const cycle = body.cycle;
  if (!plan || (cycle !== "Monthly" && cycle !== "Yearly")) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin;

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email || undefined,
      // Ties the Stripe customer back to our user for webhooks later on.
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id, plan: plan.id, cycle } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: chargeAmount(plan, cycle),
            recurring: { interval: cycle === "Yearly" ? "year" : "month" },
            product_data: { name: `${plan.name} plan`, description: plan.tagline },
          },
        },
      ],
      success_url: `${origin}/settings?section=Billing&billing=success&plan=${plan.id}`,
      cancel_url: `${origin}/settings?section=Billing&billing=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe didn't return a checkout URL." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't start checkout.";
    // "No valid payment method types" almost always means the account itself
    // can't charge yet, which Stripe's own wording doesn't make obvious.
    if (message.includes("No valid payment method types")) {
      try {
        // retrieve() with no id returns the account the key belongs to; the
        // published types only cover the connected-account form.
        const accounts = new Stripe(secretKey).accounts as unknown as {
          retrieve: () => Promise<Stripe.Account>;
        };
        const account = await accounts.retrieve();
        if (!account.charges_enabled) {
          return NextResponse.json(
            {
              error:
                "This Stripe account can't take payments yet — charges are still disabled. " +
                "Finish activation in the Stripe dashboard, or use a test key (sk_test_...) to try the flow.",
            },
            { status: 502 }
          );
        }
      } catch {
        // Fall through to Stripe's original message.
      }
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

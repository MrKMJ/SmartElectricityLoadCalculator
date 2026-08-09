import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface CheckoutSession {
  checkoutUrl: string;
  sessionId: string;
}

/**
 * Payments provider abstraction over Stripe (Architecture.docx §6/§43).
 * Business logic calls `paymentsProvider.createCheckout(...)`, never the
 * Stripe SDK directly, so the provider can be swapped later. Without
 * STRIPE_SECRET_KEY configured, a mock provider is used so subscription
 * flows are testable without a real Stripe account — see the doc's "Add
 * after MVP" tier for Stripe.
 */
@Injectable()
export class PaymentsProvider {
  private readonly logger = new Logger(PaymentsProvider.name);
  private readonly isLive: boolean;

  constructor(private readonly config: ConfigService) {
    this.isLive = Boolean(this.config.get<string>("integrations.stripeSecretKey"));
  }

  async createCheckout(userId: string, plan: string): Promise<CheckoutSession> {
    if (!this.isLive) {
      this.logger.log(`[MOCK] Stripe checkout for user=${userId} plan=${plan}`);
      const sessionId = `mock_cs_${Date.now()}`;
      return { checkoutUrl: `https://mock-checkout.local/session/${sessionId}`, sessionId };
    }
    // A real integration would call the Stripe SDK here using the
    // configured secret key. Left unimplemented until a Stripe account is
    // connected — throwing keeps behavior explicit rather than silently
    // falling back to the mock in a "live" environment.
    throw new Error("Live Stripe integration is not implemented yet. Unset STRIPE_SECRET_KEY to use the mock provider.");
  }

  async cancelSubscription(subscriptionId: string): Promise<{ canceled: boolean }> {
    if (!this.isLive) {
      this.logger.log(`[MOCK] Cancel subscription ${subscriptionId}`);
      return { canceled: true };
    }
    throw new Error("Live Stripe integration is not implemented yet.");
  }
}

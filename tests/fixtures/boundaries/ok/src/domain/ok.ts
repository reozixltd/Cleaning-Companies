import type { PricingConfig } from '@/config/pricing';
import { pricing } from '@/config/pricing';
import { a } from '@/core/a';
export const ok = (p: PricingConfig) => p.base + pricing.base + a;

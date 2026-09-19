import {
  ProviderService,
  ServiceFAQ,
  ServicePackage,
  ServiceRateType,
} from '../../../types';
import { MAX_DESCRIPTION, MAX_TITLE, Weekday, WEEKDAYS } from './constants';

export const PACKAGE_TIERS = ['Basic', 'Standard', 'Premium'] as const;

export interface PackageDraft {
  enabled: boolean;
  name: string;
  price: string;
  deliveryDays: string;
  features: string[];
}

export function makeDefaultPackages(existing?: ServicePackage[]): PackageDraft[] {
  return PACKAGE_TIERS.map((tier) => {
    const found = existing?.find((p) => p.name === tier);
    return found
      ? {
          enabled: true,
          name: tier,
          price: String(found.price),
          deliveryDays: String(found.delivery_days),
          features: [...found.features],
        }
      : { enabled: false, name: tier, price: '', deliveryDays: '', features: [] };
  });
}

/**
 * Only fully-valid tiers are written. The old screen filtered on truthy
 * strings, so a tier priced "abc" produced NaN and a tier priced "0" was
 * accepted — both of which end up violating `starting_price NOT NULL` or
 * silently zeroing the headline price. This keeps the same shape but requires
 * a real positive number and a real day count.
 */
export function buildPackages(drafts: PackageDraft[]): ServicePackage[] {
  return drafts
    .filter((p) => {
      if (!p.enabled) return false;
      const price = Number(p.price);
      const days = parseInt(p.deliveryDays, 10);
      return Number.isFinite(price) && price > 0 && Number.isFinite(days) && days >= 1;
    })
    .map((p) => ({
      name: p.name,
      price: Number(p.price),
      delivery_days: parseInt(p.deliveryDays, 10),
      features: p.features.filter((f) => f.trim()),
    }));
}

export interface PostServiceForm {
  categoryId: string | null;
  title: string;
  description: string;
  price: string;
  rateType: ServiceRateType;
  durationHours: number | null;
  locationText: string;
  availabilityDays: Weekday[];
  images: string[];
  // Preserved from the previous form — carried through untouched unless the
  // provider opens the advanced sections and edits them.
  packages: PackageDraft[];
  faq: ServiceFAQ[];
  portfolioExamples: string[];
  deliveryDays: number;
}

function sanitizeDays(value: string[] | null | undefined): Weekday[] {
  if (!value) return [];
  return WEEKDAYS.filter((d) => value.includes(d));
}

export function initialForm(existing?: ProviderService): PostServiceForm {
  return {
    categoryId: existing?.category_id ?? null,
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    price: existing ? String(existing.starting_price) : '',
    rateType: existing?.rate_type ?? 'fixed',
    durationHours: existing?.duration_hours ?? null,
    locationText: existing?.location_text ?? '',
    availabilityDays: sanitizeDays(existing?.availability_days),
    images: existing?.images ?? [],
    packages: makeDefaultPackages(existing?.packages),
    faq: existing?.faq ?? [],
    portfolioExamples: existing?.portfolio_examples ?? [],
    // Turnaround time. Not surfaced in the 3-step flow, but it is NOT NULL in
    // the database and is rendered as "N Day Delivery" by ServiceCard, so the
    // existing value is preserved on edit and defaulted on create.
    deliveryDays: existing?.delivery_days ?? 1,
  };
}

export type StepErrors = Partial<Record<keyof PostServiceForm, string>>;

/** Step 1 requires only a category. */
export function validateCategoryStep(form: PostServiceForm): StepErrors {
  return form.categoryId ? {} : { categoryId: 'Choose a category to continue.' };
}

/** Step 2 validates the fields the listing cannot be published without. */
export function validateDetailsStep(form: PostServiceForm): StepErrors {
  const errors: StepErrors = {};

  if (!form.title.trim()) errors.title = 'Give your service a title.';
  else if (form.title.trim().length < 3) errors.title = 'Make the title a little longer.';

  if (!form.description.trim()) errors.description = 'Describe what you offer.';

  const price = Number(form.price);
  if (!form.price.trim()) errors.price = 'Set your rate.';
  else if (!Number.isFinite(price) || price <= 0) errors.price = 'Enter a rate above $0.';

  if (!form.locationText.trim()) errors.locationText = 'Add where you work.';

  // Availability mirrors the existing business logic: optional, because
  // provider-level availability already exists on the profile.

  const badPackage = form.packages.find((p) => {
    if (!p.enabled) return false;
    const pkgPrice = Number(p.price);
    const pkgDays = parseInt(p.deliveryDays, 10);
    return !(Number.isFinite(pkgPrice) && pkgPrice > 0) || !(Number.isFinite(pkgDays) && pkgDays >= 1);
  });
  if (badPackage) {
    errors.packages = `Add a price and delivery time to your ${badPackage.name} package, or turn it off.`;
  }

  const incompleteFaq = form.faq.find((f) => !f.question.trim() || !f.answer.trim());
  if (incompleteFaq) errors.faq = 'Finish or remove your empty FAQ entries.';

  return errors;
}

export function hasErrors(errors: StepErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Builds the payload for createService/updateService.
 *
 * Mirrors the previous screen's derivation so existing listings keep behaving
 * the same: when packages are enabled, the cheapest tier drives starting_price
 * and that same tier drives delivery_days (the old code took the first enabled
 * tier's days, which could come from a different tier than the price).
 */
export function buildServicePayload(form: PostServiceForm) {
  const pkgs = buildPackages(form.packages);

  const cheapest = pkgs.length
    ? pkgs.reduce((min, p) => (p.price < min.price ? p : min), pkgs[0])
    : null;

  const startingPrice = cheapest ? cheapest.price : Number(form.price);
  const deliveryDays = cheapest ? cheapest.delivery_days : form.deliveryDays;

  return {
    title: form.title.trim().slice(0, MAX_TITLE),
    category_id: form.categoryId,
    description: form.description.trim().slice(0, MAX_DESCRIPTION),
    starting_price: startingPrice,
    delivery_days: deliveryDays,
    images: form.images,
    faq: form.faq.filter((f) => f.question.trim() && f.answer.trim()),
    packages: pkgs,
    portfolio_examples: form.portfolioExamples,
    // Migration 017 fields. Stripped automatically by src/api/services.ts if
    // the migration has not been applied to the target project yet.
    rate_type: form.rateType,
    duration_hours: form.durationHours,
    location_text: form.locationText.trim() || null,
    availability_days: form.availabilityDays,
  };
}

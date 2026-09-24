/**
 * Bridges the Post a Service form (src/data/types) and the provider_services
 * table (src/types), so the form can save through the existing services API
 * without either side changing shape.
 *
 * Field map, form -> column:
 *   title          -> title
 *   category slug  -> category_id (resolved by category name; 'other' from migration 018)
 *   description    -> description
 *   images         -> images (URLs from uploadServiceImage)
 *   rate           -> starting_price
 *   rateType       -> pricing_type          (migration 017)
 *   durationMinutes-> duration_minutes      (migration 017)
 *   place          -> location              (migration 017)
 *   availability   -> availability_days     (migration 017)
 *   active         -> is_active
 */
import type { CategoryId, Service, ServiceDraft } from '../data/types';
import type { Category, ProviderService } from '../types';
import { createProviderProfile, getProviderProfile } from './auth';
import { createService, updateService } from './services';
import { supabase } from './supabase';

type ServiceCategoryId = Exclude<CategoryId, 'all'>;

/** images and durationMinutes are optional on the draft; both columns accept "none". */
export type ServiceDraftInput = ServiceDraft;

/**
 * categories.name for each form category. Yard Work, Tech Help and Errands come
 * from migration 017, Other from migration 018.
 */
export const CATEGORY_NAME: Record<ServiceCategoryId, string> = {
  yard: 'Yard Work',
  tutoring: 'Tutoring',
  moving: 'Moving',
  pets: 'Pet Care',
  cleaning: 'Cleaning',
  tech: 'Tech Help',
  errands: 'Errands',
  other: 'Other',
};

/**
 * The same read as requests.ts getCategories. Importing that module would load
 * expo-image-picker with it, which throws on load with the installed version.
 */
async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

function resolveCategoryId(slug: ServiceCategoryId, categories: Category[]): string {
  const match = categories.find((c) => c.name === CATEGORY_NAME[slug]);
  // Refuse rather than save a service with no category: it would never show
  // under a category filter, and the poster wouldn't know why.
  if (!match) {
    throw new Error(`Category "${CATEGORY_NAME[slug]}" is missing. Apply migrations 017 and 018.`);
  }
  return match.id;
}

function draftColumns(draft: ServiceDraftInput, categoryId: string) {
  return {
    title: draft.title,
    category_id: categoryId,
    description: draft.description,
    starting_price: draft.rate,
    pricing_type: draft.rateType,
    duration_minutes: draft.durationMinutes ?? null,
    location: draft.place,
    availability_days: draft.availability,
    ...(draft.images ? { images: draft.images } : {}),
  };
}

/**
 * provider_services.provider_id is a foreign key to provider_profiles.user_id
 * (migration 008), and nothing else in the app creates that row, so a first
 * post would be rejected without this.
 */
async function ensureProviderProfile(userId: string): Promise<void> {
  if (await getProviderProfile(userId)) return;
  try {
    await createProviderProfile({ user_id: userId });
  } catch (err) {
    // 23505: another first post (say, in a second tab) created it in between.
    if ((err as { code?: string } | null)?.code !== '23505') throw err;
  }
}

/** Publishes a new service for the signed-in user. */
export async function postServiceDraft(
  draft: ServiceDraftInput,
  userId: string,
): Promise<ProviderService> {
  const [categories] = await Promise.all([getCategories(), ensureProviderProfile(userId)]);
  return createService({
    ...draftColumns(draft, resolveCategoryId(draft.category, categories)),
    provider_id: userId,
    // The form has no turnaround; 1 is delivery_days' column default. faq,
    // packages and portfolio_examples belong to the older editor and start empty.
    delivery_days: 1,
    images: draft.images ?? [],
    faq: [],
    packages: [],
    portfolio_examples: [],
    is_active: true,
  });
}

/** Saves an edit made through the same form. Leaves images alone unless the draft carries them. */
export async function updateServiceDraft(id: string, draft: ServiceDraftInput): Promise<void> {
  const categories = await getCategories();
  await updateService(id, draftColumns(draft, resolveCategoryId(draft.category, categories)));
}

/**
 * Reads a row back into the form's shape. Returns null for a service filed under
 * a category the form doesn't offer (e.g. Plumbing), which it can't edit.
 * views and requests have no backing column and read as 0.
 */
export function serviceFromRow(row: ProviderService): Service | null {
  const name = row.category?.name;
  const slug = (Object.keys(CATEGORY_NAME) as ServiceCategoryId[]).find(
    (id) => CATEGORY_NAME[id] === name,
  );
  if (!slug) return null;
  return {
    id: row.id,
    title: row.title,
    category: slug,
    rate: Number(row.starting_price),
    rateType: row.pricing_type,
    description: row.description ?? '',
    availability: row.availability_days,
    place: row.location ?? '',
    active: row.is_active,
    views: 0,
    requests: 0,
    images: row.images,
    ...(row.duration_minutes === null ? {} : { durationMinutes: row.duration_minutes }),
    remoteId: row.id,
  };
}

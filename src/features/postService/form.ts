/**
 * The Post a Service form as one typed object, the rules that decide whether it
 * can move on, and its conversions to and from the store's Service shape.
 *
 * Every error is derived from the form, so the inline messages, the "still
 * needed" summary and the saved draft can never disagree with each other.
 */
import { CATEGORY_BY_ID } from '../../data/mock';
import type { Service, ServiceDraft } from '../../data/types';
import { formatMoney } from '../../utils/format';
import {
  DAYS,
  DESCRIPTION_MIN,
  MAX_PHOTOS,
  RATE_MAX,
  TITLE_MIN,
  durationFromMinutes,
  durationMinutes,
} from './constants';
import type { Day, DurationId, RateType, ServiceCategoryId } from './constants';

export interface PostServiceForm {
  category: ServiceCategoryId | null;
  /** Local picker URIs until posted; remote URLs once a service has been saved. */
  photos: string[];
  title: string;
  description: string;
  /** Whole dollars as typed, digits only. */
  rate: string;
  rateType: RateType | null;
  duration: DurationId | null;
  place: string;
  availability: Day[];
}

export type FieldKey =
  | 'category'
  | 'title'
  | 'description'
  | 'rate'
  | 'rateType'
  | 'duration'
  | 'place'
  | 'availability';

export type FormErrors = Partial<Record<FieldKey, string>>;

/** Step 2's fields in screen order, which is also the order the summary names them. */
export const DETAIL_FIELDS: FieldKey[] = [
  'title',
  'description',
  'rate',
  'rateType',
  'duration',
  'place',
  'availability',
];

/** How the "To preview, fix:" line names each field: its label on the form. */
export const FIELD_NAMES: Record<FieldKey, string> = {
  category: 'category',
  title: 'title',
  description: 'description',
  rate: 'price',
  rateType: 'pricing',
  duration: 'duration',
  place: 'location',
  availability: 'availability',
};

export function emptyForm(place: string): PostServiceForm {
  return {
    category: null,
    photos: [],
    title: '',
    description: '',
    rate: '',
    rateType: null,
    duration: null,
    place,
    availability: [],
  };
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Seeds the form from a saved service, for editing from My Services. The
 * service may come from localStorage, so anything malformed is left blank for
 * the user to fill in again rather than trusted.
 */
export function formFromService(service: Service): PostServiceForm {
  const category = service.category as string;
  return {
    category:
      category !== 'all' && Object.prototype.hasOwnProperty.call(CATEGORY_BY_ID, category)
        ? service.category
        : null,
    photos: Array.isArray(service.images)
      ? service.images.filter((uri) => typeof uri === 'string' && uri.length > 0).slice(0, MAX_PHOTOS)
      : [],
    title: text(service.title),
    description: text(service.description),
    rate: String(Math.round(service.rate)),
    rateType: service.rateType === 'hourly' || service.rateType === 'fixed' ? service.rateType : null,
    duration: durationFromMinutes(service.durationMinutes),
    place: text(service.place),
    // Kept to known labels and put back in Mon -> Sun order.
    availability: DAYS.filter((day) => service.availability.includes(day)),
  };
}

export function validate(form: PostServiceForm): FormErrors {
  const errors: FormErrors = {};

  if (form.category === null) errors.category = 'Pick a category to continue.';

  if (form.title.trim().length < TITLE_MIN) {
    errors.title = form.title.trim().length === 0
      ? 'Add a title.'
      : `Use at least ${TITLE_MIN} characters.`;
  }

  if (form.description.trim().length < DESCRIPTION_MIN) {
    errors.description = form.description.trim().length === 0
      ? 'Add a description.'
      : `Use at least ${DESCRIPTION_MIN} characters so people know what they get.`;
  }

  const rate = Number(form.rate);
  if (form.rate.length === 0) {
    errors.rate = 'Enter your price.';
  } else if (!Number.isInteger(rate) || rate <= 0) {
    errors.rate = 'Enter a price above $0.';
  } else if (rate > RATE_MAX) {
    errors.rate = `Keep it at ${formatMoney(RATE_MAX)} or under.`;
  }

  if (form.rateType === null) errors.rateType = 'Pick hourly or fixed.';
  if (form.duration === null) errors.duration = 'Pick how long it usually takes.';
  if (form.place.trim().length === 0) errors.place = 'Add where you offer this.';
  if (form.availability.length === 0) errors.availability = 'Pick at least one day.';

  return errors;
}

/** "title, price and duration" — the missing step 2 fields, in screen order. */
export function missingSummary(errors: FormErrors): string {
  const names = DETAIL_FIELDS.filter((key) => errors[key] !== undefined).map(
    (key) => FIELD_NAMES[key],
  );
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The draft the store and the Supabase adapter both take. Throws on a form that doesn't validate. */
export function draftFromForm(form: PostServiceForm): ServiceDraft {
  if (form.category === null || form.rateType === null || form.duration === null) {
    throw new Error('draftFromForm needs a validated form.');
  }
  return {
    title: form.title.trim(),
    category: form.category,
    rate: Number(form.rate),
    rateType: form.rateType,
    description: form.description.trim(),
    availability: [...form.availability],
    place: form.place.trim(),
    images: [...form.photos],
    durationMinutes: durationMinutes(form.duration),
  };
}

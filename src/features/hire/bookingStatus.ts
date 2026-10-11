/** Labels, tones and plain-language explanations for each booking status. */
import type { BookingStatus } from '../../data/types';
import type { PillTone } from '../../ui';

export const BOOKING_STATUS: Record<
  BookingStatus,
  { label: string; tone: PillTone; explain: (first: string) => string }
> = {
  requested: {
    label: 'Awaiting reply',
    tone: 'outline',
    explain: (first) =>
      `${first} has your request. You'll see it change to Confirmed once they accept.`,
  },
  confirmed: {
    label: 'Confirmed',
    tone: 'success',
    explain: (first) =>
      `${first} accepted. Now is the time to share your exact address with them.`,
  },
  completed: {
    label: 'Completed',
    tone: 'light',
    explain: () => 'This job is done. Leave a review so others know how it went.',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'danger',
    explain: () => 'This booking was cancelled.',
  },
  declined: {
    label: 'Declined',
    tone: 'neutral',
    explain: (first) => `${first} couldn't take this one. Try another time or another worker.`,
  },
};

/**
 * Where a finished Post a Service draft goes.
 *
 * Signed in to Supabase: photos go up through uploadServiceImage and the
 * service is saved through the serviceDraft adapter (createService /
 * updateService underneath). Signed out, or with no Supabase configured, there
 * is nowhere to save it but the app store, which is what the app does today;
 * the caller handles that path.
 */
import type { ServiceDraft } from '../../data/types';
import { getSession } from '../../api/auth';
import { postServiceDraft, updateServiceDraft } from '../../api/serviceDraft';
import { uploadServiceImage } from '../../api/services';
import { supabaseConfigured } from '../../api/supabase';

/** The signed-in Supabase user's id, or null when nobody is signed in. */
export async function signedInUserId(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  try {
    const session = await getSession();
    return session?.user.id ?? null;
  } catch {
    // An unreachable or misconfigured project reads as signed out.
    return null;
  }
}

/** A URL that is already in storage, as opposed to a picker URI still on the device. */
const UPLOADED = /^https?:\/\//i;

/** Uploads the photos that are still local, in order, keeping the ones already uploaded. */
async function uploadPhotos(photos: string[], userId: string): Promise<string[]> {
  const urls: string[] = [];
  // One at a time, so a failure names a single photo and keeps the order stable.
  for (const uri of photos) {
    urls.push(UPLOADED.test(uri) ? uri : await uploadServiceImage(uri, userId));
  }
  return urls;
}

/**
 * Saves the draft to Supabase and returns it as saved: photo URLs in place of
 * device URIs, and remoteId set to the provider_services row. With a remoteId
 * it updates that row instead of creating one.
 */
export async function publishDraft(
  draft: ServiceDraft,
  userId: string,
  remoteId?: string,
): Promise<ServiceDraft> {
  const images = await uploadPhotos(draft.images ?? [], userId);
  const saved: ServiceDraft = { ...draft, images };

  if (remoteId !== undefined) {
    await updateServiceDraft(remoteId, saved);
    return { ...saved, remoteId };
  }

  const row = await postServiceDraft(saved, userId);
  return { ...saved, remoteId: row.id };
}

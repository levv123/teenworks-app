/**
 * Where Post a Service keeps photos while there is no Supabase user to upload
 * them for: on the device, next to the service in the app's local store.
 *
 * Phone: the picker hands back a file in its cache, which the OS may clear.
 * Each pick is copied into the app's document directory, which it doesn't,
 * and a copy is deleted once nothing uses it any more.
 *
 * Web: photos are data: URIs inside the store's localStorage entry (see
 * pickServiceImages), so the space they need is checked before a save.
 */
import { Platform } from 'react-native';

/** The parts of expo-file-system's legacy API used here, typed by hand; see copyTo. */
interface LegacyFileSystem {
  documentDirectory: string | null;
  makeDirectoryAsync: (uri: string, options: { intermediates: boolean }) => Promise<void>;
  copyAsync: (options: { from: string; to: string }) => Promise<void>;
  deleteAsync: (uri: string, options: { idempotent: boolean }) => Promise<void>;
}

const PHOTO_DIR_NAME = 'service-photos/';

/**
 * The file system, or null where it can't be used. Required lazily, and only
 * off web: the installed expo-file-system is v56, newer than this Expo SDK.
 * Its legacy API works against SDK 51's native module, but a build that
 * doesn't include that module gets a shim with no document directory, so
 * everything here falls back to leaving photos where the picker put them.
 */
function fileSystem(): LegacyFileSystem | null {
  if (Platform.OS === 'web') return null;
  try {
    const fs: LegacyFileSystem = require('expo-file-system/legacy');
    return fs.documentDirectory ? fs : null;
  } catch (err) {
    console.warn('[TeenWorks] File system unavailable; photos stay in the picker cache:', err);
    return null;
  }
}

function photoDir(fs: LegacyFileSystem): string {
  return `${fs.documentDirectory}${PHOTO_DIR_NAME}`;
}

let copySeq = 0;

/**
 * Copies freshly picked photos into the app's own folder and returns the
 * copies' URIs in the same order. A photo that can't be copied keeps its
 * picker URI, so a failure never loses a pick. Web URIs come back as they are.
 */
export async function keepPhotosOnDevice(uris: string[]): Promise<string[]> {
  const fs = fileSystem();
  if (fs === null || uris.length === 0) return uris;
  const dir = photoDir(fs);
  try {
    await fs.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // Already there; a real failure shows up in copyAsync below.
  }
  return Promise.all(
    uris.map(async (uri) => {
      if (uri.startsWith(dir)) return uri;
      const ext = /\.(jpe?g|png|heic|heif|webp|gif)$/i.exec(uri.split('?')[0])?.[1] ?? 'jpg';
      copySeq += 1;
      const to = `${dir}${Date.now()}-${copySeq}.${ext.toLowerCase()}`;
      try {
        await fs.copyAsync({ from: uri, to });
        return to;
      } catch (err) {
        console.warn('[TeenWorks] Could not copy a photo; keeping the picker file:', err);
        return uri;
      }
    }),
  );
}

/**
 * Deletes this app's copies among `uris` that no service or form still uses
 * (`inUse`). Picker files, stored URLs and anything on web are left alone.
 * Never throws: a copy left behind only costs disk space.
 */
export async function discardPhotoCopies(uris: string[], inUse: string[]): Promise<void> {
  const fs = fileSystem();
  if (fs === null) return;
  const dir = photoDir(fs);
  const keep = new Set(inUse);
  const unused = [...new Set(uris)].filter((uri) => uri.startsWith(dir) && !keep.has(uri));
  await Promise.all(
    unused.map((uri) =>
      fs.deleteAsync(uri, { idempotent: true }).catch((err: unknown) => {
        console.warn('[TeenWorks] Could not delete an unused photo copy:', err);
      }),
    ),
  );
}

// ── Web storage room ──────────────────────────────────────────────────────────

const PROBE_KEY = 'teenworks.room-check';
/** Headroom for the service's text fields and the store's other small changes. */
const PROBE_MARGIN = 16 * 1024;

function isQuotaError(err: unknown): boolean {
  if (typeof DOMException !== 'undefined' && err instanceof DOMException) {
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    );
  }
  return false;
}

/**
 * Web only: whether localStorage has room for `extraChars` more characters,
 * which is what saving photos that aren't in the store yet will add. It
 * writes a throwaway entry of that size and removes it again. True off web,
 * and when localStorage can't be used at all (the store then can't save
 * anything anyway, and says nothing, as before).
 */
export function hasRoomForPhotos(extraChars: number): boolean {
  if (Platform.OS !== 'web' || extraChars <= 0) return true;
  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return true;
  }
  try {
    storage.setItem(PROBE_KEY, 'x'.repeat(extraChars + PROBE_MARGIN));
    return true;
  } catch (err) {
    return !isQuotaError(err);
  } finally {
    try {
      storage.removeItem(PROBE_KEY);
    } catch {
      // Nothing was written.
    }
  }
}

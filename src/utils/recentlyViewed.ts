import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProviderService } from '../types';

const KEY = 'recently_viewed_services';
const MAX_ITEMS = 20;

export async function recordRecentlyViewed(service: ProviderService): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const current: ProviderService[] = raw ? JSON.parse(raw) : [];
    // Remove existing entry for this service (de-dupe), then prepend
    const filtered = current.filter((s) => s.id !== service.id);
    const updated = [service, ...filtered].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // Silent fail — recently viewed is non-critical
  }
}

export async function getRecentlyViewed(): Promise<ProviderService[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProviderService[]) : [];
  } catch {
    return [];
  }
}

export async function clearRecentlyViewed(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

export async function removeRecentlyViewed(serviceId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const current: ProviderService[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify(current.filter((s) => s.id !== serviceId)),
    );
  } catch {}
}

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Location } from '../types';

// expo-location is native-only and stubbed to an empty module on web.
// Import it lazily so the stub doesn't crash the bundle.
const ExpoLocation = Platform.OS !== 'web'
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ? (require('expo-location') as typeof import('expo-location'))
  : null;

interface UseLocationResult {
  location: Location | null;
  address: string | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<Location | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async (): Promise<boolean> => {
    if (!ExpoLocation) return false;
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === 'granted';
  };

  const fetchLocation = async () => {
    if (!ExpoLocation) return; // not supported on web
    setLoading(true);
    setError(null);
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setError('Location permission denied');
          return;
        }
      }

      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      const loc: Location = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(loc);

      // Reverse geocode
      try {
        const [geo] = await ExpoLocation.reverseGeocodeAsync(loc);
        if (geo) {
          const parts = [geo.street, geo.city, geo.region].filter(Boolean);
          setAddress(parts.join(', '));
        }
      } catch {
        // Ignore geocoding errors
      }
    } catch (err: unknown) {
      setError('Could not get location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  return {
    location,
    address,
    loading,
    error,
    requestPermission,
    refreshLocation: fetchLocation,
  };
}

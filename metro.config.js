const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Packages that use createPermissionHook (or other native-only APIs) at
// module-import time.  On web they crash the bundle before React mounts,
// so we redirect them to empty stub modules instead.
const WEB_STUBS = new Set([
  '@opentelemetry/api',   // optional dep of @supabase/supabase-js
  'expo-location',        // calls createPermissionHook on import
  'expo-notifications',   // calls createPermissionHook on import
  'expo-image-picker',    // calls createPermissionHook on import
  'expo-device',          // native-only device info, no web equivalent
]);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS.has(moduleName)) {
    return { type: 'empty' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

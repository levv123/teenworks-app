import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and on web it also calls AppRegistry.runApplication() to mount to #root.
// Without this file, "main": "App.tsx" causes Metro to evaluate App.tsx as
// module 0 and call __r(0), which just exports the component — nothing ever
// mounts to the DOM and the page stays blank.
registerRootComponent(App);

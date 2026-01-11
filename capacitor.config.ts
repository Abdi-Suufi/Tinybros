import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tinywatch.app',
  appName: 'Tinywatch',
  webDir: 'out',
  server: {
    url: 'https://tinywatch.vercel.app', 
    cleartext: true
  }
};

export default config;
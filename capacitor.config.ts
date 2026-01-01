import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tinybros.app',
  appName: 'TinyBros',
  webDir: 'out',
  server: {
    url: 'https://tinybros.vercel.app', 
    cleartext: true
  }
};

export default config;
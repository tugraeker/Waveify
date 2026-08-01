import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.waveify.mobile',
  appName: 'Waveify',
  webDir: 'dist',
  android: {
    backgroundColor: '#121216',
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    App: {
      appUrlOpenScheme: ['waveify'],
    },
  },
}

export default config

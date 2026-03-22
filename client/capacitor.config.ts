import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.strengthcharts.app',
  appName: 'StrengthCharts',
  webDir: 'dist',
  server: {
    // For development with live reload, uncomment and set your local IP:
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0a0a0a',
    preferredContentMode: 'mobile',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Set your iOS client ID from Google Cloud Console here:
      // iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
      // Set your server/web client ID here:
      // serverClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    },
  },
};

export default config;

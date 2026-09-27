import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mythrift.app',
  appName: 'My Thrift',
  webDir: 'dist',
  ios: {
    backgroundColor: '#ffffff',
    contentInset: 'never',
    scrollEnabled: true
  },
  plugins: {
    FirebaseAuthentication: {
      providers: ['google.com', 'twitter.com'],
      skipNativeAuth: true
    },
    Keyboard: {
      resize: 'native',
      style: 'LIGHT',
      resizeOnFullScreen: true
    },
    SplashScreen: {
      // AppBootstrapGate hides this only after the saved experience, Firebase
      // session and initial destination are resolved. This prevents the wrong
      // role shell flashing during a native cold start.
      launchAutoHide: false,
      launchShowDuration: 1200,
      backgroundColor: '#f9531e',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'LIGHT'
    }
  }
};

export default config;

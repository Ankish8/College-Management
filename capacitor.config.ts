import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jlu.cms',
  appName: 'JLU College Management System',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  
  // iOS Configuration
  ios: {
    scheme: 'JLU CMS',
    backgroundColor: '#2563eb'
  },
  
  // Android Configuration
  android: {
    backgroundColor: '#2563eb',
    allowMixedContent: true,
    captureInput: true
  },
  
  // Plugins Configuration
  plugins: {
    // Push Notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    
    // Local Notifications
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#2563eb',
      sound: 'beep.wav'
    },
    
    // Status Bar
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2563eb'
    },
    
    // Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563eb',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff'
    },
    
    // Keyboard
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    
    // Network
    Network: {},
    
    // Device Info
    Device: {},
    
    // App State
    App: {
      launchUrl: '/dashboard'
    },
    
    // Camera (for profile pictures)
    Camera: {
      permissions: ['camera', 'photos']
    },
    
    // File System
    Filesystem: {},
    
    // Share
    Share: {},
    
    // Browser
    Browser: {
      windowName: '_system'
    },
    
    // Haptics
    Haptics: {},
    
    // Toast
    Toast: {},
    
    // Action Sheet
    ActionSheet: {}
  }
};

export default config;
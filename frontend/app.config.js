import 'dotenv/config';

export default {
  "expo": {
    "name": "LockMatchApp",
    "slug": "LockMatchApp",
    "scheme": "lockmatchapp",
    "version": "54.0.0",
    "orientation": "portrait",
    "icon": "./assets/app_icon/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/app_icon/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffe1ca"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.lockmatch.LockMatchApp"
    },
    "android": {
      "usesCleartextTraffic": true,
      "adaptiveIcon": {
        "foregroundImage": "./assets/app_icon/adaptive-icon.png",
        "backgroundColor": "#ffe1ca"
      },
      "permissions": [
        "android.permission.CAMERA"
      ],
      "edgeToEdgeEnabled": true,
      "package": "com.lockmatch.LockMatchApp",
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY
        }
      }
    },
    "web": {
      "favicon": "./assets/app_icon/favicon.png"
    },
    "plugins": [
      "expo-router"
    ],
    "extra": {
      "apiUrl": process.env.EXPO_PUBLIC_API_URL,
      "router": {},
      "eas": {
        "projectId": "e87e8358-1496-4bc4-814a-73e8f12242a0"
      }
    }
  }
}
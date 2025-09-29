import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Check if required Firebase environment variables are available
const hasFirebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
                         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
                         process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
                         process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

const firebaseConfig = hasFirebaseConfig ? {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} : {
  // Fallback config for when Firebase is not configured
  apiKey: "demo-api-key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

// Initialize Firebase only if config is valid
let app: any = null;
let messaging: any = null;

if (hasFirebaseConfig) {
  // Check if Firebase is already initialized
  const apps = getApps();
  if (apps.length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = apps[0];
  }

  // Initialize Firebase Cloud Messaging and get a reference to the service
  if (typeof window !== 'undefined') {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.warn('Firebase messaging initialization failed:', error);
      messaging = null;
    }
  }
}

export { app, messaging };

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messaging || !hasFirebaseConfig) {
    console.log('Firebase messaging not available - notifications disabled');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (token) {
        console.log('FCM token:', token);
        return token;
      }
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }

  return null;
};

export const onMessageListener = (callback: (payload: any) => void) => {
  if (!messaging || !hasFirebaseConfig) return () => {}; // Return empty cleanup function

  return onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    callback(payload);
  });
};

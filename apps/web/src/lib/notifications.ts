import { supabaseAdmin } from './supabase';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

export interface FCMMessage {
  token: string;
  notification: NotificationPayload;
  webpush?: {
    headers: {
      Urgency: 'very-low' | 'low' | 'normal' | 'high';
    };
    notification: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      tag?: string;
    };
  };
  data?: Record<string, any>;
}

// Initialize Firebase Admin SDK
let messaging: any = null;

try {
  // Check if Firebase Admin is already initialized
  const apps = getApps();
  if (apps.length === 0) {
    // Initialize Firebase Admin with service account
    const serviceAccountPath = path.join(process.cwd(), 'travel-safety.json');
    initializeApp({
      credential: cert(serviceAccountPath),
    });
  }
  
  messaging = getMessaging();
} catch (error) {
  console.warn('Firebase Admin initialization failed:', error);
}

// Check if Firebase is configured
const hasFirebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
                         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
                         process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
                         process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
                         messaging;

export async function sendFCMNotification(
  token: string,
  payload: NotificationPayload
): Promise<boolean> {
  if (!hasFirebaseConfig || !messaging) {
    console.log('Firebase not configured - notifications disabled');
    return false;
  }

  try {
    const message = {
      token: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/icon-192.png',
          tag: payload.tag,
        },
        headers: {
          Urgency: 'high',
        },
      },
      data: payload.data || {},
    };

    const response = await messaging.send(message);
    console.log('FCM notification sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return false;
  }
}

export async function sendNotificationToTourist(
  touristId: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    // Get tourist's device token
    const { data: tokens, error } = await supabaseAdmin
      .from('device_tokens')
      .select('token')
      .eq('tourist_id', touristId)
      .eq('platform', 'web');

    if (error || !tokens || tokens.length === 0) {
      console.error('No device tokens found for tourist:', touristId);
      return false;
    }

    // Send to all devices
    const results = await Promise.all(
      tokens.map(token => sendFCMNotification(token.token, payload))
    );

    return results.some(result => result); // Return true if at least one succeeded
  } catch (error) {
    console.error('Error sending notification to tourist:', error);
    return false;
  }
}

export async function sendNotificationToOperators(payload: NotificationPayload): Promise<boolean> {
  try {
    // Get all operator device tokens
    const { data: tokens, error } = await supabaseAdmin
      .from('device_tokens')
      .select('token')
      .neq('user_id', null) // Only operators (not tourists)
      .eq('platform', 'web');

    if (error || !tokens || tokens.length === 0) {
      console.error('No operator device tokens found');
      return false;
    }

    // Send to all operators
    const results = await Promise.all(
      tokens.map(token => sendFCMNotification(token.token, payload))
    );

    return results.some(result => result); // Return true if at least one succeeded
  } catch (error) {
    console.error('Error sending notification to operators:', error);
    return false;
  }
}

// Predefined notification templates
export const NotificationTemplates = {
  RESTRICTED_ZONE_WARNING: {
    title: '⚠️ Restricted Zone Alert',
    body: 'You have entered a restricted area. Please leave immediately for your safety.',
    icon: '/icon-192.png',
    tag: 'zone-warning',
  },
  IMMOBILE_WARNING: {
    title: '🚨 Immobility Detected',
    body: 'We detected you may be immobile. If this is an emergency, tap SOS or call emergency services.',
    icon: '/icon-192.png',
    tag: 'immobile-warning',
  },
  NEW_INCIDENT: {
    title: '🚨 New Incident Alert',
    body: 'A new incident has been reported and needs attention.',
    icon: '/icon-192.png',
    tag: 'new-incident',
  },
  SOS_ALERT: {
    title: '🚨 SOS Emergency',
    body: 'Emergency SOS activated. Authorities have been notified.',
    icon: '/icon-192.png',
    tag: 'sos-alert',
  },
};

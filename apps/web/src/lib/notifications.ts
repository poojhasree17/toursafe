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

  // Validate token format (FCM tokens are typically 152+ characters)
  if (!token || token.length < 140 || !token.includes(':')) {
    console.warn('Invalid FCM token format, skipping notification:', {
      tokenLength: token?.length || 0,
      tokenPreview: token?.substring(0, 20) + '...'
    });
    return false;
  }

  try {
    // Convert all data values to strings (FCM requirement)
    const stringifiedData: Record<string, string> = {};
    if (payload.data) {
      for (const [key, value] of Object.entries(payload.data)) {
        // Convert all values to strings
        if (value === null || value === undefined) {
          stringifiedData[key] = '';
        } else if (typeof value === 'object') {
          stringifiedData[key] = JSON.stringify(value);
        } else {
          stringifiedData[key] = String(value);
        }
      }
    }

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
      data: stringifiedData,
    };

    const response = await messaging.send(message);
    console.log('✅ FCM notification sent successfully:', response);
    return true;
  } catch (error: any) {
    // Handle common FCM errors gracefully
    if (error?.errorInfo?.code === 'messaging/invalid-argument' || 
        error?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
        error?.errorInfo?.code === 'messaging/invalid-registration-token') {
      console.warn('⚠️  Invalid or expired FCM token, skipping notification:', {
        code: error?.errorInfo?.code,
        token: token?.substring(0, 20) + '...'
      });
      // Don't throw - this is expected in dev/demo mode
      return false;
    }
    
    console.error('❌ Error sending FCM notification:', error?.errorInfo || error);
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

    if (error) {
      console.error('❌ Database error fetching device tokens:', error);
      return false;
    }

    if (!tokens || tokens.length === 0) {
      console.log('ℹ️  No device tokens found for tourist:', touristId, '(notifications disabled in demo mode)');
      return false;
    }

    console.log(`📱 Sending notification to ${tokens.length} device(s) for tourist ${touristId}`);
    console.log(`   Title: ${payload.title}`);
    console.log(`   Body: ${payload.body}`);

    // Send to all devices
    const results = await Promise.all(
      tokens.map(token => sendFCMNotification(token.token, payload))
    );

    const successCount = results.filter(r => r).length;
    console.log(`📊 Notification result: ${successCount}/${tokens.length} sent successfully`);

    return results.some(result => result); // Return true if at least one succeeded
  } catch (error) {
    console.error('❌ Error sending notification to tourist:', error);
    return false;
  }
}

export async function sendNotificationToOperators(payload: NotificationPayload): Promise<boolean> {
  try {
    // Get all operator device tokens
    const { data: tokens, error } = await supabaseAdmin
      .from('device_tokens')
      .select('token')
      .not('user_id', 'is', null) // Only operators (not tourists) - proper NULL check
      .eq('platform', 'web');

    if (error) {
      console.error('❌ Database error fetching operator tokens:', error);
      return false;
    }

    if (!tokens || tokens.length === 0) {
      console.log('ℹ️  No operator device tokens found (notifications disabled in demo mode)');
      return false;
    }

    console.log(`📱 Sending notification to ${tokens.length} operator(s)`);
    console.log(`   Title: ${payload.title}`);
    console.log(`   Body: ${payload.body}`);

    // Send to all operators
    const results = await Promise.all(
      tokens.map(token => sendFCMNotification(token.token, payload))
    );

    const successCount = results.filter(r => r).length;
    console.log(`📊 Notification result: ${successCount}/${tokens.length} sent successfully`);

    return results.some(result => result); // Return true if at least one succeeded
  } catch (error) {
    console.error('❌ Error sending notification to operators:', error);
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

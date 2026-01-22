// services/notificationService.ts - Complete Implementation

import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';

// ============ WEB NOTIFICATIONS ============

/**
 * Checks if the browser supports Service Workers and Push Notifications.
 */
export const isPushSupported = (): boolean =>
  'serviceWorker' in navigator && 'Notification' in window;

/**
 * Check current web notification status
 */
export const checkWebNotificationStatus = (): NotificationPermission => {
  if (!isPushSupported()) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Request web notification permission
 */
export const requestWebNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) {
    console.warn('❌ Push notifications not supported in this browser');
    return 'denied';
  }

  try {
    console.log('🔔 Requesting web notification permission...');
    const permission = await Notification.requestPermission();
    console.log('✅ Web notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('❌ Error requesting web notification permission:', error);
    return 'denied';
  }
};

/**
 * Send web notification via Service Worker
 */
export const sendWebNotification = async (title: string, body: string): Promise<void> => {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported.');
    return;
  }

  try {
    // Check permission first
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Web notification permission not granted');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      console.log('📨 Sending notification via Service Worker:', title);
      registration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        timestamp: Date.now(),
        icon: '/icon-192x192.png',
      });
    } else {
      console.warn('⚠️ Service worker not active, using fallback');
      // Fallback: show notification directly
      if (document.visibilityState === 'visible') {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
        });
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error sending notification via Service Worker:', errorMessage);
  }
};

// ============ ANDROID NATIVE NOTIFICATIONS ============

/**
 * Initialize LocalNotifications channel for Android
 */
export const initializeLocalNotificationsChannel = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    console.log('🔔 Initializing LocalNotifications channel...');

    await LocalNotifications.createChannel({
      id: 'default',
      name: 'Default',
      description: 'TruAwake Alert Notifications',
      importance: 5,
      sound: 'default',
      vibration: true,
      lightColor: '#FF0000',
    });

    console.log('✅ LocalNotifications channel created');
  } catch (error) {
    console.error('❌ Error initializing LocalNotifications channel:', error);
  }
};

/**
 * Check Android notification permission
 */
export const checkAndroidNotificationPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  try {
    const result = await LocalNotifications.checkPermissions();
    console.log('📱 Android permission check:', result);

    if (result.display === 'granted') {
      return 'granted';
    } else if (result.display === 'denied') {
      return 'denied';
    } else {
      return 'prompt';
    }
  } catch (error) {
    console.error('❌ Error checking Android permission:', error);
    return 'denied';
  }
};

/**
 * Request Android notification permission
 */
export const requestAndroidNotificationPermission = async (): Promise<'granted' | 'denied'> => {
  try {
    console.log('🔔 Requesting Android notification permission...');

    // Initialize channel first
    await initializeLocalNotificationsChannel();

    // Check current status
    const checkResult = await LocalNotifications.checkPermissions();
    console.log('Current Android permission:', checkResult);

    if (checkResult.display === 'granted') {
      console.log('✅ Permission already granted');
      return 'granted';
    }

    // Request permission
    const requestResult = await LocalNotifications.requestPermissions();
    console.log('Android permission request result:', requestResult);

    return requestResult.display === 'granted' ? 'granted' : 'denied';
  } catch (error) {
    console.error('❌ Error requesting Android permission:', error);
    return 'denied';
  }
};

/**
 * Send Android notification
 */
export const sendAndroidNotification = async (title: string, body: string): Promise<void> => {
  try {
    // Verify permission
    const status = await checkAndroidNotificationPermission();
    console.log('📱 Permission status before sending:', status);

    if (status !== 'granted') {
      console.warn('⚠️ Notification permission not granted');
      return;
    }

    const notification: LocalNotificationSchema = {
      id: Date.now(),
      title,
      body,
      largeBody: body,
      summaryText: title,
      channelId: 'default',
      smallIcon: 'ic_stat_notification',
      sound: 'default',
    };

    console.log('📨 Sending Android notification');

    await LocalNotifications.schedule({
      notifications: [notification],
    });

    console.log('✅ Android notification sent');
  } catch (error) {
    console.error('❌ Error sending Android notification:', error);
  }
};

// ============ UNIFIED API ============

/**
 * Check notification status (web or native)
 * Returns: 'granted' | 'denied' | 'prompt'
 */
export const checkNotificationStatus = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  if (Capacitor.isNativePlatform()) {
    console.log('📱 Checking native (Android) notification status...');
    return await checkAndroidNotificationPermission();
  } else {
    console.log('🌐 Checking web notification status...');
    const status = checkWebNotificationStatus();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'prompt';
  }
};

/**
 * Request notification permission (web or native)
 * Returns: 'granted' | 'denied'
 */
export const requestNotifications = async (): Promise<'granted' | 'denied'> => {
  if (Capacitor.isNativePlatform()) {
    console.log('📱 Requesting native (Android) notifications...');
    return await requestAndroidNotificationPermission();
  } else {
    console.log('🌐 Requesting web notifications...');
    const permission = await requestWebNotificationPermission();
    return permission === 'granted' ? 'granted' : 'denied';
  }
};

/**
 * Send notification (web or native)
 */
export const sendNotification = async (title: string, body: string): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Sending native (Android) notification...');
      await sendAndroidNotification(title, body);
    } else {
      console.log('🌐 Sending web notification...');
      await sendWebNotification(title, body);
    }
  } catch (error) {
    console.error('❌ Error in sendNotification:', error);
  }
};

/**
 * Backward compatible: requestNotificationPermission
 * Used by existing components
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  const result = await requestNotifications();
  return (result === 'granted' ? 'granted' : 'denied') as NotificationPermission;
};

/**
 * Initialize notification listeners
 */
export const initializeNotificationListeners = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    console.log('📝 Setting up Android notification listeners...');

    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('🔔 Notification received:', notification);
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('🔔 Notification action performed:', notification);
    });

    console.log('✅ Notification listeners attached');
  } catch (error) {
    console.error('Error setting up listeners:', error);
  }
};

/**
 * Initialize notifications on app startup
 */
export const initializeNotifications = async (): Promise<void> => {
  console.log('🔔 Initializing notifications system...');

  if (Capacitor.isNativePlatform()) {
    console.log('📱 Setting up for Android...');
    await initializeLocalNotificationsChannel();
    await initializeNotificationListeners();
    console.log('✅ Android notifications ready');
  } else {
    console.log('🌐 Web notifications ready');
  }
};

/**
 * Enable notifications - entry point
 */
export const enableNotifications = async (): Promise<boolean> => {
  try {
    console.log('🔔 Enabling notifications...');

    // Initialize first
    await initializeNotifications();

    // Request permission
    const result = await requestNotifications();
    console.log('Permission result:', result);

    if (result === 'granted') {
      console.log('✅ Notifications enabled');

      // Send test notification
      await new Promise(resolve => setTimeout(resolve, 500));

      await sendNotification(
        '✅ Alerts Enabled',
        'TruAwake notifications are now active!'
      );

      return true;
    } else {
      console.warn('❌ Notifications not enabled');
      return false;
    }
  } catch (error) {
    console.error('❌ Error enabling notifications:', error);
    return false;
  }
};
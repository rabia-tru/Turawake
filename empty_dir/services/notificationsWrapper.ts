import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import * as webNotificationService from './notificationService';

/**
 * Request notification permissions depending on platform.
 * Returns 'granted' or 'denied'.
 */
export const requestNotifications = async (): Promise<'granted' | 'denied'> => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native Android/iOS
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted' ? 'granted' : 'denied';
    } else {
      // Web browser
      const perm = await webNotificationService.requestNotificationPermission();
      return perm === 'granted' ? 'granted' : 'denied';
    }
  } catch (err) {
    console.error('Notification permission request failed:', err);
    return 'denied';
  }
};

/**
 * Send a notification depending on platform.
 */
export const sendNotification = async (title: string, body: string): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title,
            body,
          },
        ],
      });
    } else {
      await webNotificationService.sendNotification(title, body);
    }
  } catch (err) {
    console.error('Error sending notification:', err);
  }
};

// ✅ REMOVE THIS LINE:
// export { requestNotifications, sendNotification };

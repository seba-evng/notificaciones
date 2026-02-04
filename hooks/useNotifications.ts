import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { registerForPushNotifications } from '../lib/notifications';

export function useNotifications() {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const [notification, setNotification] =
      useState<Notifications.Notification | undefined>();
  
    const notificationListener =
      useRef<Notifications.Subscription | null>(null);
    const responseListener =
      useRef<Notifications.Subscription | null>(null);
  
      useEffect(() => {
        registerForPushNotifications().then(setExpoPushToken);
      
        notificationListener.current =
          Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
          });
      
        responseListener.current =
          Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Click en notificación', response);
          });
      
        return () => {
          notificationListener.current?.remove();
          responseListener.current?.remove();
        };
      }, []);
      
  
    return {
      expoPushToken,
      notification,
    };
  }
  
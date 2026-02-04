import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configuración del handler de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registra el dispositivo para recibir notificaciones push
 * @returns El token de push o undefined si falla
 */
export async function registerForPushNotifications(): Promise<string | undefined> {
  // Solo funciona en dispositivos físicos
  if (!Device.isDevice) {
    alert('Las notificaciones push solo funcionan en dispositivos físicos');
    return undefined;
  }

  // Verificar permisos existentes
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  // Solicitar permisos si no los tiene
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  // Si no se otorgaron permisos, salir
  if (finalStatus !== 'granted') {
    alert('No se otorgaron permisos para notificaciones push');
    return undefined;
  }

  try {
    // Obtener el token de Expo Push
    // IMPORTANTE: Cambia este projectId por el tuyo de app.json
    const projectId = 'AQUI_TU_PROJECT_ID'; // Ejemplo: '4d75e6ca-1f70-4c2b-8e37-54e5ca0c6c94'
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;

    // Configurar canal de notificaciones para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Guardar el token en Supabase
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);

      if (error) {
        console.error('Error guardando push token:', error);
      } else {
        console.log('Push token guardado exitosamente');
      }
    }

    return token;
  } catch (error) {
    console.error('Error obteniendo push token:', error);
    return undefined;
  }
}

/**
 * Envía una notificación push manual (para testing)
 */
export async function sendTestNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const message = {
    to: token,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Notificación enviada:', result);
    return result;
  } catch (error) {
    console.error('Error enviando notificación:', error);
    throw error;
  }
}

/**
 * Cancela todas las notificaciones programadas
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Obtiene el badge count actual
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { sendTestNotification } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setPushToken(data?.push_token || null);
    } catch (error: any) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ]
    );
  }

  async function sendTestPushNotification() {
    if (!pushToken) {
      Alert.alert('Error', 'No hay token de push registrado');
      return;
    }

    setSendingTest(true);
    try {
      await sendTestNotification(
        pushToken,
        '🎉 Notificación de Prueba',
        'Esta es una notificación de prueba enviada desde tu perfil',
        { type: 'test', timestamp: Date.now() }
      );

      Alert.alert('¡Éxito!', 'Notificación de prueba enviada');
    } catch (error: any) {
      console.error('Error enviando notificación:', error);
      Alert.alert('Error', 'No se pudo enviar la notificación');
    } finally {
      setSendingTest(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header del perfil */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={100} color="#007AFF" />
        </View>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Sección de información */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Dispositivo</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="phone-portrait-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Push Token</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {pushToken || 'No registrado'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Cuenta creada</Text>
              <Text style={styles.infoValue}>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Desconocido'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones</Text>

        {pushToken && (
          <TouchableOpacity
            style={[styles.actionButton, styles.testButton]}
            onPress={sendTestPushNotification}
            disabled={sendingTest}
          >
            {sendingTest ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  Enviar Notificación de Prueba
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>🔔 Push Notifications App</Text>
        <Text style={styles.footerSubtext}>Versión 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  email: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    marginLeft: 5,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    gap: 10,
  },
  testButton: {
    backgroundColor: '#34C759',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    padding: 30,
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
  },
});
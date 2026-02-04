import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data: any;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  useEffect(() => {
    // Contar no leídas
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  async function loadNotifications() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToNotifications() {
    if (!user) return;

    // Suscribirse a nuevas notificaciones en tiempo real
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🆕 Nueva notificación:', payload);
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📝 Notificación actualizada:', payload);
          setNotifications(prev =>
            prev.map(n => (n.id === payload.new.id ? payload.new as Notification : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Actualizar localmente
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error: any) {
      console.error('Error marcando como leída:', error);
    }
  }

  async function markAllAsRead() {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Actualizar localmente
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error: any) {
      console.error('Error marcando todas como leídas:', error);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con contador y botón */}
      {unreadCount > 0 && (
        <View style={styles.headerBar}>
          <Text style={styles.unreadText}>
            {unreadCount} no leída{unreadCount !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllButton}>Marcar todas como leídas</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.notificationCard,
              !item.read && styles.unreadCard,
            ]}
            onPress={() => !item.read && markAsRead(item.id)}
          >
            <View style={styles.notificationHeader}>
              <View style={styles.titleRow}>
                {!item.read && <View style={styles.unreadDot} />}
                <Text style={styles.notificationTitle}>{item.title}</Text>
              </View>
              <Ionicons
                name={item.read ? 'mail-open-outline' : 'mail-unread-outline'}
                size={20}
                color={item.read ? '#999' : '#007AFF'}
              />
            </View>

            <Text style={styles.notificationBody}>{item.body}</Text>

            <Text style={styles.notificationDate}>
              {new Date(item.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No hay notificaciones</Text>
            <Text style={styles.emptyHint}>
              Cuando alguien cree un post, recibirás una notificación aquí
            </Text>
          </View>
        }
      />
    </View>
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  unreadText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  markAllButton: {
    fontSize: 14,
    color: '#007AFF',
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  notificationBody: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  notificationDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
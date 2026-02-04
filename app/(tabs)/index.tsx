import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { registerForPushNotifications } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pushToken, setPushToken] = useState<string>();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadPosts();
    setupNotifications();

    // Listener para notificaciones
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📩 Notificación recibida:', notification);
      Alert.alert(
        notification.request.content.title || 'Notificación',
        notification.request.content.body || ''
      );
    });

    return () => subscription.remove();
  }, []);

  async function setupNotifications() {
    const token = await registerForPushNotifications();
    setPushToken(token);
    console.log('Push Token:', token);
  }

  async function loadPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error cargando posts:', error);
      Alert.alert('Error', 'No se pudieron cargar los posts');
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }

  async function createPost() {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes estar autenticado');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('posts').insert({
        title: title.trim(),
        content: content.trim(),
        user_id: user.id,
      });

      if (error) throw error;

      // Limpiar formulario
      setTitle('');
      setContent('');

      // Recargar posts
      await loadPosts();

      // Scroll to top
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

      Alert.alert('¡Éxito!', 'Post creado. Las notificaciones se enviarán automáticamente.');
    } catch (error: any) {
      console.error('Error creando post:', error);
      Alert.alert('Error', error.message || 'No se pudo crear el post');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      {/* Formulario para crear posts */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Crear Nuevo Post</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Título del post"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          editable={!loading}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Contenido del post"
          placeholderTextColor="#999"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={3}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={createPost}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📤 Publicar Post</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Lista de posts */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Posts Recientes</Text>
        
        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <Text style={styles.postTitle}>{item.title}</Text>
              <Text style={styles.postContent}>{item.content}</Text>
              <Text style={styles.postDate}>
                {new Date(item.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>📝</Text>
              <Text style={styles.emptySubtext}>No hay posts aún</Text>
              <Text style={styles.emptyHint}>¡Sé el primero en publicar!</Text>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    padding: 15,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  postCard: {
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
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  postContent: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  postDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 60,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
  },
});
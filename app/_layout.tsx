import { Stack, useRouter, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function RootLayout() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = pathname.startsWith('/(auth)');
    const inTabsGroup = pathname.startsWith('/(tabs)');
    const inIndex = pathname === '/';

    if (!user && !inAuthGroup && !inIndex) {
      router.replace('/');
    } else if (user && inIndex) {
      router.replace('/(tabs)');
    }
  }, [user, pathname, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

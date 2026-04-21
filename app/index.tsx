import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { getLoggedInRole } from '@/services/auth-jwt';
import { clearTokens, getAccessToken } from '@/services/auth-storage';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const token = await getAccessToken();

      if (!isMounted) {
        return;
      }

      if (token) {
        const role = await getLoggedInRole();

        if (!isMounted) {
          return;
        }

        if (role === 40) {
          router.replace('/review-form');
          return;
        }

        await clearTokens();

        if (!isMounted) {
          return;
        }

        Alert.alert('Access not allowed', '', [
          {
            text: 'Logout',
            onPress: () => {
              if (isMounted) {
                router.replace('/login');
              }
            },
          },
        ]);
        return;
      }

      router.replace('/login');
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7A1E2C',
  },
});

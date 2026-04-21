import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { loginWithEmailPassword } from '@/services/auth-api';
import { getLoggedInRole } from '@/services/auth-jwt';
import {
  clearRememberedCredentials,
  clearTokens,
  getRememberedCredentials,
  saveRememberedCredentials,
  saveTokens,
} from '@/services/auth-storage';

const DEFAULT_EMAIL = '';
const DEFAULT_PASSWORD = '';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingSavedCredentials, setIsLoadingSavedCredentials] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRememberedLogin() {
      try {
        const savedCredentials = await getRememberedCredentials();

        if (savedCredentials && isMounted) {
          setEmail(savedCredentials.email);
          setPassword(savedCredentials.password);
          setRememberPassword(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSavedCredentials(false);
        }
      }
    }

    loadRememberedLogin();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);

      const loginData = await loginWithEmailPassword({
        email: email.trim(),
        password,
      });

      if (rememberPassword) {
        await saveRememberedCredentials(email.trim(), password);
      } else {
        await clearRememberedCredentials();
      }

      await saveTokens(loginData.accessToken, loginData.refreshToken);

      const role = await getLoggedInRole();

      if (role === 40) {
        router.replace('/review-form');
        return;
      }

      await clearTokens();
      Alert.alert('Access not allowed', '', [
        {
          text: 'Logout',
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to login right now.';
      Alert.alert('Login failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Login with your email and password.</Text>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="••••••••"
                style={styles.passwordInput}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRememberPassword((prev) => !prev)}>
            <View style={[styles.checkbox, rememberPassword ? styles.checkboxChecked : null]}>
              {rememberPassword ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </View>
            <Text style={styles.rememberText}>Save password</Text>
          </Pressable>

          <Pressable
            style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
            onPress={handleLogin}
            disabled={isSubmitting || isLoadingSavedCredentials}>
            {isSubmitting || isLoadingSavedCredentials ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#7A1E2C',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberRow: {
    marginTop: -2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  rememberText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  button: {
    marginTop: 8,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#7A1E2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

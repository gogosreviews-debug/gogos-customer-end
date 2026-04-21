import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const SAVED_EMAIL_KEY = 'auth.savedEmail';
const SAVED_PASSWORD_KEY = 'auth.savedPassword';

export async function saveTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);

  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveRememberedCredentials(email: string, password: string) {
  await SecureStore.setItemAsync(SAVED_EMAIL_KEY, email);
  await SecureStore.setItemAsync(SAVED_PASSWORD_KEY, password);
}

export async function getRememberedCredentials() {
  const [email, password] = await Promise.all([
    SecureStore.getItemAsync(SAVED_EMAIL_KEY),
    SecureStore.getItemAsync(SAVED_PASSWORD_KEY),
  ]);

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export async function clearRememberedCredentials() {
  await SecureStore.deleteItemAsync(SAVED_EMAIL_KEY);
  await SecureStore.deleteItemAsync(SAVED_PASSWORD_KEY);
}

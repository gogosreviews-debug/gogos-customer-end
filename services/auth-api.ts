type LoginPayload = {
  email: string;
  password: string;
};

type LoginData = {
  id: string;
  fullName: string;
  email: string;
  role: number;
  accessToken: string;
  refreshToken?: string;
};

type LoginResponse = {
  success: boolean;
  message: string;
  data?: LoginData;
};

const FALLBACK_AUTH_BASE_URL = 'https://gogos-backend-review.onrender.com/api/auth/';

function getAuthBaseUrl() {
  const authBaseUrl =
    process.env.EXPO_PUBLIC_AUTH_BASE_URL ??
    process.env.AUTH_BASE_URL ??
    FALLBACK_AUTH_BASE_URL;

  return authBaseUrl.endsWith('/') ? authBaseUrl : `${authBaseUrl}/`;
}

export async function loginWithEmailPassword(payload: LoginPayload): Promise<LoginData> {
  const response = await fetch(`${getAuthBaseUrl()}login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as LoginResponse;

  if (!response.ok || !result.success || !result.data?.accessToken) {
    throw new Error(result.message || 'Login failed.');
  }

  return result.data;
}

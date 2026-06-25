type EnvKey =
  | "GEMINI_API_KEY"
  | "GEMINI_MODEL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export class EnvVarError extends Error {
  constructor(public readonly key: EnvKey) {
    super(`Missing required environment variable: ${key}`);
    this.name = "EnvVarError";
  }
}

export function getRequiredEnv(key: EnvKey) {
  const value = process.env[key];

  if (!value) {
    throw new EnvVarError(key);
  }

  return value;
}

export function getOptionalEnv(key: EnvKey, fallback: string) {
  return process.env[key] || fallback;
}

export function getPublicSupabaseEnv() {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export function getSupabaseServiceEnv() {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getGeminiEnv() {
  return {
    apiKey: getRequiredEnv("GEMINI_API_KEY"),
    model: getOptionalEnv("GEMINI_MODEL", "gemini-2.5-flash"),
  };
}

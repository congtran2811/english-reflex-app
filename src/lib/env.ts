import 'server-only';
import { z } from 'zod';
import { DEFAULT_DEEPSEEK_BASE_URL, DEFAULT_DEEPSEEK_MODEL, DEFAULT_GEMINI_MODEL, DEFAULT_GROQ_MODEL, DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL } from './constants';

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default(DEFAULT_GEMINI_MODEL),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().min(1).default(DEFAULT_GROQ_MODEL),
  OLLAMA_BASE_URL: z.string().min(1).default(DEFAULT_OLLAMA_BASE_URL),
  OLLAMA_MODEL: z.string().min(1).default(DEFAULT_OLLAMA_MODEL),
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  DEEPSEEK_BASE_URL: z.string().min(1).default(DEFAULT_DEEPSEEK_BASE_URL),
  DEEPSEEK_MODEL: z.string().min(1).default(DEFAULT_DEEPSEEK_MODEL),
  AI_PRIMARY_PROVIDER: z.enum(['ollama', 'deepseek', 'gemini', 'groq']).default('ollama'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/** Lazily validated server-side env. Never import from client components. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
    GROQ_API_KEY: process.env.GROQ_API_KEY || undefined,
    GROQ_MODEL: process.env.GROQ_MODEL || undefined,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || undefined,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || undefined,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || undefined,
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || undefined,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || undefined,
    AI_PRIMARY_PROVIDER: process.env.AI_PRIMARY_PROVIDER || undefined,
  });
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}

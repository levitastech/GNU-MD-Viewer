import type { AppError } from '../contracts/document';

export const isAppError = (value: unknown): value is AppError => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' && typeof candidate.message === 'string'
  );
};

export const normalizeNativeError = (
  error: unknown,
  fallback: AppError,
): AppError => (isAppError(error) ? error : fallback);

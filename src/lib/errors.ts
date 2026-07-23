export interface AppError {
  code: string
  operation: string
  message: string
  details?: string
}

function isAppError(error: unknown): error is AppError {
  if (!error || typeof error !== "object") return false
  const candidate = error as Partial<AppError>
  return (
    typeof candidate.code === "string" &&
    typeof candidate.operation === "string" &&
    typeof candidate.message === "string"
  )
}

export function normalizeAppError(
  error: unknown,
  operation: string
): AppError {
  if (isAppError(error)) return error

  return {
    code: "UNEXPECTED",
    operation,
    message: error instanceof Error ? error.message : String(error),
  }
}

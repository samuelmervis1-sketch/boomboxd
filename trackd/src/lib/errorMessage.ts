// Turning a thrown value into something worth showing a user.
//
// The subtle part: supabase-js only constructs a real `PostgrestError`
// (which extends Error) when the query builder is in throwOnError mode.
// Everywhere in this app we destructure `{ data, error }` and re-throw the
// error ourselves, so what actually reaches a catch block is the *plain
// object* PostgREST returned — `{ message, details, hint, code }` with
// `Object` as its constructor. That means `err instanceof Error` is false
// for every database error, and code branching on it silently discards the
// real message. Verified against @supabase/postgrest-js as installed.

/** Shape of the plain object supabase-js hands back in `{ data, error }`. */
interface PostgrestLikeError {
  message?: unknown
  code?: unknown
  details?: unknown
  hint?: unknown
}

function asRecord(err: unknown): PostgrestLikeError | null {
  return typeof err === 'object' && err !== null ? (err as PostgrestLikeError) : null
}

/** The Postgres/PostgREST error code, when there is one. */
export function errorCode(err: unknown): string | null {
  const code = asRecord(err)?.code
  return typeof code === 'string' && code ? code : null
}

// Codes where the raw Postgres text would only confuse ("new row violates
// row-level security policy for table \"ratings\""), but the situation has a
// clear, actionable explanation. Anything not listed keeps its real message.
const FRIENDLY: Record<string, string> = {
  // RLS rejected the write — in practice this means the request wasn't
  // authenticated as the user it claimed to be.
  '42501': 'Your session has expired. Please sign in again, then try once more.',
  PGRST301: 'Your session has expired. Please sign in again, then try once more.',
}

/**
 * Best available human-readable message for a thrown value.
 *
 * Always logs the raw error, so a failure leaves a trace in the console even
 * when the text shown to the user is a generic fallback.
 */
export function describeError(err: unknown, fallback: string): string {
  console.error('[boomboxd]', fallback, err)

  const code = errorCode(err)
  if (code && FRIENDLY[code]) return FRIENDLY[code]

  // Real Error instances (including PostgrestError in throwOnError mode, and
  // our own `new Error('Not signed in')` guards).
  if (err instanceof Error && err.message) return err.message

  // The common case: a plain PostgREST error object.
  const message = asRecord(err)?.message
  if (typeof message === 'string' && message && message !== '{}') return message

  return fallback
}

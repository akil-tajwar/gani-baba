import { z } from 'zod'

// Declare process shape for environments where Node types are not present
declare const process:
  | { env?: { NEXT_PUBLIC_API_BASE_URL?: string } }
  | undefined

// Type for API response
type ApiResponse<T> = {
  data: T | null
  error: {
    message: string
    status?: number
    code?: string
    details?: unknown
  } | null
}

// Type for the fetch options
type FetchOptions<T> = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
  schema?: z.ZodType<T>
}

// Function to handle user logout
const handleLogout = () => {
  // localStorage.clear()
  // window.location.href = '/login'
}

// Auth endpoints where a 401 means "bad credentials / not verified",
// NOT "your session expired". Never log the user out for these.
const AUTH_ENDPOINTS = [
  'auth/login',
  'auth/register',
  'auth/verify-registration',
  'auth/resend-otp',
]
const isAuthEndpoint = (u: string) => AUTH_ENDPOINTS.some((p) => u.includes(p))

// Normalize API base URL and provide sensible defaults for server/client contexts
const rawBase =
  (typeof process !== 'undefined'
    ? process.env?.NEXT_PUBLIC_API_BASE_URL
    : undefined) ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/api`
    : 'http://127.0.0.1:4000/api')

const API_BASE_URL = rawBase.replace(/\/+$/, '')
const buildUrl = (u: string) => `${API_BASE_URL}/${u.replace(/^\/+/, '')}`

// Pull the backend's message/code out of whichever shape it sends
const extractErrorInfo = (errorData: any) => ({
  message:
    (typeof errorData?.error === 'string' ? errorData.error : undefined) ||
    errorData?.error?.message ||
    errorData?.message ||
    null,
  code: errorData?.error?.code || errorData?.code || undefined,
})

// Main fetch utility function
export async function fetchApi<T>({
  url,
  method = 'GET',
  body,
  headers = {},
  schema,
}: FetchOptions<T>): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(buildUrl(url), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    // Handle ALL non-200 responses (including 401) by reading the real message
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`🚨 [fetchApi] Error Status: ${response.status}`)
      console.log(`🚨 [fetchApi] Raw Error Response:`, errorText)

      let errorData: any = null
      try {
        errorData = JSON.parse(errorText)
        console.log(`🚨 [fetchApi] Parsed JSON Error:`, errorData)
      } catch (e) {
        console.log(
          `🚨 [fetchApi] Could not parse error as JSON (It might be an HTML crash page).`
        )
      }

      // A 401 on a protected endpoint means the session is invalid.
      // A 401 on login/register/OTP just means the request failed.
      if (response.status === 401 && !isAuthEndpoint(url)) {
        handleLogout()
      }

      const { message, code } = extractErrorInfo(errorData)

      return {
        data: null,
        error: {
          message:
            message ||
            (response.status === 401
              ? 'Unauthorized access'
              : `Request failed with status ${response.status}`),
          status: response.status,
          code,
          details: errorData,
        },
      }
    }

    // Parse JSON response
    const jsonData = await response.json().catch(() => null)
    if (!jsonData) {
      return {
        data: null,
        error: {
          message: 'Invalid JSON response from server',
          status: 400,
        },
      }
    }

    // Validate response with schema if provided
    if (schema) {
      const result = schema.safeParse(jsonData)
      if (!result.success) {
        return {
          data: null,
          error: {
            message: 'Response validation failed',
            status: 400,
            details: result.error.flatten(),
          },
        }
      }
      return { data: result.data, error: null }
    }

    return { data: jsonData as T, error: null }
  } catch (err: any) {
    // Handle actual network failures (e.g., server offline)
    console.log(`🚨 [fetchApi] Network/Catch Error:`, err)
    return {
      data: null,
      error: {
        message:
          err?.message ||
          'Network error occurred. Please check your connection.',
        status: 500,
      },
    }
  }
}

export async function fetchApiWithFile<T>({
  url,
  method,
  headers = {},
  body,
}: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: HeadersInit
  body?: any
}): Promise<T> {
  const isFormData = body instanceof FormData

  const finalHeaders = isFormData
    ? headers // Do NOT set Content-Type for FormData
    : { 'Content-Type': 'application/json', ...headers }

  const response = await fetch(buildUrl(url), {
    method,
    headers: finalHeaders,
    body: isFormData ? body : JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.log(`🚨 [fetchApiWithFile] Error Status: ${response.status}`)
    console.log(`🚨 [fetchApiWithFile] Raw Error Response:`, errorText)

    let errorData: any = null
    try {
      errorData = JSON.parse(errorText)
      console.log(`🚨 [fetchApiWithFile] Parsed JSON Error:`, errorData)
    } catch (e) {
      console.log(`🚨 [fetchApiWithFile] Could not parse error as JSON.`)
    }

    const { message } = extractErrorInfo(errorData)
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return response.json()
}

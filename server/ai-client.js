class AIError extends Error {
  constructor(status, message, providerStatus) { super(message); this.status = status; this.providerStatus = providerStatus }
}
async function chatCompletion({ messages, maxTokens = 500 }, { env = process.env, fetchImpl = fetch } = {}) {
  if (!env.AI_API_KEY?.trim() || !env.AI_BASE_URL || !env.AI_MODEL) throw new AIError(503, 'AI is not configured on the backend.')
  let response
  try {
    response = await fetchImpl(`${env.AI_BASE_URL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.AI_API_KEY}` },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({ model: env.AI_MODEL, messages, response_format: { type: 'json_object' }, max_tokens: maxTokens })
    })
  } catch (error) {
    throw new AIError(error.name === 'TimeoutError' ? 504 : 502, error.name === 'TimeoutError' ? 'AI provider timed out. Please retry.' : 'Could not reach the AI provider. Check backend connectivity and AI_BASE_URL.')
  }
  let data
  try { data = await response.json() } catch { /* Some proxies return non-JSON error pages. */ }
  if (!response.ok || data?.error) {
    const providerError = data?.error
    const invalidRequest = providerError?.type === 'invalid_request_error' || providerError?.code === 'invalid_request_error'
    // Classify using provider fields, but never expose arbitrary provider text:
    // error bodies can echo request content, credentials, or authorization headers.
    if (invalidRequest) {
      const jsonFormat = typeof providerError.message === 'string' && /json/i.test(providerError.message) && /json_object|format/i.test(providerError.message)
      const error = new AIError(502, `AI provider HTTP ${response.status}: Provider request/configuration issue (invalid_request_error).${jsonFormat ? ' Check json instructions and structured response format.' : ' Check model and request settings.'}`, response.status)
      error.providerErrorType = 'invalid_request_error'
      throw error
    }
    const reasons = { 400: 'Provider rejected the request format.', 401: 'Provider rejected AI_API_KEY.', 403: 'Provider denied access. Check key permissions or account status.', 402: 'Provider account has insufficient credit.', 404: 'Provider endpoint or model was not found.', 413: 'Provider rejected the request size.', 429: 'Provider rate limit or quota exceeded.' }
    throw new AIError(502, `AI provider HTTP ${response.status}: ${reasons[response.status] || 'Provider request failed.'}`, response.status)
  }
  if (!data) throw new AIError(502, 'AI provider returned invalid JSON.')
  return data
}
module.exports = { chatCompletion, AIError }

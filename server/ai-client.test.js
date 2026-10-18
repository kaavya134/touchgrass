const { test } = require('node:test')
const assert = require('node:assert/strict')
const { chatCompletion } = require('./ai-client')
const env = { AI_API_KEY: 'secret-test-key', AI_BASE_URL: 'https://example.test/v1', AI_MODEL: 'test-model' }
const request = { messages: [{ role: 'user', content: 'Return json.' }] }
function options(status, body) { return { env, fetchImpl: async () => ({ ok: status === 200, status, json: async () => body }) } }
test('429 invalid_request_error is classified from body, never as quota or rate limit', async () => {
  await assert.rejects(chatCompletion(request, options(429, { error: { type: 'invalid_request_error', code: 429, message: `Input must contain json for json_object format. ${env.AI_API_KEY}` } })), error => {
    assert.equal(error.providerStatus,429)
    assert.match(error.message,/request\/configuration issue/)
    assert.match(error.message,/invalid_request_error/)
    assert.doesNotMatch(error.message,/quota|rate limit|secret-test-key/)
    return true
  })
})
test('real rate limits and authentication failures retain HTTP classification', async () => {
  await assert.rejects(chatCompletion(request,options(429,{error:{type:'rate_limit_error',message:'Too many requests'}})), /rate limit or quota/)
  await assert.rejects(chatCompletion(request,options(401,{error:{type:'authentication_error'}})), /rejected AI_API_KEY/)
})
test('malformed response bodies and errors wrapped in HTTP 200 are handled', async () => {
  await assert.rejects(chatCompletion(request,{env,fetchImpl:async()=>({ok:false,status:503,json:async()=>{throw new Error('HTML')}})}), /HTTP 503/)
  await assert.rejects(chatCompletion(request,options(200,{error:{type:'invalid_request_error',message:'Invalid model'}})), /configuration issue/)
})

test('provider deadline covers response headers and response body reads with safe errors', async () => {
  for (const phase of ['headers', 'body']) {
    await assert.rejects(chatCompletion(request, { env, fetchImpl: async (url, options) => {
      assert.ok(options.signal instanceof AbortSignal)
      if (phase === 'headers') throw Object.assign(new Error('private provider detail'), { name: 'TimeoutError' })
      return { ok: true, status: 200, json: async () => { throw Object.assign(new Error('private provider detail'), { name: 'TimeoutError' }) } }
    } }), error => error.status === 504 && !error.message.includes('private provider detail'))
  }
})

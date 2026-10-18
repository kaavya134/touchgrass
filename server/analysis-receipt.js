const { createHmac, randomBytes, timingSafeEqual } = require('crypto')
const secret = randomBytes(32)
function signAnalysis(result) {
  const payload = Buffer.from(JSON.stringify({ ...result, id: randomBytes(16).toString('hex'), expires: Date.now() + 30 * 60 * 1000 })).toString('base64url')
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
}
function verifyAnalysis(token) {
  if (typeof token !== 'string') return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = createHmac('sha256', secret).update(payload).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  try {
    const result = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return result.expires > Date.now() ? result : null
  } catch { return null }
}
module.exports = { signAnalysis, verifyAnalysis }

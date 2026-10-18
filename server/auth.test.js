const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomBytes } = require('crypto')
const { authConfig, csrfProtection } = require('./auth')
test('hosted cookies fail closed and require exact HTTPS CORS origins',()=>{
 const base={SESSION_SECRET:randomBytes(40).toString('hex')}
 assert.throws(()=>authConfig({}),/SESSION_SECRET/)
 assert.throws(()=>authConfig({...base,NODE_ENV:'production'}),/FRONTEND_ORIGINS/)
 assert.throws(()=>authConfig({...base,SESSION_COOKIE_SAME_SITE:'none'}),/Secure/)
 const config=authConfig({...base,NODE_ENV:'production',FRONTEND_ORIGINS:'https://app.example.com',SESSION_COOKIE_SAME_SITE:'none'})
 assert.equal(config.cookie.httpOnly,true);assert.equal(config.cookie.secure,true);assert.equal(config.cookie.sameSite,'none')
 assert.deepEqual(config.origins,['https://app.example.com'])
})
test('CSRF rejects untrusted origins, missing or malformed tokens without throwing',()=>{
 const token='a'.repeat(64)
 const config={origins:['http://localhost:5173']}
 for(const [origin,supplied]of [['https://evil.example',token],['http://localhost:5173',undefined],['http://localhost:5173','é'.repeat(64)]]){
  let status;const req={method:'POST',session:{csrfToken:token},get:key=>key==='Origin'?origin:supplied}
  csrfProtection(config)(req,{status(value){status=value;return this},json(){}},()=>assert.fail('Must block'))
  assert.equal(status,403)
 }
})

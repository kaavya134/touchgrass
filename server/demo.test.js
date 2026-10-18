const test = require('node:test')
const assert = require('node:assert/strict')
const fixture = require('../client-vue/src/demo/leaderboard.json')
const { buildDemo } = require('../scripts/demo-data.cjs')

test('static demo matches the existing ranking calculator without database or provider access', () => {
  assert.deepEqual(fixture, buildDemo())
  assert.equal(fixture.board.isFinal, true)
  assert.equal(fixture.board.startDate, '2026-09-07')
  assert.equal(fixture.board.endDate, '2026-09-13')
  assert.equal(new Date(fixture.board.startDate).getUTCDay(), 1)
  assert.equal(new Date(fixture.board.endDate).getUTCDay(), 0)
  assert.equal(fixture.board.members.length, 4)
  assert.deepEqual(fixture.board.members.map(m => m.rank), [1, 2, 3, 4])
  assert.deepEqual(fixture.board.members.map(m => m.totalMinutes), [180, 240, 300, 405])
  assert.equal(fixture.board.loserMemberId, 'demo-rowan')
  assert.ok(fixture.board.forfeit.includes('lemonade'))
  for (const member of fixture.board.members) {
    assert.match(member.memberId, /^demo-/)
    assert.equal(member.days.length, 7)
    assert.equal(member.eligible, true)
    assert.equal(member.submittedDays.length, 7)
    assert.equal(member.days.reduce((sum, day) => sum + day.minutes, 0), member.totalMinutes)
    assert.ok(member.days.every(day => day.status === 'completed'))
  }
  const serialized = JSON.stringify(fixture)
  for (const field of ['analysisToken', 'usedAnalysisIds', 'userId', 'email', 'password']) assert.ok(!serialized.includes(`"${field}"`))
})

test('real APIs still reject anonymous requests when the public demo is available', async () => {
  const request = require('supertest')
  const { MemoryStore } = require('express-session')
  const { createApp } = require('./app')
  const app = createApp({ store: new MemoryStore(), env: {
    SESSION_SECRET: require('node:crypto').randomBytes(32).toString('hex'),
    FRONTEND_ORIGINS: 'http://localhost:5173'
  } })
  for (const [method, path] of [
    ['get', '/api/groups'],
    ['get', '/api/groups/DEMO/check-ins'],
    ['get', '/api/groups/DEMO/leaderboard'],
    ['post', '/api/screenshots/analyze'],
    ['post', '/api/activities/suggest'],
    ['post', '/api/groups/DEMO/check-ins']
  ]) {
    const response = await request(app)[method](path)
    assert.equal(response.status, 401, `${method} ${path} must require login`)
  }
})

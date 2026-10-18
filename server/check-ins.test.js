const { test } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const Group = require('./models/Group')
const CheckIn = require('./models/CheckIn')
const { signAnalysis } = require('./analysis-receipt')
const { singaporeDate, weekDays, submissionStatus, eligibleForFinal } = require('./check-in-dates')

test('Singapore rollover, Sunday on Monday, and only today/yesterday allowed', () => {
  const monday = new Date('2026-10-18T16:01:00Z')
  assert.equal(singaporeDate(monday), '2026-10-19')
  assert.equal(submissionStatus('2026-10-18', monday), 'completed')
  assert.equal(submissionStatus('2026-10-19', monday), 'provisional')
  assert.equal(submissionStatus('2026-10-17', monday), null)
  assert.equal(submissionStatus('2026-10-20', monday), null)
  assert.equal(weekDays('2026-10-18')[6], '2026-10-18')
  assert.equal(eligibleForFinal({ status: 'provisional' }), false)
  assert.equal(eligibleForFinal({ status: 'accepted' }), false)
  assert.equal(eligibleForFinal({ status: 'completed' }), true)
})
test('fresh extraction replaces one record; manual values, replay, bad dates and stale provisional extraction rejected', async () => {
  const originals = [Group.findOne, CheckIn.findOneAndUpdate, CheckIn.find]
  const entries = []
  Group.findOne = async () => ({ _id: 'group', competitionStartDate: '2020-01-06', members: [{ _id: 'member', userId: 'user-test', competitionStartDate: '2020-01-06' }] })
  CheckIn.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(options.upsert, true)
    let entry = entries.find(e => e.date === filter.date)
    if (entry?.usedAnalysisIds.includes(filter.usedAnalysisIds.$ne)) throw Object.assign(new Error(), { code: 11000 })
    if (!entry) { entry = { ...update.$setOnInsert, usedAnalysisIds: [] }; entries.push(entry) }
    Object.assign(entry, update.$set)
    entry.usedAnalysisIds.push(update.$addToSet.usedAnalysisIds)
    return entry
  }
  CheckIn.find = filter => ({ lean: async () => entries.filter(e => filter.date.$in.includes(e.date)) })
  const app = express(); app.use(express.json()); app.use((req,res,next)=>{req.user={_id:'user-test'};next()}); app.use(require('./check-ins'))
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve))
  const url = `http://127.0.0.1:${server.address().port}/ABCDEF/check-ins`
  const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const today = singaporeDate()
  const previous = new Date(today + 'T00:00:00Z'); previous.setUTCDate(previous.getUTCDate() - 1)
  const yesterday = previous.toISOString().slice(0,10)
  const token = (date, minutes, status = submissionStatus(date)) => signAnalysis({ userId: 'user-test', date, socialMediaMinutes: minutes, submissionStatus: status })
  try {
    const first = token(today, 30)
    assert.equal((await post({ analysisToken: first })).status, 200)
    assert.equal(entries[0].status, 'provisional')
    assert.equal((await post({ analysisToken: token(today, 75) })).status, 200)
    assert.equal(entries.length, 1); assert.equal(entries[0].socialMediaMinutes, 75)
    assert.equal((await post({ analysisToken: first })).status, 409)
    assert.equal((await post({ analysisToken: token(today, 60), socialMediaMinutes: 1 })).status, 400)
    assert.equal((await post({ analysisToken: token(today, 60), date: yesterday })).status, 400)
    assert.equal((await post({ analysisToken: token(null, 60) })).status, 400)
    assert.equal((await post({ analysisToken: token('2020-01-01', 60) })).status, 400)
    assert.equal((await post({ analysisToken: token(yesterday, 60, 'provisional') })).status, 400)
    assert.equal((await post({ analysisToken: token(yesterday, null) })).status, 422)
    // Yesterday's saved provisional record must be replaced, never auto-promoted.
    entries.push({ groupId: 'group', date: yesterday, socialMediaMinutes: 25, status: 'provisional', usedAnalysisIds: [] })
    assert.equal((await post({ analysisToken: token(yesterday, 0) })).status, 200)
    assert.equal(entries.length, 2)
    assert.equal(entries[1].status, 'completed')
    assert.equal(entries[1].socialMediaMinutes, 0)
    const yesterdayWeek = await (await fetch(url + '?weekOf=' + yesterday)).json()
    assert.equal(yesterdayWeek.days.find(d => d.date === yesterday).eligibleForFinal, true)
    const data = await (await fetch(url + '?weekOf=' + today)).json()
    const current = data.days.find(d => d.date === today)
    assert.equal(current.eligibleForFinal, false)
    assert.equal(current.checkIn.status, 'provisional')
    assert.ok(data.days.some(d => d.checkIn === null && d.eligibleForFinal === false))
  } finally {
    await new Promise(resolve => server.close(resolve))
    ;[Group.findOne, CheckIn.findOneAndUpdate, CheckIn.find] = originals
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { weekDates, usageHours, duration } from './diary-utils.mjs'
import { builtInActivities, validSaved } from './activity-utils.mjs'
test('weeks run Monday through Sunday across year boundaries', () => {
  assert.deepEqual(weekDates('2027-01-03'), ['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'])
})
test('usage accepts zero and 24h but rejects incomplete or out-of-range inputs', () => {
  assert.equal(usageHours(0,0),0); assert.equal(usageHours(24,0),24); assert.equal(usageHours(2,30),2.5)
  for (const pair of [[24,1],[-1,0],[0,60],[1.5,0],['',0],[1,'']]) assert.equal(usageHours(...pair),null)
})
test('existing decimal hours display as hours and minutes', () => { assert.equal(duration(2.5),'2h 30m'); assert.equal(duration(0),'0h 0m'); assert.equal(duration(1.999),'2h 0m') })
test('built-in sets retain saved schema and completion state', () => {
  const activities = builtInActivities({ interests:['creative'], minutes:20, company:'solo', location:'indoors' })
  activities[0].completed = true
  assert.equal(validSaved(JSON.parse(JSON.stringify({version:1,source:'built-in',activities}))),true)
})

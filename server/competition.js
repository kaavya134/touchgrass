const { singaporeDate, validDate, weekDays } = require('./check-in-dates')
function nextMonday(now = new Date()) {
  const day = new Date(singaporeDate(now) + 'T00:00:00Z')
  const offset = (8 - day.getUTCDay()) % 7 || 7
  day.setUTCDate(day.getUTCDate() + offset)
  return day.toISOString().slice(0,10)
}
function isMonday(date) { return validDate(date) && weekDays(date)[0] === date }
function competitionStart(group, member) {
  if (!member?.userId || !isMonday(group?.competitionStartDate) || !isMonday(member.competitionStartDate)) return null
  return group.competitionStartDate > member.competitionStartDate ? group.competitionStartDate : member.competitionStartDate
}
function recordScope(group, member, entry) {
  const start = competitionStart(group,member)
  if (!entry || !start || !['practice','official'].includes(entry.competitionType)) return 'historical'
  if (entry.competitionType === 'practice' || entry.date < start) return 'practice'
  return String(entry.userId) === String(member.userId) ? 'official' : 'historical'
}
async function initializeExistingEligibility(now = new Date()) {
  const Group = require('./models/Group')
  const start = nextMonday(now)
  // Forward-only rollout: never guess past creation/join eligibility or rewrite check-ins.
  await Group.updateMany({ competitionStartDate: { $exists: false } }, { $set: { competitionStartDate: start, eligibilitySource: 'rollout', eligibilityRecordedAt: now } })
  await Group.updateMany({ members: { $elemMatch: { userId: { $exists: true, $ne: null }, competitionStartDate: { $exists: false } } } }, {
    $set: { 'members.$[member].competitionStartDate': start, 'members.$[member].eligibilitySource': 'rollout', 'members.$[member].eligibilityRecordedAt': now }
  }, { arrayFilters: [{ 'member.userId': { $exists: true, $ne: null }, 'member.competitionStartDate': { $exists: false } }] })
}
module.exports = { nextMonday, isMonday, competitionStart, recordScope, initializeExistingEligibility }

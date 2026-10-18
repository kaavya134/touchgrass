// Fictional inputs only. This module runs offline and never opens a database.
const { buildLeaderboard } = require('../server/leaderboard')
const { weekDays } = require('../server/check-in-dates')
function buildDemo() {
  const dates = weekDays('2026-09-07')
  const samples = [
    { id: 'demo-mina', name: 'Mina Fern', minutes: [25, 20, 30, 15, 25, 35, 30] },
    { id: 'demo-theo', name: 'Theo Brook', minutes: [35, 30, 25, 40, 30, 45, 35] },
    { id: 'demo-iris', name: 'Iris Reed', minutes: [45, 35, 50, 40, 45, 30, 55] },
    { id: 'demo-rowan', name: 'Rowan Moss', minutes: [60, 55, 50, 65, 45, 70, 60] }
  ]
  const group = {
    name: 'The Sunday Sprouts', competitionStartDate: dates[0],
    forfeit: 'Bring homemade lemonade to the next picnic.',
    members: samples.map(sample => ({ _id: sample.id, userId: sample.id, name: sample.name, competitionStartDate: dates[0] }))
  }
  const records = samples.flatMap(sample => dates.map((date, index) => ({
    memberId: sample.id, userId: sample.id, date,
    socialMediaMinutes: sample.minutes[index], status: 'completed', competitionType: 'official',
    // Synthetic marker for the existing calculator; never a signed receipt or saved check-in.
    usedAnalysisIds: ['demo-synthetic-record']
  })))
  return { groupName: group.name, board: buildLeaderboard(group, records, { week: 'previous', now: new Date('2026-09-14T04:00:00Z') }) }
}
module.exports = { buildDemo }

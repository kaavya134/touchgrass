const express = require('express')
const { requireGroup } = require('./group-access')
const CheckIn = require('./models/CheckIn')
const { buildLeaderboard } = require('./leaderboard')
const router = express.Router()
router.get('/:code/leaderboard', requireGroup, async (req, res) => {
  try {
    const week = req.query.week || 'current'
    if (!['current', 'previous'].includes(week)) return res.status(400).json({ message: 'Choose current or previous week.' })
    const group = req.group
    const now = new Date()
    const range = buildLeaderboard(group, [], { week, now })
    const checkIns = await CheckIn.find({ groupId: group._id, date: { $gte: range.startDate, $lte: range.endDate } }).select('+usedAnalysisIds').lean()
    res.json(buildLeaderboard(group, checkIns, { week, now }))
  } catch (error) {
    // Log error type and route without credentials, member data, or connection strings.
    console.error('Weekly leaderboard failed:', { method: req.method, route: '/api/groups/:code/leaderboard', errorType: error.name, code: error.code })
    res.status(500).json({ message: 'Could not load weekly leaderboard. Please retry.' })
  }
})
module.exports = router

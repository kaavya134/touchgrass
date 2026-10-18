const express = require('express')
const { requireGroup } = require('./group-access')
const CheckIn = require('./models/CheckIn')
const { competitionStart, recordScope } = require('./competition')
const { verifyAnalysis } = require('./analysis-receipt')
const { singaporeDate, validDate, weekDays, submissionStatus, eligibleForFinal } = require('./check-in-dates')
const router = express.Router()
router.use('/:code/check-ins', requireGroup, (req, res, next) => {
  req.checkInGroup = req.group
  req.checkInMemberId = req.member._id
  next()
})
router.get('/:code/check-ins', async (req, res) => {
  try {
    const anchor = req.query.weekOf || singaporeDate()
    if (!validDate(anchor)) return res.status(400).json({ message: 'Choose a valid week date.' })
    const dates = weekDays(anchor)
    const entries = await CheckIn.find({ groupId: req.checkInGroup._id, memberId: req.checkInMemberId, date: { $in: dates } }).lean()
    res.json({ timeZone: 'Asia/Singapore', competitionStartDate: competitionStart(req.group,req.member), days: dates.map(date => ({ date, checkIn: (() => { const entry = entries.find(entry => entry.date === date); return entry ? { ...entry, competitionScope: recordScope(req.group,req.member,entry) } : null })(), eligibleForFinal: entries.some(entry => entry.date === date && eligibleForFinal(entry) && recordScope(req.group,req.member,entry) === 'official') })) })
  } catch { res.status(500).json({ message: 'Could not load check-ins.' }) }
})
router.post('/:code/check-ins', async (req, res) => {
  try {
    const { analysisToken } = req.body || {}
    if (Object.keys(req.body || {}).some(key => key !== 'analysisToken')) return res.status(400).json({ message: 'Submit only fresh AI analysis. Manual dates or usage values are not accepted.' })
    const analysis = verifyAnalysis(analysisToken)
    if (!analysis || analysis.userId !== String(req.user._id)) return res.status(400).json({ message: 'Analysis expired or invalid. Upload the screenshot again.' })
    if (!Number.isInteger(analysis.socialMediaMinutes) || analysis.socialMediaMinutes < 0 || analysis.socialMediaMinutes > 1440) return res.status(422).json({ message: 'Upload a daily screenshot showing the Social or Social Networking category duration.' })
    const date = analysis.date
    const status = submissionStatus(date)
    if (!validDate(date) || !status) return res.status(400).json({ message: 'Only screenshots reporting today or yesterday in Asia/Singapore are accepted.' })
    if (!analysis.id || analysis.submissionStatus !== status) return res.status(400).json({ message: 'The Singapore day has changed. Upload a fresh screenshot for completed-day extraction.' })
    const start = competitionStart(req.group,req.member)
    const competitionType = start && date >= start ? 'official' : 'practice'
    const key = { groupId: req.checkInGroup._id, memberId: req.checkInMemberId, date }
    const entry = await CheckIn.findOneAndUpdate({ ...key, usedAnalysisIds: { $ne: analysis.id } }, {
      $set: { competitionType, userId: req.user._id, socialMediaMinutes: analysis.socialMediaMinutes, status },
      $setOnInsert: key,
      $addToSet: { usedAnalysisIds: analysis.id }
    }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })
    res.status(200).json(entry)
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'This analysis has already been saved. Upload a fresh screenshot to replace the check-in.' : 'Could not save check-in. Please retry.' })
  }
})
module.exports = router

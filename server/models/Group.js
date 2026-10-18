const mongoose = require('mongoose')
const { isMonday } = require('../competition')

const groupSchema = new mongoose.Schema({
  competitionStartDate: { type: String, validate: isMonday },
  eligibilitySource: { type: String, enum: ['created','rollout'] },
  eligibilityRecordedAt: Date,
  name: {
    type: String,
    required: true,
    trim: true
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true
  },
  goalHoursPerDay: {
    type: Number,
    default: 2,
    min: 0,
    max: 24
  },
  forfeit: {
    type: String,
    default: 'Buy everyone a coffee'
  },
  members: [{
    joinedAt: Date,
    competitionStartDate: { type: String, validate: isMonday },
    eligibilitySource: { type: String, enum: ['created','joined','rollout'] },
    eligibilityRecordedAt: Date,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: {
      type: String,
      required: true,
      trim: true
    }
  }]
}, { timestamps: true })

module.exports = mongoose.model('Group', groupSchema)
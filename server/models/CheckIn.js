const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  competitionType: { type: String, enum: ['practice','official'] },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  groupId: { type: mongoose.Schema.Types.ObjectId, required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: String, required: true },
  socialMediaMinutes: { type: Number, required: true, min: 0, max: 1440, validate: Number.isInteger },
  usedAnalysisIds: { type: [String], default: [], select: false },
  status: { type: String, enum: ['provisional', 'completed'], required: true }
}, { timestamps: true })
schema.index({ groupId: 1, memberId: 1, date: 1 }, { unique: true })
module.exports = mongoose.model('CheckIn', schema)

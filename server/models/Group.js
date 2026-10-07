const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
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
    name: {
      type: String,
      required: true,
      trim: true
    }
  }]
}, { timestamps: true })

module.exports = mongoose.model('Group', groupSchema)
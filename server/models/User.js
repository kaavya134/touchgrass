const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true })
schema.set('toJSON', { transform(doc, value) { delete value.passwordHash; return value } })
module.exports = mongoose.model('User', schema)

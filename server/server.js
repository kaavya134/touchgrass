const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()
const Group = require('./models/Group')
const { randomBytes } = require('crypto')

const app = express()
const PORT = process.env.PORT || 8000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    message: 'TouchGrass backend is running 🌱',
    databaseConnected: mongoose.connection.readyState === 1
  })
})

app.post('/api/groups', async (req, res) => {
  try {
    const { groupName, memberName, forfeit } = req.body

    // Check that both names are provided.
    if (
      typeof groupName !== 'string' ||
      typeof memberName !== 'string' ||
      groupName.trim() === '' ||
      memberName.trim() === ''
    ) {
      return res.status(400).json({
        message: 'Group name and your name are required'
      })
    }

    if ( typeof forfeit !== 'string' || forfeit.trim() === '' || forfeit.trim().length > 200) {
      return res.status(400).json({
        message: 'Enter a forfeit between 1 and 200 characters.'})
      }

    // Generate an invite code that is not already used.
    let inviteCode
    let codeExists

    do {
      inviteCode = randomBytes(3).toString('hex').toUpperCase()
      codeExists = await Group.exists({ inviteCode })
    } while (codeExists)

    // Save the group, including its first member.
    const group = await Group.create({
      name: groupName.trim(),
      inviteCode,
      forfeit: forfeit.trim()
      members: [{ name: memberName.trim() }]
    })

    res.status(201).json(group)
  } catch (error) {
    console.error('Create group failed:', error.message)

    res.status(500).json({
      message: 'Failed to create group. Please try again.'
    })
  }
})
app.post('/api/groups/join', async (req, res) => {
  try {
    const { inviteCode, memberName } = req.body

    if (
      typeof inviteCode !== 'string' ||
      typeof memberName !== 'string' ||
      inviteCode.trim() === '' ||
      memberName.trim() === ''
    ) {
      return res.status(400).json({
        message: 'Your name and a group code are required'
      })
    }

    const code = inviteCode.trim().toUpperCase()
    const name = memberName.trim()

    const group = await Group.findOne({ inviteCode: code })

    if (!group) {
      return res.status(404).json({
        message: 'Group not found. Check your invite code.'
      })
    }

    const nameExists = group.members.some(
      member => member.name.toLowerCase() === name.toLowerCase()
    )

    if (nameExists) {
      return res.status(409).json({
        message: 'That name is already taken in this group. Use another name.'
      })
    }

    group.members.push({ name })
    await group.save()

    res.json(group)
  } catch (error) {
    console.error('Join group failed:', error.message)

    res.status(500).json({
      message: 'Failed to join group. Please try again.'
    })
  }
})

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from .env')
    }

    await mongoose.connect(process.env.MONGODB_URI)

    console.log('Connected to MongoDB 🌱')

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
}

startServer()
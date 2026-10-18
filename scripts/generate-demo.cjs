// Regenerate the static fixture without starting the server, connecting to MongoDB, or calling AI.
const fs = require('node:fs')
const path = require('node:path')
const { buildDemo } = require('./demo-data.cjs')
fs.writeFileSync(path.join(__dirname, '../client-vue/src/demo/leaderboard.json'), JSON.stringify(buildDemo(), null, 2) + '\n')
console.log('Updated fictional demo leaderboard using the existing ranking calculation.')

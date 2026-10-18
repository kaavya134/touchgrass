const express = require('express')
const cors = require('cors')
const { authConfig, sessionMiddleware, csrfProtection, currentUser, requireAuth, createAuthRouter } = require('./auth')
function createApp({ store, env = process.env } = {}) {
  const config = authConfig(env)
  if (!store) throw new Error('A MongoDB session store is required.')
  const app = express()
  if (config.trustProxy !== false) {
    if (!Number.isInteger(config.trustProxy) || config.trustProxy < 1) throw new Error('TRUST_PROXY_HOPS must be a positive integer.')
    app.set('trust proxy',config.trustProxy)
  }
  app.disable('x-powered-by')
  app.use(cors({ origin(origin, callback) { callback(null, !origin || config.origins.includes(origin)) }, credentials: true, allowedHeaders: ['Content-Type','X-CSRF-Token'], methods: ['GET','POST','OPTIONS'] }))
  app.use((req,res,next)=>{
    res.set('Cache-Control','no-store')
    res.set('X-Content-Type-Options','nosniff')
    next()
  })
  const startedAt = new Date().toISOString()
  app.get('/api/health',(req,res)=>{
    const databaseConnected = require('mongoose').connection.readyState === 1
    res.status(databaseConnected ? 200 : 503).json({ service:'touchgrass',pid:process.pid,startedAt,databaseConnected })
  })
  app.use(sessionMiddleware(config,store))
  app.use(currentUser)
  app.use((req,res,next)=>express.json({limit:req.path==='/api/screenshots/analyze'?'7mb':'16kb'})(req,res,next))
  app.use('/api/auth',csrfProtection(config),createAuthRouter(config))
  app.use('/api',requireAuth,csrfProtection(config))
  app.use('/api/screenshots/analyze',require('./screenshot').router)
  app.use('/api/activities/suggest',require('./activities').createActivityRouter())
  app.use('/api/groups',require('./groups'))
  app.use('/api/groups',require('./check-ins'))
  app.use('/api/groups',require('./leaderboard-routes'))
  app.use((req,res)=>res.status(404).json({message:'Endpoint not found.'}))
  app.use((error,req,res,next)=>{
    if (res.headersSent) { res.end(); return }
    res.status(error.type==='entity.too.large'?413:error.type==='entity.parse.failed'?400:500).json({message:error.type==='entity.too.large'?'Request is too large.':error.type==='entity.parse.failed'?'Invalid JSON request.':'Request failed. Please retry.'})
  })
  return app
}
module.exports = { createApp }

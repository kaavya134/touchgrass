require('dotenv').config({path:require('path').join(__dirname,'.env'),quiet:true})
const mongoose=require('mongoose')
const { MongoStore }=require('connect-mongo')
const { createApp }=require('./app')
async function startServer(){
 try {
  require('./auth').authConfig()
  if(!process.env.MONGODB_URI)throw new Error('Missing database configuration')
  await mongoose.connect(process.env.MONGODB_URI)
  await Promise.all([require('./models/User').init(),require('./models/Group').init(),require('./models/CheckIn').init()])
  await require('./competition').initializeExistingEligibility()
  const store=MongoStore.create({client:mongoose.connection.getClient(),dbName:mongoose.connection.name,collectionName:'sessions',ttl:7*24*60*60})
  store.on('error',()=>console.error('Session store failed. Check database connectivity.'))
  const app=createApp({store})
  const server=app.listen(process.env.PORT||8000,()=>console.log('TouchGrass backend ready; MongoDB sessions enabled.'))
  server.on('error',error=>{console.error('HTTP server failed:',error.code);mongoose.disconnect().finally(()=>process.exit(1))})
 }catch(error){console.error('Backend startup failed. Check MongoDB, SESSION_SECRET, FRONTEND_ORIGINS, and cookie configuration. Error type:',error.name);await mongoose.disconnect();process.exitCode=1}
}
if(require.main===module)startServer()
module.exports={startServer}

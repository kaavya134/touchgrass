const { test }=require('node:test')
const assert=require('node:assert/strict')
const {randomBytes}=require('crypto')
test('real MongoDB accounts, sessions, CSRF, identity and logout integration', {skip:process.env.AUTH_INTEGRATION!=='1',timeout:120000}, async()=>{
 require('dotenv').config({path:require('path').join(__dirname,'.env'),quiet:true})
 const mongoose=require('mongoose'),request=require('supertest'),bcrypt=require('bcryptjs')
 const {MongoStore}=require('connect-mongo')
 const {createApp}=require('./app')
 const User=require('./models/User'),Group=require('./models/Group'),CheckIn=require('./models/CheckIn')
 const {signAnalysis}=require('./analysis-receipt'),{singaporeDate,submissionStatus}=require('./check-in-dates')
 const testDb='touchgrass_auth_test_'+randomBytes(8).toString('hex')
 await mongoose.connect(process.env.MONGODB_URI,{dbName:testDb,serverSelectionTimeoutMS:15000})
 try{
  await Promise.all([User.init(),Group.init(),CheckIn.init()])
  const store=MongoStore.create({client:mongoose.connection.getClient(),dbName:testDb,collectionName:'sessions'})
  const env={SESSION_SECRET:randomBytes(48).toString('hex'),FRONTEND_ORIGINS:'http://localhost:5173'}
  const app=createApp({store,env}),a=request.agent(app),b=request.agent(app)
  for(const [method,url]of [['get','/api/groups'],['get','/api/groups/ABCDEF'],['get','/api/groups/ABCDEF/leaderboard'],['get','/api/groups/ABCDEF/check-ins'],['post','/api/groups'],['post','/api/groups/join'],['post','/api/screenshots/analyze'],['post','/api/activities/suggest']])assert.equal((await request(app)[method](url).send({})).status,401)
  const initial=await a.get('/api/auth/me');assert.equal(initial.body.user,null)
  assert.match(initial.headers['set-cookie'][0],/HttpOnly/);assert.match(initial.headers['set-cookie'][0],/SameSite=Lax/)
  let at=initial.body.csrfToken
  const signup={displayName:'Same Name',email:' Owner@Example.com ',password:'a-long-test-password-123!'}
  assert.equal((await a.post('/api/auth/signup').send(signup)).status,403)
  assert.equal((await a.post('/api/auth/signup').set('Origin','https://evil.example').set('X-CSRF-Token',at).send(signup)).status,403)
  for(const invalid of [{...signup,email:'invalid'},{...signup,password:'short'},{...signup,password:'\u00e9'.repeat(40)},{...signup,displayName:' '}]) assert.equal((await a.post('/api/auth/signup').set('X-CSRF-Token',at).send(invalid)).status,400)
  const signed=await a.post('/api/auth/signup').set('Origin','http://localhost:5173').set('X-CSRF-Token',at).send(signup)
  assert.equal(signed.status,201);at=signed.body.csrfToken
  assert.ok(signed.headers['set-cookie'][0].split(';')[0] !== initial.headers['set-cookie'][0].split(';')[0], 'Session ID rotates at signup')
  assert.ok(!JSON.stringify(signed.body).includes(signup.password), 'No password in response')
  assert.equal((await a.post('/api/groups').set('X-CSRF-Token',initial.body.csrfToken).send({groupName:'x',forfeit:'x'})).status,403)
  const aid=signed.body.user.id
  assert.equal(signed.body.user.email,'owner@example.com');assert.equal(signed.body.user.passwordHash,undefined)
  const user=await User.findById(aid).select('+passwordHash')
  assert.notEqual(user.passwordHash,signup.password);assert.equal(await bcrypt.compare(signup.password,user.passwordHash),true);assert.equal(user.password,undefined)
  assert.equal((await a.get('/api/auth/me')).body.user.id,aid)
  const refreshApp=createApp({store,env})
  const cookie=signed.headers['set-cookie'][0].split(';')[0]
  assert.equal((await request(refreshApp).get('/api/auth/me').set('Cookie',cookie)).body.user.id,aid)
  assert.ok(await mongoose.connection.db.collection('sessions').countDocuments()>0)
  const duplicateAgent=request.agent(app);const dupCsrf=(await duplicateAgent.get('/api/auth/csrf')).body.csrfToken
  assert.equal((await duplicateAgent.post('/api/auth/signup').set('X-CSRF-Token',dupCsrf).send({...signup,email:'OWNER@example.com'})).status,409)
  const bt0=(await b.get('/api/auth/csrf')).body.csrfToken
  const second=await b.post('/api/auth/signup').set('X-CSRF-Token',bt0).send({...signup,email:'second@example.com'})
  assert.equal(second.status,201);const bid=second.body.user.id,bt=second.body.csrfToken
  const created=await a.post('/api/groups').set('X-CSRF-Token',at).send({groupName:'Auth test group',forfeit:'Bring snacks',memberName:'Spoofed',userId:bid})
  assert.equal(created.status,201)
  const {nextMonday,initializeExistingEligibility}=require('./competition')
  assert.equal(created.body.competitionStartDate,nextMonday())
  assert.equal(created.body.members[0].competitionStartDate,created.body.competitionStartDate)
  const code=created.body.inviteCode,am=created.body.currentMemberId
  assert.equal(created.body.members[0].name,signup.displayName);assert.equal(created.body.members[0].userId,aid)
  for(const path of [`/api/groups/${code}`,`/api/groups/${code}/leaderboard`,`/api/groups/${code}/check-ins`])assert.equal((await b.get(path)).status,404)
  assert.equal((await b.post(`/api/groups/${code}/check-ins`).set('X-CSRF-Token',bt).send({analysisToken:'x'})).status,404)
  const joins=await Promise.all([1,2].map(()=>b.post('/api/groups/join').set('X-CSRF-Token',bt).send({inviteCode:code,memberName:'Spoofed'})))
  assert.deepEqual(joins.map(r=>r.status).sort(),[200,409])
  const joined=joins.find(r=>r.status===200).body,bm=joined.currentMemberId
  assert.notEqual(am,bm);assert.equal(joined.members.filter(m=>m.userId===bid).length,1)
  assert.equal(joined.competitionStartDate,created.body.competitionStartDate)
  assert.equal(joined.members.find(m=>m.userId===aid).competitionStartDate,created.body.members[0].competitionStartDate)
  assert.equal((await b.get(`/api/groups/${code}/leaderboard`)).status,200)
  const today=singaporeDate()
  const tokenFor=id=>signAnalysis({userId:id,date:today,socialMediaMinutes:42,submissionStatus:submissionStatus(today)})
  const stolen=tokenFor(aid)
  assert.equal((await b.post(`/api/groups/${code}/check-ins`).set('X-CSRF-Token',bt).send({analysisToken:stolen})).status,400)
  assert.equal((await b.post(`/api/groups/${code}/check-ins`).set('X-CSRF-Token',bt).send({analysisToken:tokenFor(bid),memberId:am})).status,400)
  assert.equal((await b.post(`/api/groups/${code}/check-ins`).set('X-CSRF-Token',bt).send({analysisToken:tokenFor(bid)})).status,200)
  const checkIn=await CheckIn.findOne({groupId:created.body._id})
  assert.equal(String(checkIn.userId),bid);assert.equal(String(checkIn.memberId),bm)
  assert.equal(checkIn.competitionType,'practice')
  const practiceBoard=(await b.get(`/api/groups/${code}/leaderboard`)).body
  assert.ok(practiceBoard.members.every(m=>m.rank===null&&m.totalMinutes===null))
  assert.equal((await b.post(`/api/groups/${code}/check-ins`).set('X-CSRF-Token',bt).send({analysisToken:tokenFor(bid),competitionType:'official'})).status,400)
  assert.equal((await b.get(`/api/groups/${code}/members/${am}/check-ins`)).status,404)
  const aDays=(await a.get(`/api/groups/${code}/check-ins`)).body.days
  assert.ok(aDays.every(d=>d.checkIn===null))
  // Matching display names never grant ownership of historical members.
  const legacy=await Group.create({name:'Legacy test',inviteCode:'FEDCBA',members:[{name:signup.displayName}]})
  const legacyMember=legacy.members[0]._id
  await CheckIn.create({groupId:legacy._id,memberId:legacyMember,date:'2026-01-01',socialMediaMinutes:155,status:'completed',usedAnalysisIds:['legacy-receipt']})
  const ownedLegacy=await Group.create({name:'Owned legacy test',inviteCode:'ABC123',members:[{name:'Existing account',userId:aid},{name:'Unowned legacy'}]})
  await initializeExistingEligibility()
  const initialized=await Group.findById(ownedLegacy._id)
  assert.equal(initialized.competitionStartDate,nextMonday())
  assert.equal(initialized.members[0].competitionStartDate,nextMonday())
  assert.equal(initialized.members[0].eligibilitySource,'rollout')
  assert.equal(initialized.members[0].joinedAt,undefined)
  assert.equal(initialized.members[1].competitionStartDate,undefined)
  const before=initialized.competitionStartDate
  await initializeExistingEligibility(new Date(Date.now()+8*24*60*60*1000))
  assert.equal((await Group.findById(ownedLegacy._id)).competitionStartDate,before)
  assert.equal((await CheckIn.findOne({memberId:legacyMember})).socialMediaMinutes,155)
  assert.equal((await CheckIn.findOne({memberId:legacyMember})).competitionType,undefined)
  assert.equal((await a.get('/api/groups/FEDCBA')).status,404)
  const legacyJoin=await a.post('/api/groups/join').set('X-CSRF-Token',at).send({inviteCode:'FEDCBA'})
  assert.equal(legacyJoin.status,200);assert.equal(legacyJoin.body.members.length,2);assert.notEqual(legacyJoin.body.currentMemberId,String(legacyMember))
  assert.equal((await CheckIn.findOne({memberId:legacyMember})).userId,undefined)
  const logout=await a.post('/api/auth/logout').set('X-CSRF-Token',at)
  assert.equal(logout.status,200);assert.match(logout.headers['set-cookie'][0],/Expires=Thu, 01 Jan 1970/)
  assert.equal((await request(app).get('/api/auth/me').set('Cookie',cookie)).body.user,null)
  assert.equal((await a.get('/api/groups')).status,401)
  at=(await a.get('/api/auth/csrf')).body.csrfToken
  assert.equal((await a.post('/api/auth/login').set('X-CSRF-Token',at).send({email:signup.email,password:'wrong password'})).status,401)
  const login=await a.post('/api/auth/login').set('X-CSRF-Token',at).send({email:'OWNER@EXAMPLE.COM',password:signup.password})
  assert.equal(login.status,200);assert.equal(login.body.user.id,aid)
  const rateApp=createApp({store,env}),limited=request.agent(rateApp),lt=(await limited.get('/api/auth/csrf')).body.csrfToken
  for(let i=0;i<10;i++)assert.equal((await limited.post('/api/auth/login').set('X-CSRF-Token',lt).send({email:'x',password:1})).status,400)
  const limitedResult=await limited.post('/api/auth/login').set('X-CSRF-Token',lt).send({email:'x',password:1})
  assert.equal(limitedResult.status,429);assert.ok(limitedResult.headers['retry-after'])
  console.log('PASS: real isolated MongoDB users, hashed passwords, persisted sessions, CSRF, ownership, duplicate membership, legacy isolation and logout.')
 }finally{
  if(mongoose.connection.name!==testDb||!testDb.startsWith('touchgrass_auth_test_'))throw new Error('Refusing cleanup outside isolated test database')
  await mongoose.connection.dropDatabase();await mongoose.disconnect()
 }
})

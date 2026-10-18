const express=require('express')
const { randomBytes }=require('crypto')
const Group=require('./models/Group')
const { nextMonday }=require('./competition')
const { memberFor, groupResponse, requireGroup }=require('./group-access')
const router=express.Router()
router.get('/',async(req,res)=>{
 try { const groups=await Group.find({'members.userId':req.user._id});res.json(groups.map(group=>groupResponse(group,req.user))) }
 catch {res.status(500).json({message:'Could not load your groups.'})}
})
router.post('/',async(req,res)=>{
 const { groupName,forfeit }=req.body||{}
 if(typeof groupName!=='string'||!groupName.trim()||groupName.trim().length>100||typeof forfeit!=='string'||!forfeit.trim()||forfeit.trim().length>200)return res.status(400).json({message:'Enter a group name (1–100 characters) and a forfeit (1–200 characters).'})
 try {
  const now=new Date(), start=nextMonday(now)
  const group=await Group.create({competitionStartDate:start,eligibilitySource:'created',eligibilityRecordedAt:now,name:groupName.trim(),inviteCode:randomBytes(6).toString('hex').slice(0,6).toUpperCase(),forfeit:forfeit.trim(),members:[{name:req.user.displayName,userId:req.user._id,joinedAt:now,competitionStartDate:start,eligibilitySource:'created',eligibilityRecordedAt:now}]})
  res.status(201).json(groupResponse(group,req.user))
 }catch{res.status(500).json({message:'Could not create group. Please retry.'})}
})
router.post('/join',async(req,res)=>{
 const code=req.body?.inviteCode
 if(typeof code!=='string'||!/^\s*[A-F0-9]{6}\s*$/i.test(code))return res.status(400).json({message:'Enter a valid six-character invite code.'})
 try {
  const now=new Date(),start=nextMonday(now)
  // Atomic condition prevents concurrent duplicate memberships for the same user.
  const group=await Group.findOneAndUpdate({inviteCode:code.trim().toUpperCase(),'members.userId':{$ne:req.user._id}},{$push:{members:{name:req.user.displayName,userId:req.user._id,joinedAt:now,competitionStartDate:start,eligibilitySource:'joined',eligibilityRecordedAt:now}}},{new:true,runValidators:true})
  if(!group){const existing=await Group.findOne({inviteCode:code.trim().toUpperCase()});return res.status(existing&&memberFor(existing,req.user)?409:404).json({message:existing&&memberFor(existing,req.user)?'You already belong to this group. Open it from Your groups.':'Group not found. Check the invite code.'})}
  res.json(groupResponse(group,req.user))
 }catch{res.status(500).json({message:'Could not join group. Please retry.'})}
})
router.get('/:code',requireGroup,(req,res)=>res.json(groupResponse(req.group,req.user)))
module.exports=router

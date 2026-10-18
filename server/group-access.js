const Group = require('./models/Group')
const { competitionStart } = require('./competition')
function memberFor(group, user) { return group.members.find(member => member.userId && String(member.userId) === String(user._id)) }
function groupResponse(group, user) {
  const value = group.toObject ? group.toObject() : group
  return { ...value, currentCompetitionStartDate: competitionStart(group,memberFor(group,user)), currentMemberId: String(memberFor(group,user)._id) }
}
async function requireGroup(req,res,next) {
  try {
    const group = await Group.findOne({ inviteCode: req.params.code.toUpperCase() })
    const member = group && memberFor(group,req.user)
    if (!member) return res.status(404).json({ message: 'Group not found or you are not a member.' })
    req.group = group; req.member = member
    next()
  } catch { res.status(500).json({ message: 'Could not load group membership.' }) }
}
module.exports = { memberFor, groupResponse, requireGroup }

const { singaporeDate, weekDays } = require('./check-in-dates')
const { competitionStart, isMonday, recordScope } = require('./competition')
function buildLeaderboard(group, checkIns, { week = 'current', now = new Date() } = {}) {
  const today = singaporeDate(now)
  const anchor = new Date(today + 'T00:00:00Z')
  if (week === 'previous') anchor.setUTCDate(anchor.getUTCDate() - 7)
  const dates = weekDays(anchor.toISOString().slice(0, 10))
  const isFinal = dates[6] < today
  const groupStart = isMonday(group.competitionStartDate) ? group.competitionStartDate : null
  const requiredDates = groupStart && dates[0] >= groupStart ? dates.filter(date => date < today) : []
  const members = group.members.map(member => {
    const start = competitionStart(group,member)
    const officialWeek = !!start && dates[0] >= start
    const required = officialWeek ? requiredDates : []
    const records = checkIns.filter(entry => String(entry.memberId) === String(member._id) && dates.includes(entry.date))
    const days = dates.map(date => {
      const entry = records.find(item => item.date === date)
      const completed = entry?.status === 'completed' && entry.usedAnalysisIds?.length > 0 && Number.isInteger(entry.socialMediaMinutes) && entry.socialMediaMinutes >= 0 && entry.socialMediaMinutes <= 1440 && date < today
      return { date, scope: entry ? recordScope(group,member,entry) : officialWeek ? 'official' : start ? 'practice' : 'historical', status: completed ? 'completed' : entry?.status === 'provisional' ? 'provisional' : entry ? 'unverified' : date < today ? 'missing' : 'not-due', minutes: completed || entry?.status === 'provisional' ? entry.socialMediaMinutes : null }
    })
    const submittedDays = days.filter(day => day.status === 'completed' && day.scope === 'official').map(day => day.date)
    const missingDays = required.filter(date => !submittedDays.includes(date))
    const sum = scope => { const valid=days.filter(day=>day.status==='completed'&&day.scope===scope);return valid.length ? valid.reduce((sum,day)=>sum+day.minutes,0) : null }
    const rankingStatus = !start ? 'unknown-eligibility' : !officialWeek ? 'practice' : !required.length ? 'not-due' : missingDays.length ? 'incomplete' : 'eligible'
    return { memberId: String(member._id), name: member.name, legacy: !member.userId, competitionStartDate: start, eligibilitySource: member.eligibilitySource || null, rankingStatus, requiredDates: required, days, submittedDays, missingDays, totalMinutes: sum('official'), practiceTotalMinutes: sum('practice'), historicalTotalMinutes: sum('historical'),
      todayProvisionalMinutes: records.find(entry => entry.date === today && entry.status === 'provisional')?.socialMediaMinutes ?? null,
      noCheckIns: records.length === 0, eligible: rankingStatus === 'eligible', rank: null, tied: false, outcome: null }
  })
  const ranked = members.filter(member => member.eligible).sort((a,b)=>a.totalMinutes-b.totalMinutes)
  ranked.forEach((member,index)=>{member.rank=index>0&&member.totalMinutes===ranked[index-1].totalMinutes?ranked[index-1].rank:index+1;member.tied=ranked.filter(other=>other.totalMinutes===member.totalMinutes).length>1})
  const best=ranked[0]?.totalMinutes,worst=ranked.at(-1)?.totalMinutes
  if(isFinal)ranked.forEach(member=>{if(member.totalMinutes===best)member.outcome=member.tied?'Joint winner':'Winner';else if(ranked.length>1&&best!==worst&&member.totalMinutes===worst)member.outcome=member.tied?'Tied highest usage':'Loser'})
  return { timeZone:'Asia/Singapore',week,startDate:dates[0],endDate:dates[6],today,isFinal,competitionStartDate:groupStart,label:!groupStart?'Historical records':dates[0]<groupStart?'Practice week':isFinal?'Completed-week results':'Provisional standings',requiredDates,forfeit:group.forfeit,
    loserMemberId:isFinal&&ranked.length>1&&best!==worst&&ranked.filter(m=>m.totalMinutes===worst).length===1?ranked.at(-1).memberId:null,
    members:[...ranked,...members.filter(member=>!member.eligible)] }
}
module.exports={buildLeaderboard}

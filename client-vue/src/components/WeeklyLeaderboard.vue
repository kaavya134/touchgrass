<script setup>
import { Trophy, ScanLine, RefreshCw, Clock, Users, Target, Gift, Sprout, ArrowUpRight } from 'lucide-vue-next'
import EmptySprout from './EmptySprout.vue'
import { ref, watch, computed } from 'vue'
import api from '../api'
import SummaryCard from './SummaryCard.vue'
import InviteCode from './InviteCode.vue'
import CompetitionNotice from './CompetitionNotice.vue'
const props = defineProps({ groupCode: { type: String, required: true }, refreshKey: { type: Number, default: 0 }, memberId: String, groupName: String, goalHours: Number })
const emit = defineEmits(['navigate'])
const podium = computed(() => board.value?.members.filter(member => member.eligible && Number.isInteger(member.rank)).slice(0, 3) || [])
const personal = computed(() => board.value?.members.find(member => member.memberId === props.memberId))
const personalExplanation = computed(() => {
  const member = personal.value
  if (!member) return 'No members have all required completed-day check-ins yet. See each member below for missing dates.'
  if (member.rankingStatus === 'practice') return 'This week is before your official start on ' + member.competitionStartDate + '. Practice and historical records are excluded from official rankings.'
  if (member.rankingStatus === 'unknown-eligibility') return 'Historical eligibility is unknown. Existing records remain visible but cannot be given official rankings retroactively.'
  if (member.rankingStatus === 'not-due') return 'No completed competition days are due yet. Today is provisional; submit its completed-day screenshot tomorrow.'
  return 'Your missing completed days: ' + member.missingDays.join(', ') + '. You may submit yesterday; older missing days keep this week unranked.'
})
function completionLabel(member) { return member.rankingStatus === 'practice' ? 'Practice this week - no official days due' : member.rankingStatus === 'unknown-eligibility' ? 'Historical eligibility unknown' : !member.requiredDates.length ? 'No completed competition days due yet' : `${member.submittedDays.length}/${member.requiredDates.length} required official days complete` }
function displayedTotal(member) { return member.totalMinutes ?? member.practiceTotalMinutes ?? member.historicalTotalMinutes ?? null }
function totalLabel(member) { return member.totalMinutes !== null ? (member.eligible ? 'official weekly total' : 'incomplete official total') : member.practiceTotalMinutes !== null ? 'practice total - excluded' : member.historicalTotalMinutes !== null ? 'historical total - excluded' : 'No completed days' }
const week = ref('current')
const board = ref(null)
const error = ref('')
const loading = ref(false)
let requestId = 0
function duration(minutes) { return `${Math.floor(minutes / 60)}h ${minutes % 60}m` }
async function load() {
  const id = ++requestId
  loading.value = true
  error.value = ''
  board.value = null
  try {
    const { data } = await api.get(`/groups/${encodeURIComponent(props.groupCode)}/leaderboard`, { params: { week: week.value }, timeout: 10000 })
    if (id === requestId) board.value = data
  } catch (failure) {
    if (id === requestId) {
      const status = failure.response?.status
      error.value = status === 404 && typeof failure.response?.data === 'string'
        ? 'Leaderboard route not found (HTTP 404). Restart the backend, then refresh.'
        : `Could not load the leaderboard${status ? ` (HTTP ${status})` : ''}. Please retry.`
    }
  }
  finally { if (id === requestId) loading.value = false }
}
watch([() => props.groupCode, () => props.refreshKey, week], load, { immediate: true })
</script>

<template>
  <header class="page-heading leaderboard-heading"><div><p class="eyebrow">LESS SCROLLING. MORE LIVING.</p><h1><Trophy class="icon-card" aria-hidden="true" /> {{ week === 'current' ? "This week's grass." : "Last week's grass." }}</h1><p>Weekly social media usage in {{ groupName }}. Lower usage wins.</p></div><button class="btn btn-success heading-action" @click="emit('navigate','checkins')"><ScanLine class="icon-control" aria-hidden="true" /> Daily check-in</button></header>
  <div class="leaderboard-layout">
    <section class="leaderboard-main" aria-label="Weekly group leaderboard">
      <div class="board-toolbar"><div class="week-choice"><label for="leaderboard-week" class="visually-hidden">Week (Asia/Singapore)</label><select id="leaderboard-week" v-model="week" class="form-select"><option value="current">Current week</option><option value="previous">Previous week</option></select></div><button class="refresh-button" :disabled="loading" @click="load"><RefreshCw class="icon-control" aria-hidden="true" /> Refresh</button></div>
      <p v-if="loading" role="status" class="state-card">Growing your leaderboard...</p>
      <div v-if="error" role="alert" class="alert alert-danger">{{ error }}</div>
      <template v-if="board">
        <CompetitionNotice v-if="personal" :start-date="personal.competitionStartDate" :today="board.today" :source="personal.eligibilitySource" />
        <div class="board-caption"><span class="status-pill">{{ board.label }}</span><span>{{ board.startDate }} to {{ board.endDate }}</span></div>
        <div v-if="podium.length" class="podium" aria-label="Top eligible ranked members">
          <article v-for="member in podium" :key="member.memberId" class="podium-block" :class="['podium-rank-' + Math.min(member.rank,3), { 'podium-self': member.memberId === memberId }]">
            <span class="podium-place">{{ member.tied ? 'Tied #' : '#' }}{{ member.rank }}</span><span class="podium-name">{{ member.name }}<small v-if="member.memberId === memberId"> (you)</small></span><strong>{{ duration(member.totalMinutes) }}</strong><span v-if="member.outcome" class="small">{{ member.outcome }}</span>
          </article>
        </div>
        <div v-else class="podium-empty"><EmptySprout /><h2 class="h4">Room to grow.</h2><p>{{ personalExplanation }}</p><button class="btn btn-success" @click="emit('navigate','checkins')">Add a check-in</button></div>
        <p class="ranking-explanation">{{ board.label === 'Practice week' ? 'Practice week: records remain excluded from official rankings. Official eligibility starts on the stored competition date.' : board.label === 'Historical records' ? 'Historical records are preserved. No historical competition eligibility has been assumed.' : board.isFinal ? 'Final ranking requires all 7 completed days. Sunday can be submitted on Monday; results may still change then.' : 'Provisional standings: ranking requires every elapsed day, Monday through yesterday.' }} Only completed-day screenshot usage counts. Missing days are never zero.</p>
        <p v-if="board.isFinal && !board.loserMemberId" class="notice">No single loser: highest usage is tied, or fewer than two members qualify.</p>
        <div class="member-list">
          <article v-for="member in board.members" :key="member.memberId" class="member-card" :class="{'member-self': member.memberId === memberId}">
            <div class="member-summary"><span class="member-rank" :aria-label="member.rank === null ? 'Unranked' : 'Rank ' + member.rank">{{ member.rank ?? '—' }}</span><span class="avatar" :class="member.memberId === memberId ? 'avatar-mustard' : 'avatar-sage'">{{ member.name.charAt(0).toUpperCase() }}</span><div class="member-identity"><strong>{{ member.name }}<small v-if="member.legacy"> (legacy)</small><small v-if="member.memberId === memberId"> (you)</small></strong><span>{{ member.rank === null ? (member.rankingStatus === 'practice' ? 'Practice - Unranked' : member.rankingStatus === 'unknown-eligibility' ? 'Historical - Unranked' : 'Unranked') : member.tied ? 'Tied rank #' + member.rank : member.outcome || 'Ranked' }}</span></div><div class="member-total"><strong>{{ member.noCheckIns ? 'No check-ins' : displayedTotal(member) === null ? 'No completed days' : duration(displayedTotal(member)) }}</strong><span v-if="displayedTotal(member) !== null">{{ totalLabel(member) }}</span></div></div>
            <p v-if="member.competitionStartDate && member.rankingStatus === 'practice'" class="small mt-2 mb-0">Competition starts Monday, {{ member.competitionStartDate }}.</p>
            <div class="member-completeness"><span>{{ completionLabel(member) }}</span><span v-if="member.todayProvisionalMinutes !== null">Today: {{ duration(member.todayProvisionalMinutes) }} provisional</span></div>
            <details class="daily-details"><summary>Daily check-ins <span v-if="member.missingDays.length">- {{ member.missingDays.length }} missing</span></summary><div class="day-grid"><div v-for="day in member.days" :key="day.date" class="day-cell" :class="'day-' + day.status"><span>{{ day.date.slice(5) }}</span><strong>{{ day.status === 'completed' ? duration(day.minutes) : day.status === 'provisional' ? duration(day.minutes) : day.date > board.today ? 'Upcoming' : day.status === 'not-due' ? 'Not due yet' : day.status === 'unverified' ? 'Unverified' : day.scope === 'official' ? 'Missing' : 'No record' }}</strong><small v-if="day.status === 'provisional'">Provisional - excluded</small><small v-else-if="day.status === 'completed'">{{ day.scope === 'official' ? 'Completed' : day.scope === 'practice' ? 'Practice - excluded' : 'Historical - excluded' }}</small></div></div><p v-if="member.missingDays.length" class="small mt-2">Missing completed days: {{ member.missingDays.join(', ') }}</p><p v-if="member.outcome" class="small">{{ member.outcome }}</p></details>
          </article>
        </div>
        <p class="small text-secondary mt-3">Monday-Sunday / Asia/Singapore. Today's provisional usage never becomes completed automatically. Screenshot dates and usage are reported values, not proof of authenticity.</p>
      </template>
    </section>
    <aside class="supporting-cards">
      <SummaryCard :icon="Clock" label="YOUR SOCIAL MEDIA USAGE" tone="forest"><template v-if="personal"><strong class="stat-number">{{ displayedTotal(personal) === null ? 'No completed days' : duration(displayedTotal(personal)) }}</strong><p>{{ displayedTotal(personal) === null ? 'Upload a screenshot to begin tracking.' : totalLabel(personal) }}</p><p v-if="personal.todayProvisionalMinutes !== null" class="provisional-note">Today: {{ duration(personal.todayProvisionalMinutes) }} provisional, excluded</p><p class="small">{{ completionLabel(personal) }}</p></template><p v-else>Load standings to see your usage.</p><button class="btn btn-mustard" @click="emit('navigate','checkins')">Check in</button></SummaryCard>
      <SummaryCard :icon="Users" label="GROW YOUR GROUP" tone="sage"><InviteCode :code="groupCode" /></SummaryCard>
      <SummaryCard :icon="Target" label="DAILY GROUP GOAL" tone="cream"><strong class="stat-number">{{ goalHours }} hours</strong><p>of social media usage per day.</p><p class="small mb-0">A shared goal. Weekly rankings use total completed-day minutes.</p></SummaryCard>
      <SummaryCard :icon="Gift" label="THE FRIENDLY FORFEIT" tone="mustard"><h3 class="h4">{{ board?.forfeit || 'Load standings to see the forfeit.' }}</h3><p class="small mb-0">For the final eligible loser. A highest-usage tie never chooses one person arbitrarily.</p></SummaryCard>
      <SummaryCard :icon="Sprout" label="OFFLINE LOOKS GOOD ON YOU" tone="peach"><h3 class="h4">A little less scroll.<br>A little more soul.</h3><button class="btn btn-forest" @click="emit('navigate','activities')">Find an activity <ArrowUpRight class="icon-control" aria-hidden="true" /></button></SummaryCard>
    </aside>
  </div>
</template>

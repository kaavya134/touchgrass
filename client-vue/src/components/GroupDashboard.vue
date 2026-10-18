<script setup>
import CompetitionNotice from './CompetitionNotice.vue'
import { ref } from 'vue'
import WeeklyLeaderboard from './WeeklyLeaderboard.vue'
import ScreenshotCheckIn from './ScreenshotCheckIn.vue'
import ActivitySuggestions from './ActivitySuggestions.vue'
const leaderboardRefresh = ref(0)
defineEmits(['leave','navigate'])
defineProps({ accountId: { type: String, required: true }, group: { type: Object, required: true }, memberName: { type: String, required: true }, view: { type: String, default: 'leaderboard' } })
</script>
<template>
  <div>
    <CompetitionNotice :compact="view === 'checkins'" v-if="view !== 'leaderboard'" :start-date="group.currentCompetitionStartDate" :source="group.members.find(member => member._id === group.currentMemberId)?.eligibilitySource" />
    <section v-show="view === 'leaderboard'">
      <WeeklyLeaderboard :group-code="group.inviteCode" :member-id="group.currentMemberId" :goal-hours="group.goalHoursPerDay" :group-name="group.name" :refresh-key="leaderboardRefresh" @navigate="$emit('navigate',$event)" />
    </section>
    <section v-show="view === 'checkins'" class="dedicated-view">
      <header class="page-heading"><p class="eyebrow">SMALL STEPS, HONEST NUMBERS</p><h1>Your daily check-in</h1></header>
      <ScreenshotCheckIn :group-code="group.inviteCode" :member-id="group.currentMemberId" @saved="leaderboardRefresh++" />
    </section>
    <section v-show="view === 'activities'" class="dedicated-view"><header class="page-heading"><p class="eyebrow">LESS SCROLLING, MORE LIVING</p><h1>A little inspiration.</h1><p>Make room for something offline.</p></header><ActivitySuggestions :account-id="accountId" :group-code="group.inviteCode" :member-id="group.currentMemberId" /></section>
  </div>
</template>

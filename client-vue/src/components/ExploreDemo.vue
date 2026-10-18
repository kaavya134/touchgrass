<script setup>
import { Trophy, Users, Gift, LogOut, CalendarDays, CheckCircle2, Sprout } from 'lucide-vue-next'
import BrandMark from './BrandMark.vue'
import SummaryCard from './SummaryCard.vue'
import sample from '../demo/leaderboard.json'

defineEmits(['exit'])
const board = sample.board
const podium = board.members.filter(member => member.eligible && member.rank <= 3)
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const duration = minutes => `${Math.floor(minutes / 60)}h ${minutes % 60}m`
const dateLabel = value => new Date(`${value}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="app-shell demo-shell">
    <a class="skip-link" href="#demo-content">Skip to demo results</a>
    <aside class="sidebar demo-sidebar">
      <BrandMark />
      <p class="demo-label">Demo · sample data</p>
      <div class="demo-sidebar-label"><Trophy class="icon-control" aria-hidden="true" /> Weekly leaderboard</div>
      <div class="sidebar-group"><p class="eyebrow">FICTIONAL GROUP</p><p>{{ sample.groupName }}</p><p class="sidebar-note">A completed sample week. Explore the results without an account.</p></div>
      <p class="sidebar-note">Real groups and rankings require login. Nothing in this demo is saved.</p>
    </aside>
    <div class="workspace">
      <div class="demo-banner">
        <div><span class="demo-label">Demo · sample data</span><span class="demo-banner-note">Read-only · Fictional members</span></div>
        <button type="button" class="btn btn-success" @click="$emit('exit')"><LogOut class="icon-control" aria-hidden="true" /> Exit demo</button>
      </div>
      <main id="demo-content" class="main-content" tabindex="-1">
        <header class="page-heading"><p class="eyebrow">A LITTLE LESS SCROLLING, TOGETHER</p><h1>This week’s grass.</h1><p>Meet {{ sample.groupName }} — a fictional group with a complete Monday–Sunday week.</p></header>
        <div class="leaderboard-layout">
          <section class="leaderboard-main" aria-label="Sample weekly leaderboard">
            <div class="board-caption"><span class="status-pill">Completed sample week</span><span><CalendarDays class="icon-control" aria-hidden="true" /> {{ dateLabel(board.startDate) }} – {{ dateLabel(board.endDate) }}</span></div>
            <div class="podium" aria-label="Top three fictional members">
              <article v-for="member in podium" :key="member.memberId" class="podium-block" :class="`podium-rank-${member.rank}`">
                <span class="podium-place">#{{ member.rank }}</span><span class="podium-name">{{ member.name }}</span><strong>{{ duration(member.totalMinutes) }}</strong><span class="small">{{ member.outcome || 'Weekly social usage' }}</span>
              </article>
            </div>
            <p class="ranking-explanation">Lower weekly Social / Social Networking usage wins. Every fictional member has seven completed daily entries. These sample results are calculated with the same ranking function as the real app.</p>
            <div class="member-list">
              <article v-for="member in board.members" :key="member.memberId" class="member-card demo-member">
                <div class="member-summary"><span class="member-rank" :aria-label="`Rank ${member.rank}`">{{ member.rank }}</span><span class="avatar avatar-sage" aria-hidden="true">{{ member.name.charAt(0) }}</span><div class="member-identity"><strong>{{ member.name }}</strong><span>{{ member.outcome === 'Loser' ? 'This week’s forfeit' : member.outcome || 'Completed sample week' }}</span></div><div class="member-total"><strong>{{ duration(member.totalMinutes) }}</strong><span>weekly social total</span></div></div>
                <p class="demo-completeness"><CheckCircle2 class="icon-control" aria-hidden="true" /> 7 of 7 sample days completed</p>
                <ul class="day-grid demo-days" :aria-label="`${member.name}: daily social usage`">
                  <li v-for="(day, index) in member.days" :key="day.date" class="day-cell day-completed"><time :datetime="day.date">{{ weekdays[index] }} <span>{{ day.date.slice(8) }}</span></time><strong>{{ duration(day.minutes) }}</strong><small>Completed</small></li>
                </ul>
              </article>
            </div>
          </section>
          <aside class="supporting-cards">
            <SummaryCard label="THE FICTIONAL GROUP" tone="sage" :icon="Users"><h2 class="h4">{{ sample.groupName }}</h2><p>Four fictional friends, one complete sample week.</p></SummaryCard>
            <SummaryCard label="THE FRIENDLY FORFEIT" tone="mustard" :icon="Gift"><h2 class="h4">{{ board.forfeit }}</h2><p class="mb-0">{{ board.members.find(member => member.memberId === board.loserMemberId)?.name }} has the highest sample total this week.</p></SummaryCard>
            <SummaryCard label="JUST A LOOK AROUND" tone="peach" :icon="Sprout"><p class="mb-0">No screenshots are uploaded, no AI requests are made, and nothing is saved. Exit demo to log in and use real features.</p></SummaryCard>
          </aside>
        </div>
      </main>
    </div>
  </div>
</template>

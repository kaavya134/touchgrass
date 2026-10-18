<script setup>
import { computed } from 'vue'
const props = defineProps({ startDate: String, today: String, source: String, compact: Boolean })
const nowDate = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const beforeStart = computed(() => props.startDate && (props.today || nowDate()) < props.startDate)
const dateLabel = computed(() => props.startDate ? new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',day:'numeric',month:'long',year:'numeric'}).format(new Date(props.startDate + 'T00:00:00Z')) : '')
</script>
<template>
  <p v-if="compact && beforeStart" class="competition-notice" role="status">Practice check-ins until Monday, {{ dateLabel }}. Practice does not count towards rankings.</p>
  <details v-else-if="compact && !startDate" class="data-disclosure"><summary>Competition eligibility</summary><p>Your competition start date is not available. Historical records are preserved and excluded from official rankings.</p></details>
  <div v-else-if="beforeStart" class="competition-notice" role="status"><strong>Your competition starts Monday, {{ dateLabel }}.</strong><p>Until then, check-ins are practice. They never count towards official rankings.</p><p v-if="source === 'rollout'" class="small mb-0">This existing membership was given a prospective start date. Earlier records are preserved as historical; past eligibility has not been assumed.</p></div>
  <p v-else-if="!startDate" class="notice">Competition eligibility is unknown. Historical records are preserved and excluded from official rankings. Legacy memberships are not claimed by matching names.</p>
</template>

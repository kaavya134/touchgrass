<script setup>
import { ImagePlus, Upload, CheckCircle2, RefreshCw, Sprout, CalendarDays } from 'lucide-vue-next'
import EmptySprout from './EmptySprout.vue'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import api from '../api'

const emit = defineEmits(['saved'])
const props = defineProps({ groupCode: { type: String, required: true }, memberId: { type: String, required: true } })
const uploadInput = ref(null)
const selectedFile = ref(null)
const dragging = ref(false)
const fileError = ref('')
const errorStep = ref('analysis')
const imagePreview = ref('')
const busy = ref(false)
const saving = ref(false)
const error = ref('')
const loadError = ref('')
const success = ref('')
const result = ref(null)
const date = ref('')
const days = ref([])
const weekOf = ref(today())
const endpoint = computed(() => `/groups/${encodeURIComponent(props.groupCode)}/check-ins`)
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
function duration(minutes) { return `${Math.floor(minutes / 60)}h ${minutes % 60}m` }
async function loadDays() {
  loadError.value = ''
  days.value = []
  try {
    const { data } = await api.get(endpoint.value, { params: { weekOf: weekOf.value }, timeout: 10000 })
    days.value = data.days
  } catch { loadError.value = 'Could not load saved days. Retry to see their status.' }
}
watch([endpoint, weekOf], loadDays, { immediate: true })
async function save() {
  if (saving.value || busy.value || !result.value?.analysisToken) return
  errorStep.value = 'save'
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const { data: saved } = await api.post(endpoint.value, { analysisToken: result.value.analysisToken }, { timeout: 15000 })
    emit('saved')
    success.value = `Saved as ${saved.status === 'completed' ? 'completed-day' : 'provisional'}${saved.competitionType === 'practice' ? ' practice' : ''}.`
    result.value = null
    weekOf.value = date.value
    await loadDays()
  } catch (failure) {
    error.value = failure.response?.data?.message || 'Could not save check-in. Please retry.'
  } finally { saving.value = false }
}
function releasePreview() { if (imagePreview.value.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value) }
onBeforeUnmount(releasePreview)
function selectFile(file) {
  if (busy.value || saving.value || !file) return
  fileError.value = ''
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    fileError.value = 'Choose a PNG, JPEG, or WebP screenshot under 5 MB.'
    return
  }
  releasePreview()
  selectedFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  result.value = null; error.value = ''; success.value = ''; date.value = ''
}
function chooseFile(event) { selectFile(event.target.files?.[0]); event.target.value = '' }
function dropFile(event) { dragging.value = false; selectFile(event.dataTransfer?.files?.[0]) }
function reset() {
  if (busy.value || saving.value) return
  releasePreview()
  selectedFile.value = null; imagePreview.value = ''; result.value = null
  error.value = ''; fileError.value = ''; success.value = ''; date.value = ''
}
async function analyze() {
  if (busy.value || saving.value || !selectedFile.value) return
  const file = selectedFile.value
  result.value = null; error.value = ''; success.value = ''; date.value = ''
  errorStep.value = 'analysis'
  busy.value = true
  try {
    const image = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Could not read screenshot.'))
      reader.readAsDataURL(file)
    })
    const { data } = await api.post('/screenshots/analyze', { image }, { timeout: 70000 })
    result.value = data
    date.value = data.date || ''
    if (!data.analysisToken && data.socialMediaMinutes !== null) error.value = 'Upload a screenshot with a readable date reporting today or yesterday in Asia/Singapore.'
    if (data.socialMediaMinutes === null) error.value = 'Upload a daily screenshot showing the Social or Social Networking category duration. Total phone usage cannot be used.'
  } catch (failure) {
    error.value = failure.response?.data?.message || 'Could not analyze the screenshot. Please retry or choose another screenshot.'
  } finally { busy.value = false }
}
</script>

<template>
  <div class="screenshot-checkin-layout">
    <section class="card checkin-flow" aria-labelledby="upload-title" :aria-busy="busy || saving">
      <div class="card-body p-4">
        <h2 id="upload-title" class="feature-heading"><span class="feature-icon feature-peach"><ImagePlus class="icon-card" aria-hidden="true" /></span>Log your social time</h2>
        <p>Upload a daily screenshot showing the date and Social / Social Networking usage.</p>
        <p class="storage-note">The image is sent to the AI provider when you analyse it.</p>
        <details class="data-disclosure screenshot-help"><summary>Screenshot requirements</summary><ul><li>Use a daily view with a readable date and Social / Social Networking category duration.</li><li>Choose today or yesterday in Asia/Singapore. You can submit Sunday on Monday.</li><li>Total phone usage and app limits cannot be used.</li><li>PNG, JPEG or WebP, up to 5 MB.</li></ul></details>
        <input ref="uploadInput" id="screenshot-file" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy || saving || !!success" aria-label="Choose screenshot" aria-describedby="screenshot-format" @change="chooseFile" />
        <template v-if="!success">
          <div v-if="!selectedFile" class="screenshot-dropzone" :class="{ dragging }" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="dropFile">
            <span class="upload-icon"><Upload class="icon-empty" aria-hidden="true" /></span>
            <button type="button" class="btn btn-success" @click="uploadInput?.click()"><ImagePlus class="icon-control" aria-hidden="true" /> Choose screenshot</button>
            <p id="screenshot-format">Tap to upload <span class="desktop-drop-hint">or drag and drop</span><br />PNG, JPEG or WebP · Up to 5 MB</p>
          </div>
          <div v-else class="selected-screenshot">
            <img :src="imagePreview" alt="Selected social usage screenshot" />
            <div><strong>{{ selectedFile.name }}</strong><p id="screenshot-format" class="storage-note">{{ (selectedFile.size / 1024 / 1024).toFixed(1) }} MB · Ready to review</p></div>
          </div>
          <p v-if="fileError" role="alert" class="alert alert-danger mt-3">{{ fileError }}</p>
          <div v-if="selectedFile && !result?.analysisToken" class="screenshot-actions">
            <button type="button" class="btn btn-success" :disabled="busy || saving" @click="analyze"><RefreshCw class="icon-control" aria-hidden="true" /> {{ busy ? 'Analysing…' : error ? 'Retry analysis' : 'Analyse screenshot' }}</button>
            <button type="button" class="btn btn-outline-success" :disabled="busy || saving" @click="uploadInput?.click()"><ImagePlus class="icon-control" aria-hidden="true" /> Change screenshot</button>
          </div>
          <p v-if="busy" class="analysis-status" role="status"><Sprout class="icon-control loading-sprout" aria-hidden="true" /> Reading the date and social usage. This may take a moment.</p>
          <p v-if="error && errorStep === 'analysis'" role="alert" class="alert alert-danger mt-3">{{ error }}</p>
          <section v-if="result?.analysisToken" class="checkin-result" aria-labelledby="review-title">
            <h3 id="review-title"><CheckCircle2 class="icon-card" aria-hidden="true" /> Review your check-in</h3>
            <dl><div><dt>Date · Asia/Singapore</dt><dd>{{ date }}</dd></div><div><dt>Social usage</dt><dd>{{ duration(result.socialMediaMinutes) }}</dd></div></dl>
            <span class="checkin-badge" :class="result.submissionStatus === 'completed' ? 'badge-completed' : 'badge-provisional'">{{ result.submissionStatus === 'completed' ? 'Completed day' : 'Provisional' }}</span>
            <p class="storage-note">{{ result.submissionStatus === 'completed' ? 'A completed-day submission.' : 'Today’s usage is provisional and excluded from final results.' }}</p>
            <p class="storage-note">Saving replaces any existing check-in for this date.</p>
            <details v-if="result.notes" class="data-disclosure"><summary>Analysis notes</summary><p>{{ result.notes }}</p></details>
            <p v-if="error && errorStep === 'save'" role="alert" class="alert alert-danger">{{ error }}</p>
            <form @submit.prevent="save"><button class="btn btn-success w-100" :disabled="saving || busy"><CheckCircle2 class="icon-control" aria-hidden="true" /> {{ saving ? 'Saving…' : 'Confirm and save' }}</button></form>
            <button type="button" class="checkin-text-button" :disabled="saving || busy" @click="uploadInput?.click()"><ImagePlus class="icon-control" aria-hidden="true" /> Change screenshot</button>
          </section>
        </template>
        <div v-else class="checkin-success"><p role="status"><CheckCircle2 class="icon-card" aria-hidden="true" /> {{ success }}</p><button type="button" class="btn btn-success" :disabled="saving" @click="reset"><Upload class="icon-control" aria-hidden="true" /> Upload another</button></div>
        <details class="data-disclosure checkin-rules"><summary>How check-ins work</summary><ul><li>Today is provisional. Submit yesterday’s screenshot for completed-day usage. Provisional entries remain provisional until replaced with a completed-day screenshot.</li><li>Saving a fresh analysis for the same date replaces that date’s check-in.</li><li>Weeks run Monday–Sunday in Asia/Singapore. Only completed-day social usage counts for rankings. Missing days are never zero.</li><li>All seven completed days are needed for a final ranking; during the week, every elapsed competition day is needed.</li><li>Screenshots support the reported date and usage, but do not prove authenticity.</li></ul></details>
      </div>
    </section>
    <aside class="card checkin-history" aria-labelledby="history-title"><div class="card-body p-4">
      <h2 id="history-title"><CalendarDays class="icon-card" aria-hidden="true" /> Your week</h2>
      <label for="check-in-week" class="form-label">View week containing</label>
      <input id="check-in-week" v-model="weekOf" type="date" class="form-control" required />
      <p class="storage-note">Monday–Sunday · Asia/Singapore</p>
      <div v-if="loadError" role="alert" class="alert alert-warning"><p>{{ loadError }}</p><button class="btn btn-outline-success" @click="loadDays">Retry history</button></div>
      <p v-if="!loadError && days.length && days.every(day => !day.checkIn)" class="storage-note"><EmptySprout />No check-ins this week yet.</p>
      <ul v-if="!loadError" class="checkin-day-list">
        <li v-for="day in days" :key="day.date">
          <div><time :datetime="day.date">{{ new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }}</time><small v-if="day.checkIn && ['practice', 'historical'].includes(day.checkIn.competitionScope)">{{ day.checkIn.competitionScope === 'practice' ? 'Practice' : 'Historical' }}</small></div>
          <div class="checkin-day-status"><strong v-if="day.checkIn">{{ duration(day.checkIn.socialMediaMinutes) }}</strong><span class="checkin-badge" :class="{ 'badge-completed': day.checkIn?.status === 'completed', 'badge-provisional': day.checkIn?.status === 'provisional' }">{{ !day.checkIn ? (day.date > today() ? 'Upcoming' : 'Missing') : day.checkIn.status === 'completed' ? 'Completed' : day.checkIn.status === 'provisional' ? 'Provisional' : 'Resubmit' }}</span></div>
        </li>
      </ul>
    </div></aside>
  </div>
</template>

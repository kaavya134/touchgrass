<script setup>
import { ref } from 'vue'

const STORAGE_KEY = 'touchgrass-diary'

function localDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const date = ref(localDate())
const hours = ref('')
const note = ref('')
const entries = ref([])
const errorMessage = ref('')
const successMessage = ref('')

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

  if (
    !Array.isArray(saved) ||
    !saved.every(entry =>
      entry &&
      typeof entry.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
      typeof entry.hours === 'number' &&
      Number.isFinite(entry.hours) &&
      entry.hours >= 0 &&
      entry.hours <= 24 &&
      typeof entry.note === 'string'
    )
  ) {
    throw new Error('Invalid saved entries')
  }

  entries.value = saved.sort((a, b) => b.date.localeCompare(a.date))
} catch {
  errorMessage.value = 'Could not load your saved diary.'
}

function saveEntry() {
  errorMessage.value = ''
  successMessage.value = ''

  const parsedDate = new Date(`${date.value}T00:00:00Z`)

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date.value) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date.value ||
    date.value > localDate()
  ) {
    errorMessage.value = 'Choose a valid date that is not in the future.'
    return
  }

  const value = Number(hours.value)

  if (
    hours.value === '' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 24
  ) {
    errorMessage.value = 'Enter hours between 0 and 24.'
    return
  }

  const entry = {
    date: date.value,
    hours: value,
    note: note.value.trim()
  }

  // Replace an existing entry for this date.
  const updated = entries.value.filter(item => item.date !== date.value)
  updated.push(entry)
  updated.sort((a, b) => b.date.localeCompare(a.date))

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    entries.value = updated
    successMessage.value = 'Diary entry saved!'
    hours.value = ''
    note.value = ''
  } catch {
    errorMessage.value = 'Could not save. Browser storage may be unavailable.'
  }
}
</script>

<template>
  <section class="card border-0 shadow-sm">
    <div class="card-body p-4">
      <h2 class="h4">My usage diary 📝</h2>
      <p class="text-secondary small">
        Track your total phone usage for yourself. No group needed.
        Entries stay in this browser and do not count towards rankings.
      </p>

      <form @submit.prevent="saveEntry">
        <div class="mb-3">
          <label for="diary-date" class="form-label">Date</label>
          <input
            id="diary-date"
            v-model="date"
            type="date"
            :max="localDate()"
            class="form-control"
            required
          />
        </div>

        <div class="mb-3">
          <label for="diary-hours" class="form-label">
            Total phone usage in hours
          </label>
          <input
            id="diary-hours"
            v-model.number="hours"
            type="number"
            min="0"
            max="24"
            step="0.01"
            placeholder="e.g. 2.5 means 2 hours 30 minutes"
            class="form-control"
            required
          />
        </div>

        <div class="mb-3">
          <label for="diary-note" class="form-label">
            Reflection (optional)
          </label>
          <textarea
            id="diary-note"
            v-model="note"
            class="form-control"
            rows="2"
            placeholder="What helped you put your phone down?"
          ></textarea>
        </div>

        <div v-if="errorMessage" class="alert alert-danger" role="alert">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="alert alert-success" role="status">
          {{ successMessage }}
        </div>

        <button type="submit" class="btn btn-success w-100">
          Save entry
        </button>
      </form>

      <h3 class="h6 mt-4">Your entries</h3>
      <p v-if="entries.length === 0" class="text-secondary">
        No entries yet.
      </p>

      <ul v-else class="list-group">
        <li
          v-for="entry in entries"
          :key="entry.date"
          class="list-group-item"
        >
          <div class="d-flex justify-content-between gap-3">
            <strong>{{ entry.date }}</strong>
            <span>{{ entry.hours }} hours</span>
          </div>
          <p v-if="entry.note" class="small text-secondary mb-0 mt-2">
            {{ entry.note }}
          </p>
        </li>
      </ul>
    </div>
  </section>
</template>
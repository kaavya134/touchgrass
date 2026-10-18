<script setup>
import { ref } from 'vue'
import api, { setCsrfToken } from '../api'
import BrandMark from './BrandMark.vue'
defineProps({ connectionError: String })
const emit = defineEmits(['authenticated','retry'])
const mode = ref('login')
const displayName = ref('')
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
function choose(next) { mode.value = next; error.value = ''; password.value = '' }
async function submit() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    const payload = { email: email.value, password: password.value }
    if (mode.value === 'signup') payload.displayName = displayName.value
    const { data } = await api.post(`/auth/${mode.value}`, payload)
    setCsrfToken(data.csrfToken)
    password.value = ''
    emit('authenticated',data.user)
  } catch (failure) { error.value = failure.response?.data?.message || 'Could not connect. Check your connection and retry.' }
  finally { busy.value = false }
}
</script>
<template>
  <main class="auth-shell">
    <div class="entry-layout auth-layout">
      <section class="entry-story"><BrandMark /><h1>Put the phone down.<br><span>Make room for life.</span></h1><p>Less social scrolling. More time for the things and people you love. Log in to grow together.</p><div class="decorative-podium" aria-hidden="true"><span></span><span></span><span></span></div></section>
      <section class="entry-form">
        <div class="segmented-control"><button :class="{ active: mode === 'login' }" :aria-pressed="mode === 'login'" :disabled="busy" @click="choose('login')">Log in</button><button :class="{ active: mode === 'signup' }" :aria-pressed="mode === 'signup'" :disabled="busy" @click="choose('signup')">Sign up</button></div>
        <h2>{{ mode === 'signup' ? 'Join the grass roots.' : 'Welcome back.' }}</h2><p class="text-secondary">{{ mode === 'signup' ? 'Your own account. A little less scrolling.' : 'Your people and your progress are waiting.' }}</p>
        <div v-if="connectionError" class="alert alert-warning" role="alert">{{ connectionError }} <button class="btn btn-outline-success" @click="emit('retry')">Retry connection</button></div>
        <form @submit.prevent="submit">
          <div v-if="mode === 'signup'" class="mb-3"><label for="auth-name" class="form-label">Display name</label><input id="auth-name" v-model="displayName" autocomplete="nickname" class="form-control" maxlength="60" required :disabled="busy" /></div>
          <div class="mb-3"><label for="auth-email" class="form-label">Email</label><input id="auth-email" v-model="email" type="email" autocomplete="email" class="form-control" maxlength="254" required :disabled="busy" /></div>
          <div class="mb-3"><label for="auth-password" class="form-label">Password</label><input id="auth-password" v-model="password" type="password" :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'" class="form-control" :minlength="mode === 'signup' ? 12 : 1" maxlength="72" required :disabled="busy" aria-describedby="password-help" /><p id="password-help" class="small text-secondary mt-2">{{ mode === 'signup' ? 'At least 12 characters, up to 72 UTF-8 bytes.' : 'Use the password you signed up with.' }}</p></div>
          <p v-if="error" role="alert" class="alert alert-danger">{{ error }}</p>
          <button class="btn btn-mustard w-100" :disabled="busy">{{ busy ? 'Please wait...' : mode === 'signup' ? 'Start growing together' : 'Log in to TouchGrass' }}</button>
        </form>
        <p class="small text-secondary mt-3">No social login, password reset or email verification yet. Diary and activity data stay browser-local and are scoped to your account.</p>
      </section>
    </div>
  </main>
</template>

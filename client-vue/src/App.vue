<script setup>
import { Users, LogOut, Trophy, Gift } from 'lucide-vue-next'
import EmptySprout from './components/EmptySprout.vue'
import { onMounted, onBeforeUnmount, ref } from 'vue'
import api, { setCsrfToken } from './api'
import HowItWorks from './components/HowItWorks.vue'
import InviteCode from './components/InviteCode.vue'
import AuthWelcome from './components/AuthWelcome.vue'
import UserDiary from './components/UserDiary.vue'
import GroupDashboard from './components/GroupDashboard.vue'
import BrandMark from './components/BrandMark.vue'
import AppNavigation from './components/AppNavigation.vue'


const authUser = ref(null)
const authLoading = ref(true)
const authError = ref('')
const logoutBusy = ref(false)
const accountGroups = ref([])
let sessionChannel
let authGeneration = 0
function selectionKey() { return 'touchgrass-group-selection:' + authUser.value.id }
function clearAccountState() {
  authGeneration++
  authUser.value = null; accountGroups.value = []; createdGroup.value = null; memberName.value = ''; groupName.value = ''; inviteCode.value = ''; forfeit.value = 'Buy everyone a coffee'; errorMessage.value = ''; selectionMessage.value = ''; restoreFailed.value = false; restoring.value = false; view.value = 'leaderboard'; mode.value = 'create'; loading.value = false; setCsrfToken(null)
}
async function authenticated(user) { clearAccountState(); authUser.value = user; authError.value = ''; memberName.value = user.displayName; await restoreSelection() }
async function bootstrap() {
  clearAccountState(); const generation = authGeneration; authLoading.value = true; authError.value = ''
  try { const { data } = await api.get('/auth/me'); if (generation !== authGeneration) return; setCsrfToken(data.csrfToken); if (data.user) await authenticated(data.user) }
  catch { authError.value = 'Could not restore your login. Please check the backend and retry.' }
  finally { authLoading.value = false }
}
function broadcastSessionChange() { if (sessionChannel) sessionChannel.postMessage('changed'); else { try { localStorage.setItem('touchgrass-session-change', String(Date.now())) } catch {} } }
async function logout() {
  if (logoutBusy.value) return
  logoutBusy.value = true
  try { await api.post('/auth/logout'); clearAccountState(); broadcastSessionChange() }
  catch (error) { if (error.response?.status === 401) { clearAccountState(); broadcastSessionChange() } else selectionMessage.value = 'Could not log out. Please retry.' }
  finally { logoutBusy.value = false }
}
function sessionExpired() { clearAccountState(); authError.value = 'Your session has ended. Please log in again.' }
function sessionChanged(event) { if (event.key === 'touchgrass-session-change') bootstrap() }
const groupName = ref('')
const memberName = ref('')
const createdGroup = ref(null)
const errorMessage = ref('')
const loading = ref(false)
const forfeit = ref('Buy everyone a coffee')

const mode = ref('create')
const inviteCode = ref('')
const view = ref('leaderboard')
function navigate(next) { view.value = next }
function entryMode(next) { mode.value = next; errorMessage.value = ''; view.value = 'groups' }
const restoring = ref(true)
const restoreFailed = ref(false)
const selectionMessage = ref('')

function clearSelection() {
  try {
    localStorage.removeItem(selectionKey())
  } catch {
    selectionMessage.value = 'Browser storage is unavailable. The saved selection could not be cleared.'
  }
}

function leaveDashboard() {
  view.value = 'groups'
  selectionMessage.value = ''
  clearSelection()
  createdGroup.value = null
  memberName.value = authUser.value?.displayName || ''
  errorMessage.value = ''
  restoreFailed.value = false
}

function openGroup(group) {
  const member = group.members?.find(item => item._id === group.currentMemberId && String(item.userId) === authUser.value?.id)
  if (!member) {
    return
  }
  createdGroup.value = group
  if (!accountGroups.value.some(item => item.inviteCode === group.inviteCode)) accountGroups.value.push(group)
  view.value = 'leaderboard'
  memberName.value = member.name
  selectionMessage.value = ''
  try {
    localStorage.setItem(selectionKey(), JSON.stringify({
      inviteCode: group.inviteCode,

    }))
  } catch {
    selectionMessage.value = 'Your dashboard is open, but browser storage is unavailable. It cannot be remembered after refresh.'
  }
}

async function restoreSelection() {
  if (!authUser.value) return
  const accountId = authUser.value.id
  restoring.value = true; restoreFailed.value = false; selectionMessage.value = ''
  try {
    const { data: groups } = await api.get('/groups', { timeout: 10000 })
    if (authUser.value?.id !== accountId) return
    accountGroups.value = groups
    let saved
    try { saved = JSON.parse(localStorage.getItem(selectionKey()) || 'null') } catch { selectionMessage.value = 'Could not read your saved selection. Choose one of your groups.' }
    const group = groups.find(item => item.inviteCode === saved?.inviteCode) || (groups.length === 1 ? groups[0] : null)
    if (group) { const selectedView = view.value; openGroup(group); view.value = selectedView }
    else if (view.value === 'leaderboard') view.value = 'groups'
  } catch {
    if (authUser.value?.id === accountId) { restoreFailed.value = true; selectionMessage.value = 'Could not load your groups. Check your connection and retry.' }
  } finally { if (authUser.value?.id === accountId) restoring.value = false }
}
onMounted(() => { if (typeof BroadcastChannel !== 'undefined') { sessionChannel = new BroadcastChannel('touchgrass-session'); sessionChannel.onmessage = () => bootstrap() } bootstrap(); window.addEventListener('touchgrass:unauthorized',sessionExpired); window.addEventListener('storage',sessionChanged) })
onBeforeUnmount(() => { sessionChannel?.close(); window.removeEventListener('touchgrass:unauthorized',sessionExpired); window.removeEventListener('storage',sessionChanged) })

function switchMode(newMode) {
  mode.value = newMode
  errorMessage.value = ''
}

async function createGroup() {
  errorMessage.value = ''

  if (!groupName.value.trim() || !memberName.value.trim()) {
    errorMessage.value = 'Please enter your name and a group name.'
    return
  }

  loading.value = true

  try {
    const response = await api.post(
      '/groups',
      {
        groupName: groupName.value.trim(),
        forfeit: forfeit.value.trim()
      }
    )

    openGroup(response.data)
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      'Could not create the group. Check that your backend is running.'
  } finally {
    loading.value = false
  }
}

async function joinGroup() {
  errorMessage.value = ''

  if (!memberName.value.trim() || !inviteCode.value.trim()) {
    errorMessage.value = 'Please enter your name and a group code.'
    return
  }

  loading.value = true

  try {
    const response = await api.post(
      '/groups/join',
      {
        inviteCode: inviteCode.value.trim().toUpperCase(),
      }
    )

    openGroup(response.data)
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      'Could not join the group. Check that your backend is running.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <p v-if="authLoading" class="auth-loading" role="status">Restoring your login...</p>
  <AuthWelcome v-else-if="!authUser" :connection-error="authError" @authenticated="user => { authenticated(user); broadcastSessionChange() }" @retry="bootstrap" />
  <template v-else>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="app-shell" :key="authUser.id">
    <aside class="sidebar">
      <BrandMark />
      <AppNavigation :active="view" @navigate="navigate" />
      <div class="sidebar-group">
        <p class="eyebrow">YOUR GROUPS</p>
        <button v-for="accountGroup in accountGroups" :key="accountGroup.inviteCode" class="group-chip mb-2" @click="openGroup(accountGroup)"><Users class="icon-control" aria-hidden="true" /> {{ accountGroup.name }}</button>
        <p v-if="!accountGroups.length" class="small">Create or join your first group.</p>
        <p class="sidebar-note">Signed in as {{ authUser.displayName }}. Only your account memberships appear here.</p>
      </div>
      <div class="sidebar-actions">
        <button class="btn btn-mustard" @click="entryMode('create')"><Users class="icon-control" aria-hidden="true" /> Create a group</button>
        <button class="btn btn-sidebar" @click="entryMode('join')"><Users class="icon-control" aria-hidden="true" /> Join with code</button>
        <button v-if="createdGroup" class="leave-button" @click="leaveDashboard">Close dashboard</button>
        <button class="btn btn-sidebar" :disabled="logoutBusy" @click="logout"><LogOut class="icon-control" aria-hidden="true" /> {{ logoutBusy ? 'Logging out...' : 'Log out' }}</button>
      </div>
    </aside>
    <div class="workspace">
      <header class="mobile-topbar"><BrandMark /><div class="mobile-account"><span class="avatar avatar-mustard" :aria-label="authUser.displayName">{{ authUser.displayName.charAt(0).toUpperCase() }}</span><button class="mobile-logout" :disabled="logoutBusy" @click="logout"><LogOut class="icon-compact" aria-hidden="true" /> Log out</button></div></header>
      <main id="main-content" class="main-content" tabindex="-1">
        <div v-if="selectionMessage" class="alert alert-warning" role="status">{{ selectionMessage }}</div>
        <p v-if="restoring" class="state-card" role="status">Restoring your dashboard...</p>
        <div v-else-if="restoreFailed" class="state-card"><h1>Welcome back.</h1><p>We couldn't load your saved group.</p><div class="d-flex gap-2"><button class="btn btn-success" @click="restoreSelection">Retry</button><button class="btn btn-outline-secondary" @click="leaveDashboard">Clear selection</button></div></div>
        <template v-else>
          <HowItWorks />
          <section v-show="view === 'diary'" class="dedicated-view"><header class="page-heading"><p class="eyebrow">A LITTLE REFLECTION</p><h1>Your personal diary</h1><p>A space to notice your habits. Just for you.</p></header><UserDiary :key="authUser.id" :account-id="authUser.id" /></section>
          <GroupDashboard v-if="createdGroup" v-show="['leaderboard','checkins','activities'].includes(view)" :key="authUser.id" :account-id="authUser.id" :group="createdGroup" :member-name="memberName.trim()" :view="view" @navigate="navigate" @leave="leaveDashboard" />
          <section v-if="view === 'groups' || (!createdGroup && view !== 'diary')" class="entry-layout">
            <div class="entry-story"><BrandMark /><h1>Put the phone down.<br><span>Make room for life.</span></h1><p>Less social scrolling. More time for the things and people you love.</p><div class="decorative-podium" aria-hidden="true"><span></span><span></span><span></span></div></div>
            <div class="entry-form">
              <div v-if="accountGroups.length" class="current-group-card"><p class="eyebrow">YOUR ACCOUNT GROUPS</p><button v-for="accountGroup in accountGroups" :key="accountGroup.inviteCode" class="btn btn-outline-success w-100 mb-2" @click="openGroup(accountGroup)"><Users class="icon-control" aria-hidden="true" /> {{ accountGroup.name }} - Open group</button></div>
              <div v-if="createdGroup" class="current-group-card"><p class="eyebrow"><Users class="icon-control" aria-hidden="true" /> CURRENT GROUP</p><strong>{{ createdGroup.name }}</strong><p>{{ createdGroup.members.length }} members</p><InviteCode :code="createdGroup.inviteCode" /><button class="btn btn-outline-success" @click="navigate('leaderboard')"><Trophy class="icon-control" aria-hidden="true" /> Open leaderboard</button></div>
              <p v-if="!accountGroups.length" class="empty-help"><EmptySprout />No groups yet. Create your own group or join a friend using an invite code. Choose an option below to get started.</p>
              <div class="segmented-control"><button :class="{active:mode === 'create'}" :aria-pressed="mode === 'create'" :disabled="loading" @click="switchMode('create')">Create group</button><button :class="{active:mode === 'join'}" :aria-pressed="mode === 'join'" :disabled="loading" @click="switchMode('join')">Join with code</button></div>
              <h2>{{ mode === 'create' ? 'Grow a little community.' : 'Find your people.' }}</h2><p class="text-secondary">{{ mode === 'create' ? 'A friendly nudge to scroll less, together.' : 'Enter your group invite code to get started.' }}</p>
              <form @submit.prevent="mode === 'create' ? createGroup() : joinGroup()">
                <p class="small text-secondary">Joining as <strong>{{ authUser.displayName }}</strong>. Your identity comes from your account.</p>
                <template v-if="mode === 'create'"><div class="mb-3"><label for="groupName" class="form-label">Group name</label><input id="groupName" v-model="groupName" class="form-control" placeholder="e.g. The Grass Roots" required :disabled="loading" /></div><div class="mb-3"><label for="forfeit" class="form-label"><Gift class="icon-control" aria-hidden="true" /> Loser's forfeit</label><input id="forfeit" v-model="forfeit" class="form-control" maxlength="200" required :disabled="loading" /></div></template>
                <div v-else class="mb-3"><label for="inviteCode" class="form-label">Invite code</label><input id="inviteCode" v-model="inviteCode" class="form-control" placeholder="Your friend's group code" required :disabled="loading" /></div>
                <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
                <button class="btn btn-mustard w-100" :disabled="loading">{{ loading ? 'Please wait...' : mode === 'create' ? 'Start growing together' : 'Join the group' }}</button>
              </form>
              <p class="small text-secondary mt-3">Your account owns new memberships. Legacy members and check-ins are preserved but are never claimed by matching names.</p>
              <button v-if="createdGroup" class="leave-button text-secondary" @click="leaveDashboard">Leave this dashboard</button>
            </div>
          </section>
        </template>
      </main>
      <div class="mobile-navigation"><AppNavigation :active="view" @navigate="navigate" /></div>
    </div>
  </div>
  </template>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import UsageDiary from './components/UserDiary.vue'
import GroupDashboard from './components/GroupDashboard.vue'


const groupName = ref('')
const memberName = ref('')
const createdGroup = ref(null)
const errorMessage = ref('')
const loading = ref(false)
const forfeit = ref('Buy everyone a coffee')

const mode = ref('create')
const inviteCode = ref('')
const showDiary = ref(false)

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
    const response = await axios.post(
      'http://localhost:8000/api/groups',
      {
        groupName: groupName.value.trim(),
        memberName: memberName.value.trim(),
        forfeit: forfeit.value.trim()
      }
    )

    createdGroup.value = response.data
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
    const response = await axios.post(
      'http://localhost:8000/api/groups/join',
      {
        inviteCode: inviteCode.value.trim().toUpperCase(),
        memberName: memberName.value.trim()
      }
    )

    createdGroup.value = response.data
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
  <main class="container py-5">
    <div class="row justify-content-center">
      <div class="col-12" :class="createdGroup && !showDiary ? 'col-lg-9' : 'col-md-8 col-lg-5'">
        <div class="text-center mb-4">
          <h1 class="fw-bold text-success">TouchGrass 🌱</h1>
          <p class="text-secondary">
            Scroll less. Hang out. Touch the most grass.
          </p>
          <button
          type="button"
          class="btn btn-outline-success" @click="showDiary = !showDiary"
>
  {{ showDiary ? 'Back to group challenge' : 'Open my personal diary' }}
</button>
        </div>

       <UserDiary v-if="showDiary" />
       <GroupDashboard v-else-if="createdGroup"
       :group="createdGroup"
       :member-name="memberName.trim()"/>

<div v-else class="card shadow-sm border-0">
          <div class="card-body p-4">
            <template v-if="!createdGroup">
              <div class="d-flex gap-2 mb-4">
  <button
    type="button"
    class="btn flex-fill"
    :class="mode === 'create' ? 'btn-success' : 'btn-outline-success'"
    :disabled="loading"
    @click="switchMode('create')"
  >
    Create Group
  </button>

  <button
    type="button"
    class="btn flex-fill"
    :class="mode === 'join' ? 'btn-success' : 'btn-outline-success'"
    :disabled="loading"
    @click="switchMode('join')"
  >
    Join Group
  </button>
</div>

<h2 class="h4 mb-3">
  {{ mode === 'create' ? 'Create your group' : 'Join your friends' }}
</h2>

<form @submit.prevent="mode === 'create' ? createGroup() : joinGroup()">
                <div class="mb-3">
                  <label for="memberName" class="form-label">
                    Your name
                  </label>
                  <input
                    id="memberName"
                    v-model="memberName"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Kavi"
                    required
                    :disabled="loading"
                  />
                </div>

                <div v-if="mode === 'create'" class="mb-4">
  <label for="groupName" class="form-label">Group name</label>
  <input
    id="groupName"
    v-model="groupName"
    type="text"
    class="form-control"
    placeholder="e.g. TouchGrass Gang"
    required
    :disabled="loading"
  />
  <div v-if="mode === 'create'" class="mb-4">
  <label for="forfeit" class="form-label">
    Loser's forfeit
  </label>
  <input
    id="forfeit"
    v-model="forfeit"
    type="text"
    class="form-control"
    placeholder="e.g. Treat everyone to bubble tea"
    maxlength="200"
    required
    :disabled="loading"
  />
</div>
</div>

<div v-else class="mb-4">
  <label for="inviteCode" class="form-label">Invite code</label>
  <input
    id="inviteCode"
    v-model="inviteCode"
    type="text"
    class="form-control"
    placeholder="Enter your friend's code"
    required
    :disabled="loading"
  />
</div>

                <div
                  v-if="errorMessage"
                  class="alert alert-danger"
                  role="alert"
                >
                  {{ errorMessage }}
                </div>

               <button
  type="submit"
  class="btn btn-success w-100"
  :disabled="loading"
>
  {{ loading ? 'Please wait...' : mode === 'create' ? 'Create Group' : 'Join Group' }}
</button>
              </form>
            </template>

           

             
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style>
body {
  margin: 0;
  min-height: 100vh;
  background-color: #f0f7f1;
}

.invite-code {
  background-color: #e5f3e8;
  color: #146c43;
  font-size: 2rem;
  font-weight: bold;
  letter-spacing: 0.2rem;
  overflow-wrap: anywhere;
}
</style>
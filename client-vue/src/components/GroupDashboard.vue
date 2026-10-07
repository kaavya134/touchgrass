<script setup>
defineProps({
  group: {
    type: Object,
    required: true
  },
  memberName: {
    type: String,
    required: true
  }
})
</script>

<template>
  <section>
    <div class="mb-4">
      <p class="text-secondary mb-1">
        Welcome, {{ memberName }}
      </p>
      <h2 class="h3 fw-bold">{{ group.name }}</h2>
      <p class="text-secondary">
        Your group's challenge starts here.
      </p>
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body p-4">
        <h3 class="h6 text-secondary">Invite your friends</h3>
        <div class="invite-code rounded p-3">
          {{ group.inviteCode }}
        </div>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-12 col-md-6">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-4">
            <h3 class="h6 text-secondary">Daily social media goal</h3>
            <p class="h4 mb-0">
              {{ group.goalHoursPerDay }} hours
            </p>
          </div>
        </div>
      </div>

      <div class="col-12 col-md-6">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-4">
            <h3 class="h6 text-secondary">Loser's forfeit</h3>
            <p class="fw-semibold mb-0">{{ group.forfeit }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body p-4">
        <h3 class="h5">Screenshot check-in 📸</h3>
        <p class="text-secondary mb-0">
          Screenshot check-ins are coming next. You'll upload your
          daily screen-time view and review the date and usage read by AI.
        </p>
      </div>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-body p-4">
        <h3 class="h5">Weekly leaderboard 🏆</h3>
        <p class="text-secondary">
          Rankings will appear once screenshot check-ins are connected.
          No loser has been determined yet.
        </p>

        <h4 class="h6">
          Group members ({{ group.members.length }})
        </h4>

        <ul class="list-group">
          <li
            v-for="member in group.members"
            :key="member._id"
            class="list-group-item"
          >
            {{ member.name }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
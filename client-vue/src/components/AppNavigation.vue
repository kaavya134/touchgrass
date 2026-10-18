<script setup>
import { Trophy, ScanLine, Sprout, BookOpen, Users } from 'lucide-vue-next'
defineProps({ active: String })
defineEmits(['navigate'])
const items = [{ id: 'leaderboard', label: 'Leaderboard', icon: Trophy }, { id: 'checkins', label: 'Check-ins', icon: ScanLine }, { id: 'activities', label: 'Activities', icon: Sprout }, { id: 'diary', label: 'Diary', icon: BookOpen }, { id: 'groups', label: 'Groups', icon: Users }]
</script>
<template>
  <nav aria-label="Main navigation" class="app-navigation">
    <button v-for="item in items" :key="item.id" :class="{ active: active === item.id }" :aria-current="active === item.id ? 'page' : undefined" @click="$emit('navigate', item.id)"><component :is="item.icon" class="icon-control nav-icon" aria-hidden="true" /><span>{{ item.label }}</span></button>
  </nav>
</template>

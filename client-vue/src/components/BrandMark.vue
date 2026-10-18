<script setup>
import { Sprout } from 'lucide-vue-next'
defineProps({ compact: Boolean })
</script>
<template>
  <span class="brand"><Sprout :stroke-width="2" aria-hidden="true" /><span v-if="!compact">TouchGrass</span></span>
</template>

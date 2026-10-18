<script setup>

defineProps({ label: String, icon: [Object, Function], tone: { type: String, default: 'cream' } })
</script>
<template><section class="summary-card" :class="`tone-${tone}`"><span v-if="icon" class="feature-icon" :class="`feature-${tone === 'forest' ? 'mustard' : tone === 'peach' ? 'peach' : 'sage'}`"><component :is="icon" class="icon-card" aria-hidden="true" /></span><h3 class="eyebrow">{{ label }}</h3><slot /></section></template>

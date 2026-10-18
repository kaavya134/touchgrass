<script setup>
import { Copy } from 'lucide-vue-next'
import { ref, watch, useId } from 'vue'
const props = defineProps({ code: { type: String, required: true } })
const input = ref(null)
const message = ref('')
const busy = ref(false)
const manual = ref(false)
const id = useId()
watch(() => props.code, () => { message.value = ''; manual.value = false })
function selectCode() { input.value?.focus(); input.value?.select(); input.value?.setSelectionRange(0, props.code.length) }
async function copy() {
  if (busy.value) return
  busy.value = true; message.value = ''; manual.value = false
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(props.code)
    message.value = 'Invite code copied!'
  } catch {
    manual.value = true
    message.value = 'Could not copy automatically. The code is selected: press Ctrl+C (or Command+C), or touch and hold to copy.'
    selectCode()
  } finally { busy.value = false }
}
</script>
<template>
  <div class="invite-control">
    <label :for="id" class="form-label">Invite code</label>
    <input :id="id" ref="input" class="form-control invite-code" :value="code" readonly :aria-describedby="id + '-feedback'" @focus="$event.target.select()" />
    <button class="btn btn-outline-success mt-2" :disabled="busy" @click="copy"><Copy class="icon-control" aria-hidden="true" /> {{ busy ? 'Copying...' : 'Copy invite code' }}</button>
    <p :id="id + '-feedback'" role="status" class="small mt-2 mb-0">{{ message || 'Share this code with friends to join your group.' }}</p>
    <button v-if="manual" class="btn btn-outline-secondary mt-2" @click="selectCode">Select code manually</button>
  </div>
</template>

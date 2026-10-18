import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref, computed } from 'vue'

// Exercise the component's actual event handlers without a browser or an AI request.
const source = await readFile(new URL('./components/ScreenshotCheckIn.vue', import.meta.url), 'utf8')
const script = source.split('<script setup>')[1].split('</script>')[0].replace(/^import .*$/gm, '')
function flow(api) {
  const create = new Function('ref', 'computed', 'watch', 'onBeforeUnmount', 'defineProps', 'defineEmits', 'api', `${script}\nreturn { selectFile, chooseFile, analyze, save, reset, selectedFile, result, error, fileError, busy, saving, success, imagePreview, date }`)
  return create(ref, computed, () => {}, () => {}, () => ({ groupCode: 'TEST', memberId: 'member' }), () => () => {}, api)
}
function image(name = 'daily.png') { return new File(['image'], name, { type: 'image/png' }) }
const history = { data: { days: [], competitionStartDate: '2026-01-05' } }

test('selection is local, invalid changes retain selection, and reset clears the flow', () => {
  let calls = 0
  const ui = flow({ post() { calls++ } })
  const selected = image()
  ui.selectFile(selected)
  assert.equal(calls, 0)
  assert.equal(ui.selectedFile.value, selected)
  assert.ok(ui.imagePreview.value.startsWith('blob:'))
  ui.selectFile(new File(['text'], 'wrong.txt', { type: 'text/plain' }))
  assert.ok(ui.fileError.value.includes('PNG'))
  assert.equal(ui.selectedFile.value, selected)
  ui.selectFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }))
  assert.ok(ui.fileError.value)
  ui.reset()
  assert.equal(ui.selectedFile.value, null)
  assert.equal(ui.imagePreview.value, '')
})

test('analysis is explicit, guarded while busy, and save sends only the existing analysis token', async () => {
  const originalReader = globalThis.FileReader
  globalThis.FileReader = class { readAsDataURL() { this.result = 'data:image/png;base64,aW1hZ2U='; this.onload() } }
  const calls = []
  let resolveAnalysis
  const ui = flow({
    post(path, body) {
      calls.push({ path, body })
      if (path === '/screenshots/analyze') return new Promise(resolve => { resolveAnalysis = resolve })
      return Promise.resolve({ data: { status: 'completed' } })
    },
    get: async () => history
  })
  try {
    ui.selectFile(image())
    const pending = ui.analyze()
    await Promise.resolve()
    await ui.analyze()
    ui.selectFile(image('other.png'))
    assert.equal(calls.length, 1)
    assert.equal(ui.selectedFile.value.name, 'daily.png')
    resolveAnalysis({ data: { date: '2026-10-17', socialMediaMinutes: 45, submissionStatus: 'completed', analysisToken: 'signed-token' } })
    await pending
    assert.equal(ui.result.value.socialMediaMinutes, 45)
    const saving = ui.save()
    await ui.save()
    await saving
    assert.deepEqual(calls[1], { path: '/groups/TEST/check-ins', body: { analysisToken: 'signed-token' } })
    assert.equal(calls.length, 2)
    assert.equal(ui.result.value, null)
    assert.ok(ui.success.value.includes('Saved'))
    ui.reset()
  } finally { globalThis.FileReader = originalReader }
})

test('save failure preserves reviewed result for retry', async () => {
  let attempts = 0
  const ui = flow({ post: async () => { if (++attempts === 1) throw { response: { data: { message: 'Please retry' } } }; return { data: { status: 'provisional' } } }, get: async () => history })
  ui.result.value = { analysisToken: 'token' }; ui.date.value = '2026-10-18'
  await ui.save()
  assert.equal(ui.error.value, 'Please retry')
  assert.equal(ui.result.value.analysisToken, 'token')
  assert.equal(ui.saving.value, false)
  await ui.save()
  assert.equal(attempts, 2)
  assert.ok(ui.success.value.includes('provisional'))
})

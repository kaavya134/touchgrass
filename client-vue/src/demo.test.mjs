import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'

test('demo renders fictional completed results, a persistent sample label, and only an exit action', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)), configFile: false,
    plugins: [vue()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom'
  })
  try {
    const { default: Demo } = await server.ssrLoadModule('/src/components/ExploreDemo.vue')
    const html = await renderToString(createSSRApp(Demo))
    assert.ok(html.includes('Demo · sample data'))
    assert.ok(html.includes('Exit demo'))
    assert.ok(html.includes('The Sunday Sprouts'))
    assert.ok(html.includes('Bring homemade lemonade'))
    assert.equal((html.match(/<article[^>]+class="[^"]*\bpodium-block\b/g) || []).length, 3)
    assert.equal((html.match(/<time datetime=/g) || []).length, 28)
    assert.equal((html.match(/<button/g) || []).length, 1)
    assert.ok(!/<form|<input|<textarea/.test(html))
    assert.ok(html.includes('2026-09-07') && html.includes('2026-09-13'))
  } finally { await server.close() }
})

test('demo dependency boundary excludes APIs, persistence, and authenticated feature components', async () => {
  const source = await readFile(new URL('./components/ExploreDemo.vue', import.meta.url), 'utf8')
  const imports = [...source.matchAll(/from ['"]([^'"]+)['"]/g)].map(match => match[1])
  assert.deepEqual(imports, ['lucide-vue-next', './BrandMark.vue', './SummaryCard.vue', '../demo/leaderboard.json'])
  assert.ok(!/localStorage|sessionStorage|fetch\(|axios|api\.|analysisToken|@submit/.test(source))
  const app = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  assert.ok(app.includes('<ExploreDemo v-if="demoOpen" @exit="demoOpen = false"'))
  assert.ok(app.includes('<AuthWelcome v-else-if="!authUser"'))
  // All real screens remain in the authenticated v-else branch.
  assert.ok(app.indexOf('<template v-else>') < app.indexOf('<GroupDashboard v-if="createdGroup"'))
})

# TouchGrass frontend

The active app is Vue 3 + Vite. See the [root README](../README.md) for installation, environment setup, development commands, and limitations.

## UI and data

- Diary: local-time Monday-Sunday navigation, hours/minutes editing of the original decimal-hour schema, selected-day editing, and a weekly average over logged days only. Missing days stay missing; saved zeroes count. Storage is `touchgrass-diary:account:<accountId>`. Load failures disable saving to protect existing data.
- Activities: explicit generation, errors/rate limits, labelled built-in fallbacks, and completion/undo for the current three suggestions. The existing version 1 account/group/member browser-storage schema is retained. Completion is self-reported and does not affect rankings.
- Check-ins: local image selection and preview, explicit AI analysis, read-only extracted date/usage, then token-based confirm/save. Failed saving retains the result for retry. Fresh analysis can replace a check-in for the same date under the existing server rules.
- Icons: named `lucide-vue-next` imports, inherited theme colours, two-unit stroke, 18-20px controls, 24px card icons, and 40px inline SVG empty states. Decorative icons are hidden from assistive technology; icon-only controls retain accessible names. Motion respects `prefers-reduced-motion`.

## Checks

From the repository root:

```powershell
node --test client-vue/src/personal-tools.test.mjs client-vue/src/screenshot-flow.test.mjs
npm run build --prefix client-vue
```

Rendered browser verification remains pending because no browser was available during UI implementation. At 375px and 1440px, check navigation labels, headings, stacked/two-column layouts, keyboard focus, reduced motion, diary missing/zero values and editing, prompt append, activity states, file selection/drop, long filenames, analysis/save retries, and completion/reset. Check the file picker on a physical phone as well.

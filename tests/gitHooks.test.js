/**
 * Git hooks test. The rule-mcp hooks live in the tracked `.githooks/` folder.
 * Git runs them only when `core.hooksPath` points to that folder and the files
 * are executable. The `prepare` script sets `core.hooksPath` on each install.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const HOOKS = ['commit-msg', 'post-merge', 'post-rewrite', 'pre-push']

function readManifest() {
  return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
}

function trackedModes() {
  const output = execFileSync('git', ['ls-files', '--stage', '.githooks'], { cwd: ROOT, encoding: 'utf8' })
  const modes = new Map()

  // Each line is "<mode> <object> <stage>\t<path>".
  for (const line of output.split('\n')) {
    if (line === '') {
      continue
    }

    const [meta, filePath] = line.split('\t', 2)
    const mode = meta.split(' ', 1).at(0)

    modes.set(filePath.replace('.githooks/', ''), mode)
  }

  return modes
}

describe('git hooks', () => {
  test('the prepare script points core.hooksPath to .githooks', () => {
    expect(readManifest().scripts.prepare).toBe('git config core.hooksPath .githooks || exit 0')
  })

  test.each(HOOKS)('%s is tracked as an executable file', (hook) => {
    expect(trackedModes().get(hook)).toBe('100755')
  })
})

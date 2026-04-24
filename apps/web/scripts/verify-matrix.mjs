import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')

const vueTscPkgPath = require.resolve('vue-tsc/package.json')
const vueTscBin = path.join(path.dirname(vueTscPkgPath), 'bin', 'vue-tsc.js')

const vitestPkgPath = require.resolve('vitest/package.json')
const vitestBin = path.join(path.dirname(vitestPkgPath), 'vitest.mjs')

const runViteModeScript = path.join(rootDir, 'scripts', 'run-vite-mode.mjs')
const runPlaywrightModeScript = path.join(rootDir, 'scripts', 'run-playwright-mode.mjs')

/**
 * @param {string} title
 * @param {string[]} args
 */
async function runStep(title, args) {
  console.log(`\n[verify] ${title}`)
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    })

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${title} interrupted by signal: ${signal}`))
        return
      }
      if (code !== 0) {
        reject(new Error(`${title} failed with exit code: ${code}`))
        return
      }
      resolve()
    })
  })
}

async function main() {
  await runStep('typecheck', [vueTscBin, '--noEmit'])
  await runStep('unit test', [vitestBin, '--run'])
  await runStep('build(full)', [runViteModeScript, 'full', 'build'])
  await runStep('build(ondemand)', [runViteModeScript, 'ondemand', 'build'])
  await runStep('smoke(full)', [runPlaywrightModeScript, 'full', 'e2e/smoke.spec.ts'])
  await runStep('smoke(ondemand)', [runPlaywrightModeScript, 'ondemand', 'e2e/smoke.spec.ts'])
  await runStep('e2e(full)', [runPlaywrightModeScript, 'full'])
  await runStep('e2e(ondemand)', [runPlaywrightModeScript, 'ondemand'])
  console.log('\n[verify] matrix passed: full + ondemand')
}

main().catch((error) => {
  console.error(`\n[verify] failed: ${error.message}`)
  process.exit(1)
})

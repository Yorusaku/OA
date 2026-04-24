import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const [, , modeArg = 'ondemand', actionArg = 'dev', ...restArgs] = process.argv
const mode = modeArg === 'full' ? 'full' : 'ondemand'
const action = ['dev', 'build', 'preview'].includes(actionArg) ? actionArg : 'dev'
const require = createRequire(import.meta.url)

const vitePkgPath = require.resolve('vite/package.json')
const viteBin = path.join(path.dirname(vitePkgPath), 'bin', 'vite.js')

const commandMap = {
  dev: [],
  build: ['build'],
  preview: ['preview'],
}

const child = spawn(process.execPath, [viteBin, ...commandMap[action], ...restArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_ELEMENT_PLUS_MODE: mode,
  },
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})

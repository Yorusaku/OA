import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const [, , modeArg = 'ondemand', ...testArgs] = process.argv
const mode = modeArg === 'full' ? 'full' : 'ondemand'
const require = createRequire(import.meta.url)

const playwrightPkgPath = require.resolve('@playwright/test/package.json')
const playwrightBin = path.join(path.dirname(playwrightPkgPath), 'cli.js')

const child = spawn(
  process.execPath,
  [playwrightBin, 'test', '--project=chrome', ...testArgs],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_ELEMENT_PLUS_MODE: mode,
    },
  },
)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})

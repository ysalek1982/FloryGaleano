import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const port = '5174'
const viteBin = resolve('node_modules', 'vite', 'bin', 'vite.js')
const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === 'string'))
const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', port], {
  env: {
    ...env,
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
    VITE_SUPABASE_PUBLISHABLE_KEY: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || 'mock-publishable-key',
    VITE_E2E_MOCK_AUTH: 'true',
  },
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal)
  })
}

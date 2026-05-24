const target = process.argv[2] || 'staging'
const explicitUrl = readArg('--url')
const envName = target === 'production' ? 'PRODUCTION_URL' : target === 'staging' ? 'STAGING_URL' : 'DEPLOY_URL'
const baseUrl = explicitUrl || process.env[envName] || process.env.DEPLOY_URL

if (!baseUrl) {
  if (target === 'production') {
    console.error(`FAIL post-deploy smoke: ${envName} is required for production smoke.`)
    process.exit(1)
  }
  console.log(`SKIP post-deploy smoke: ${envName} is not configured.`)
  process.exit(0)
}

let origin
try {
  origin = normalizeUrl(baseUrl)
} catch (error) {
  console.error(`FAIL post-deploy smoke: ${envName} is not a valid URL.`)
  process.exit(1)
}

console.log(`Post-deploy smoke target: ${origin.host}`)
try {
  await checkPublicRoute('/', 'landing')
  await checkPublicRoute('/login', 'login')
  await checkProtectedRoute('/app/dashboard')
  console.log('PASS post-deploy smoke complete')
} catch (error) {
  console.error(`FAIL post-deploy smoke: ${error instanceof Error ? error.message : 'unknown error'}`)
  process.exit(1)
}

async function checkPublicRoute(path, label) {
  const response = await fetch(new URL(path, origin), { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`${label} route returned HTTP ${response.status}`)
  }
  const body = await response.text()
  if (!hasAppShellMarker(body)) {
    throw new Error(`${label} route did not look like the Smart Family Meals app shell`)
  }
  console.log(`PASS ${label} route returned ${response.status}`)
}

async function checkProtectedRoute(path) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual' })
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    console.log(`PASS protected route returned redirect ${response.status}`)
    return
  }
  if (response.ok) {
    const body = await response.text()
    if (hasAppShellMarker(body)) {
      console.log(`PASS protected route returned app shell ${response.status}`)
      return
    }
  }
  throw new Error(`protected route returned unexpected HTTP ${response.status}`)
}

function hasAppShellMarker(body) {
  return body.includes('id="root"') || body.includes("id='root'") || body.includes('Smart Family Meals')
}

function normalizeUrl(value) {
  const url = new URL(value.startsWith('http') ? value : `https://${value}`)
  url.pathname = '/'
  url.search = ''
  url.hash = ''
  return url
}

function readArg(name) {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (exact) return exact.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const root = 'dist'
const vendors = [
  'three',
  'react',
  'react-dom',
  'scheduler',
  'lucide-react',
  '@fontsource-variable/dm-sans',
  '@fontsource/barlow-condensed',
  '@fontsource/ibm-plex-mono',
]
const notices = await Promise.all(
  vendors.map(async (name) => {
    const license = await readFile(
      join('node_modules', name, 'LICENSE'),
      'utf8',
    )
    return name + '\n\n' + license.trim()
  }),
)
await writeFile(join(root, 'licenses.txt'), notices.join('\n\n') + '\n')
async function filesIn(path) {
  const entries = await readdir(path, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const item = join(path, entry.name)
      return entry.isDirectory() ? filesIn(item) : item
    }),
  )
  return nested.flat().sort()
}
const files = (await filesIn(root)).filter(
  (path) => relative(root, path) !== 'sw.js',
)
const hash = createHash('sha256')
hash.update(await readFile(new URL(import.meta.url)))
for (const path of files) {
  hash.update(relative(root, path))
  hash.update(await readFile(path))
}
const version = hash.digest('hex').slice(0, 14)
const paths = files.map((path) => relative(root, path).split(sep).join('/'))
const worker = `// Generated from the complete production build.
const scope = self.registration.scope
const prefix = 'fallline:' + scope + ':'
const current = prefix + '${version}'
const files = ${JSON.stringify(paths)}.map(path => new URL(path, scope).href)

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(current)
    try {
      await cache.addAll(files.map(url => new Request(url, { cache: 'reload' })))
    } catch (error) {
      await caches.delete(current)
      throw error
    }
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== current).map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return
  event.respondWith((async () => {
    const cache = await caches.open(current)
    const key = request.mode === 'navigate' ? new URL('index.html', scope).href : request
    // Every entry is a fixed, public build asset, including on hosts that vary CORS headers.
    const cached = await cache.match(key, { ignoreSearch: true, ignoreVary: true })
    return cached || fetch(request)
  })())
})
`
await writeFile(join(root, 'sw.js'), worker)
console.log(
  'Offline cache includes ' + paths.length + ' files (' + version + ').',
)

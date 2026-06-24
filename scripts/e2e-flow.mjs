import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const fixtures = join(__dir, 'fixtures')
mkdirSync(fixtures, { recursive: true })

const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
  'base64'
)

for (let i = 1; i <= 3; i++) {
  writeFileSync(join(fixtures, `test-${i}.jpg`), JPEG)
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function main() {
  const logs = []
  const browser = await chromium.launch()
  const page = await browser.newPage()

  page.on('console', (msg) => {
    const t = msg.text()
    logs.push(t)
    console.log('[browser]', t)
  })

  // wait for async console
  await page.waitForTimeout(100)

  await page.goto('http://localhost:5174/upload', { waitUntil: 'networkidle' })

  await page.locator('input[type="file"]').setInputFiles([
    join(fixtures, 'test-1.jpg'),
    join(fixtures, 'test-2.jpg'),
    join(fixtures, 'test-3.jpg'),
  ])

  await page.getByRole('button', { name: /observaci|observation|観察/i }).click()
  await page.waitForURL('**/results', { timeout: 120000 })
  await page.waitForFunction(() => {
    return [...performance.getEntriesByType('resource')].length > 0
  }, { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(500)

  const receivedLog = logs.find((l) => l.includes('received photos'))
  const selectedLog = logs.find((l) => l.includes('selected files'))
  const payloadLog = logs.find((l) => l.includes('result payload photos'))
  console.log('selected files:', selectedLog)
  console.log('result payload photos:', payloadLog)
  console.log('received photos:', receivedLog)

  assert(selectedLog?.includes('3'), `expected selected files 3, got: ${selectedLog}`)
  assert(payloadLog?.includes('3'), `expected payload photos 3, got: ${payloadLog}`)
  assert(receivedLog?.includes('3'), `expected received photos 3, got: ${receivedLog}`)

  const gridImages = page.locator('img[src^="data:"]')
  const imgCount = await gridImages.count()
  console.log('visible data: images on results page:', imgCount)

  await page.getByRole('button', { name: /guardar|save|保存/i }).click()

  await page.waitForSelector('text=/guardado|saved|保存しました/i', { timeout: 30000 })

  const publishLog = logs.find((l) => l.includes('publishing photos'))
  const entriesBefore = logs.find((l) => l.includes('entries before'))
  const entriesAfter = logs.filter((l) => l.includes('entries after')).pop()

  console.log('publishing photos:', publishLog)
  console.log('entries before:', entriesBefore)
  console.log('entries after:', entriesAfter)

  assert(publishLog?.includes('3'), `expected publishing 3, got: ${publishLog}`)
  assert(entriesAfter, 'missing entries after log')

  await page.goto('http://localhost:5174/archive', { waitUntil: 'networkidle' })
  const archiveLog = logs.filter((l) => l.includes('archive entries')).pop()
  console.log('archive entries:', archiveLog)

  console.log('\n=== E2E PASSED ===')
  await browser.close()
}

main().catch((err) => {
  console.error('\n=== E2E FAILED ===', err.message)
  process.exit(1)
})

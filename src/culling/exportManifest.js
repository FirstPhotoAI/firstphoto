/**
 * Export-ready manifests for delivery workflows and automation.
 */

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function escapeCsv(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * @param {object[]} results
 * @param {object} meta
 */
export function buildExportPayload(results, meta) {
  const byVerdict = { keep: [], maybe: [], reject: [] }
  for (const row of results) {
    byVerdict[row.verdict]?.push(row)
  }

  return {
    version: 1,
    sessionId: meta.id,
    processedAt: meta.finishedAt,
    durationMs: meta.durationMs ?? null,
    totals: {
      total: meta.total,
      keep: meta.keep,
      maybe: meta.maybe,
      reject: meta.reject,
    },
    photos: results.map((r) => ({
      filename: r.name,
      verdict: r.verdict,
      rank: r.rank,
      flags: r.flags ?? [],
      signals: r.signals ?? {},
    })),
    lists: {
      keep: byVerdict.keep.map((r) => r.name),
      maybe: byVerdict.maybe.map((r) => r.name),
      reject: byVerdict.reject.map((r) => r.name),
    },
  }
}

export function downloadCsvManifest(results, meta) {
  const header = 'filename,verdict,rank,flags'
  const rows = results.map((r) =>
    [r.name, r.verdict, r.rank, (r.flags ?? []).join(';')]
      .map(escapeCsv)
      .join(',')
  )
  const csv = [header, ...rows].join('\n')
  const stamp = new Date(meta.finishedAt).toISOString().slice(0, 10)
  downloadBlob(`firstphoto-cull-${stamp}.csv`, new Blob([csv], { type: 'text/csv' }))
}

export function downloadJsonManifest(results, meta) {
  const payload = buildExportPayload(results, meta)
  const json = JSON.stringify(payload, null, 2)
  const stamp = new Date(meta.finishedAt).toISOString().slice(0, 10)
  downloadBlob(`firstphoto-cull-${stamp}.json`, new Blob([json], { type: 'application/json' }))
}

export function downloadVerdictLists(results) {
  const groups = { keep: [], maybe: [], reject: [] }
  for (const r of results) groups[r.verdict]?.push(r.name)

  for (const [verdict, names] of Object.entries(groups)) {
    const body = names.join('\n')
    downloadBlob(`firstphoto-${verdict}.txt`, new Blob([body], { type: 'text/plain' }))
  }
}

/** Store-only ZIP with Keep / Maybe / Reject manifest text files. */
export function downloadOrganizedZip(results, meta) {
  const payload = buildExportPayload(results, meta)
  const files = [
    { path: 'Keep/manifest.txt', content: payload.lists.keep.join('\n') },
    { path: 'Maybe/manifest.txt', content: payload.lists.maybe.join('\n') },
    { path: 'Reject/manifest.txt', content: payload.lists.reject.join('\n') },
    { path: 'manifest.csv', content: buildCsvString(results) },
    { path: 'manifest.json', content: JSON.stringify(payload, null, 2) },
  ]
  const zip = buildStoreZip(files)
  const stamp = new Date(meta.finishedAt).toISOString().slice(0, 10)
  downloadBlob(`firstphoto-cull-${stamp}.zip`, new Blob([zip], { type: 'application/zip' }))
}

function buildCsvString(results) {
  const header = 'filename,verdict,rank,flags'
  const rows = results.map((r) =>
    [r.name, r.verdict, r.rank, (r.flags ?? []).join(';')]
      .map(escapeCsv)
      .join(',')
  )
  return [header, ...rows].join('\n')
}

function crc32(bytes) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function u16(n) {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff])
}

function u32(n) {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff])
}

function buildStoreZip(files) {
  const enc = new TextEncoder()
  const parts = []
  const central = []
  let offset = 0

  for (const file of files) {
    const nameBytes = enc.encode(file.path)
    const dataBytes = enc.encode(file.content)
    const crc = crc32(dataBytes)

    const local = new Uint8Array(30 + nameBytes.length + dataBytes.length)
    local.set(u32(0x04034b50), 0)
    local.set(u16(20), 4)
    local.set(u16(0), 6)
    local.set(u16(0), 8)
    local.set(u16(0), 10)
    local.set(u16(0), 12)
    local.set(u32(crc), 14)
    local.set(u32(dataBytes.length), 18)
    local.set(u32(dataBytes.length), 22)
    local.set(u16(nameBytes.length), 26)
    local.set(u16(0), 28)
    local.set(nameBytes, 30)
    local.set(dataBytes, 30 + nameBytes.length)
    parts.push(local)

    const cd = new Uint8Array(46 + nameBytes.length)
    cd.set(u32(0x02014b50), 0)
    cd.set(u16(20), 4)
    cd.set(u16(20), 6)
    cd.set(u16(0), 8)
    cd.set(u16(0), 10)
    cd.set(u16(0), 12)
    cd.set(u16(0), 14)
    cd.set(u32(crc), 16)
    cd.set(u32(dataBytes.length), 20)
    cd.set(u32(dataBytes.length), 24)
    cd.set(u16(nameBytes.length), 28)
    cd.set(u16(0), 30)
    cd.set(u16(0), 32)
    cd.set(u16(0), 34)
    cd.set(u16(0), 36)
    cd.set(u32(0), 38)
    cd.set(u32(offset), 42)
    cd.set(nameBytes, 46)
    central.push(cd)

    offset += local.length
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  end.set(u32(0x06054b50), 0)
  end.set(u16(0), 4)
  end.set(u16(0), 6)
  end.set(u16(files.length), 8)
  end.set(u16(files.length), 10)
  end.set(u32(centralSize), 12)
  end.set(u32(offset), 16)
  end.set(u16(0), 20)

  const total = parts.reduce((s, p) => s + p.length, 0) + centralSize + end.length
  const out = new Uint8Array(total)
  let pos = 0
  for (const p of parts) { out.set(p, pos); pos += p.length }
  for (const c of central) { out.set(c, pos); pos += c.length }
  out.set(end, pos)
  return out
}

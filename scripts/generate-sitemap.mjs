/**
 * Sitemap generator — run after `ng build`.
 * Fetches all published decks from the API and writes sitemap.xml to dist/.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL = 'https://vtesdecks.com'
const API_BASE = 'https://api.vtesdecks.com/1.0'
const OUTPUT_FILE = join(__dirname, '..', 'dist', 'vtesDecksFront', 'sitemap.xml')
const BATCH_SIZE = 500

// ---------------------------------------------------------------------------
// Static pages
// ---------------------------------------------------------------------------
const STATIC_PAGES = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/decks', changefreq: 'hourly', priority: '0.9' },
    { loc: '/metagame', changefreq: 'weekly', priority: '0.8' },
    { loc: '/statistics', changefreq: 'weekly', priority: '0.7' },
    { loc: '/cards/crypt', changefreq: 'monthly', priority: '0.7' },
    { loc: '/cards/library', changefreq: 'monthly', priority: '0.7' },
    { loc: '/vtesdle', changefreq: 'daily', priority: '0.7' },
    { loc: '/advent', changefreq: 'yearly', priority: '0.5' },
    { loc: '/vtes-ai', changefreq: 'monthly', priority: '0.6' },
    { loc: '/proxy-generator', changefreq: 'monthly', priority: '0.5' },
    { loc: '/contact', changefreq: 'yearly', priority: '0.3' },
    { loc: '/changelog', changefreq: 'monthly', priority: '0.4' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function toW3cDate(date) {
    return new Date(date).toISOString().split('T')[0]
}

async function fetchDeckPage(offset, limit) {
    const url = `${API_BASE}/decks?offset=${offset}&limit=${limit}&type=TOURNAMENT`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`API error ${res.status} for ${url}`)
    return res.json()
}

async function fetchAllDeckIds() {
    console.log('Fetching deck list from API…')
    const decks = []

    // First request to get total
    const first = await fetchDeckPage(0, BATCH_SIZE)
    for (const d of first.decks) decks.push({ id: d.id, lastmod: d.modifyDate ?? d.creationDate })

    const total = first.total
    console.log(`Total tournament decks: ${total}`)

    let offset = BATCH_SIZE
    while (offset < total) {
        const page = await fetchDeckPage(offset, BATCH_SIZE)
        for (const d of page.decks) decks.push({ id: d.id, lastmod: d.modifyDate ?? d.creationDate })
        offset += BATCH_SIZE
        process.stdout.write(`\r  Fetched ${Math.min(offset, total)} / ${total}`)
    }

    // Also fetch community decks
    let communityOffset = 0
    process.stdout.write('\n')
    console.log('Fetching community decks…')
    while (true) {
        const url = `${API_BASE}/decks?offset=${communityOffset}&limit=${BATCH_SIZE}&type=COMMUNITY`
        const res = await fetch(url)
        if (!res.ok) break
        const page = await res.json()
        for (const d of page.decks) decks.push({ id: d.id, lastmod: d.modifyDate ?? d.creationDate })
        communityOffset += BATCH_SIZE
        process.stdout.write(`\r  Fetched ${Math.min(communityOffset, page.total)} / ${page.total}`)
        if (communityOffset >= page.total) break
    }
    process.stdout.write('\n')

    // Deduplicate by id
    const seen = new Set()
    return decks.filter((d) => {
        if (seen.has(d.id)) return false
        seen.add(d.id)
        return true
    })
}

// ---------------------------------------------------------------------------
// Build XML
// ---------------------------------------------------------------------------

function buildSitemap(staticPages, deckEntries) {
    const today = new Date().toISOString().split('T')[0]

    const staticXml = staticPages
        .map(
            (p) => `  <url>
    <loc>${escapeXml(BASE_URL + p.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
        )
        .join('\n')

    const deckXml = deckEntries
        .map(
            (d) => `  <url>
    <loc>${escapeXml(`${BASE_URL}/deck/${d.id}`)}</loc>
    <lastmod>${toW3cDate(d.lastmod)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
        )
        .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${deckXml}
</urlset>`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    let deckEntries = []
    try {
        deckEntries = await fetchAllDeckIds()
        console.log(`\nTotal unique deck URLs: ${deckEntries.length}`)
    } catch (err) {
        console.warn(`Warning: could not fetch decks from API — ${err.message}`)
        console.warn('Sitemap will be generated with static pages only.')
    }

    const xml = buildSitemap(STATIC_PAGES, deckEntries)
    mkdirSync(join(__dirname, '..', 'dist', 'vtesDecksFront'), { recursive: true })
    writeFileSync(OUTPUT_FILE, xml, 'utf8')
    console.log(`Sitemap written to ${OUTPUT_FILE}`)
    console.log(`Total URLs: ${STATIC_PAGES.length + deckEntries.length}`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})

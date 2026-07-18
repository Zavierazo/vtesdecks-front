#!/usr/bin/env node
/**
 * i18n drift guard.
 *
 * Flattens every locale JSON under src/assets/i18n and verifies that all
 * locales share the exact same set of keys. Exits non-zero (failing CI) when
 * any key is missing from, or extra in, a locale relative to the union of all
 * keys. The first locale in LANGS is treated as the reference for reporting.
 *
 * Usage: node scripts/check-i18n.js
 */
const fs = require('fs')
const path = require('path')

const I18N_DIR = path.join(__dirname, '..', 'src', 'assets', 'i18n')
const LANGS = ['en', 'es', 'fr', 'pt']

const flatten = (obj, prefix = '', acc = {}) => {
  for (const key of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, full, acc)
    } else {
      acc[full] = value
    }
  }
  return acc
}

// Root locale files plus one entry per lazy-loaded Transloco scope
// subdirectory (e.g. src/assets/i18n/tutorial/{en,es,fr,pt}.json).
const scopes = ['']
for (const entry of fs.readdirSync(I18N_DIR, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    scopes.push(entry.name)
  }
}

let hasError = false
let totalKeys = 0
for (const scope of scopes) {
  const data = {}
  for (const lang of LANGS) {
    const file = path.join(I18N_DIR, scope, `${lang}.json`)
    if (!fs.existsSync(file)) {
      hasError = true
      console.error(`\n✗ ${path.join(scope, `${lang}.json`)} is missing.`)
      continue
    }
    data[lang] = flatten(JSON.parse(fs.readFileSync(file, 'utf8')))
  }

  const allKeys = new Set()
  for (const lang of LANGS) {
    Object.keys(data[lang] ?? {}).forEach((k) => allKeys.add(k))
  }
  totalKeys += allKeys.size

  for (const lang of LANGS) {
    if (!data[lang]) {
      continue
    }
    const missing = [...allKeys].filter((k) => !(k in data[lang])).sort()
    if (missing.length) {
      hasError = true
      const label = path.join(scope, `${lang}.json`)
      console.error(`\n✗ ${label} is missing ${missing.length} key(s):`)
      missing.forEach((k) => console.error(`    ${k}`))
    }
  }
}

if (hasError) {
  console.error('\ni18n locales are out of sync. See keys above.\n')
  process.exit(1)
}

console.log(
  `✓ i18n locales in sync: ${LANGS.join('/')} — ${totalKeys} keys each across ${scopes.length} scope(s).`,
)

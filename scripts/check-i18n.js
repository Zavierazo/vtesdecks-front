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

const data = {}
for (const lang of LANGS) {
  const file = path.join(I18N_DIR, `${lang}.json`)
  data[lang] = flatten(JSON.parse(fs.readFileSync(file, 'utf8')))
}

const allKeys = new Set()
for (const lang of LANGS) {
  Object.keys(data[lang]).forEach((k) => allKeys.add(k))
}

let hasError = false
for (const lang of LANGS) {
  const missing = [...allKeys].filter((k) => !(k in data[lang])).sort()
  if (missing.length) {
    hasError = true
    console.error(`\n✗ ${lang}.json is missing ${missing.length} key(s):`)
    missing.forEach((k) => console.error(`    ${k}`))
  }
}

if (hasError) {
  console.error('\ni18n locales are out of sync. See keys above.\n')
  process.exit(1)
}

console.log(
  `✓ i18n locales in sync: ${LANGS.join('/')} — ${allKeys.size} keys each.`,
)

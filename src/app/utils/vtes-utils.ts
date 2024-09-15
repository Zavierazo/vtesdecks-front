import { ApiCard } from '../models/api-card'
import { ApiKrcgRuling } from '../models/krcg/api-krcg-ruling'
import { DISCIPLINE_LIST } from './disciplines'

export function isCrypt(value: ApiCard): boolean {
  return value.id >= 200000
}

export function isLibrary(value: ApiCard): boolean {
  return value.id < 200000
}

export function roundNumber(value: number, decimals: number): number {
  if (Number.isNaN(value)) {
    return value
  }
  return Number(Math.round(Number(`${value}e${decimals}`)) + `e-${decimals}`)
}

export function isChristmas() {
  const now = new Date()
  return (
    (now.getMonth() === 11 && now.getDate() > 20) ||
    (now.getMonth() === 0 && now.getDate() < 6)
  )
}

export const searchIncludes = (
  string: string,
  searchString: string,
): boolean => {
  let collator = new Intl.Collator('en', { sensitivity: 'base' })
  const searchStringLength = searchString.length
  const lengthDiff = string.length - searchString.length
  for (let i = 0; i <= lengthDiff; i++) {
    if (
      collator.compare(
        string.substring(i, i + searchStringLength),
        searchString,
      ) === 0
    ) {
      return true
    }
  }
  return false
}

export function formatRulingText(ruling: ApiKrcgRuling): string {
  let text = ruling.text
  ruling.references.forEach((reference) => {
    if (text.includes(reference.text)) {
      text = text.replace(
        reference.text,
        `<a class="text-decoration-none" href="${reference.url}" target="_blank">${reference.label}</a>`,
      )
    }
  })
  DISCIPLINE_LIST.forEach((discipline) => {
    const disciplineText = `[${discipline.abbrev}]`
    if (text.includes(disciplineText.toUpperCase())) {
      text = text.replace(
        disciplineText.toUpperCase(),
        `<i class="vtes vtes-small ${discipline.iconSuperior}"></i>`,
      )
    } else if (text.includes(disciplineText)) {
      text = text.replace(
        disciplineText,
        `<i class="vtes vtes-small ${discipline.icon}"></i>`,
      )
    }
  })
  text = text.replace(/\{(.*?)\}/g, '<span class="fw-semibold">$1</span>')
  return text
}

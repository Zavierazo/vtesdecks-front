import type { TokenizerAndRendererExtension } from 'marked'
import { Clan, getClanMarkdown } from './utils/clans'
import { Discipline, getDisciplineMarkdown } from './utils/disciplines'

export function bracketsExtension() {
  const cardBracketsExtension: TokenizerAndRendererExtension = {
    name: 'cardBrackets',
    level: 'inline',
    start(src: string) {
      const rule = /\[\[card:/
      return rule.exec(src)?.index
    },
    tokenizer(src: string) {
      const rule = /^\[\[card:([^\]]+)\]\]/
      const match = rule.exec(src)
      if (match) {
        return {
          type: 'cardBrackets',
          raw: match[0],
          text: match[1].trim(),
        }
      }
      return undefined
    },
    renderer(token) {
      //TODO fix
      return `<span class="fw-semibold card-bracket" title="${token['text']}" tabindex="0">${token['text']}</span>`
    },
  }

  const clanBracketsExtension: TokenizerAndRendererExtension = {
    name: 'clanBrackets',
    level: 'inline',
    start(src: string) {
      const rule = /\[\[clan:/
      return rule.exec(src)?.index
    },
    tokenizer(src: string) {
      const rule = /^\[\[clan:([^\]]+)\]\]/
      const match = rule.exec(src)
      if (match) {
        return {
          type: 'clanBrackets',
          raw: match[0],
          clan: getClanMarkdown(match[1].trim()),
        }
      }
      return undefined
    },
    renderer(token) {
      const clan = token['clan'] as Clan
      if (clan) {
        return `<i class="vtes ${clan.icon}" title="${clan.name}"></i>`
      } else {
        return token['raw']
      }
    },
  }

  const disciplineBracketsExtension: TokenizerAndRendererExtension = {
    name: 'disciplineBrackets',
    level: 'inline',
    start(src: string) {
      const rule = /\[\[discipline:/
      return rule.exec(src)?.index
    },
    tokenizer(src: string) {
      const rule = /^\[\[discipline:([^\]]+)\]\]/
      const match = rule.exec(src)
      if (match) {
        return {
          type: 'disciplineBrackets',
          raw: match[0],
          discipline: getDisciplineMarkdown(match[1].trim()),
        }
      }
      return undefined
    },
    renderer(token) {
      const discipline = token['discipline'] as Discipline
      if (discipline) {
        return `<i class="vtes ${discipline.icon}" title="${discipline.name}"></i>`
      } else {
        return token['raw']
      }
    },
  }

  return {
    extensions: [
      cardBracketsExtension,
      clanBracketsExtension,
      disciplineBracketsExtension,
    ],
  }
}

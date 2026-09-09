import type { TokenizerAndRendererExtension } from 'marked'
import { CryptQuery } from './state/crypt/crypt.query'
import { LibraryQuery } from './state/library/library.query'
import { Clan, getClanMarkdown } from './utils/clans'
import { Discipline, getDisciplineMarkdown } from './utils/disciplines'
import { normalizeText } from './utils/vtes-utils'
import { trigramSimilarity } from './utils/trigram-similarity'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function bracketsExtension(
  cryptQuery: CryptQuery,
  libraryQuery: LibraryQuery,
) {
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
      const cardName = token['text']
      const cryptCard = cryptQuery.getAll({
        filter: {
          name: cardName,
        },
        sortBy: 'trigramSimilarity',
        sortByOrder: 'desc',
      })

      const libraryCard = libraryQuery.getAll({
        filter: {
          name: cardName,
        },
        sortBy: 'trigramSimilarity',
        sortByOrder: 'desc',
      })

      // The name filter falls back to fuzzy trigram matching, so e.g. the
      // crypt card "Petra" also matches a search for "Petra Resonance". Prefer
      // an exact (normalized) name match before falling back to the best fuzzy
      // result, so the precise card always wins. Both crypt and library
      // candidates render the same way, so we pick across the merged list:
      // an exact match first, otherwise the highest trigram similarity overall
      // (rather than always preferring crypt over library).
      const candidates = [...cryptCard, ...libraryCard]
      const normalizedName = normalizeText(cardName)
      const card =
        candidates.find(
          (candidate) => normalizeText(candidate.name) === normalizedName,
        ) ??
        candidates.sort(
          (a, b) =>
            trigramSimilarity(b.name, cardName) -
            trigramSimilarity(a.name, cardName),
        )[0]

      if (card) {
        return `<app-markdown-card name="${escapeHtml(card.name)}" image="${escapeHtml(card.image ?? '')}"></app-markdown-card>`
      } else {
        return `<span class="fw-semibold">${escapeHtml(cardName)}</span>`
      }
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
        return `<i class="vtes ${escapeHtml(clan.icon)}" title="${escapeHtml(clan.name)}"></i>`
      } else {
        return escapeHtml(token['raw'])
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
        return `<i class="vtes ${escapeHtml(discipline.icon)}" title="${escapeHtml(discipline.name)}"></i>`
      } else {
        return escapeHtml(token['raw'])
      }
    },
  }

  const youtubeExtension: TokenizerAndRendererExtension = {
    name: 'youtubeBrackets',
    level: 'inline',
    start(src: string) {
      const rule = /\[\[youtube:/
      return rule.exec(src)?.index
    },
    tokenizer(src: string) {
      const rule = /^\[\[youtube:([^\]]+)\]\]/
      const match = rule.exec(src)
      if (match) {
        return {
          type: 'youtubeBrackets',
          raw: match[0],
          link: match[1].trim(),
        }
      }
      return undefined
    },
    renderer(token) {
      const videoId = token['link'] as string
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return escapeHtml(token['raw'])
      return `<iframe width="560" loading="lazy" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen="" class="mw-100"></iframe>`
    },
  }

  return {
    extensions: [
      cardBracketsExtension,
      clanBracketsExtension,
      disciplineBracketsExtension,
      youtubeExtension,
    ],
  }
}

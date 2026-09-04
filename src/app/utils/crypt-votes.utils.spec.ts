import { describe, expect, it } from 'vitest'
import { getCryptVotes, isCryptTitleInVotesRange } from './crypt-votes.utils'

describe('crypt votes utilities', () => {
  it.each([
    [undefined, 0],
    ['', 0],
    ['unknown future title', 0],
    ['1 vote', 1],
    ['primogen', 1],
    ['bishop', 1],
    ['2 votes', 2],
    ['prince', 2],
    ['archbishop', 2],
    ['baron', 2],
    ['magaji', 2],
    ['kholo', 2],
    ['justicar', 3],
    ['cardinal', 3],
    ['priscus', 3],
    ['inner circle', 4],
    ['regent', 4],
  ])('maps %s to %i votes', (title, votes) => {
    expect(getCryptVotes(title)).toBe(votes)
  })

  it('normalizes title casing and surrounding whitespace', () => {
    expect(getCryptVotes('  Inner Circle ')).toBe(4)
  })

  it('matches inclusive vote range boundaries', () => {
    expect(isCryptTitleInVotesRange('prince', [2, 3])).toBe(true)
    expect(isCryptTitleInVotesRange('priscus', [2, 3])).toBe(true)
    expect(isCryptTitleInVotesRange('inner circle', [2, 3])).toBe(false)
    expect(isCryptTitleInVotesRange(undefined, [0, 0])).toBe(true)
  })
})

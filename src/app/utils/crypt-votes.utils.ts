export const CRYPT_VOTES_RANGE = [0, 4] as const

const TITLE_VOTES: Readonly<Record<string, number>> = {
  '1 vote': 1,
  bishop: 1,
  primogen: 1,
  '2 votes': 2,
  archbishop: 2,
  baron: 2,
  kholo: 2,
  magaji: 2,
  prince: 2,
  cardinal: 3,
  justicar: 3,
  priscus: 3,
  'inner circle': 4,
  regent: 4,
}

/** Vote value represented by a crypt card's title. */
export function getCryptVotes(title?: string): number {
  if (!title) {
    return 0
  }
  return TITLE_VOTES[title.trim().toLowerCase()] ?? 0
}

export function isCryptTitleInVotesRange(
  title: string | undefined,
  range: readonly number[],
): boolean {
  const votes = getCryptVotes(title)
  return votes >= range[0] && votes <= range[1]
}

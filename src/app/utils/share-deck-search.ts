import { SearchParams } from '@models'

export function shareDeckSearch(
  params: SearchParams,
  username?: string,
): { params: SearchParams; omittedPersonal: boolean } {
  if (params['type'] !== 'USER') {
    return { params: { ...params }, omittedPersonal: false }
  }
  if (!username) {
    throw new Error('Cannot share My decks without an owner')
  }
  const shared = {
    ...params,
    type: 'ALL',
    username,
  } as SearchParams
  const omittedPersonal =
    params['favorite'] === 'true' ||
    params['collectionPercentage'] !== undefined
  delete shared['favorite']
  delete shared['collectionPercentage']
  return { params: shared, omittedPersonal }
}

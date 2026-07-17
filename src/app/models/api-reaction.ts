export type DeckReactionKey =
  | 'would_play'
  | 'tournament_worthy'
  | 'original_brew'
  | 'mind_blowing'
  | 'spicy'
  | 'too_greedy'

export type CommentReactionKey =
  | 'thumbs_up'
  | 'thumbs_down'
  | 'heart'
  | 'laugh'
  | 'wow'
  | 'thanks'
  | 'hundred'

export type ReactionKey = DeckReactionKey | CommentReactionKey

export interface ApiReactionSummary {
  reaction: ReactionKey
  count: number
  reacted: boolean
}

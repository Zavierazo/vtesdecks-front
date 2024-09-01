export interface ApiComment {
  id: number;
  deckId: string;
  created: Date;
  modified: Date;
  content: string;
  fullName: string;
  profileImage: string;
  createdByAdmin: boolean;
  createdByCurrentUser: boolean;
}

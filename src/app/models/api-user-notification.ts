export interface ApiUserNotification {
  id: number;
  read: boolean;
  type: string;
  notification: string;
  link: string;
  creationDate: Date;
}

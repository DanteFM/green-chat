export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export interface CheckAccountResult {
  exist: boolean;
  chatId: string;
  username?: string;
  phoneNumber?: number;
}

export interface SendMessageResult {
  idMessage: string;
}

export interface InstanceState {
  stateInstance?: string;
}

export interface SenderData {
  chatId: string;
  chatName?: string;
  sender?: string;
  senderName?: string;
  senderContactName?: string;
  senderPhoneNumber?: number;
}

export interface MessageData {
  typeMessage: string;
  textMessageData?: { textMessage?: string };
  extendedTextMessageData?: { text?: string };
}

export interface NotificationBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: SenderData;
  messageData?: MessageData;
}

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}

export interface MessengerApi {
  getStateInstance(signal?: AbortSignal): Promise<InstanceState>;
  checkAccount(phone: string, signal?: AbortSignal): Promise<CheckAccountResult>;
  sendMessage(chatId: string, text: string, signal?: AbortSignal): Promise<SendMessageResult>;
  receiveNotification(timeoutSec: number, signal?: AbortSignal): Promise<Notification | null>;
  deleteNotification(receiptId: number, signal?: AbortSignal): Promise<boolean>;
  dispose?(): void;
}

import { SNSHandler, SNSMessage } from 'aws-lambda';
import { log } from '../utils/logger';

interface TodoEvent {
  eventType: string;
  todoId: string;
  title?: string;
  status?: string;
  createdAt?: string;
  completedAt?: string;
}

function handleEvent(event: TodoEvent): void {
  switch (event.eventType) {
    case 'TODO_CREATED':
      log('INFO', 'Notification: new todo created', {
        eventType: event.eventType,
        todoId: event.todoId,
        title: event.title,
        createdAt: event.createdAt,
        // Production: trigger SES email / Firebase push notification here
      });
      break;

    case 'TODO_COMPLETED':
      log('INFO', 'Notification: todo marked completed', {
        eventType: event.eventType,
        todoId: event.todoId,
        title: event.title,
        completedAt: event.completedAt,
        // Production: trigger SES completion email / webhook here
      });
      break;

    default:
      log('WARN', 'Received unknown event type — no handler registered', {
        eventType: event.eventType,
        todoId: event.todoId,
      });
  }
}

export const handler: SNSHandler = async (event) => {
  for (const record of event.Records) {
    const snsMessage: SNSMessage = record.Sns;

    try {
      const payload = JSON.parse(snsMessage.Message) as TodoEvent;
      handleEvent(payload);
    } catch (err) {
      log('ERROR', 'Failed to parse SNS message', {
        messageId: snsMessage.MessageId,
        message: (err as Error).message,
      });
      // Do not throw — SNS retries are not useful for parse failures
    }
  }
};

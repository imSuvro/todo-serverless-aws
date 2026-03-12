import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { log } from './logger';

const snsClient = new SNSClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });

export async function publishEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const topicArn = process.env.TODO_EVENTS_TOPIC_ARN;
  if (!topicArn) {
    log('ERROR', 'TODO_EVENTS_TOPIC_ARN env var not set');
    return;
  }
  await snsClient.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify({ eventType, ...payload }),
      Subject: eventType,
    })
  );
}

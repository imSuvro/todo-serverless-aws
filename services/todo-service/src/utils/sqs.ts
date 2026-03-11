import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { log } from './logger';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });

export async function sendToTaskQueue(payload: Record<string, unknown>): Promise<void> {
  const queueUrl = process.env.TODO_TASK_QUEUE_URL;
  if (!queueUrl) {
    log('ERROR', 'TODO_TASK_QUEUE_URL env var not set');
    return;
  }
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    })
  );
}

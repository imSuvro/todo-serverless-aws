import { SQSHandler, SQSRecord } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { ddb, TABLE_NAME } from '../utils/dynamodb';
import { log } from '../utils/logger';

interface TaskPayload {
  todoId: string;
  title: string;
  createdAt: string;
}

async function processRecord(record: SQSRecord): Promise<void> {
  const messageId = record.messageId;
  let payload: TaskPayload;

  try {
    payload = JSON.parse(record.body) as TaskPayload;
  } catch {
    log('ERROR', 'Failed to parse SQS message body — skipping', { requestId: messageId });
    // Return without throwing: malformed messages should not block the queue
    return;
  }

  const { todoId } = payload;

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { todoId },
        UpdateExpression: 'SET #status = :inProgress, #processedAt = :processedAt',
        ConditionExpression: '#status = :pending AND attribute_exists(todoId)',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#processedAt': 'processedAt',
        },
        ExpressionAttributeValues: {
          ':inProgress': 'IN_PROGRESS',
          ':processedAt': new Date().toISOString(),
          ':pending': 'PENDING',
        },
      })
    );

    log('INFO', 'Task processed — status updated to IN_PROGRESS', {
      requestId: messageId,
      todoId,
    });
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      // Either todo was already processed (duplicate SQS delivery) or was deleted
      // Both are permanent — acknowledge the message, do not retry
      log('WARN', 'Conditional check failed — todo not in PENDING state or does not exist', {
        requestId: messageId,
        todoId,
      });
      return;
    }
    // Unexpected error — throw to trigger SQS retry and eventual DLQ routing
    log('ERROR', 'Unexpected error processing task', {
      requestId: messageId,
      todoId,
      message: (err as Error).message,
    });
    throw err;
  }
}

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

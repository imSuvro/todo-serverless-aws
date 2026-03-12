import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { ddb, TABLE_NAME } from '../utils/dynamodb';
import { sendToTaskQueue } from '../utils/sqs';
import { publishEvent } from '../utils/sns';
import { log } from '../utils/logger';
import { success, error } from '../utils/response';
import { CreateTodoInput, Todo } from '../types/todo';

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const requestId = context.awsRequestId;

  try {
    const body: CreateTodoInput = JSON.parse(event.body ?? '{}');

    if (!body.title || body.title.trim() === '') {
      return error(400, 'title is required');
    }

    const now = new Date().toISOString();
    const todo: Todo = {
      todoId: uuidv4(),
      title: body.title.trim(),
      description: body.description?.trim() ?? '',
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: todo }));

    log('INFO', 'Todo created', { requestId, todoId: todo.todoId });

    // Fire-and-forget: publish to SQS and SNS after successful DDB write.
    // Accepted partial failure window for assessment scope.
    // Production: use DynamoDB Streams or transactional outbox pattern.
    await sendToTaskQueue({ todoId: todo.todoId, title: todo.title, createdAt: todo.createdAt });
    await publishEvent('TODO_CREATED', {
      todoId: todo.todoId,
      title: todo.title,
      status: todo.status,
      createdAt: todo.createdAt,
    });

    return success(201, todo);
  } catch (err) {
    const e = err as Error;
    log('ERROR', 'Failed to create todo', { requestId, message: e.message, stack: e.stack });
    return error(500, 'Internal server error');
  }
};

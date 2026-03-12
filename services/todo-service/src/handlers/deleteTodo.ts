import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../utils/dynamodb';
import { log } from '../utils/logger';
import { success, error } from '../utils/response';

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const requestId = context.awsRequestId;
  const todoId = event.pathParameters?.id;

  if (!todoId) {
    return error(400, 'todoId is required');
  }

  try {
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { todoId } })
    );

    if (!existing.Item) {
      return error(404, 'Todo not found');
    }

    await ddb.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: { todoId } })
    );

    log('INFO', 'Todo deleted', { requestId, todoId });
    return success(200, { message: 'Todo deleted', todoId });
  } catch (err) {
    const e = err as Error;
    log('ERROR', 'Failed to delete todo', { requestId, todoId, message: e.message, stack: e.stack });
    return error(500, 'Internal server error');
  }
};

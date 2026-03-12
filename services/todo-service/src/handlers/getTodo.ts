import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
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
    const result = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { todoId } })
    );

    if (!result.Item) {
      log('WARN', 'Todo not found', { requestId, todoId });
      return error(404, 'Todo not found');
    }

    log('INFO', 'Todo retrieved', { requestId, todoId });
    return success(200, result.Item);
  } catch (err) {
    const e = err as Error;
    log('ERROR', 'Failed to get todo', { requestId, todoId, message: e.message, stack: e.stack });
    return error(500, 'Internal server error');
  }
};

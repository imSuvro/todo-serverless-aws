import { APIGatewayProxyHandler } from 'aws-lambda';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../utils/dynamodb';
import { log } from '../utils/logger';
import { success, error } from '../utils/response';

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const requestId = context.awsRequestId;

  try {
    const limitParam = event.queryStringParameters?.limit;
    const nextKeyParam = event.queryStringParameters?.nextKey;

    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const params: ScanCommandInput = {
      TableName: TABLE_NAME,
      Limit: limit,
    };

    if (nextKeyParam) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(nextKeyParam, 'base64').toString('utf8')
      );
    }

    const result = await ddb.send(new ScanCommand(params));

    const responseBody: Record<string, unknown> = {
      items: result.Items ?? [],
      count: result.Count ?? 0,
    };

    if (result.LastEvaluatedKey) {
      responseBody.nextKey = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey)
      ).toString('base64');
    }

    log('INFO', 'Todos listed', { requestId, count: result.Count });
    return success(200, responseBody);
  } catch (err) {
    const e = err as Error;
    log('ERROR', 'Failed to list todos', { requestId, message: e.message, stack: e.stack });
    return error(500, 'Internal server error');
  }
};

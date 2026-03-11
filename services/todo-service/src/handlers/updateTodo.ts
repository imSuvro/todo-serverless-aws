import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../utils/dynamodb';
import { publishEvent } from '../utils/sns';
import { log } from '../utils/logger';
import { success, error } from '../utils/response';
import { UpdateTodoInput, TodoStatus, isValidTransition } from '../types/todo';

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const requestId = context.awsRequestId;
  const todoId = event.pathParameters?.id;

  if (!todoId) {
    return error(400, 'todoId is required');
  }

  try {
    const body: UpdateTodoInput = JSON.parse(event.body ?? '{}');

    // Fetch current item to validate status transition
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { todoId } })
    );

    if (!existing.Item) {
      return error(404, 'Todo not found');
    }

    const currentStatus = existing.Item.status as TodoStatus;

    if (body.status && body.status !== currentStatus) {
      if (!isValidTransition(currentStatus, body.status)) {
        return error(
          400,
          `Invalid status transition from ${currentStatus} to ${body.status}`
        );
      }
    }

    const now = new Date().toISOString();
    const updateParts: string[] = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const expressionAttributeValues: Record<string, unknown> = { ':updatedAt': now };

    if (body.title) {
      updateParts.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = body.title.trim();
    }

    if (body.description !== undefined) {
      updateParts.push('#description = :description');
      expressionAttributeNames['#description'] = 'description';
      expressionAttributeValues[':description'] = body.description.trim();
    }

    if (body.status) {
      updateParts.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = body.status;
    }

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { todoId },
        UpdateExpression: `SET ${updateParts.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    const updated = result.Attributes;
    log('INFO', 'Todo updated', { requestId, todoId, newStatus: body.status });

    if (body.status === 'COMPLETED') {
      await publishEvent('TODO_COMPLETED', {
        todoId,
        title: updated?.title,
        status: 'COMPLETED',
        completedAt: now,
      });
    }

    return success(200, updated);
  } catch (err) {
    const e = err as Error;
    log('ERROR', 'Failed to update todo', { requestId, todoId, message: e.message, stack: e.stack });
    return error(500, 'Internal server error');
  }
};

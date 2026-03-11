export type TodoStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Todo {
  todoId: string;
  title: string;
  description: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
}

const VALID_TRANSITIONS: Record<TodoStatus, TodoStatus[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

export function isValidTransition(from: TodoStatus, to: TodoStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

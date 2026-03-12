[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Serverless](https://img.shields.io/badge/Serverless-v3-FD5750?logo=serverless&logoColor=white)](https://www.serverless.com/)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/lambda/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/imSuvro/todo-serverless-aws/blob/main/LICENSE)

This repository contains an event-driven Todo Management backend built as three independent serverless microservices. It is fully deployed on AWS (`ap-south-1`) and exposes a live API, with asynchronous workflows coordinated through SQS and SNS.

## Live API

```bash
https://6vil9pgf46.execute-api.ap-south-1.amazonaws.com/dev
```

```bash
curl -X POST "https://6vil9pgf46.execute-api.ap-south-1.amazonaws.com/dev/todos" -H "Content-Type: application/json" -d "{\"title\":\"Ship README\",\"description\":\"Validate live POST endpoint\"}"
```

The API is live — no setup required to test it.

## Architecture

```text
Client → API Gateway → Todo Service (Lambda) → DynamoDB
                                         → SQS → Task Processing Service (Lambda)
                                         → SNS → Notification Service (Lambda)
```


| Service                 | Trigger                | Responsibility                                                                          |
| ----------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| Todo Service            | API Gateway (HTTP)     | CRUD APIs, writes to DynamoDB, publishes SQS task messages, emits SNS domain events     |
| Task Processing Service | SQS queue subscription | Consumes task messages and transitions todo state (`PENDING` → `IN_PROGRESS`)           |
| Notification Service    | SNS topic subscription | Consumes domain events (`TODO_CREATED`, `TODO_COMPLETED`) and logs notification actions |


For the full architecture document — data model, event flows, IAM scoping, DLQ strategy, and design trade-offs — see the [Solution Architecture](./docs/SOLUTION_ARCHITECTURE.md).

## Project Structure

```text
.
├── .github/
│   └── workflows/                      # CI/CD workflow definitions
├── docs/
│   ├── screenshots/                    # Architecture and deployment evidence images
│   └── SOLUTION_ARCHITECTURE.md        # Detailed architecture and design decisions
├── postman/                            # Postman collection and environment for API testing
├── services/
│   ├── todo-service/
│   │   └── src/                        # API handlers, shared utilities, and todo domain types
│   ├── task-processing-service/
│   │   └── src/                        # SQS consumer logic and DynamoDB update flow
│   └── notification-service/
│       └── src/                        # SNS consumer logic and notification logging
├── .gitignore                          # Git ignore rules for node/serverless artifacts
└── README.md                           # Project overview, deployment guide, and testing links
```

## Deploy to Your Own AWS Account

### Prerequisites

- Node.js 18+
- npm
- Serverless Framework v3 (`npm install -g serverless`)
- AWS CLI configured with credentials that can manage Lambda, API Gateway, DynamoDB, SQS, and SNS

### Clone and install

```bash
git clone https://github.com/imSuvro/todo-serverless-aws.git
cd todo-serverless-aws/services/todo-service && npm install
cd ../task-processing-service && npm install
cd ../notification-service && npm install
```

### Deploy

```bash
cd services/todo-service && serverless deploy --stage dev --region ap-south-1
cd ../task-processing-service && serverless deploy --stage dev --region ap-south-1
cd ../notification-service && serverless deploy --stage dev --region ap-south-1
```

Each service manages its own CloudFormation stack. Environment variables (DynamoDB table name, SQS URL, SNS ARN) are injected automatically via `serverless.yml` — no `.env` file needed.

## Testing with Postman

[![Postman Collection](https://img.shields.io/badge/Postman-Collection-orange?logo=postman)](https://todo-serverless-assets-suvra.s3.ap-south-1.amazonaws.com/postman/todo-management-live-api.postman_collection.json)
[![Postman Environment](https://img.shields.io/badge/Postman-Environment-orange?logo=postman)](https://todo-serverless-assets-suvra.s3.ap-south-1.amazonaws.com/postman/todo-serverless-dev.postman_environment.json)

### Import and run

1. Download both files using the badges above.
2. Open Postman and click **Import** (top-left). Drag in both JSON files, or use **File → Import**.
3. In the top-right environment dropdown, select **todo-serverless-dev**. This sets `BASE_URL` to the live API endpoint.
4. Run **Create Todo** first — the post-response script automatically captures the returned `todoId` into the `TODO_ID` environment variable, so all subsequent requests (Get, Update, Delete) use it without manual copy-paste.
5. Recommended execution order:

| # | Request | What it verifies |
|---|---|---|
| 1 | Create Todo | `POST /todos` — returns `201`, auto-sets `TODO_ID` |
| 2 | List Todos | `GET /todos` — returns all items |
| 3 | Get Todo By ID | `GET /todos/{id}` — returns the created item |
| 4 | Update Todo Title | `PUT /todos/{id}` — partial update, returns `200` |
| 5 | Mark Todo Completed | `PUT /todos/{id}` — status transition `IN_PROGRESS → COMPLETED` |
| 6 | Delete Todo | `DELETE /todos/{id}` — removes the item |
| 7 | Create Todo - Missing Title | `POST /todos` — expects `400` validation error |
| 8 | Invalid Transition | `PUT /todos/{id}` — expects `400` for `COMPLETED → PENDING` |

### Environment variables

| Variable | Purpose | Set by |
|---|---|---|
| `BASE_URL` | Live API Gateway endpoint | Pre-configured in environment file |
| `TODO_ID` | ID of the most recently created todo | Auto-set by Create Todo post-response script |
| `COMPLETED_TODO_ID` | ID of a todo already in `COMPLETED` state | Pre-configured for invalid transition test |

## Live Demo and Screenshots

For live API links, deployment evidence, CloudWatch log samples, and architecture screenshots, see the [Assessment Submission Page](https://www.notion.so/Todo-Management-System-Live-Assessment-Submission-321cd9d248538152a812ca1308824a95?source=copy_link).
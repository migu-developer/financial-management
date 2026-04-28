# API Documentation Flow

## Overview

API documentation is generated as CloudFormation `DocumentationPart` and `DocumentationVersion` resources attached to the API Gateway REST API. This provides a built-in OpenAPI-compatible documentation layer that describes every endpoint, method, query parameter, request body, and response.

## How It Works

```
api-docs-stack.ts (CDK)
  |
  |-- Creates ApiDocumentation helper
  |-- Calls addResource() for each endpoint group
  |     |-- Creates CfnDocumentationPart (RESOURCE type) for the path
  |     |-- Creates CfnDocumentationPart (METHOD type) for each HTTP method
  |
  |-- Calls createVersion('1.0.0') at the end
  |     |-- Creates CfnDocumentationVersion
  |
  v
API Gateway (CloudFormation)
  |-- DocumentationParts attached to the REST API
  |-- DocumentationVersion "1.0.0" published
  |
  v
Exportable via AWS Console or CLI:
  aws apigateway get-export --rest-api-id {id} --stage-name prod --export-type swagger --accepts application/json
```

## Documented Endpoints

| Resource               | Methods                 | Description                                      |
| ---------------------- | ----------------------- | ------------------------------------------------ |
| `/`                    | -                       | API root description                             |
| `/expenses`            | GET, POST               | List expenses (paginated), create expense        |
| `/expenses/{id}`       | GET, PUT, PATCH, DELETE | Single expense CRUD operations                   |
| `/expenses/types`      | GET                     | Expense type catalog (income/outcome)            |
| `/expenses/categories` | GET                     | Expense category catalog                         |
| `/users`               | POST                    | Create user (called by Cognito PostConfirmation) |
| `/users/{id}`          | GET, PATCH              | Get/update user profile by UID                   |
| `/currencies`          | GET                     | List all supported currencies                    |
| `/documents`           | GET                     | List all document types (CC, CE, Passport, NIT)  |

## Documentation Parts Structure

Each endpoint generates two types of documentation parts:

### RESOURCE part (path-level)

```json
{
  "location": { "type": "RESOURCE", "path": "/expenses" },
  "properties": { "description": "Manage user expenses (income/outcome)" }
}
```

### METHOD part (per HTTP method)

```json
{
  "location": { "type": "METHOD", "path": "/expenses", "method": "GET" },
  "properties": {
    "description": "List expenses for the authenticated user (paginated)",
    "queryParameters": [
      {
        "name": "limit",
        "description": "Max items per page (1-100, default 20)"
      },
      {
        "name": "cursor",
        "description": "Pagination cursor from previous response"
      }
    ],
    "responses": {
      "200": "Paginated list of expenses with next_cursor and has_more"
    }
  }
}
```

For POST/PUT/PATCH methods, a `requestBody` field describes the expected schema:

```json
{
  "location": { "type": "METHOD", "path": "/expenses", "method": "POST" },
  "properties": {
    "description": "Create a new expense for the authenticated user",
    "requestBody": "CreateExpense schema: name, value, currency_id, expense_type_id, expense_category_id (optional)"
  }
}
```

## Versioning

Documentation is versioned with `CfnDocumentationVersion`:

| Version | Description               |
| ------- | ------------------------- |
| `1.0.0` | Initial API documentation |

New versions should be created when endpoints are added or modified.

## Exporting Documentation

### Via AWS CLI

```bash
# Export as Swagger/OpenAPI JSON
aws apigateway get-export \
  --rest-api-id $(aws apigateway get-rest-apis --query "items[?name=='FinancialManagement-v2-ApiGateway'].id" --output text) \
  --stage-name prod \
  --export-type swagger \
  --accepts application/json \
  output.json

# Export as OpenAPI 3.0
aws apigateway get-export \
  --rest-api-id {id} \
  --stage-name prod \
  --export-type oas30 \
  --accepts application/json \
  output.json
```

### Via AWS Console

1. Go to API Gateway > APIs > FinancialManagement-v2-ApiGateway
2. Click "Documentation" in the left menu
3. Select version "1.0.0"
4. Click "Publish Documentation"
5. Or export as Swagger/OpenAPI from the "Stages" section

## Cross-Stack Dependencies

```
v2 API Gateway (REST API)
  |
  v
v2 API Docs (DocumentationParts + Version)
```

The ApiDocsStack requires the ApiGatewayStack to exist first, as it attaches documentation parts to the REST API resource.

## Related Code

| Component            | Path                                           |
| -------------------- | ---------------------------------------------- |
| API Docs CDK stack   | `infra/lib/versions/v2/api-docs-stack.ts`      |
| Documentation helper | `infra/lib/versions/v2/api-docs.ts`            |
| API Docs tests       | `infra/lib/versions/v2/api-docs-stack.test.ts` |
| API Gateway stack    | `infra/lib/versions/v2/api-gateway-stack.ts`   |

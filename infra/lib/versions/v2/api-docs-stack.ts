import { BaseStack, BaseStackProps } from '@core/base-stack';
import type { StackDeps } from '@utils/types';
import { Construct } from 'constructs';
import { ApiGatewayStack } from './api-gateway-stack';
import { ActiveStack } from './stacks';
import { ApiDocumentation } from './api-docs';

export interface ApiDocsStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
}

export class ApiDocsStack extends BaseStack {
  constructor(scope: Construct, id: string, props: ApiDocsStackProps) {
    const { version, stackName, description, deps } = props;
    super(scope, id, { version, stackName, description });

    const gateway = deps?.getStack(ActiveStack.API_GATEWAY) as ApiGatewayStack;
    const docs = new ApiDocumentation(this, gateway.api, stackName);

    // ── API-level documentation ──────────────────────────
    docs.addResource({
      path: '/',
      description:
        'Financial Management REST API — expenses, users, currencies, documents',
      methods: [],
    });

    // ── Expenses ─────────────────────────────────────────
    docs.addResource({
      path: '/expenses',
      description: 'Manage user expenses (income/outcome)',
      methods: [
        {
          method: 'GET',
          description: 'List expenses for the authenticated user (paginated)',
          queryParameters: [
            {
              name: 'limit',
              description: 'Max items per page (1-100, default 20)',
            },
            {
              name: 'cursor',
              description: 'Pagination cursor from previous response',
            },
          ],
          responses: {
            '200': 'Paginated list of expenses with next_cursor and has_more',
          },
        },
        {
          method: 'POST',
          description: 'Create a new expense for the authenticated user',
          requestBody:
            'CreateExpense schema: name, value, currency_id, expense_type_id, expense_category_id (optional)',
        },
      ],
    });

    docs.addResource({
      path: '/expenses/{id}',
      description: 'Operations on a single expense by ID',
      methods: [
        { method: 'GET', description: 'Get a single expense by ID' },
        {
          method: 'PUT',
          description: 'Full update of an expense',
          requestBody: 'UpdateExpense schema',
        },
        {
          method: 'PATCH',
          description: 'Partial update of an expense',
          requestBody: 'PatchExpense schema (minProperties: 1)',
        },
        { method: 'DELETE', description: 'Delete an expense by ID' },
      ],
    });

    docs.addResource({
      path: '/expenses/types',
      description: 'Expense type catalog (income/outcome)',
      methods: [{ method: 'GET', description: 'List all expense types' }],
    });

    docs.addResource({
      path: '/expenses/categories',
      description: 'Expense category catalog',
      methods: [{ method: 'GET', description: 'List all expense categories' }],
    });

    // ── Users ────────────────────────────────────────────
    docs.addResource({
      path: '/users',
      description: 'User management (registration and profile)',
      methods: [
        {
          method: 'POST',
          description:
            'Create a new user (called by Cognito PostConfirmation trigger)',
          requestBody:
            'CreateUser schema: uid, email (required), first_name, last_name, locale, picture, phone, identities, provider_id (optional)',
        },
      ],
    });

    docs.addResource({
      path: '/users/{id}',
      description: 'Operations on a single user profile by UID',
      methods: [
        { method: 'GET', description: 'Get user profile by UID' },
        {
          method: 'PATCH',
          description: 'Update user profile',
          requestBody:
            'PatchUser schema: first_name, last_name, locale, picture, phone, document_id (minProperties: 1)',
        },
      ],
    });

    // ── Currencies ───────────────────────────────────────
    docs.addResource({
      path: '/currencies',
      description: 'Currency catalog',
      methods: [
        { method: 'GET', description: 'List all supported currencies' },
      ],
    });

    // ── Documents ────────────────────────────────────────
    docs.addResource({
      path: '/documents',
      description: 'Document type catalog',
      methods: [
        {
          method: 'GET',
          description: 'List all document types (CC, CE, Passport, NIT)',
        },
      ],
    });

    // ── Documentation Version ────────────────────────────
    docs.createVersion('1.0.0', 'Initial API documentation');
  }
}

import {
  CfnDocumentationPart,
  CfnDocumentationVersion,
  type RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import type { Construct } from 'constructs';

export interface DocMethod {
  method: string;
  description: string;
  queryParameters?: Array<{ name: string; description: string }>;
  requestBody?: string;
  responses?: Record<string, string>;
}

export interface DocResource {
  path: string;
  description: string;
  methods: DocMethod[];
}

export class ApiDocumentation {
  constructor(
    private readonly scope: Construct,
    private readonly api: RestApi,
    private readonly prefix: string,
  ) {}

  private toStableId(path: string, suffix?: string): string {
    const sanitized = path
      .replace(/\//g, '-')
      .replace(/[{}]/g, '')
      .replace(/^-/, '');
    const base = sanitized || 'root';
    return `${this.prefix}-${base}${suffix ? `-${suffix}` : ''}`;
  }

  addResource(doc: DocResource): void {
    const resourceId = this.toStableId(doc.path, 'Resource');
    new CfnDocumentationPart(this.scope, resourceId, {
      restApiId: this.api.restApiId,
      location: { type: 'RESOURCE', path: doc.path },
      properties: JSON.stringify({ description: doc.description }),
    });

    for (const method of doc.methods) {
      const methodId = this.toStableId(doc.path, method.method);
      const properties: Record<string, unknown> = {
        description: method.description,
      };
      if (method.queryParameters) {
        properties['queryParameters'] = method.queryParameters;
      }
      if (method.requestBody) {
        properties['requestBody'] = method.requestBody;
      }
      if (method.responses) {
        properties['responses'] = method.responses;
      }

      new CfnDocumentationPart(this.scope, methodId, {
        restApiId: this.api.restApiId,
        location: { type: 'METHOD', path: doc.path, method: method.method },
        properties: JSON.stringify(properties),
      });
    }
  }

  createVersion(versionId: string, description: string): void {
    new CfnDocumentationVersion(this.scope, `${this.prefix}-DocsVersion`, {
      restApiId: this.api.restApiId,
      documentationVersion: versionId,
      description,
    });
  }
}

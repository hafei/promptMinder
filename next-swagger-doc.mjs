import { createSwaggerSpec } from 'next-swagger-doc';

const apiSpec = createSwaggerSpec({
  apiFolder: 'pages/api', // API路由文件夹
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PromptMinder API',
      version: '1.0.0',
      description: 'API for programmatically accessing team prompts and related resources',
      contact: {
        name: 'PromptMinder Support',
        url: 'https://promptminder.com/support',
        email: 'api@promptminder.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://promptminder.com/api/v1',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Prompts',
        description: 'Prompt management operations'
      },
      {
        name: 'Projects',
        description: 'Project management operations'
      },
      {
        name: 'Tags',
        description: 'Tag management operations'
      },
      {
        name: 'API Keys Management',
        description: 'API key management operations (internal use)'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'pmk_your_api_key_here',
          description: 'Use your team API key to authenticate requests'
        }
      },
      schemas: {
        Prompt: {
          type: 'object',
          required: ['id', 'title', 'content', 'team_id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the prompt'
            },
            title: {
              type: 'string',
              description: 'Title of the prompt',
              example: 'Marketing Email Template'
            },
            content: {
              type: 'string',
              description: 'The actual prompt content',
              example: 'Write a professional marketing email...'
            },
            description: {
              type: 'string',
              description: 'Optional description of the prompt',
              nullable: true
            },
            team_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the team that owns this prompt'
            },
            project_id: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID of the project this prompt belongs to'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Tags associated with the prompt',
              example: ['marketing', 'email', 'template']
            },
            is_public: {
              type: 'boolean',
              description: 'Whether the prompt is publicly visible',
              default: false
            },
            version: {
              type: 'integer',
              description: 'Version number of the prompt',
              default: 1
            },
            cover_img: {
              type: 'string',
              description: 'Cover image URL',
              nullable: true
            },
            created_by: {
              type: 'string',
              description: 'ID of the user who created the prompt'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the prompt was created'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the prompt was last updated'
            }
          }
        },
        Project: {
          type: 'object',
          required: ['id', 'name', 'team_id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the project'
            },
            name: {
              type: 'string',
              description: 'Name of the project',
              example: 'Marketing Campaigns'
            },
            description: {
              type: 'string',
              description: 'Description of the project',
              nullable: true
            },
            team_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the team that owns this project'
            },
            created_by: {
              type: 'string',
              description: 'ID of the user who created the project'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the project was created'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the project was last updated'
            }
          }
        },
        Tag: {
          type: 'object',
          required: ['id', 'name', 'team_id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the tag'
            },
            name: {
              type: 'string',
              description: 'Name of the tag',
              example: 'marketing'
            },
            team_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the team that owns this tag'
            },
            user_id: {
              type: 'string',
              description: 'ID of the user who created the tag'
            },
            created_by: {
              type: 'string',
              description: 'ID of the user who created the tag'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the tag was created'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the tag was last updated'
            }
          }
        },
        Error: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            },
            error_code: {
              type: 'string',
              description: 'Machine-readable error code',
              example: 'INVALID_API_KEY'
            },
            details: {
              type: 'string',
              description: 'Additional error details',
              nullable: true
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of the error'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page number',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  description: 'Number of items per page',
                  example: 20
                },
                total: {
                  type: 'integer',
                  description: 'Total number of items',
                  example: 150
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total number of pages',
                  example: 8
                },
                hasNextPage: {
                  type: 'boolean',
                  description: 'Whether there is a next page',
                  example: true
                },
                hasPrevPage: {
                  type: 'boolean',
                  description: 'Whether there is a previous page',
                  example: false
                }
              }
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing API key',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    externalDocs: {
      description: 'PromptMinder API Documentation',
      url: 'https://promptminder.com/api-docs'
    }
  }
});

export default apiSpec;
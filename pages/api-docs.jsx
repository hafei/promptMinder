import React from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-dist/swagger-ui.css';
import Head from 'next/head';

// Dynamically import SwaggerUI with SSR disabled to avoid 'window' issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

// 自定义Swagger UI配置
const swaggerUIOptions = {
  docExpansion: 'list', // 默认展开所有端点
  operationsSorter: 'alpha', // 按字母顺序排序操作
  tagsSorter: 'alpha', // 按字母顺序排序标签
  tryItOutEnabled: true, // 启用"Try it out"功能
  defaultModelsExpandDepth: 2, // 默认展开模型
  displayRequestDuration: true, // 显示请求时长
  filter: true, // 启用搜索过滤
  persistAuthorization: true, // 持久化授权信息
  displayOperationId: false, // 不显示操作ID
  showExtensions: true, // 显示扩展
  showCommonExtensions: true, // 显示常见扩展
  deepLinking: true, // 启用深度链接
  supportedSubmitMethods: ['get', 'post', 'put', 'delete'], // 支持的提交方法
};

export default function ApiDocs({ apiSpec }) {
  return (
    <>
      <Head>
        <title>PromptMinder API Documentation</title>
        <meta name="description" content="PromptMinder API documentation" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* API文档标题和说明 */}
          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
              PromptMinder API Documentation
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#666' }}>
              通过API访问和管理您的团队prompts
            </p>
          </div>

          {/* 快速开始指南 */}
          <div style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>快速开始</h2>
            <ol style={{ lineHeight: '1.8' }}>
              <li>在团队管理页面创建API Key</li>
              <li>使用您的API Key进行认证：
                <pre style={{
                  background: '#fff',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '5px',
                  overflow: 'auto'
                }}>
                  <code>Authorization: Bearer pmk_your_api_key_here</code>
                </pre>
              </li>
              <li>开始调用API端点</li>
            </ol>
          </div>

          {/* Swagger UI */}
          {apiSpec && <SwaggerUI spec={apiSpec} {...swaggerUIOptions} />}

          {/* 额外信息 */}
          {/* <div style={{
            marginTop: '50px',
            padding: '20px',
            background: '#fff',
            border: '1px solid #e1e5e9',
            borderRadius: '8px'
          }}>
            <h3>需要帮助？</h3>
            <ul>
              <li>查看<a href="/docs" style={{ color: '#007bff' }}>完整文档</a></li>
              <li>联系<a href="mailto:api@promptminder.com" style={{ color: '#007bff' }}>API支持</a></li>
              <li>访问我们的<a href="https://github.com/promptminder" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>GitHub仓库</a></li>
            </ul>

            <h3 style={{ marginTop: '20px' }}>SDK和示例</h3>
            <p>我们提供多种语言的SDK和示例代码：</p>
            <ul>
              <li><a href="#javascript">JavaScript/Node.js</a></li>
              <li><a href="#python">Python</a></li>
              <li><a href="#curl">cURL</a></li>
              <li><a href="#postman">Postman Collection</a></li>
            </ul>
          </div> */}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  // Import and call createSwaggerSpec at request time to ensure dynamic scanning
  const { createSwaggerSpec } = await import('next-swagger-doc');

  const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const apiSpec = createSwaggerSpec({
    apiFolder: 'pages/api', // API路由文件夹
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'PromptMinder API',
        version: '0.1.1',
        // description: 'API for programmatically accessing team prompts and related resources',
        // contact: {
        //   name: 'PromptMinder Support',
        //   url: 'https://promptminder.com/support',
        //   email: 'api@promptminder.com'
        // },
        // license: {
        //   name: 'MIT',
        //   url: 'https://opensource.org/licenses/MIT'
        // }
      },
      servers: [
        {
          url: `${baseUrl}/api/v1`,
          description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
        }
      ],
      tags: [
        {
          name: 'Prompts',
          description: 'Prompt management operations'
        },
        // {
        //   name: 'Projects',
        //   description: 'Project management operations'
        // },
        // {
        //   name: 'Tags',
        //   description: 'Tag management operations'
        // },
        // {
        //   name: 'API Keys Management',
        //   description: 'API key management operations (internal use)'
        // }
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
              id: { type: 'string', format: 'uuid', description: 'Unique identifier for the prompt' },
              title: { type: 'string', description: 'Title of the prompt', example: 'Marketing Email Template' },
              content: { type: 'string', description: 'The actual prompt content', example: 'Write a professional marketing email...' },
              description: { type: 'string', description: 'Optional description of the prompt', nullable: true },
              team_id: { type: 'string', format: 'uuid', description: 'ID of the team that owns this prompt' },
              project_id: { type: 'string', format: 'uuid', nullable: true, description: 'ID of the project this prompt belongs to' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Tags associated with the prompt', example: ['marketing', 'email', 'template'] },
              is_public: { type: 'boolean', description: 'Whether the prompt is publicly visible', default: false },
              version: { type: 'integer', description: 'Version number of the prompt', default: 1 },
              cover_img: { type: 'string', description: 'Cover image URL', nullable: true },
              created_by: { type: 'string', description: 'ID of the user who created the prompt' },
              created_at: { type: 'string', format: 'date-time', description: 'Timestamp when the prompt was created' },
              updated_at: { type: 'string', format: 'date-time', description: 'Timestamp when the prompt was last updated' }
            }
          },
          Project: {
            type: 'object',
            required: ['id', 'name', 'team_id'],
            properties: {
              id: { type: 'string', format: 'uuid', description: 'Unique identifier for the project' },
              name: { type: 'string', description: 'Name of the project', example: 'Marketing Campaigns' },
              description: { type: 'string', description: 'Description of the project', nullable: true },
              team_id: { type: 'string', format: 'uuid', description: 'ID of the team that owns this project' },
              created_by: { type: 'string', description: 'ID of the user who created the project' },
              created_at: { type: 'string', format: 'date-time', description: 'Timestamp when the project was created' },
              updated_at: { type: 'string', format: 'date-time', description: 'Timestamp when the project was last updated' }
            }
          },
          Tag: {
            type: 'object',
            required: ['id', 'name', 'team_id'],
            properties: {
              id: { type: 'string', format: 'uuid', description: 'Unique identifier for the tag' },
              name: { type: 'string', description: 'Name of the tag', example: 'marketing' },
              team_id: { type: 'string', format: 'uuid', description: 'ID of the team that owns this tag' },
              user_id: { type: 'string', description: 'ID of the user who created the tag' },
              created_by: { type: 'string', description: 'ID of the user who created the tag' },
              created_at: { type: 'string', format: 'date-time', description: 'Timestamp when the tag was created' },
              updated_at: { type: 'string', format: 'date-time', description: 'Timestamp when the tag was last updated' }
            }
          },
          Error: {
            type: 'object',
            required: ['success', 'error'],
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', description: 'Error message' },
              error_code: { type: 'string', description: 'Machine-readable error code', example: 'INVALID_API_KEY' },
              details: { type: 'string', description: 'Additional error details', nullable: true },
              timestamp: { type: 'string', format: 'date-time', description: 'Timestamp of the error' }
            }
          },
          Pagination: {
            type: 'object',
            properties: {
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer', description: 'Current page number', example: 1 },
                  limit: { type: 'integer', description: 'Number of items per page', example: 20 },
                  total: { type: 'integer', description: 'Total number of items', example: 150 },
                  totalPages: { type: 'integer', description: 'Total number of pages', example: 8 },
                  hasNextPage: { type: 'boolean', description: 'Whether there is a next page', example: true },
                  hasPrevPage: { type: 'boolean', description: 'Whether there is a previous page', example: false }
                }
              }
            }
          }
        },
        responses: {
          Unauthorized: {
            description: 'Unauthorized - Invalid or missing API key',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          },
          Forbidden: {
            description: 'Forbidden - Insufficient permissions',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          },
          InternalServerError: {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          }
        }
      },
      security: [{ BearerAuth: [] }],
      // externalDocs: {
      //   description: 'PromptMinder API Documentation',
      //   url: 'https://promptminder.com/api-docs'
      // }
    }
  });

  return {
    props: {
      apiSpec
    }
  };
}
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
          <div style={{
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
          </div>
        </div>
      </div>
    </>
  );
}

export async function getStaticProps() {
  // Import swagger spec at build time only (server-side)
  const { default: apiSpec } = await import('../next-swagger-doc.mjs');
  return {
    props: {
      apiSpec
    }
  };
}
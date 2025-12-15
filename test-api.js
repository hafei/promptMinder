#!/usr/bin/env node

/**
 * PromptMinder API 测试脚本
 * 用于测试 API 的基本功能
 */

const https = require('https');
const http = require('http');

// 配置
const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
  apiKey: process.env.API_KEY || null
};

// 辅助函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = protocol.request(url, requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// 测试函数
async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 测试: ${name}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await makeRequest(config.baseUrl + url, options);

    if (response.status >= 200 && response.status < 300) {
      console.log(`   ✅ 成功 (${response.status})`);

      if (options.showData) {
        console.log('   响应数据:', JSON.stringify(response.data, null, 2));
      } else if (response.data.data) {
        console.log(`   返回 ${response.data.data.length || 0} 条记录`);
        if (response.data.meta?.pagination) {
          const { pagination } = response.data.meta;
          console.log(`   分页: 第 ${pagination.page} 页，共 ${pagination.totalPages} 页`);
        }
      }
    } else {
      console.log(`   ❌ 失败 (${response.status})`);
      console.log('   错误:', response.data.error || response.data);
    }
  } catch (error) {
    console.log(`   ❌ 请求失败: ${error.message}`);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 PromptMinder API 测试开始\n');
  console.log(`基础URL: ${config.baseUrl}`);
  console.log(`API Key: ${config.apiKey ? '已设置' : '未设置'}\n`);

  // 检查 API Key
  if (!config.apiKey) {
    console.log('⚠️  警告: 未设置 API_KEY 环境变量');
    console.log('   请设置: export API_KEY="pmk_your_api_key_here"\n');

    // 测试无认证的请求
    await testEndpoint('无认证请求 - 获取 Prompts', '/prompts', { showData: true });
    return;
  }

  // 测试获取 Prompts
  await testEndpoint('获取所有 Prompts', '/prompts');

  // 测试带分页的请求
  await testEndpoint('获取 Prompts (第1页, 5条)', '/prompts?page=1&limit=5');

  // 测试搜索功能
  await testEndpoint('搜索 Prompts (关键词: test)', '/prompts?search=test');

  // 测试标签过滤
  await testEndpoint('按标签过滤 Prompts', '/prompts?tags=test,demo');

  // 测试排序
  await testEndpoint('按更新时间排序', '/prompts?sort=updated_at&order=desc');

  // 测试获取 Projects
  await testEndpoint('获取所有 Projects', '/projects');

  // 测试获取 Tags
  await testEndpoint('获取所有 Tags', '/tags');

  // 测试获取第一个 Prompt（如果有的话）
  try {
    const promptsResponse = await makeRequest(config.baseUrl + '/prompts?limit=1');
    if (promptsResponse.status === 200 && promptsResponse.data.data?.length > 0) {
      const promptId = promptsResponse.data.data[0].id;
      await testEndpoint(`获取单个 Prompt (ID: ${promptId.substring(0, 8)}...)`, `/prompts/${promptId}`);
    }
  } catch (e) {
    // 忽略错误
  }

  console.log('\n✨ 测试完成！');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { makeRequest, testEndpoint, runTests };
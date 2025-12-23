/**
 * 邮件服务测试服务器
 * 运行在 8081 端口，接收并验证邮件请求
 * 
 * 启动: node test-email-server.js
 * 访问: http://localhost:8081/
 */

const http = require('http');
const url = require('url');

// 邮件日志存储
const emailLogs = [];

// 创建服务器
const server = http.createServer((req, res) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // 设置 CORS 响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 首页 - 显示邮件日志
  if (pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderDashboard());
    return;
  }

  // API: 获取所有邮件日志
  if (pathname === '/api/logs' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(emailLogs, null, 2));
    return;
  }

  // API: 获取邮件详情
  if (pathname.startsWith('/api/logs/') && req.method === 'GET') {
    const messageId = pathname.replace('/api/logs/', '');
    const emailLog = emailLogs.find(log => log.id === messageId);
    
    if (!emailLog) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '邮件未找到' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(emailLog, null, 2));
    return;
  }

  // 邮件详情页面
  if (pathname.startsWith('/view/') && req.method === 'GET') {
    const messageId = pathname.replace('/view/', '');
    const emailLog = emailLogs.find(log => log.id === messageId);
    
    if (!emailLog) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>邮件未找到</h1>');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderEmailDetail(emailLog));
    return;
  }

  // API: 清空邮件日志
  if (pathname === '/api/logs' && req.method === 'DELETE') {
    emailLogs.length = 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: '邮件日志已清空' }));
    return;
  }

  // 邮件接收端点
  if (pathname === '/message/normal/no-attach' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        // 验证必填字段
        const errors = [];
        if (!payload.type) errors.push('缺少 type 字段');
        if (!payload.from) errors.push('缺少 from 字段');
        if (!payload.userName) errors.push('缺少 userName 字段');
        if (!payload.password) errors.push('缺少 password 字段');
        if (!payload.receivers || payload.receivers.length === 0) errors.push('缺少 receivers 字段或为空');
        if (!payload.subject) errors.push('缺少 subject 字段');
        if (!payload.content) errors.push('缺少 content 字段');

        const emailLog = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          received: true,
          payload,
          validation: {
            valid: errors.length === 0,
            errors
          }
        };

        emailLogs.unshift(emailLog);

        // 限制日志条数
        if (emailLogs.length > 100) {
          emailLogs.pop();
        }

        console.log('\n✅ 收到邮件请求:');
        console.log('时间:', emailLog.timestamp);
        console.log('ID:', emailLog.id);
        console.log('发件人:', payload.from);
        console.log('收件人:', payload.receivers);
        console.log('主题:', payload.subject);
        console.log('内容预览:', payload.content.substring(0, 100) + (payload.content.length > 100 ? '...' : ''));
        console.log('业务场景:', payload.bizScene);
        console.log('验证状态:', errors.length === 0 ? '✓ 有效' : '✗ 无效');
        if (errors.length > 0) {
          console.log('错误信息:', errors);
        }
        console.log('---\n');

        // 返回成功响应
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          messageId: emailLog.id,
          message: '邮件已接收',
          timestamp: emailLog.timestamp
        }));
      } catch (error) {
        console.error('错误:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: '请求体解析失败',
          details: error.message
        }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: '找不到请求的端点',
    path: pathname,
    method: req.method
  }));
});

// 生成仪表板 HTML
function renderDashboard() {
  const emailCount = emailLogs.length;
  const validCount = emailLogs.filter(log => log.validation.valid).length;
  const invalidCount = emailLogs.filter(log => !log.validation.valid).length;

  let emailsHtml = '';
  if (emailLogs.length === 0) {
    emailsHtml = '<tr><td colspan="8" style="text-align:center; padding: 20px;">暂无邮件记录</td></tr>';
  } else {
    emailsHtml = emailLogs.map(log => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; font-size: 12px; max-width: 100px; word-break: break-all;">
          <a href="/view/${log.id}" target="_blank" style="color: #667eea; text-decoration: none;">
            ${log.id.substring(0, 12)}...
          </a>
        </td>
        <td style="padding: 10px; font-size: 13px;">${new Date(log.timestamp).toLocaleString('zh-CN')}</td>
        <td style="padding: 10px;">${log.payload.from}</td>
        <td style="padding: 10px;">${log.payload.receivers.join(', ')}</td>
        <td style="padding: 10px; max-width: 250px; word-break: break-word; font-weight: 500;">${log.payload.subject}</td>
        <td style="padding: 10px; max-width: 150px; word-break: break-word;">${log.payload.bizScene || '-'}</td>
        <td style="padding: 10px;">
          <span style="
            padding: 4px 8px; 
            border-radius: 3px;
            font-size: 12px;
            ${log.validation.valid 
              ? 'background-color: #d4edda; color: #155724;' 
              : 'background-color: #f8d7da; color: #721c24;'
            }
          ">
            ${log.validation.valid ? '✓ 有效' : '✗ 无效'}
          </span>
        </td>
        <td style="padding: 10px;">
          <a href="/view/${log.id}" target="_blank" style="
            display: inline-block;
            padding: 6px 12px;
            background: #667eea;
            color: white;
            border-radius: 4px;
            text-decoration: none;
            font-size: 12px;
            transition: background 0.3s;
          " onmouseover="this.style.background='#5568d3'" onmouseout="this.style.background='#667eea'">
            查看详情
          </a>
        </td>
      </tr>
    `).join('');
  }

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>邮件服务测试 - 8081 端口</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .stat-card.valid {
            border-left-color: #28a745;
        }
        
        .stat-card.invalid {
            border-left-color: #dc3545;
        }
        
        .stat-label {
            font-size: 12px;
            color: #6c757d;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
        }
        
        .stat-card.valid .stat-value {
            color: #28a745;
        }
        
        .stat-card.invalid .stat-value {
            color: #dc3545;
        }
        
        .controls {
            padding: 20px 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #667eea;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5568d3;
        }
        
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
        
        .content {
            padding: 30px;
        }
        
        .table-wrapper {
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        
        th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .empty-message {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }
        
        .empty-message svg {
            width: 80px;
            height: 80px;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .footer {
            padding: 20px 30px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #6c757d;
            text-align: center;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .status-valid {
            background: #d4edda;
            color: #155724;
        }
        
        .status-invalid {
            background: #f8d7da;
            color: #721c24;
        }
        
        .tooltip {
            position: relative;
            cursor: help;
        }
        
        .tooltip:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 邮件服务测试服务器</h1>
            <p>运行在 http://localhost:8081 | 接收邮件请求并验证数据完整性</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-label">总请求数</div>
                <div class="stat-value">${emailCount}</div>
            </div>
            <div class="stat-card valid">
                <div class="stat-label">有效请求</div>
                <div class="stat-value">${validCount}</div>
            </div>
            <div class="stat-card invalid">
                <div class="stat-label">无效请求</div>
                <div class="stat-value">${invalidCount}</div>
            </div>
        </div>
        
        <div class="controls">
            <button class="btn btn-primary" onclick="location.reload()">🔄 刷新</button>
            <button class="btn btn-danger" onclick="clearLogs()">🗑️ 清空日志</button>
        </div>
        
        <div class="content">
            <h3 style="margin-bottom: 20px;">邮件接收日志</h3>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>消息 ID</th>
                            <th>接收时间</th>
                            <th>发件人</th>
                            <th>收件人</th>
                            <th>主题</th>
                            <th>业务场景</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${emailsHtml}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="footer">
            <p>✅ 服务运行正常 | 接收端点: POST http://localhost:8081/message/normal/no-attach</p>
            <p style="margin-top: 10px; opacity: 0.7;">刷新页面查看最新邮件请求 | 最多显示 100 条最近的记录</p>
        </div>
    </div>
    
    <script>
        function clearLogs() {
            if (confirm('确定要清空所有邮件日志吗？')) {
                fetch('/api/logs', { method: 'DELETE' })
                    .then(res => res.json())
                    .then(data => {
                        alert('邮件日志已清空');
                        location.reload();
                    })
                    .catch(err => alert('清空失败: ' + err.message));
            }
        }
        
        // 每 2 秒自动刷新一次
        setInterval(() => {
            fetch('/api/logs')
                .then(res => res.json())
                .then(data => {
                    // 简单判断数据是否有变化，如果有变化则刷新页面
                    const currentCount = document.querySelector('.stat-value').textContent;
                    if (data.length > parseInt(currentCount)) {
                        location.reload();
                    }
                })
                .catch(() => {
                    // 忽略错误
                });
        }, 2000);
    </script>
</body>
</html>
  `;
}

// 生成邮件详情页面
function renderEmailDetail(emailLog) {
  const payload = emailLog.payload;
  const timestamp = new Date(emailLog.timestamp);
  const subject = escapeHtml(payload.subject);
  const from = escapeHtml(payload.from);
  const receivers = payload.receivers.map(r => escapeHtml(r)).join(', ');
  const content = payload.content; // 保持原始 HTML 内容，不转义
  const payloadJson = JSON.stringify(payload, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bizScene = payload.bizScene ? escapeHtml(payload.bizScene) : '-';
  const typeText = payload.type === 1 ? '普通邮件' : payload.type === 2 ? '通知类邮件' : payload.type;
  const userName = escapeHtml(payload.userName);
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>邮件详情 - ${subject}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 8px;
            word-break: break-word;
        }
        
        .back-link {
            display: inline-block;
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
            font-size: 14px;
            margin-top: 10px;
        }
        
        .back-link:hover {
            color: white;
        }
        
        .content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 12px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 8px;
        }
        
        .field {
            margin-bottom: 12px;
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 15px;
        }
        
        .field-label {
            color: #666;
            font-weight: 500;
            font-size: 14px;
        }
        
        .field-value {
            color: #333;
            font-size: 14px;
            word-break: break-word;
        }
        
        .field-value.mono {
            font-family: 'Monaco', 'Courier New', monospace;
            background: #f5f5f5;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
        }
        
        .status-valid {
            background: #d4edda;
            color: #155724;
        }
        
        .status-invalid {
            background: #f8d7da;
            color: #721c24;
        }
        
        .email-content {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #667eea;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .json-box {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #ddd;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            overflow-x: auto;
            color: #333;
        }
        
        .errors {
            background: #f8d7da;
            padding: 12px 15px;
            border-radius: 4px;
            color: #721c24;
            font-size: 13px;
        }
        
        .errors li {
            margin-left: 20px;
            margin-bottom: 6px;
        }
        
        .footer {
            padding: 20px 30px;
            background: #f5f5f5;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 ${subject}</h1>
            <a href="/" class="back-link">← 返回列表</a>
        </div>
        
        <div class="content">
            <!-- 基本信息 -->
            <div class="section">
                <div class="section-title">基本信息</div>
                <div class="field">
                    <div class="field-label">消息 ID</div>
                    <div class="field-value mono">${emailLog.id}</div>
                </div>
                <div class="field">
                    <div class="field-label">接收时间</div>
                    <div class="field-value">${timestamp.toLocaleString('zh-CN')}</div>
                </div>
                <div class="field">
                    <div class="field-label">状态</div>
                    <div class="field-value">
                        <span class="status-badge ${emailLog.validation.valid ? 'status-valid' : 'status-invalid'}">
                            ${emailLog.validation.valid ? '✓ 有效' : '✗ 无效'}
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- 邮件信息 -->
            <div class="section">
                <div class="section-title">邮件信息</div>
                <div class="field">
                    <div class="field-label">发件人</div>
                    <div class="field-value">${from}</div>
                </div>
                <div class="field">
                    <div class="field-label">收件人</div>
                    <div class="field-value">${receivers}</div>
                </div>
                <div class="field">
                    <div class="field-label">主题</div>
                    <div class="field-value">${subject}</div>
                </div>
                <div class="field">
                    <div class="field-label">业务场景</div>
                    <div class="field-value">${bizScene}</div>
                </div>
                <div class="field">
                    <div class="field-label">邮件类型</div>
                    <div class="field-value">${typeText}</div>
                </div>
                <div class="field">
                    <div class="field-label">用户名</div>
                    <div class="field-value mono">${userName}</div>
                </div>
            </div>
            
            <!-- 邮件内容 -->
            <div class="section">
                <div class="section-title">邮件内容</div>
                <div class="email-content">${content}</div>
            </div>
            
            <!-- HTML 渲染 -->
            <div class="section">
                <div class="section-title">HTML 渲染预览</div>
                <div style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #ddd; min-height: 100px;">
                    ${content}
                </div>
            </div>
            
            <!-- 验证结果 -->
            ${emailLog.validation.errors.length > 0 ? `
            <div class="section">
                <div class="section-title">验证错误</div>
                <div class="errors">
                    <ul>
                        ${emailLog.validation.errors.map(err => `<li>${err}</li>`).join('')}
                    </ul>
                </div>
            </div>
            ` : ''}
            
            <!-- 完整 Payload -->
            <div class="section">
                <div class="section-title">完整请求数据</div>
                <div class="json-box">${payloadJson}</div>
            </div>
        </div>
        
        <div class="footer">
            <p>消息 ID: ${emailLog.id}</p>
            <p style="margin-top: 8px;">接收时间: ${timestamp.toISOString()}</p>
        </div>
    </div>
</body>
</html>
  `;
}

// HTML 转义函数
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 启动服务器
const PORT = 8081;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════╗
║  📧 邮件服务测试服务器                         ║
╠════════════════════════════════════════════════╣
║  服务器运行在:  http://localhost:${PORT}      ║
║  接收端点:      POST /message/normal/no-attach ║
║  API:           GET  /api/logs                 ║
║                 DELETE /api/logs               ║
╠════════════════════════════════════════════════╣
║  打开浏览器访问 http://localhost:${PORT}     ║
║  查看实时邮件接收日志                          ║
╚════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('服务器正在关闭...');
  server.close(() => {
    console.log('服务器已停止');
    process.exit(0);
  });
});

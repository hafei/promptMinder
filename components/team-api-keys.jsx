import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/getSupabaseClient';
import { generateAPIKeyDocumentation } from '@/lib/api-key-generator';
import { toast } from 'react-hot-toast';

export default function TeamApiKeys({ teamId }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchApiKeys();
  }, [teamId]);

  async function fetchApiKeys() {
    if (!supabase) {
      console.error('Supabase client not initialized - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      toast.error('获取API Keys失败');
      console.error('Error fetching API keys:', error);
    }
  }

  async function handleCreateKey(e) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const name = formData.get('name');
    const description = formData.get('description');
    const expiresAt = formData.get('expiresAt');
    const permissions = formData.getAll('permissions');

    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          expiresAt: expiresAt || null,
          permissions: permissions.length > 0 ? permissions : ['read:prompts']
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '创建失败');
      }

      // 保存新生成的API Key
      setNewKey(data.data.api_key);
      setShowCreateForm(false);
      fetchApiKeys();

      toast.success('API Key创建成功！');
      e.target.reset();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteKey(keyId, keyName) {
    if (!confirm(`确定要删除API Key "${keyName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys/${keyId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '删除失败');
      }

      toast.success('API Key已删除');
      fetchApiKeys();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleRotateKey(keyId, keyName) {
    if (!confirm(`确定要轮换API Key "${keyName}" 吗？旧Key将立即失效。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys/${keyId}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '轮换失败');
      }

      setNewKey(data.data.api_key);
      toast.success('API Key已轮换，请保存新的Key');
      fetchApiKeys();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  }

  function downloadDocumentation(apiKey, keyName) {
    const doc = generateAPIKeyDocumentation(apiKey, {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://promptminder.com/api/v1'
    });

    const blob = new Blob([doc], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${keyName.replace(/[^a-z0-9]/gi, '_')}_API_Documentation.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="api-keys-manager">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">API Keys</h3>
          <p className="text-gray-600 text-sm mt-1">
            管理您的团队API访问密钥
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          创建新的 API Key
        </button>
      </div>

      {/* 新创建的密钥提示 */}
      {newKey && (
        <div className="alert alert-warning mb-6" role="alert">
          <h4 className="font-semibold">请立即保存您的API Key</h4>
          <p className="text-sm text-gray-600 mb-3">
            这是唯一一次显示完整的API Key，请立即复制并安全保存。
          </p>
          <div className="bg-gray-100 p-3 rounded-lg mb-3">
            <code className="text-sm break-all">{newKey}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(newKey)}
              className="btn btn-sm"
            >
              {copied ? '已复制!' : '复制'}
            </button>
            <button
              onClick={() => downloadDocumentation(newKey, 'New API Key')}
              className="btn btn-sm btn-secondary"
            >
              下载文档
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="btn btn-sm btn-primary"
            >
              我已保存
            </button>
          </div>
        </div>
      )}

      {/* API Keys 列表 */}
      {apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-400 mb-3">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">还没有API Keys</h3>
          <p className="text-gray-500 mb-4">创建您的第一个API Key以开始使用API</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            创建 API Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map(key => (
            <div key={key.id} className="card border">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="font-semibold">{key.name}</h5>
                      <span className={`badge ${key.is_active ? 'badge-success' : 'badge-secondary'}`}>
                        {key.is_active ? '激活' : '禁用'}
                      </span>
                    </div>
                    {key.description && (
                      <p className="text-gray-600 text-sm mb-3">{key.description}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Key前缀:</span>
                        <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {key.key_prefix}
                        </span>
                      </div>
                      {key.expires_at && (
                        <div>
                          <span className="text-gray-500">过期时间:</span>
                          <span className="ml-2">
                            {new Date(key.expires_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">使用次数:</span>
                        <span className="ml-2 font-semibold">{key.usage_count || 0}</span>
                      </div>
                      {key.last_used_at && (
                        <div>
                          <span className="text-gray-500">最后使用:</span>
                          <span className="ml-2">
                            {new Date(key.last_used_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">创建时间:</span>
                        <span className="ml-2">
                          {new Date(key.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                    {key.permissions && key.permissions.length > 0 && (
                      <div className="mt-3">
                        <span className="text-gray-500 text-sm">权限:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {key.permissions.map(permission => (
                            <span key={permission} className="badge badge-outline text-xs">
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleRotateKey(key.id, key.name)}
                      className="btn btn-sm btn-secondary"
                      title="轮换API Key"
                    >
                      轮换
                    </button>
                    <button
                      onClick={() => handleDeleteKey(key.id, key.name)}
                      className="btn btn-sm btn-danger"
                      title="删除API Key"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建表单模态框 */}
      {showCreateForm && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">创建新的 API Key</h3>
            <form onSubmit={handleCreateKey}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">名称 *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="例如：生产环境API"
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">描述</span>
                </label>
                <textarea
                  name="description"
                  placeholder="这个API Key的用途..."
                  className="textarea textarea-bordered h-24 w-full"
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">权限</span>
                </label>
                <div className="space-y-2">
                  <label className="cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="permissions"
                      value="read:prompts"
                      defaultChecked
                      className="checkbox checkbox-sm"
                    />
                    <span className="text-sm">读取 Prompts</span>
                  </label>
                  <label className="cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="permissions"
                      value="read:projects"
                      className="checkbox checkbox-sm"
                    />
                    <span className="text-sm">读取项目</span>
                  </label>
                  <label className="cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="permissions"
                      value="write:prompts"
                      className="checkbox checkbox-sm"
                    />
                    <span className="text-sm">写入 Prompts</span>
                  </label>
                </div>
              </div>

              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">过期时间</span>
                </label>
                <select name="expiresAt" className="select select-bordered w-full">
                  <option value="">永不过期</option>
                  <option value={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}>
                    1年后
                  </option>
                  <option value={new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()}>
                    6个月后
                  </option>
                  <option value={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}>
                    3个月后
                  </option>
                  <option value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}>
                    1个月后
                  </option>
                </select>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-ghost"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading && <span className="loading loading-spinner loading-sm"></span>}
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API使用说明 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">API使用说明</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• API Key具有完整的团队数据访问权限，请妥善保管</li>
          <li>• 建议为不同的应用或环境创建不同的API Key</li>
          <li>• 定期轮换API Key以提高安全性</li>
          <li>• 监控API Key的使用情况，发现异常及时处理</li>
          <li>• 查看 <a href="/api-docs" className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">完整API文档</a></li>
        </ul>
      </div>
    </div>
  );
}
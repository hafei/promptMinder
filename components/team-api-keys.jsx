import React, { useState, useEffect } from 'react';
import { generateAPIKeyDocumentation } from '@/lib/api-key-generator';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Key,
  Plus,
  Trash2,
  RotateCcw,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  RefreshCw
} from "lucide-react";

export default function TeamApiKeys({ teamId }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState(['read:prompts']);
  const [expiresAt, setExpiresAt] = useState('no-expiry');
  const { toast } = useToast();

  // 定义过期时间选项 - 使用静态值，在提交时计算实际日期
  const expiryOptions = [
    { value: 'no-expiry', label: '永不过期' },
    { value: '30d', label: '30天后' },
    { value: '90d', label: '90天后' },
    { value: '1y', label: '1年后' }
  ];

  // 根据选项计算实际过期日期
  const calculateExpiryDate = (option) => {
    if (option === 'no-expiry') return null;
    const now = Date.now();
    switch (option) {
      case '30d': return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d': return new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString();
      case '1y': return new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
      default: return null;
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [teamId]);

  async function fetchApiKeys() {
    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取失败');
      }

      console.log('Fetched API Keys:', data.data);
      setApiKeys(data.data || []);
    } catch (error) {
      toast({
        title: "获取API Keys失败",
        variant: "destructive",
        description: error.message
      });
      console.error('Error fetching API keys:', error);
    }
  }

  async function handleCreateKey(e) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const name = formData.get('name');
    const description = formData.get('description');

    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          expiresAt: calculateExpiryDate(expiresAt),
          permissions: selectedPermissions.length > 0 ? selectedPermissions : ['read:prompts']
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '创建失败');
      }

      setNewKey(data.data.api_key);
      setShowCreateForm(false);
      fetchApiKeys();
      setSelectedPermissions(['read:prompts']);
      setExpiresAt('no-expiry');

      toast({
        title: "API Key创建成功",
        description: "请妥善保管您的API Key"
      });
      e.target.reset();
    } catch (error) {
      toast({
        title: "创建失败",
        variant: "destructive",
        description: error.message
      });
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

      toast({
        title: "API Key已删除",
        description: `API Key "${keyName}" 已被成功删除`
      });
      fetchApiKeys();
    } catch (error) {
      toast({
        title: "删除失败",
        variant: "destructive",
        description: error.message
      });
    }
  }

  async function handleRotateKey(keyId, keyName) {
    if (!confirm(`确定要轮换API Key "${keyName}" 吗？旧Key将立即失效。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys/${keyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate' })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '轮换失败');
      }

      setNewKey(data.data.api_key);
      fetchApiKeys();

      toast({
        title: "API Key轮换成功",
        description: "请使用新的API Key"
      });
    } catch (error) {
      toast({
        title: "轮换失败",
        variant: "destructive",
        description: error.message
      });
    }
  }

  async function copyToClipboard(text, isFullKey = false) {
    try {
      // 检查是否支持 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 降级方案：使用 document.execCommand
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!success) {
          throw new Error('execCommand failed');
        }
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "已复制到剪贴板",
        description: isFullKey ? "API Key已复制" : "Key前缀已复制"
      });
    } catch (error) {
      console.error('复制失败:', error);

      // 最后的降级方案：显示文本让用户手动复制
      const fallbackText = isFullKey ? text : text.substring(0, 8) + '...';

      toast({
        title: "复制失败",
        variant: "destructive",
        description: "请手动复制: " + fallbackText,
        action: (
          <button
            onClick={() => {
              navigator.clipboard.writeText(text).catch(() => {});
              toast({
                title: "已复制到剪贴板",
                description: isFullKey ? "API Key已复制" : "Key前缀已复制"
              });
            }}
            className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm"
          >
            重试
          </button>
        )
      });
    }
  }

  async function downloadDocumentation(key, keyName) {
    try {
      const doc = generateAPIKeyDocumentation(key, keyName, teamId);
      const blob = new Blob([doc], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${keyName}-api-documentation.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "文档已下载",
        description: "API文档已下载到本地"
      });
    } catch (error) {
      toast({
        title: "下载失败",
        variant: "destructive",
        description: error.message
      });
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '永不过期';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isExpired = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const getStatusBadge = (key) => {
    if (isExpired(key.expires_at)) {
      return <Badge variant="destructive">已过期</Badge>;
    }
    if (key.last_used_at) {
      return <Badge variant="default">活跃</Badge>;
    }
    return <Badge variant="secondary">未使用</Badge>;
  };

  const permissionPresets = [
    {
      id: 'read-only',
      name: '只读权限',
      description: '仅能读取数据',
      permissions: ['read:prompts', 'read:analytics']
    },
    {
      id: 'developer',
      name: '开发者',
      description: '可读写数据和执行操作',
      permissions: ['read:prompts', 'write:prompts', 'read:analytics', 'execute:prompts']
    },
    {
      id: 'full-access',
      name: '完全访问',
      description: '所有权限',
      permissions: ['read:prompts', 'write:prompts', 'read:analytics', 'write:analytics', 'execute:prompts', 'admin:team']
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                管理团队的API访问密钥
              </CardDescription>
            </div>
            <Dialog
              open={showCreateForm}
              onOpenChange={(open) => {
                if (!open) {
                  setExpiresAt('no-expiry');
                }
                setShowCreateForm(open);
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  创建 API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>创建新的API Key</DialogTitle>
                  <DialogDescription>
                    为团队成员或应用程序创建API访问密钥
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateKey} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">名称 *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="例如：生产环境API"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">过期时间</Label>
                      <Select value={expiresAt} onValueChange={setExpiresAt}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择过期时间" />
                        </SelectTrigger>
                        <SelectContent>
                          {expiryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">描述</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="描述此API Key的用途"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>权限设置</Label>
                    <Tabs defaultValue="custom" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="custom">自定义</TabsTrigger>
                        {/* <TabsTrigger value="read-only">只读</TabsTrigger>
                        <TabsTrigger value="developer">开发者</TabsTrigger>
                        <TabsTrigger value="full-access">完全访问</TabsTrigger> */}
                      </TabsList>

                      <TabsContent value="custom" className="space-y-3 mt-3">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'read:prompts', label: '读取提示词' },
                            // { id: 'write:prompts', label: '写入提示词' },
                            // { id: 'read:analytics', label: '查看分析' },
                            // { id: 'write:analytics', label: '管理分析' },
                            // { id: 'execute:prompts', label: '执行提示词' },
                            // { id: 'admin:team', label: '团队管理' }
                          ].map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPermissions([...selectedPermissions, permission.id]);
                                  } else {
                                    setSelectedPermissions(selectedPermissions.filter(p => p !== permission.id));
                                  }
                                }}
                              />
                              <Label htmlFor={permission.id} className="text-sm">
                                {permission.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      {permissionPresets.map((preset) => (
                        <TabsContent key={preset.id} value={preset.id} className="mt-3">
                          <Alert>
                            <Shield className="h-4 w-4" />
                            <AlertDescription>
                              <strong>{preset.name}</strong> - {preset.description}
                            </AlertDescription>
                          </Alert>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {preset.permissions.map((perm) => (
                              <Badge key={perm} variant="outline">
                                {perm.replace(':', ' · ')}
                              </Badge>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-3"
                            onClick={() => setSelectedPermissions(preset.permissions)}
                          >
                            使用此权限集
                          </Button>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setExpiresAt('no-expiry');
                      }}
                    >
                      取消
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                      创建API Key
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无API Keys</h3>
              <p className="text-muted-foreground mb-4">
                创建第一个API Key来开始使用团队的API服务
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建 API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{key.name}</span>
                          {getStatusBadge(key)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-muted-foreground">
                            {key.key_prefix}...
                          </code>
                          {/* <button
                            onClick={() => copyToClipboard(key.key_prefix)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="复制"
                          >
                            <Copy className="w-3 h-3" />
                          </button> */}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span className="hidden sm:inline">{formatDate(key.expires_at)}</span>
                      {key.usage_count !== undefined && (
                        <span className="hidden md:inline">使用次数: {key.usage_count}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleRotateKey(key.id, key.name)}
                        title="轮换"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button> */}
                      {/* <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => downloadDocumentation(key.key_prefix, key.name)}
                        title="下载文档"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button> */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteKey(key.id, key.name)}
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {key.permissions && key.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
                      {key.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-[10px] px-1.5 py-0">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 显示新创建的API Key */}
      {newKey && (
        <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                API Key创建成功
              </DialogTitle>
              <DialogDescription>
                请立即复制并保存您的API Key，此Key将不会再次显示
              </DialogDescription>
            </DialogHeader>

            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                请妥善保管此API Key，不要在代码仓库或公共场所暴露
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label>您的API Key:</Label>
              <div className="relative">
                <Input
                  value={newKey}
                  readOnly
                  className="pr-20 font-mono text-sm"
                />
                <Button
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => copyToClipboard(newKey, true)}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNewKey(null)}>
                我已保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
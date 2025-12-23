"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Shield, User, Loader2, Crown, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const { toast } = useToast();

  // 超级管理员匹配模式
  const [adminPatterns, setAdminPatterns] = useState([]);

  useEffect(() => {
    const fetchAdminPatterns = async () => {
      try {
        const response = await fetch("/api/admin/superadmins");
        if (response.ok) {
          const data = await response.json();
          setAdminPatterns(data.adminPatterns || []);
        }
      } catch (error) {
        console.error('Failed to fetch admin patterns:', error);
      }
    };

    fetchAdminPatterns();
  }, []);

  const isSuperAdmin = (email) => {
    if (!email || !adminPatterns.length) return false;

    return adminPatterns.some(adminUsername => {
      const adminEmail = adminUsername.includes('@') ? adminUsername : `${adminUsername}@`;
      return adminEmail === email.toLowerCase() ||
             email.toLowerCase().startsWith(adminEmail);
    });
  };

  const getUserRole = (userItem) => {
    if (isSuperAdmin(userItem.email)) {
      return {
        label: "超级管理员",
        badge: "bg-red-500 hover:bg-red-600",
        icon: <Crown className="w-3 h-3 mr-1" />
      };
    } else if (userItem.is_admin) {
      return {
        label: "管理员",
        badge: "bg-amber-500 hover:bg-amber-600",
        icon: <Shield className="w-3 h-3 mr-1" />
      };
    } else {
      return {
        label: "普通用户",
        badge: "",
        icon: <User className="w-3 h-3 mr-1" />
      };
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      } else {
        throw new Error(data.error || "获取用户列表失败");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "错误",
        description: error.message || "获取用户列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId, currentStatus) => {
    setUpdatingId(userId);
    try {
      const response = await fetch("/api/admin/set-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          isAdmin: !currentStatus
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "成功",
          description: data.message,
        });

        // 如果是取消管理员权限（从 true 变为 false），使该用户的会话失效
        if (currentStatus === true) {
          // 从用户列表中获取用户信息
          const targetUser = users.find(u => u.id === userId);
          if (targetUser) {
            try {
              const invalidateResponse = await fetch("/api/admin/invalidate-session", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId
                }),
              });

              if (invalidateResponse.ok) {
                toast({
                  title: "权限已撤销",
                  description: "该用户需要重新登录后生效",
                  variant: "default",
                });
              }
            } catch (error) {
              console.error("Failed to invalidate session:", error);
            }
          }
        }

        // 更新本地状态
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId ? { ...user, is_admin: !currentStatus } : user
          )
        );
      } else {
        toast({
          title: "错误",
          description: data.error || "操作失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to toggle admin:", error);
      toast({
        title: "错误",
        description: "操作失败，请重试",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(user =>
    [user.email, user.display_name]
      .filter(Boolean)
      .some(field =>
        field.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="h-6 w-6 text-amber-500" />
          <h1 className="text-3xl font-bold">用户管理</h1>
        </div>
        <p className="text-muted-foreground">
          管理用户权限，设置或取消管理员角色
        </p>
      </div>

      {/* 搜索栏 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="搜索用户邮箱或显示名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            用户列表
          </CardTitle>
          <CardDescription>
            共 {filteredUsers.length} 个用户
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[100px]" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">没有找到用户</h3>
              <p className="text-muted-foreground">
                尝试调整搜索条件
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户信息</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          {userItem.display_name ? (
                            <span className="text-sm font-medium">
                              {userItem.display_name.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {userItem.display_name || "未设置"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {userItem.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const role = getUserRole(userItem);
                        return (
                          <Badge
                            variant={role.badge ? "default" : "outline"}
                            className={role.badge}
                          >
                            {role.icon}
                            {role.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(userItem.created_at).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {userItem.id !== user?.id ? (
                        <div className="flex items-center justify-end gap-2">
                          {isSuperAdmin(userItem.email) ? (
                            <Badge variant="secondary" className="text-xs bg-red-50 text-red-700 border-red-200">
                              <Crown className="w-3 h-3 mr-1" />
                              超级管理员
                            </Badge>
                          ) : (
                            <>
                              <Label htmlFor={`admin-${userItem.id}`} className="sr-only">
                                管理员权限
                              </Label>
                              <Switch
                                id={`admin-${userItem.id}`}
                                checked={userItem.is_admin}
                                onCheckedChange={() =>
                                  handleToggleAdmin(userItem.id, userItem.is_admin)
                                }
                                disabled={updatingId === userItem.id}
                              />
                              {updatingId === userItem.id && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <UserCheck className="w-3 h-3 mr-1" />
                          当前用户
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
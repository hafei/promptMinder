"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, LogIn, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function AdminProtected({ children }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    // 如果用户未登录，直接返回 false
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/check");
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.success);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Failed to check admin status:", error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/admin/refresh-session', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        // 刷新页面以获取最新的用户信息
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "刷新失败，请重新登录");
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      alert("刷新失败，请重新登录");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">验证权限中...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">访问受限</CardTitle>
            <CardDescription>
              {user ? "您没有访问管理后台的权限" : "请先登录账户"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    当前登录账户: <span className="font-medium">{user.email}</span>
                  </p>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  如果您刚刚被授予管理员权限，请尝试以下操作：
                </p>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleRefreshSession}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      刷新会话中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      刷新会话（推荐）
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsLoading(true);
                    setIsAdmin(null);
                    checkAdminStatus();
                  }}
                >
                  重新验证权限
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => router.push("/")}
                >
                  返回首页
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  请登录您的管理员账户以访问此页面
                </p>
                <Button asChild className="w-full">
                  <Link href="/sign-in">
                    <LogIn className="w-4 h-4 mr-2" />
                    登录账户
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
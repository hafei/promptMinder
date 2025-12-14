"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TestDebugPage() {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/debug");
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        console.error("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">用户信息调试</h1>

      {/* 当前 Auth Context 中的用户信息 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Auth Context 用户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* API 返回的用户信息 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API 返回的用户信息</CardTitle>
            <Button onClick={fetchUserData} disabled={loading}>
              {loading ? "加载中..." : "获取用户信息"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userData ? (
            <div>
              <div className="mb-4">
                <Badge variant={userData.user?.is_admin ? "default" : "outline"}>
                  {userData.user?.is_admin ? "管理员" : "普通用户"}
                </Badge>
              </div>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(userData, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-muted-foreground">点击按钮获取用户信息</p>
          )}
        </CardContent>
      </Card>

      {/* 测试链接 */}
      <Card>
        <CardHeader>
          <CardTitle>测试链接</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button asChild>
            <a href="/admin/contributions">访问贡献管理页面</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/admin/users">访问用户管理页面</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
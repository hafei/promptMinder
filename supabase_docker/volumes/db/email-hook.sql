-- Email Hook PostgreSQL 函数 (修正版)
-- GoTrue 期望接收单个 JSONB 参数

-- 删除旧函数
DROP FUNCTION IF EXISTS public.send_email_hook(jsonb, jsonb);
DROP FUNCTION IF EXISTS public.send_email_hook(jsonb);

-- 创建新函数
CREATE OR REPLACE FUNCTION public.send_email_hook(input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_data jsonb;
  email_data jsonb;
  email TEXT;
  action_type TEXT;
  token_hash TEXT;
  redirect_to TEXT;
  verification_url TEXT;
  subject TEXT;
  content TEXT;
  request_body jsonb;
BEGIN
  -- 解析输入
  user_data := input->'user';
  email_data := input->'email_data';
  
  email := user_data->>'email';
  action_type := COALESCE(email_data->>'email_action_type', 'signup');
  token_hash := email_data->>'token_hash';
  redirect_to := COALESCE(email_data->>'redirect_to', 'http://localhost:3010');

  -- 构建验证 URL
  verification_url := 'http://localhost:8000/auth/v1/verify?token=' || token_hash || '&type=' || action_type || '&redirect_to=' || redirect_to;

  -- 设置邮件主题和内容
  CASE action_type
    WHEN 'signup' THEN
      subject := '确认您的邮箱 - PromptMinder';
    WHEN 'recovery' THEN
      subject := '重置您的密码 - PromptMinder';
    WHEN 'magiclink' THEN
      subject := '登录链接 - PromptMinder';
    ELSE
      subject := '验证邮件 - PromptMinder';
  END CASE;

  content := '<html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h1>' || subject || '</h1><p style="text-align: center;"><a href="' || verification_url || '" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px;">点击验证</a></p><p style="font-size: 12px; color: #888;">' || verification_url || '</p></body></html>';

  -- 构建请求体
  request_body := jsonb_build_object(
    'type', 2,
    'from', 'it-platform@dev.zo',
    'userName', 'it-platform',
    'password', '1qaz@WSX3edc',
    'bizScene', 'Supabase Auth - ' || action_type,
    'receivers', jsonb_build_array(email),
    'subject', subject,
    'content', content
  );

  -- 使用 pg_net 发送 HTTP 请求
  PERFORM net.http_post(
    url := 'http://host.docker.internal:8081/message/normal/no-attach',
    headers := jsonb_build_object('Content-Type', 'application/json', 'token', '{"tenantId": "PromptMinder"}'),
    body := request_body
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION public.send_email_hook(jsonb) TO supabase_auth_admin;

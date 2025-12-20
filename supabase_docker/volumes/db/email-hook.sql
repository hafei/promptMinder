-- Email Hook PostgreSQL 函数 (修正版)
-- GoTrue 期望接收单个 JSONB 参数
--
-- 配置变量 (通过 postgresql.conf 或 -c 参数设置):
--   app.supabase_auth_url: Supabase Auth 验证 URL 基础地址 (例如: http://localhost:8000)
--   app.email_api_url: 企业邮件 REST API 地址 (例如: http://host.docker.internal:8081/message/normal/no-attach)
--   app.email_from: 发件人邮箱地址 (例如: it-platform@dev.zo)
--   app.email_username: 邮件服务用户名 (例如: it-platform)
--   app.email_password: 邮件服务密码

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
  supabase_auth_url TEXT;
  email_api_url TEXT;
  email_from TEXT;
  email_username TEXT;
  email_password TEXT;
  subject TEXT;
  body_text TEXT;
  button_text TEXT;
  content TEXT;
  request_body jsonb;
BEGIN
  -- 解析输入
  user_data := input->'user';
  email_data := input->'email_data';
  
  email := user_data->>'email';
  action_type := COALESCE(email_data->>'email_action_type', 'signup'); -- 默认为 signup
  token_hash := email_data->>'token_hash';
  redirect_to := COALESCE(email_data->>'redirect_to', 'http://localhost:3010');

  -- 从配置读取 URL 和邮件凭证 (带默认值)
  supabase_auth_url := COALESCE(current_setting('app.supabase_auth_url', true), 'http://localhost:8000');
  email_api_url := COALESCE(current_setting('app.email_api_url', true), 'http://host.docker.internal:8081/message/normal/no-attach');
  email_from := COALESCE(current_setting('app.email_from', true), 'it-platform@dev.zo');
  email_username := COALESCE(current_setting('app.email_username', true), 'it-platform');
  email_password := COALESCE(current_setting('app.email_password', true), '');

  -- 构建验证 URL
  verification_url := supabase_auth_url || '/auth/v1/verify?token=' || token_hash || '&type=' || action_type || '&redirect_to=' || redirect_to;

  -- 设置邮件主题和内容
  CASE action_type
    WHEN 'signup' THEN
      subject := '确认您的邮箱 - PromptMinder';
      body_text := '感谢您注册 PromptMinder！请点击下方按钮验证您的邮箱地址以完成注册。';
      button_text := '验证邮箱';
    WHEN 'recovery' THEN
      subject := '重置您的密码 - PromptMinder';
      body_text := '我们收到您的密码重置请求。请点击下方按钮重置密码，如果您没有提交此请求，可以安全地忽略此邮件。';
      button_text := '重置密码';
    WHEN 'magiclink' THEN
      subject := '登录链接 - PromptMinder';
      body_text := '您可以使用以下链接直接登录您的 PromptMinder 账户。此链接在短时间内有效且只能使用一次。';
      button_text := '立即登录';
    ELSE
      subject := '验证邮件 - PromptMinder';
      body_text := '请点击下方按钮完成您的身份验证。';
      button_text := '点击验证';
  END CASE;

  content := '<html><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 40px 20px;">' ||
             '<h2 style="margin-top: 0; color: #1f2937;">' || subject || '</h2>' ||
             '<p>您好，</p>' ||
             '<p>' || body_text || '</p>' ||
             '<div style="text-align: center; margin: 30px 0;">' ||
             '<a href="' || verification_url || '" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">' || button_text || '</a>' ||
             '</div>' ||
             '<p style="font-size: 14px; color: #666;">如果按钮无法点击，请复制并访问以下链接：<br>' ||
             '<a href="' || verification_url || '" style="color: #2563eb; word-break: break-all;">' || verification_url || '</a></p>' ||
             '<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">' ||
             '<p style="font-size: 12px; color: #999;">如果您没有请求此邮件，请忽略，您的账户安全不会受到影响。</p>' ||
             '</body></html>';

  -- 构建请求体
  request_body := jsonb_build_object(
    'type', 2,
    'from', email_from,
    'userName', email_username,
    'password', email_password,
    'bizScene', 'Supabase Auth - ' || action_type,
    'receivers', jsonb_build_array(email),
    'subject', subject,
    'content', content
  );

  -- 使用 pg_net 发送 HTTP 请求
  PERFORM net.http_post(
    url := email_api_url,
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

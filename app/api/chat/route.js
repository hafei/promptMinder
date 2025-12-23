import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const DEFAULT_API_KEY = process.env.CUSTOM_API_KEY;
const DEFAULT_BASE_URL = process.env.CUSTOM_API_URL || 'https://open.bigmodel.cn/api/paas/v4';
const DEFAULT_MODEL_NAME = process.env.CUSTOM_MODEL_NAME;

// 解析可用的模型列表
const getAvailableModels = () => {
  if (!DEFAULT_MODEL_NAME) return ['gpt-3.5-turbo'];
  return DEFAULT_MODEL_NAME.split(',').map(model => model.trim()).filter(model => model.length > 0);
};

// 获取默认模型
const getDefaultModel = () => {
  const models = getAvailableModels();
  return models.length > 0 ? models[0] : 'gpt-3.5-turbo';
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      messages, 
      apiKey, 
      model, 
      systemPrompt, 
      temperature = 0.7,
      max_tokens = 2000,
      top_p = 0.7,
      baseURL
    } = body;

    const finalApiKey = apiKey || DEFAULT_API_KEY;
    const availableModels = getAvailableModels();

    // 处理模型选择
    let finalModel;
    if (!model || model === 'default') {
      finalModel = getDefaultModel();
    } else {
      // 检查所选模型是否在可用模型列表中（如果使用默认配置）
      if (!apiKey && availableModels.length > 1) {
        if (availableModels.includes(model)) {
          finalModel = model;
        } else {
          finalModel = getDefaultModel();
        }
      } else {
        finalModel = model;
      }
    }

    const finalBaseURL = baseURL || DEFAULT_BASE_URL;
    
    if (!finalApiKey) {
      throw new Error('未提供 API Key');
    }

    // 创建 OpenAI 客户端实例，使用传入的 baseURL
    const openai = new OpenAI({
      apiKey: finalApiKey,
      baseURL: finalBaseURL,
    });
    // 准备发送给 AI 的消息
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ].filter(msg => msg.content);

    // 使用 OpenAI SDK 发送请求
    const completion = await openai.chat.completions.create({
      model: finalModel,
      messages: aiMessages,
      temperature: temperature,
      max_tokens: max_tokens,
      top_p: top_p,
      stream: true
    });

    // 创建一个新的 ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            // 获取当前块的内容
            const content = chunk.choices[0]?.delta?.content || '';
            // 打印数据块信息
            console.log('收到数据块:', {
              content: content,
              timestamp: new Date().toISOString(),
              chunkInfo: chunk
            });
            // 将内容编码为 UTF-8
            const bytes = new TextEncoder().encode(content);
            // 将内容推送到流中
            controller.enqueue(bytes);
          }
          controller.close();
        } catch (error) {
          console.error('流处理错误:', error);
          controller.error(error);
        }
      },
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || '处理请求时发生错误' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve available models
export async function GET() {
  try {
    const models = getAvailableModels();
    const defaultModel = getDefaultModel();

    return NextResponse.json({
      models: models,
      defaultModel: defaultModel
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve models' },
      { status: 500 }
    );
  }
} 
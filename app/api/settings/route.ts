import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { anthropicApiKey } = await req.json();
    
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (e) {
      // 文件不存在，创建新的
    }
    
    // 更新或添加 ANTHROPIC_API_KEY
    if (envContent.includes('ANTHROPIC_API_KEY=')) {
      envContent = envContent.replace(
        /ANTHROPIC_API_KEY=.*/g,
        `ANTHROPIC_API_KEY="${anthropicApiKey}"`
      );
    } else {
      envContent += `\nANTHROPIC_API_KEY="${anthropicApiKey}"\n`;
    }
    
    await fs.writeFile(envPath, envContent);
    
    // 重启服务需要手动刷新才能生效，这里先返回成功
    return NextResponse.json({ 
      success: true,
      message: 'API Key 已保存！请重启服务生效。'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  const hasKey = process.env.ANTHROPIC_API_KEY && 
    process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here';
  
  return NextResponse.json({
    hasKeyConfigured: hasKey,
    keyPreview: hasKey ? process.env.ANTHROPIC_API_KEY?.slice(0, 8) + '...' : ''
  });
}

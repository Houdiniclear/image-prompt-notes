import { NextResponse } from 'next/server';
import { Skill } from 'lucide-react';

export async function POST(req: Request) {
  const { url } = await req.json();

  try {
    // 使用agent-reach抓取内容
    const result = await Skill({
      skill: 'agent-reach',
      args: url,
    });

    // 提取图片和文本
    const data = typeof result === 'string' ? JSON.parse(result) : result;

    // 查找图片
    const images: string[] = [];
    const text = JSON.stringify(data);
    const imgRegex = /https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp)/gi;
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
      if (!images.includes(match[0])) {
        images.push(match[0]);
      }
    }

    // 提取提示词（查找常见模式）
    const prompts: { name: string; content: string }[] = [];
    const promptRegex = /(?:prompt|提示词|咒语|Negative prompt|negative|负面提示词)\s*[:：]\s*([^\n]{10,500})/gi;
    let pmatch;
    const fullText = JSON.stringify(data);
    while ((pmatch = promptRegex.exec(fullText)) !== null) {
      prompts.push({
        name: prompts.length === 0 ? 'Prompt' : `Prompt ${prompts.length + 1}`,
        content: pmatch[1].trim(),
      });
    }

    return NextResponse.json({
      title: data.title || data.name || '抓取内容',
      images: images.slice(0, 20),
      prompts,
      content: fullText.slice(0, 2000),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

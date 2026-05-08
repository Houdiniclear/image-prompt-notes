import { NextResponse } from 'next/server';
import { extractStructuredPrompts, combinePrompt, StructuredPrompt } from '@/lib/ai';
import { addSample, findSampleByHash } from '@/lib/knowledge-store';

// 简单的图片哈希
function computeImageHash(base64: string): string {
  let hash = 0;
  const str = base64.slice(-1000);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(req: Request) {
  try {
    const { imageUrl, noteId } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: '缺少图片URL' }, { status: 400 });
    }

    // 计算图片哈希
    const imageHash = computeImageHash(imageUrl);

    // 检查是否已学习过这张图
    const existingSample = await findSampleByHash(imageHash);
    console.log('现有样本:', existingSample ? '找到 - ' + existingSample.id : '未找到');

    let extraction, confidence, referencedSamples;

    // 如果已学习，直接使用样本内容（避免 AI 重新提取失败）
    if (existingSample && existingSample.extraction) {
      console.log('✅ 使用已学习的样本内容，无需重新提取');
      extraction = existingSample.extraction;
      confidence = {
        art_style: 0.95, subject: 0.95, composition: 0.9, color_palette: 0.9, elements: 0.9,
        lighting: 0.85, camera_angle: 0.85, quality: 0.9, aspect_ratio: 0.95, layout: 0.8,
        text_elements: 0.9, negative: 0.7
      };
      referencedSamples = [];
    } else {
      console.log('🔄 调用 AI 重新提取');
      const result = await extractStructuredPrompts(imageUrl);
      extraction = result.extraction;
      confidence = result.confidence;
      referencedSamples = result.referencedSamples;

      // 自动添加到知识库（如果是新样本）
      await addSample(imageHash, extraction);
    }

    // 兼容旧格式：同时返回 prompts 数组
    const positivePrompt = combinePrompt(extraction);

    return NextResponse.json({
      // 新的结构化格式
      structured: extraction,
      confidence,
      referencedSamples: referencedSamples.length,
      hasBeenLearned: !!existingSample,
      sampleId: existingSample?.id,

      // 兼容旧格式
      prompts: [
        { name: '正面提示词', content: positivePrompt },
        { name: '负面提示词', content: extraction.negative || '' },
      ],
      style: extraction.art_style,
    });
  } catch (e: any) {
    console.error('OCR错误:', e);
    return NextResponse.json({ 
      error: e.message || '图片分析失败' 
    }, { status: 500 });
  }
}

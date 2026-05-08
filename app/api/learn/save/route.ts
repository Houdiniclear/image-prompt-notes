import { NextResponse } from 'next/server';
import { updateSample, findSampleByHash } from '@/lib/knowledge-store';
import type { StructuredPrompt } from '@/lib/ai';

// 保存用户修正，强化学习
export async function POST(req: Request) {
  try {
    const { sampleId, imageHash, correction }: {
      sampleId?: string;
      imageHash?: string;
      correction: StructuredPrompt;
    } = await req.json();

    if (!sampleId && !imageHash) {
      return NextResponse.json({ error: '缺少样本ID或图片哈希' }, { status: 400 });
    }

    let id = sampleId;
    
    // 如果只有哈希，先查找对应的样本ID
    if (!id && imageHash) {
      const sample = await findSampleByHash(imageHash);
      if (sample) id = sample.id;
    }

    if (!id) {
      return NextResponse.json({ error: '找不到对应样本' }, { status: 404 });
    }

    // 更新样本，保存用户修正
    const updated = await updateSample(id, correction);
    
    if (!updated) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '✅ 学习成功！AI已记住你的修正风格',
      sample: updated,
    });
  } catch (e: any) {
    console.error('保存学习失败:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

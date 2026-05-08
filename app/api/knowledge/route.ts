import { NextResponse } from 'next/server';
import { getStats, getAllSamples, deleteSample, findSampleByHash } from '@/lib/knowledge-store';

// 获取知识库统计
export async function GET() {
  try {
    const stats = await getStats();
    const samples = await getAllSamples();
    
    return NextResponse.json({
      ...stats,
      samples: samples.slice(0, 50), // 只返回最近50条
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 删除样本
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const success = await deleteSample(id);
    return NextResponse.json({ success });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 向量知识库 - 存储和管理学习样本
import fs from 'fs/promises';
import path from 'path';
import type { StructuredPrompt, LearningSample } from './ai';

const DATA_DIR = path.join(process.cwd(), 'data', 'knowledge');
const SAMPLES_DIR = path.join(DATA_DIR, 'samples');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// 确保目录存在
async function ensureDirs() {
  await fs.mkdir(SAMPLES_DIR, { recursive: true });
}

// 生成简单的相似度分数（基于关键词重叠）
function calculateSimilarity(a: StructuredPrompt, b: StructuredPrompt): number {
  const getKeywords = (s: string) => s.toLowerCase().split(/[,，\s]+/).filter(k => k.length > 1);
  
  let score = 0;
  let total = 0;
  
  const dimensions: (keyof StructuredPrompt)[] = ['art_style', 'subject', 'composition', 'color_palette', 'elements', 'lighting'];
  
  for (const dim of dimensions) {
    const kwA = new Set(getKeywords(a[dim]));
    const kwB = new Set(getKeywords(b[dim]));
    
    if (kwA.size > 0 || kwB.size > 0) {
      const arrA = Array.from(kwA);
      const arrB = Array.from(kwB);
      const intersection = arrA.filter(k => kwB.has(k)).length;
      const union = new Set(arrA.concat(arrB)).size;
      score += union > 0 ? intersection / union : 0;
      total += 1;
    }
  }
  
  return total > 0 ? score / total : 0;
}

// 获取知识库统计
export async function getStats(): Promise<{
  totalSamples: number;
  verifiedSamples: number;
  totalReferences: number;
}> {
  await ensureDirs();
  
  let totalSamples = 0;
  let verifiedSamples = 0;
  let totalReferences = 0;
  
  try {
    const files = await fs.readdir(SAMPLES_DIR);
    totalSamples = files.filter(f => f.endsWith('.json')).length;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(SAMPLES_DIR, file), 'utf-8');
        const sample: LearningSample = JSON.parse(content);
        if (sample.userCorrection) verifiedSamples++;
        totalReferences += sample.usageCount || 0;
      }
    }
  } catch (e) {
    console.error('统计失败:', e);
  }
  
  return { totalSamples, verifiedSamples, totalReferences };
}

// 添加学习样本
export async function addSample(
  imageHash: string,
  extraction: StructuredPrompt,
  userCorrection?: StructuredPrompt
): Promise<LearningSample> {
  await ensureDirs();
  
  const sample: LearningSample = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    imageHash,
    extraction,
    userCorrection,
    learnedAt: new Date().toISOString(),
    usageCount: 0,
  };
  
  await fs.writeFile(
    path.join(SAMPLES_DIR, `${sample.id}.json`),
    JSON.stringify(sample, null, 2),
    'utf-8'
  );
  
  return sample;
}

// 更新样本（添加用户修正）
export async function updateSample(
  id: string,
  userCorrection: StructuredPrompt
): Promise<LearningSample | null> {
  await ensureDirs();
  
  const filepath = path.join(SAMPLES_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    const sample: LearningSample = JSON.parse(content);
    sample.userCorrection = userCorrection;
    await fs.writeFile(filepath, JSON.stringify(sample, null, 2), 'utf-8');
    return sample;
  } catch (e) {
    return null;
  }
}

// 增加样本引用计数
export async function incrementUsage(id: string): Promise<void> {
  const filepath = path.join(SAMPLES_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    const sample: LearningSample = JSON.parse(content);
    sample.usageCount = (sample.usageCount || 0) + 1;
    await fs.writeFile(filepath, JSON.stringify(sample, null, 2), 'utf-8');
  } catch (e) {
    // 忽略错误
  }
}

// 搜索相似样本
export async function searchSimilar(
  prompt: StructuredPrompt,
  limit: number = 5
): Promise<Array<{ sample: LearningSample; similarity: number }>> {
  await ensureDirs();
  
  const results: Array<{ sample: LearningSample; similarity: number }> = [];
  
  try {
    const files = await fs.readdir(SAMPLES_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(SAMPLES_DIR, file), 'utf-8');
        const sample: LearningSample = JSON.parse(content);
        
        // 使用用户修正后的版本计算相似度（如果有）
        const compareTarget = sample.userCorrection || sample.extraction;
        const similarity = calculateSimilarity(prompt, compareTarget);
        
        results.push({ sample, similarity });
      }
    }
  } catch (e) {
    console.error('搜索失败:', e);
  }
  
  // 按相似度排序，用户验证的样本加分
  results.sort((a, b) => {
    const scoreA = a.similarity + (a.sample.userCorrection ? 0.2 : 0);
    const scoreB = b.similarity + (b.sample.userCorrection ? 0.2 : 0);
    return scoreB - scoreA;
  });
  
  // 增加被引用样本的计数
  for (const r of results.slice(0, limit)) {
    incrementUsage(r.sample.id);
  }
  
  return results.slice(0, limit);
}

// 获取所有样本
export async function getAllSamples(): Promise<LearningSample[]> {
  await ensureDirs();
  
  const samples: LearningSample[] = [];
  
  try {
    const files = await fs.readdir(SAMPLES_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(SAMPLES_DIR, file), 'utf-8');
        samples.push(JSON.parse(content));
      }
    }
  } catch (e) {
    console.error('读取样本失败:', e);
  }
  
  samples.sort((a, b) => new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime());
  return samples;
}

// 删除样本
export async function deleteSample(id: string): Promise<boolean> {
  try {
    await fs.unlink(path.join(SAMPLES_DIR, `${id}.json`));
    return true;
  } catch (e) {
    return false;
  }
}

// 图片哈希查找样本
export async function findSampleByHash(imageHash: string): Promise<LearningSample | null> {
  await ensureDirs();
  
  try {
    const files = await fs.readdir(SAMPLES_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(SAMPLES_DIR, file), 'utf-8');
        const sample: LearningSample = JSON.parse(content);
        if (sample.imageHash === imageHash) return sample;
      }
    }
  } catch (e) {
    console.error('查找样本失败:', e);
  }
  
  return null;
}

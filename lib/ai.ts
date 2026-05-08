// 结构化提示词提取 + AI自学习系统

// API 配置
const API_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3";
const API_KEY = "c74b2710-3bbb-45dd-87c4-e2c0b43e81dd";
const MODEL = "ark-code-latest";

// 12维度结构化提示词
export interface StructuredPrompt {
  art_style: string;      // 🎨 风格
  subject: string;        // 📋 主题
  composition: string;    // 🖼️ 构图
  color_palette: string;  // 🌈 色彩
  elements: string;       // ✨ 元素
  lighting: string;       // 💡 光影
  camera_angle: string;   // 📐 视角
  quality: string;        // 🎯 画质
  aspect_ratio: string;   // 📏 比例
  layout: string;         // 📝 排版
  text_elements: string;  // 🔤 文字元素
  negative: string;       // 💭 负面排除
}

export interface LearningSample {
  id: string;
  imageHash: string;
  extraction: StructuredPrompt;
  userCorrection?: StructuredPrompt;
  learnedAt: string;
  usageCount: number;
}

// 维度中文名称和图标
export const DIMENSION_INFO: Record<keyof StructuredPrompt, { name: string; icon: string }> = {
  art_style: { name: '风格', icon: '🎨' },
  subject: { name: '主题', icon: '📋' },
  composition: { name: '构图', icon: '🖼️' },
  color_palette: { name: '色彩', icon: '🌈' },
  elements: { name: '元素', icon: '✨' },
  lighting: { name: '光影', icon: '💡' },
  camera_angle: { name: '视角', icon: '📐' },
  quality: { name: '画质', icon: '🎯' },
  aspect_ratio: { name: '比例', icon: '📏' },
  layout: { name: '排版', icon: '📝' },
  text_elements: { name: '文字', icon: '🔤' },
  negative: { name: '负面', icon: '💭' },
};

// 简单的图片哈希（用于去重）
function computeImageHash(base64: string): string {
  let hash = 0;
  const str = base64.slice(-1000); // 只取后1000字符
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// 从知识库中搜索相似样本
async function searchSimilarSamples(imageBase64: string, limit: number = 3): Promise<LearningSample[]> {
  try {
    const fs = require('fs/promises');
    const path = require('path');
    const samplesDir = path.join(process.cwd(), 'data', 'knowledge', 'samples');
    
    // 读取所有样本
    const files = await fs.readdir(samplesDir).catch(() => []);
    const samples: LearningSample[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(samplesDir, file), 'utf-8');
        samples.push(JSON.parse(content));
      }
    }
    
    // 优先返回用户验证过的、被引用多的样本
    samples.sort((a, b) => {
      const scoreA = (a.userCorrection ? 100 : 0) + a.usageCount;
      const scoreB = (b.userCorrection ? 100 : 0) + b.usageCount;
      return scoreB - scoreA;
    });
    
    return samples.slice(0, limit);
  } catch (e) {
    console.error('搜索样本失败:', e);
    return [];
  }
}

// 调用 API 进行结构化分析
export async function extractStructuredPrompts(imageBase64: string): Promise<{
  extraction: StructuredPrompt;
  confidence: Record<keyof StructuredPrompt, number>;
  referencedSamples: LearningSample[];
}> {
  // 搜索相似样本作为参考
  const similarSamples = await searchSimilarSamples(imageBase64);
  
  // 构建参考样本的提示
  const referenceSection = similarSamples.length > 0 
    ? `\n\n你有 ${similarSamples.length} 个之前学习过的高质量样本作为参考风格：\n${similarSamples.map((s, i) => 
        `${i + 1}. 【${s.userCorrection ? '用户验证' : 'AI提取'}】\n` + 
        Object.entries(s.userCorrection || s.extraction)
          .filter(([k]) => k !== 'negative')
          .map(([k, v]) => `   - ${DIMENSION_INFO[k as keyof StructuredPrompt]?.name || k}: ${v.slice(0, 50)}`)
          .join('\n')
      ).join('\n')}\n\n请学习并保持一致的提取风格和粒度。`
    : '';

  const prompt = `请深度分析这张AI绘画图片，按以下12个维度进行结构化提取，生成专业的提示词。

${referenceSection}

必须严格按以下JSON格式返回（不要添加任何额外文字）：
{
  "extraction": {
    "art_style": "艺术风格描述，如：赛博朋克风格、新海诚动漫风格、写实摄影风格",
    "subject": "画面核心主体，如：一位穿着汉服的少女、未来城市建筑群",
    "composition": "构图方式，如：居中构图、三分法构图、鱼眼超广角、散景背景",
    "color_palette": "色彩方案，如：暖色调、莫兰迪色系、霓虹赛博配色",
    "elements": "画面关键元素，如：樱花飘落、闪电、雨水、古建筑",
    "lighting": "光影效果，如：柔和自然光、体积光、赛博霓虹灯光",
    "camera_angle": "镜头视角，如：平视、45度仰拍、超广角、微距",
    "quality": "画质和技术参数，如：8K超高清、HDR、RAW格式、细节丰富",
    "aspect_ratio": "画面比例，如：16:9 横屏、1:1 正方形、9:16 竖屏",
    "layout": "排版布局，如：左文右图、上下分屏、居中大字排版",
    "text_elements": "画面中的文字/UI元素，如：无文字、极简标题、科技感UI界面",
    "negative": "负面排除词，如：模糊、低画质、畸形、水印"
  },
  "confidence": {
    "art_style": 0.9,
    "subject": 0.95,
    "composition": 0.85,
    "color_palette": 0.9,
    "elements": 0.85,
    "lighting": 0.8,
    "camera_angle": 0.75,
    "quality": 0.9,
    "aspect_ratio": 0.95,
    "layout": 0.7,
    "text_elements": 0.8,
    "negative": 0.6
  }
}

提取要求：
1. 每个维度用中文专业术语描述
2. 关键词之间用逗号分隔
3. 用词要精准、专业、可直接用于AI绘画
4. 负面词要具体，包含常见的缺陷
5. confidence是你对这个维度提取结果的信心分数（0-1之间）`;

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageBase64 } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // 解析 JSON
    try {
      console.log('=== AI 原始响应 ===');
      console.log(text);
      console.log('===================');

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log('✅ 解析成功, extraction:', result.extraction);
        console.log('✅ confidence:', result.confidence);

        // 验证 extraction 字段
        if (!result.extraction || typeof result.extraction !== 'object') {
          throw new Error('API 返回缺少 extraction 字段');
        }

        // 检查并修复空值
        const extraction: any = {};
        for (const key of ['art_style', 'subject', 'composition', 'color_palette', 'elements', 'lighting', 'camera_angle', 'quality', 'aspect_ratio', 'layout', 'text_elements', 'negative']) {
          let val = result.extraction[key];
          if (!val || val === '-' || val.trim() === '') {
            val = 'AI 未能提取该维度内容，请手动编辑';
            console.warn(`⚠️ 字段 ${key} 为空，已替换为默认值`);
          }
          extraction[key] = val;
        }

        return {
          extraction,
          confidence: result.confidence || {
            art_style: 0.7, subject: 0.7, composition: 0.7, color_palette: 0.7, elements: 0.7,
            lighting: 0.7, camera_angle: 0.7, quality: 0.7, aspect_ratio: 0.7, layout: 0.7,
            text_elements: 0.7, negative: 0.5
          },
          referencedSamples: similarSamples,
        };
      }
    } catch (e) {
      console.error('❌ 解析 JSON 失败:', e);
    }

    throw new Error('API 返回格式不正确，请检查终端日志');
  } catch (e: any) {
    console.error('API 调用失败:', e);
    throw new Error(`图片分析失败: ${e.message}`);
  }
}

// 将结构化提示词合并为完整提示词
export function combinePrompt(structured: StructuredPrompt): string {
  const parts: string[] = [];
  
  if (structured.subject) parts.push(structured.subject);
  if (structured.art_style) parts.push(structured.art_style);
  if (structured.composition) parts.push(structured.composition);
  if (structured.color_palette) parts.push(structured.color_palette);
  if (structured.elements) parts.push(structured.elements);
  if (structured.lighting) parts.push(structured.lighting);
  if (structured.camera_angle) parts.push(structured.camera_angle);
  if (structured.quality) parts.push(structured.quality);
  
  return parts.join(', ');
}

// 检查API Key是否已配置
export function hasApiKeyConfigured(): boolean {
  return !!API_KEY && API_KEY !== 'your-api-key-here';
}

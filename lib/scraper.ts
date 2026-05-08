import * as cheerio from "cheerio";

export interface ScrapeResult {
  title: string;
  images: string[];
  prompts: { name: string; content: string }[];
  content: string;
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  // 推特自动转镜像站
  if (url.includes('twitter.com') || url.includes('x.com')) {
    url = url.replace(/https?:\/\/(www\.)?(twitter|x)\.com/, 'https://fxtwitter.com');
  }

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
  } catch (e: any) {
    throw new Error("无法连接到该网站: " + e.message);
  }
  if (!response.ok) {
    throw new Error(`HTTP错误: ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  // 提取标题
  const title = $("title").text() || $("h1").first().text() || "未命名笔记";

  // 提取图片 - 过滤掉小图标和追踪像素
  const images: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const width = parseInt($(el).attr("width") || "0");
    const height = parseInt($(el).attr("height") || "0");
    
    if (src && src.length > 10 && !src.includes("data:image") && (width === 0 || width > 50) && (height === 0 || height > 50)) {
      const fullUrl = src.startsWith("//") ? "https:" + src : src.startsWith("/") ? new URL(url).origin + src : src;
      if (!images.includes(fullUrl)) {
        images.push(fullUrl);
      }
    }
  });

  // 提取正文
  const content = $("article").text() || $("body").text().slice(0, 2000);

  // 智能识别提示词
  const prompts: { name: string; content: string }[] = [];
  const text = $("body").text();
  
  const promptPatterns = [
    /(?:prompt|提示词|咒语)\s*[:：]\s*([^\n]{10,500})/gi,
    /(?:negative prompt|negative|负面提示词|反向提示词)\s*[:：]\s*([^\n]{10,500})/gi,
  ];

  for (const pattern of promptPatterns) {
    let match;
    const globalRegex = new RegExp(pattern.source, "gi");
    while ((match = globalRegex.exec(text)) !== null) {
      const promptText = match[1].trim().replace(/\s+/g, " ");
      if (promptText.length > 10) {
        const isNegative = /negative|负面|反向/i.test(match[0]);
        prompts.push({
          name: isNegative ? "Negative Prompt" : `Prompt ${prompts.length + 1}`,
          content: promptText,
        });
      }
    }
  }

  // 如果没有找到提示词，尝试从meta标签或常见的生图网站结构提取
  if (prompts.length === 0) {
    $("meta[name='description'], meta[property='og:description']").each((_, el) => {
      const desc = $(el).attr("content") || "";
      if (desc.length > 50) {
        prompts.push({ name: "从描述提取", content: desc });
      }
    });
  }

  return { title, images: images.slice(0, 20), prompts, content };
}

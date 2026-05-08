// 一键抓取工具 - 在 Claude 中直接调用
const https = require('https');
const http = require('http');
const cheerio = require('cheerio');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function scrapeTwitter(url) {
  // 使用Nitter实例抓取
  const nitterUrl = url.replace(/https?:\/\/(twitter|x)\.com/i, 'https://nitter.net');
  console.log('正在抓取:', nitterUrl);
  
  const html = await fetchUrl(nitterUrl);
  const $ = cheerio.load(html);
  
  const images = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('/pic/') || src.includes('media')) {
      images.push('https://nitter.net' + src);
    }
  });
  
  const text = $('.tweet-content').first().text();
  
  return {
    title: $('title').text(),
    images: [...new Set(images)],
    text
  };
}

console.log('=== 生图笔记抓取工具 ===');
console.log('用法: 把网址发给我，我帮你抓取后粘贴到笔记里');
console.log('');
console.log('支持:');
console.log('  ✅ 推特/X (自动转镜像站)');
console.log('  ✅ 普通网页');
console.log('  ✅ 公众号文章 (发截图用OCR)');

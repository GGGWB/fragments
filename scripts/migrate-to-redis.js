const fs = require('fs');
const path = require('path');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisRequest(command, ...args) {
  const body = [command, ...args];
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function main() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('请设置环境变量 UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  const dataDir = path.join(__dirname, '..', 'data');
  const files = {
    fragments: 'fragments.json',
    categories: 'categories.json',
    trash: 'trash.json'
  };

  for (const [key, file] of Object.entries(files)) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`${file} 不存在，跳过`);
      continue;
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    await redisRequest('SET', key, JSON.stringify(content));
    console.log(`${key}: ${content.length} 条数据已导入`);
  }

  console.log('迁移完成！');
}

main().catch(console.error);

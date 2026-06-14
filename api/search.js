import { Innertube } from 'youtubei-js';

let ytCache = null;
async function getYT() {
  if (!ytCache) {
    ytCache = await Innertube.create();
  }
  return ytCache;
}

export default async function handler(req, res) {
  // CORS ヘッダーの設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
  }

  try {
    const yt = await getYT();
    const results = await yt.search(q);
    
    // 通常の動画オブジェクトのみを抽出し整形
    const videos = (results.videos || []).map(v => ({
      id: v.id,
      title: v.title ? v.title.toString() : null,
      description: v.description ? v.description.toString() : null,
      duration: v.duration ? v.duration.text : null,
      view_count: v.view_count ? v.view_count.text : null,
      published: v.published ? v.published.text : null,
      thumbnail: v.thumbnails && v.thumbnails[0] ? v.thumbnails[0].url : null,
      author: {
        id: v.author ? v.author.id : null,
        name: v.author ? v.author.name : null,
        thumbnail: v.author && v.author.thumbnails && v.author.thumbnails[0] ? v.author.thumbnails[0].url : null
      }
    }));

    // 5分間エッジネットワークでキャッシュ
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({ success: true, data: videos });
  } catch (error) {
    console.error('Search API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

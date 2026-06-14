import { Innertube } from 'youtube-js';

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

  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Query parameter "videoId" is required' });
  }

  try {
    const yt = await getYT();
    const videoInfo = await yt.getInfo(videoId);
    const basicInfo = videoInfo.basic_info || {};
    
    // 関連動画フィードのパース
    const relatedVideos = (videoInfo.watch_next_feed?.videos || []).map(v => ({
      id: v.id,
      title: v.title ? v.title.toString() : null,
      duration: v.duration ? v.duration.text : null,
      view_count: v.view_count ? v.view_count.text : null,
      published: v.published ? v.published.text : null,
      thumbnail: v.thumbnails && v.thumbnails[0] ? v.thumbnails[0].url : null,
      author: {
        id: v.author ? v.author.id : null,
        name: v.author ? v.author.name : null
      }
    }));

    // 1時間エッジネットワークでキャッシュ
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json({
      success: true,
      data: {
        video: {
          id: basicInfo.id || null,
          title: basicInfo.title || null,
          description: basicInfo.description || null,
          duration: basicInfo.duration || null,
          view_count: basicInfo.view_count || null,
          thumbnail: basicInfo.thumbnail || null,
          like_count: basicInfo.like_count || null,
          channel_id: basicInfo.channel_id || null
        },
        related: relatedVideos
      }
    });
  } catch (error) {
    console.error('Video API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

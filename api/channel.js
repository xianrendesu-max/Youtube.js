import { Innertube } from 'youtubei.js';

let ytCache = null;
async function getYT() {
  if (!ytCache) {
    ytCache = await Innertube.create();
  }
  return ytCache;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { channelId } = req.query;
  if (!channelId) {
    return res.status(400).json({ success: false, error: 'Query parameter "channelId" is required' });
  }

  try {
    const yt = await getYT();
    const channel = await yt.getChannel(channelId);
    const metadata = channel.metadata || {};
    
    let latestVideos = [];
    try {
      const videosTab = await channel.getVideos();
      latestVideos = (videosTab.videos || []).map(v => ({
        id: v.id,
        title: v.title ? v.title.toString() : null,
        view_count: v.view_count ? v.view_count.text : null,
        published: v.published ? v.published.text : null,
        thumbnail: v.thumbnails && v.thumbnails[0] ? v.thumbnails[0].url : null
      }));
    } catch (e) {
      console.warn("Could not fetch videos tab:", e.message);
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json({
      success: true,
      data: {
        id: metadata.id || null,
        name: metadata.title || null,
        description: metadata.description || null,
        avatar: (metadata.avatar && metadata.avatar[0] ? metadata.avatar[0].url : null) || (channel.header?.author?.thumbnails && channel.header.author.thumbnails[0] ? channel.header.author.thumbnails[0].url : null),
        banner: channel.header?.banner?.thumbnails && channel.header.banner.thumbnails[0] ? channel.header.banner.thumbnails[0].url : null,
        subscribers: channel.header?.subscriber_count ? channel.header.subscriber_count.toString() : "非公開",
        videos_count: channel.header?.video_count ? channel.header.video_count.toString() : "0",
        is_verified: channel.header?.author?.is_verified || false,
        latest_videos: latestVideos
      }
    });
  } catch (error) {
    console.error('Channel API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

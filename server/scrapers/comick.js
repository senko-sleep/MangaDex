import BaseScraper from './base.js';

// ComicK - Public API, no Cloudflare, very reliable
export class ComickScraper extends BaseScraper {
  constructor() {
    super('ComicK', 'https://api.comick.fun', false);
  }

  async search(query, page = 1, includeAdult = true) {
    try {
      let url = `${this.baseUrl}/v1.0/search?q=${encodeURIComponent(query)}&limit=24&page=${page}`;
      if (includeAdult) {
        url += '&tachiyomi=true'; // Includes adult content
      }
      const res = await this.client.get(url);
      return (res.data || []).map(m => this.formatManga(m));
    } catch (e) {
      console.error('[ComicK] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true) {
    try {
      let url = `${this.baseUrl}/v1.0/search?sort=follow&limit=24&page=${page}`;
      if (includeAdult) {
        url += '&tachiyomi=true';
      }
      const res = await this.client.get(url);
      return (res.data || []).map(m => this.formatManga(m));
    } catch (e) {
      console.error('[ComicK] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true) {
    try {
      let url = `${this.baseUrl}/v1.0/search?sort=uploaded&limit=24&page=${page}`;
      if (includeAdult) {
        url += '&tachiyomi=true';
      }
      const res = await this.client.get(url);
      return (res.data || []).map(m => this.formatManga(m));
    } catch (e) {
      console.error('[ComicK] Latest error:', e.message);
      return [];
    }
  }

  formatManga(m) {
    const cover = m.md_covers?.[0]?.b2key;
    const contentRating = m.content_rating;
    const isAdult = contentRating === 'erotica' || contentRating === 'pornographic' || contentRating === 'suggestive';

    return {
      id: `comick:${m.slug || m.hid}`,
      sourceId: 'comick',
      slug: m.slug || m.hid,
      title: m.title || m.slug,
      altTitles: m.md_titles?.map(t => t.title) || [],
      cover: cover ? `https://meo.comick.pictures/${cover}` : null,
      status: m.status === 1 ? 'ongoing' : m.status === 2 ? 'completed' : 'unknown',
      contentRating,
      isAdult,
      genres: m.genres || [],
      year: m.year,
      rating: m.rating,
      follows: m.follow_count,
      isLongStrip: m.hid ? true : false,
    };
  }

  async getMangaDetails(id) {
    const slug = id.replace('comick:', '');
    try {
      const res = await this.client.get(`${this.baseUrl}/comic/${slug}`);
      const m = res.data?.comic;
      if (!m) return null;

      const cover = m.md_covers?.[0]?.b2key;
      const genres = m.md_comic_md_genres?.map(g => g.md_genres?.name).filter(Boolean) || [];

      return {
        id,
        sourceId: 'comick',
        slug: m.slug || m.hid,
        title: m.title,
        description: m.desc,
        cover: cover ? `https://meo.comick.pictures/${cover}` : null,
        status: m.status === 1 ? 'ongoing' : m.status === 2 ? 'completed' : 'unknown',
        genres,
        tags: genres,
        year: m.year,
        rating: m.bayesian_rating,
        follows: m.follow_count,
        author: m.authors?.map(a => a.name).join(', '),
        isLongStrip: m.content_rating === 'safe' ? false : true,
      };
    } catch (e) {
      console.error('[ComicK] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const slug = mangaId.replace('comick:', '');
    try {
      const res = await this.client.get(`${this.baseUrl}/comic/${slug}/chapters?lang=en&limit=500`);
      const chapters = res.data?.chapters || [];

      return chapters.map(ch => ({
        id: ch.hid,
        mangaId,
        chapter: ch.chap || '0',
        title: ch.title || '',
        volume: ch.vol,
        date: ch.created_at,
        sourceId: 'comick',
      }));
    } catch (e) {
      console.error('[ComicK] Chapters error:', e.message);
      return [];
    }
  }

  async getChapterPages(chapterId, mangaId) {
    try {
      const res = await this.client.get(`${this.baseUrl}/chapter/${chapterId}`);
      const images = res.data?.chapter?.md_images || [];

      return images.map((img, i) => ({
        page: i + 1,
        url: `https://meo.comick.pictures/${img.b2key}`,
      }));
    } catch (e) {
      console.error('[ComicK] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    try {
      // ComicK has a genres endpoint
      const res = await this.client.get(`${this.baseUrl}/genre`);
      const genres = res.data || [];
      const tags = genres.map(g => g.name).filter(Boolean).sort();
      console.log(`[ComicK] Loaded ${tags.length} official tags`);
      return tags;
    } catch (e) {
      console.error('[ComicK] Tags error:', e.message);
      return [
        'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
        'Isekai', 'Mystery', 'Romance', 'Sci-Fi', 'Seinen', 'Shoujo',
        'Shounen', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
      ];
    }
  }
}

export default ComickScraper;

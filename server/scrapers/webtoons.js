import BaseScraper from './base.js';

// Webtoons - Official LINE Webtoons
export class WebtoonsScraper extends BaseScraper {
  constructor() {
    super('Webtoons', 'https://www.webtoons.com', false);
  }

  async search(query, page = 1, includeAdult = true) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/en/search?keyword=${encodeURIComponent(query)}`);
      if (!$) return [];
      return this.parseSearchResults($);
    } catch (e) {
      console.error('[Webtoons] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/en/top`);
      if (!$) return [];
      return this.parseList($);
    } catch (e) {
      console.error('[Webtoons] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/en/dailySchedule`);
      if (!$) return [];
      return this.parseList($);
    } catch (e) {
      console.error('[Webtoons] Latest error:', e.message);
      return [];
    }
  }

  parseSearchResults($) {
    const results = [];
    $('.card_item, .search_result_item').each((i, el) => {
      const $el = $(el);
      const link = $el.find('a').first().attr('href') || '';
      const titleMatch = link.match(/title_no=(\d+)/);
      const slug = titleMatch ? titleMatch[1] : '';
      const title = $el.find('.subj, .title').first().text().trim();
      const cover = $el.find('img').attr('src') || '';

      if (slug && title) {
        results.push({
          id: `webtoons:${slug}`,
          sourceId: 'webtoons',
          slug,
          title,
          cover,
          isAdult: false,
        });
      }
    });
    return results;
  }

  parseList($) {
    const results = [];
    $('li[class*="daily"] a, .daily_card_item').each((i, el) => {
      const $el = $(el);
      const link = $el.attr('href') || $el.find('a').first().attr('href') || '';
      const titleMatch = link.match(/title_no=(\d+)/);
      const slug = titleMatch ? titleMatch[1] : '';
      const title = $el.find('.subj, .info .subj').text().trim();
      const cover = $el.find('img').attr('src') || '';

      if (slug && title) {
        results.push({
          id: `webtoons:${slug}`,
          sourceId: 'webtoons',
          slug,
          title,
          cover,
          isAdult: false,
        });
      }
    });
    
    // Dedupe
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  async getMangaDetails(id) {
    const slug = id.replace('webtoons:', '');
    try {
      const $ = await this.fetch(`${this.baseUrl}/en/comedy/name/list?title_no=${slug}`);
      if (!$) return null;

      const title = $('h1.subj, .detail_header .subj').first().text().trim();
      const description = $('.summary, .detail_body').text().trim();
      const cover = $('meta[property="og:image"]').attr('content') || '';
      const genres = [];
      $('.genre, .tag').each((i, el) => {
        genres.push($(el).text().trim());
      });

      return {
        id,
        sourceId: 'webtoons',
        slug,
        title,
        description,
        cover,
        genres,
        tags: genres,
        isAdult: false,
        isLongStrip: true,
      };
    } catch (e) {
      console.error('[Webtoons] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const slug = mangaId.replace('webtoons:', '');
    try {
      const $ = await this.fetch(`${this.baseUrl}/en/comedy/name/list?title_no=${slug}`);
      if (!$) return [];

      const chapters = [];
      $('#_listUl li a, .episode_lst li a').each((i, el) => {
        const $el = $(el);
        const link = $el.attr('href') || '';
        const epMatch = link.match(/episode_no=(\d+)/);
        const chNum = epMatch ? epMatch[1] : String(i + 1);

        chapters.push({
          id: chNum,
          mangaId,
          chapter: chNum,
          title: $el.find('.subj, .sub_title').text().trim() || `Episode ${chNum}`,
          sourceId: 'webtoons',
        });
      });
      return chapters.reverse();
    } catch (e) {
      console.error('[Webtoons] Chapters error:', e.message);
      return [];
    }
  }

  async getChapterPages(chapterId, mangaId) {
    const slug = mangaId.replace('webtoons:', '');
    try {
      const $ = await this.fetch(`${this.baseUrl}/en/comedy/name/viewer?title_no=${slug}&episode_no=${chapterId}`);
      if (!$) return [];

      const pages = [];
      $('#_imageList img, .viewer_img img').each((i, el) => {
        const url = $(el).attr('data-url') || $(el).attr('src') || '';
        if (url) {
          pages.push({ page: i + 1, url });
        }
      });
      return pages;
    } catch (e) {
      console.error('[Webtoons] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    return [
      'Action', 'Comedy', 'Drama', 'Fantasy', 'Heartwarming', 'Historical',
      'Horror', 'Informative', 'Mystery', 'Romance', 'School', 'Sci-Fi',
      'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
    ];
  }
}

export default WebtoonsScraper;

import BaseScraper from './base.js';

// MangaKakalot/Manganato - Large library, frequent updates
export class MangaKakalotScraper extends BaseScraper {
  constructor() {
    super('MangaKakalot', 'https://mangakakalot.com', false);
    this.altUrl = 'https://chapmanganato.to';
  }

  async search(query, page = 1) {
    const searchQuery = query.replace(/\s+/g, '_');
    const $ = await this.fetch(`${this.baseUrl}/search/story/${searchQuery}?page=${page}`);
    if (!$) return [];

    const results = [];
    $('.story_item').each((_, el) => {
      const $el = $(el);
      const link = $el.find('h3 a').attr('href') || '';
      const title = $el.find('h3 a').text().trim();
      const cover = $el.find('img').attr('src');
      const chapters = $el.find('.story_chapter a').first().text().trim();

      // Extract ID from URL
      const idMatch = link.match(/manga[-\/]([^\/]+)/);
      const id = idMatch ? idMatch[1] : '';

      if (id && title) {
        results.push({
          id: `mangakakalot:${id}`,
          sourceId: 'mangakakalot',
          slug: id,
          title,
          cover,
          latestChapter: chapters,
          url: link,
        });
      }
    });

    return results;
  }

  async getPopular(page = 1) {
    const $ = await this.fetch(`${this.baseUrl}/manga_list?type=topview&category=all&state=all&page=${page}`);
    if (!$) return [];

    return this.parseList($);
  }

  async getLatest(page = 1) {
    const $ = await this.fetch(`${this.baseUrl}/manga_list?type=latest&category=all&state=all&page=${page}`);
    if (!$) return [];

    return this.parseList($);
  }

  parseList($) {
    const results = [];
    $('.list-truyen-item-wrap').each((_, el) => {
      const $el = $(el);
      const link = $el.find('h3 a').attr('href') || $el.find('a').first().attr('href') || '';
      const title = $el.find('h3 a').text().trim() || $el.find('a').first().attr('title') || '';
      const cover = $el.find('img').attr('src');

      const idMatch = link.match(/manga[-\/]([^\/]+)/);
      const id = idMatch ? idMatch[1] : '';

      if (id && title) {
        results.push({
          id: `mangakakalot:${id}`,
          sourceId: 'mangakakalot',
          slug: id,
          title,
          cover,
          url: link,
        });
      }
    });

    return results;
  }

  async getMangaDetails(id) {
    const slug = id.replace('mangakakalot:', '');

    // Try both domains
    let $ = await this.fetch(`${this.baseUrl}/manga/${slug}`);
    let url = `${this.baseUrl}/manga/${slug}`;

    if (!$ || !$('.manga-info-text').length) {
      $ = await this.fetch(`${this.altUrl}/manga-${slug}`);
      url = `${this.altUrl}/manga-${slug}`;
    }

    if (!$) return null;

    try {
      // Different selectors for different domains
      const isManganato = url.includes('manganato') || url.includes('chapmanganato');

      let title, cover, description, author, status, genres;

      if (isManganato) {
        title = $('.story-info-right h1').text().trim();
        cover = $('.info-image img').attr('src');
        description = $('#panel-story-info-description').text().replace('Description :', '').trim();

        $('.variations-tableInfo tr').each((_, row) => {
          const label = $(row).find('td').first().text().toLowerCase();
          const value = $(row).find('td').last();
          if (label.includes('author')) author = value.text().trim();
          if (label.includes('status')) status = value.text().trim();
          if (label.includes('genre')) genres = value.find('a').map((_, a) => $(a).text().trim()).get();
        });
      } else {
        title = $('h1').first().text().trim() || $('.manga-info-text h1').text().trim();
        cover = $('.manga-info-pic img').attr('src');
        description = $('#noidungm, #panel-story-info-description').text().trim();

        $('.manga-info-text li').each((_, li) => {
          const text = $(li).text();
          if (text.includes('Author')) author = $(li).find('a').text().trim();
          if (text.includes('Status')) status = text.split(':')[1]?.trim();
          if (text.includes('Genres')) genres = $(li).find('a').map((_, a) => $(a).text().trim()).get();
        });
      }

      return {
        id,
        sourceId: 'mangakakalot',
        slug,
        title,
        cover,
        description,
        author,
        status,
        genres: genres || [],
        url,
        isLongStrip: (genres || []).some(g => g.toLowerCase().includes('webtoon') || g.toLowerCase().includes('manhwa')),
      };
    } catch (e) {
      console.error('[MangaKakalot] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const slug = mangaId.replace('mangakakalot:', '');

    // Try both domains
    let $ = await this.fetch(`${this.baseUrl}/manga/${slug}`);
    let isManganato = false;

    if (!$ || !$('.chapter-list').length) {
      $ = await this.fetch(`${this.altUrl}/manga-${slug}`);
      isManganato = true;
    }

    if (!$) return [];

    const chapters = [];
    const selector = isManganato ? '.row-content-chapter li' : '.chapter-list .row';

    $(selector).each((_, el) => {
      const $el = $(el);
      const link = $el.find('a').first();
      const href = link.attr('href') || '';
      const title = link.text().trim();
      const date = $el.find('span').last().text().trim();

      // Extract chapter number
      const chMatch = title.match(/chapter[:\s-]*(\d+\.?\d*)/i) || href.match(/chapter[_-](\d+\.?\d*)/i);
      const chNum = chMatch ? chMatch[1] : '0';

      // Extract chapter ID from URL
      const idMatch = href.match(/chapter[_-]([^\/]+)/i);
      const chId = idMatch ? idMatch[1] : chNum;

      chapters.push({
        id: chId,
        mangaId,
        chapter: chNum,
        title: title.replace(/chapter[:\s-]*\d+\.?\d*/i, '').trim(),
        date,
        url: href,
        sourceId: 'mangakakalot',
      });
    });

    return chapters;
  }

  async getChapterPages(chapterId, mangaId) {
    const slug = mangaId.replace('mangakakalot:', '');

    // Try to construct URL
    let $ = await this.fetch(`${this.baseUrl}/chapter/${slug}/chapter_${chapterId}`);

    if (!$ || !$('.container-chapter-reader img').length) {
      $ = await this.fetch(`${this.altUrl}/manga-${slug}/chapter-${chapterId}`);
    }

    if (!$) return [];

    const pages = [];
    $('.container-chapter-reader img').each((i, img) => {
      const url = $(img).attr('src');
      if (url) {
        pages.push({ page: i + 1, url });
      }
    });

    return pages;
  }

  async getTags() {
    return [
      'Action', 'Adult', 'Adventure', 'Comedy', 'Cooking', 'Doujinshi',
      'Drama', 'Ecchi', 'Fantasy', 'Gender bender', 'Harem', 'Historical',
      'Horror', 'Isekai', 'Josei', 'Manhua', 'Manhwa', 'Martial arts',
      'Mature', 'Mecha', 'Medical', 'Mystery', 'One shot', 'Psychological',
      'Romance', 'School life', 'Sci fi', 'Seinen', 'Shoujo', 'Shoujo ai',
      'Shounen', 'Shounen ai', 'Slice of life', 'Smut', 'Sports',
      'Supernatural', 'Tragedy', 'Webtoons', 'Yaoi', 'Yuri'
    ];
  }
}

export default MangaKakalotScraper;

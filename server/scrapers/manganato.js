import BaseScraper from './base.js';

export class ManganatoScraper extends BaseScraper {
  constructor() {
    super('Manganato', 'https://manganato.com', false);
    this.client.defaults.headers['Referer'] = 'https://manganato.com';
  }

  async search(query, page = 1) {
    try {
      const searchUrl = `${this.baseUrl}/search/story/${encodeURIComponent(query.replace(/\s+/g, '_'))}?page=${page}`;
      const $ = await this.fetch(searchUrl);
      if (!$) return [];

      return this.parseMangaList($);
    } catch (e) {
      console.error('[Manganato] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/genre-all/${page}?type=topview`);
      if (!$) return [];

      return this.parseMangaList($);
    } catch (e) {
      console.error('[Manganato] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/genre-all/${page}?type=latest`);
      if (!$) return [];

      return this.parseMangaList($);
    } catch (e) {
      console.error('[Manganato] Latest error:', e.message);
      return [];
    }
  }

  parseMangaList($) {
    const results = [];

    $('.search-story-item, .content-genres-item').each((_, el) => {
      const $el = $(el);
      const link = $el.find('a').first().attr('href') || '';
      const title = $el.find('.item-title, h3 a').text().trim();
      const cover = $el.find('img').attr('src');

      const idMatch = link.match(/manga-(\w+)/);
      const id = idMatch ? idMatch[1] : '';

      if (id && title) {
        results.push({
          id: `manganato:${id}`,
          sourceId: 'manganato',
          slug: id,
          title,
          cover,
        });
      }
    });

    return results;
  }

  async getMangaDetails(id) {
    const slug = id.replace('manganato:', '');
    const url = `https://chapmanganato.to/manga-${slug}`;

    try {
      const $ = await this.fetch(url);
      if (!$) return null;

      const title = $('.story-info-right h1').text().trim();
      const cover = $('.info-image img').attr('src');
      const description = $('#panel-story-info-description').text().replace('Description :', '').trim();

      const genres = [];
      const author = $('.variations-tableInfo tr:contains("Author") td.table-value').text().trim();
      const status = $('.variations-tableInfo tr:contains("Status") td.table-value').text().trim();

      $('.variations-tableInfo tr:contains("Genres") td.table-value a').each((_, el) => {
        genres.push($(el).text().trim());
      });

      return {
        id,
        sourceId: 'manganato',
        slug,
        title,
        cover,
        description,
        author,
        status,
        genres,
        isLongStrip: false,
      };
    } catch (e) {
      console.error('[Manganato] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const slug = mangaId.replace('manganato:', '');
    const url = `https://chapmanganato.to/manga-${slug}`;

    try {
      const $ = await this.fetch(url);
      if (!$) return [];

      const chapters = [];
      $('.row-content-chapter li').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a').attr('href') || '';
        const title = $el.find('a').text().trim();
        const date = $el.find('.chapter-time').text().trim();

        const chMatch = link.match(/chapter-(\d+(?:\.\d+)?)/);
        const chNum = chMatch ? chMatch[1] : '';

        if (chNum) {
          chapters.push({
            id: `${slug}-chapter-${chNum}`,
            mangaId,
            chapter: chNum,
            title,
            date,
            sourceId: 'manganato',
          });
        }
      });

      return chapters;
    } catch (e) {
      console.error('[Manganato] Chapters error:', e.message);
      return [];
    }
  }

  async getChapterPages(chapterId, mangaId) {
    const slug = mangaId.replace('manganato:', '');
    const chNum = chapterId.replace(`${slug}-chapter-`, '');
    const url = `https://chapmanganato.to/manga-${slug}/chapter-${chNum}`;

    try {
      const $ = await this.fetch(url);
      if (!$) return [];

      const pages = [];
      $('.container-chapter-reader img').each((i, img) => {
        const src = $(img).attr('src');
        if (src) {
          pages.push({ page: i + 1, url: src });
        }
      });

      return pages;
    } catch (e) {
      console.error('[Manganato] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    try {
      // Scrape official genres from Manganato
      const $ = await this.fetch(`${this.baseUrl}/genre-all`);
      if (!$) throw new Error('Failed to fetch genre page');

      const tags = [];
      // Try multiple selectors
      $('table.table-genre a, .panel-category a, .genres-item-name, a[href*="/genre-"]').each((_, el) => {
        let genre = $(el).text().trim();
        // Clean up the genre name
        genre = genre.replace(/\(\d+\)/, '').trim();
        if (genre && genre.length > 1 && genre.length < 30 && !tags.includes(genre)) {
          tags.push(genre);
        }
      });

      if (tags.length > 0) {
        console.log(`[Manganato] Loaded ${tags.length} official tags`);
        return tags.sort();
      }

      throw new Error('No tags found in page');
    } catch (e) {
      console.error('[Manganato] Tags error:', e.message);
      // Return comprehensive fallback tags
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
}

export default ManganatoScraper;

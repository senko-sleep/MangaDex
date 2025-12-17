import BaseScraper from './base.js';

// E-Hentai - Adult content using JSON API
export class EHentaiScraper extends BaseScraper {
  constructor() {
    super('E-Hentai', 'https://e-hentai.org', true);
    this.apiUrl = 'https://api.e-hentai.org/api.php';
  }

  async fetchApi(method, params = {}) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({ method, ...params }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error('[E-Hentai] API error:', e.message);
      return null;
    }
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      let searchQuery = query || '';

      if (language && language !== 'all') {
        searchQuery += ` language:${language}`;
      }

      if (tags.length > 0) {
        searchQuery += ' ' + tags.map(t => `"${t}$"`).join(' ');
      }

      if (excludeTags.length > 0) {
        searchQuery += ' ' + excludeTags.map(t => `-"${t}$"`).join(' ');
      }

      const searchUrl = `${this.baseUrl}/?f_search=${encodeURIComponent(
        searchQuery.trim()
      )}&page=${page - 1}`;

      const $ = await this.fetch(searchUrl);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[E-Hentai] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      if (!Array.isArray(tags)) tags = [];
      if (!Array.isArray(excludeTags)) excludeTags = [];

      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        return this.search('', page, includeAdult, tags, excludeTags, language);
      }

      const $ = await this.fetch(`${this.baseUrl}/popular?page=${page - 1}`);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[E-Hentai] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        return this.search('', page, includeAdult, tags, excludeTags, language);
      }

      const $ = await this.fetch(`${this.baseUrl}/?page=${page - 1}`);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[E-Hentai] Latest error:', e.message);
      return [];
    }
  }

  parseGalleryList($) {
    const results = [];

    $('table.itg tr, .gl1t').each((_, el) => {
      const $el = $(el);

      const link = $el.find('a[href*="/g/"]').first();
      const href = link.attr('href') || '';
      const match = href.match(/\/g\/(\d+)\/([a-f0-9]+)/);

      if (!match) return;

      const [, gid, token] = match;
      const title =
        $el.find('.glink, .gl4t a').text().trim() || link.text().trim();

      let cover =
        $el.find('img').first().attr('data-src') ||
        $el.find('img').first().attr('src');

      if (cover && !cover.startsWith('http')) {
        cover = `https:${cover}`;
      }

      const category = $el
        .find('.cn, .cs, .ct')
        .first()
        .text()
        .trim()
        .toLowerCase();

      if (gid && title) {
        results.push({
          id: `ehentai:${gid}_${token}`,
          sourceId: 'ehentai',
          slug: `${gid}/${token}`,
          title,
          cover: cover
            ? `/api/proxy/image?url=${encodeURIComponent(cover)}`
            : null,
          category,
          isAdult: true,
          contentType: this.mapCategory(category),
        });
      }
    });

    return results;
  }

  mapCategory(cat) {
    const catMap = {
      'doujinshi': 'doujinshi',
      'manga': 'manga',
      'artist cg': 'artistcg',
      'game cg': 'gamecg',
      'western': 'western',
      'image set': 'imageset',
      'cosplay': 'cosplay',
      'non-h': 'manga',
      'misc': 'imageset',
    };
    return catMap[cat] || 'doujinshi';
  }

  async getMangaDetails(id) {
    const slug = id.replace('ehentai:', '');
    const [gid, token] = slug.split('_');

    try {
      const data = await this.fetchApi('gdata', {
        gidlist: [[parseInt(gid, 10), token]],
        namespace: 1,
      });

      if (!data?.gmetadata?.[0]) return null;
      const gallery = data.gmetadata[0];

      const tags = [];
      const artists = [];
      const groups = [];
      const parodies = [];
      const characters = [];

      for (const tag of gallery.tags || []) {
        const [ns, name] = tag.includes(':') ? tag.split(':') : ['misc', tag];
        switch (ns) {
          case 'artist': artists.push(name); break;
          case 'group': groups.push(name); break;
          case 'parody': parodies.push(name); break;
          case 'character': characters.push(name); break;
          default: tags.push(name);
        }
      }

      return {
        id,
        sourceId: 'ehentai',
        slug,
        title: gallery.title || gallery.title_jpn || `Gallery ${gid}`,
        titleJpn: gallery.title_jpn,
        cover: gallery.thumb
          ? `/api/proxy/image?url=${encodeURIComponent(gallery.thumb)}`
          : null,
        tags,
        artists,
        groups,
        parodies,
        characters,
        category: gallery.category?.toLowerCase(),
        pageCount: gallery.filecount || 0,
        rating: parseFloat(gallery.rating) || 0,
        isAdult: true,
        isLongStrip: false,
      };
    } catch (e) {
      console.error('[E-Hentai] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const slug = mangaId.replace('ehentai:', '');
    return [{
      id: slug,
      mangaId,
      chapter: '1',
      title: 'Full Gallery',
      sourceId: 'ehentai',
    }];
  }

  async getTags() {
    return [
      'translated', 'chinese', 'english', 'japanese', 'full color',
      'sole female', 'sole male', 'femdom', 'big breasts', 'ahegao',
      'nakadashi', 'schoolgirl uniform', 'stockings', 'glasses',
      'blowjob', 'paizuri', 'anal', 'group', 'netorare', 'vanilla',
    ];
  }

  async getNewlyAdded(page = 1) {
    return this.getLatest(page);
  }

  async getTopRated(page = 1) {
    return this.getPopular(page);
  }
}

export default EHentaiScraper;

/**
 * Tag Management System
 * Supports up to 1 million+ tags for organizing manga
 * Uses efficient indexing for fast lookups
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const TAG_INDEX_FILE = path.join(DATA_DIR, 'tag-index.json');
const MANGA_TAGS_FILE = path.join(DATA_DIR, 'manga-tags.json');

// In-memory cache for fast access
let tagsCache = null;
let tagIndexCache = null;
let mangaTagsCache = null;

// Tag groups for organization
const TAG_GROUPS = [
  'genre',
  'theme', 
  'demographic',
  'format',
  'content',
  'character',
  'setting',
  'mood',
  'artist',
  'author',
  'year',
  'status',
  'language',
  'source',
  'custom'
];

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load tags from disk
 */
function loadTags() {
  if (tagsCache) return tagsCache;
  
  ensureDataDir();
  
  if (fs.existsSync(TAGS_FILE)) {
    try {
      tagsCache = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf-8'));
    } catch {
      tagsCache = {};
    }
  } else {
    tagsCache = {};
  }
  
  return tagsCache;
}

/**
 * Load tag index from disk
 */
function loadTagIndex() {
  if (tagIndexCache) return tagIndexCache;
  
  ensureDataDir();
  
  if (fs.existsSync(TAG_INDEX_FILE)) {
    try {
      tagIndexCache = JSON.parse(fs.readFileSync(TAG_INDEX_FILE, 'utf-8'));
    } catch {
      tagIndexCache = { byName: {}, byGroup: {} };
    }
  } else {
    tagIndexCache = { byName: {}, byGroup: {} };
  }
  
  return tagIndexCache;
}

/**
 * Load manga-tags mapping from disk
 */
function loadMangaTags() {
  if (mangaTagsCache) return mangaTagsCache;
  
  ensureDataDir();
  
  if (fs.existsSync(MANGA_TAGS_FILE)) {
    try {
      mangaTagsCache = JSON.parse(fs.readFileSync(MANGA_TAGS_FILE, 'utf-8'));
    } catch {
      mangaTagsCache = { byManga: {}, byTag: {} };
    }
  } else {
    mangaTagsCache = { byManga: {}, byTag: {} };
  }
  
  return mangaTagsCache;
}

/**
 * Save tags to disk
 */
function saveTags() {
  ensureDataDir();
  fs.writeFileSync(TAGS_FILE, JSON.stringify(tagsCache, null, 2));
}

/**
 * Save tag index to disk
 */
function saveTagIndex() {
  ensureDataDir();
  fs.writeFileSync(TAG_INDEX_FILE, JSON.stringify(tagIndexCache));
}

/**
 * Save manga-tags mapping to disk
 */
function saveMangaTags() {
  ensureDataDir();
  fs.writeFileSync(MANGA_TAGS_FILE, JSON.stringify(mangaTagsCache));
}

/**
 * Generate unique tag ID
 */
function generateTagId() {
  return `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Normalize tag name for indexing
 */
function normalizeTagName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Create a new tag
 */
export function createTag(name, group = 'custom', metadata = {}) {
  const tags = loadTags();
  const index = loadTagIndex();
  
  const normalizedName = normalizeTagName(name);
  
  // Check if tag already exists
  if (index.byName[normalizedName]) {
    return { exists: true, tag: tags[index.byName[normalizedName]] };
  }
  
  const id = generateTagId();
  const tag = {
    id,
    name: name.trim(),
    normalizedName,
    group: TAG_GROUPS.includes(group) ? group : 'custom',
    usageCount: 0,
    createdAt: new Date().toISOString(),
    ...metadata
  };
  
  // Store tag
  tags[id] = tag;
  tagsCache = tags;
  
  // Update index
  index.byName[normalizedName] = id;
  if (!index.byGroup[tag.group]) {
    index.byGroup[tag.group] = [];
  }
  index.byGroup[tag.group].push(id);
  tagIndexCache = index;
  
  // Persist
  saveTags();
  saveTagIndex();
  
  return { exists: false, tag };
}

/**
 * Create multiple tags at once (bulk operation)
 */
export function createTags(tagList) {
  const results = [];
  
  for (const item of tagList) {
    const { name, group, ...metadata } = typeof item === 'string' 
      ? { name: item, group: 'custom' } 
      : item;
    results.push(createTag(name, group, metadata));
  }
  
  return results;
}

/**
 * Get tag by ID
 */
export function getTag(id) {
  const tags = loadTags();
  return tags[id] || null;
}

/**
 * Get tag by name
 */
export function getTagByName(name) {
  const index = loadTagIndex();
  const tags = loadTags();
  
  const normalizedName = normalizeTagName(name);
  const id = index.byName[normalizedName];
  
  return id ? tags[id] : null;
}

/**
 * Search tags by query
 */
export function searchTags(query, options = {}) {
  const { group, limit = 50, offset = 0 } = options;
  const tags = loadTags();
  const index = loadTagIndex();
  
  const normalizedQuery = normalizeTagName(query);
  let tagIds = Object.keys(tags);
  
  // Filter by group if specified
  if (group && index.byGroup[group]) {
    tagIds = index.byGroup[group];
  }
  
  // Filter by query
  const matches = tagIds
    .filter(id => {
      const tag = tags[id];
      return tag.normalizedName.includes(normalizedQuery) ||
             tag.name.toLowerCase().includes(query.toLowerCase());
    })
    .map(id => tags[id])
    .sort((a, b) => b.usageCount - a.usageCount);
  
  return {
    tags: matches.slice(offset, offset + limit),
    total: matches.length,
    hasMore: offset + limit < matches.length
  };
}

/**
 * Get all tags in a group
 */
export function getTagsByGroup(group, options = {}) {
  const { limit = 100, offset = 0, sortBy = 'usageCount' } = options;
  const tags = loadTags();
  const index = loadTagIndex();
  
  const tagIds = index.byGroup[group] || [];
  const groupTags = tagIds
    .map(id => tags[id])
    .filter(Boolean)
    .sort((a, b) => {
      if (sortBy === 'usageCount') return b.usageCount - a.usageCount;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'createdAt') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });
  
  return {
    tags: groupTags.slice(offset, offset + limit),
    total: groupTags.length,
    hasMore: offset + limit < groupTags.length
  };
}

/**
 * Get popular tags
 */
export function getPopularTags(limit = 50) {
  const tags = loadTags();
  
  return Object.values(tags)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

/**
 * Tag a manga with multiple tags
 */
export function tagManga(mangaId, tagIds) {
  const mangaTags = loadMangaTags();
  const tags = loadTags();
  
  // Initialize manga entry if not exists
  if (!mangaTags.byManga[mangaId]) {
    mangaTags.byManga[mangaId] = [];
  }
  
  const addedTags = [];
  
  for (const tagId of tagIds) {
    // Skip if tag doesn't exist
    if (!tags[tagId]) continue;
    
    // Skip if already tagged
    if (mangaTags.byManga[mangaId].includes(tagId)) continue;
    
    // Add to manga's tags
    mangaTags.byManga[mangaId].push(tagId);
    
    // Add to tag's manga list
    if (!mangaTags.byTag[tagId]) {
      mangaTags.byTag[tagId] = [];
    }
    mangaTags.byTag[tagId].push(mangaId);
    
    // Increment usage count
    tags[tagId].usageCount++;
    
    addedTags.push(tagId);
  }
  
  mangaTagsCache = mangaTags;
  tagsCache = tags;
  
  saveMangaTags();
  saveTags();
  
  return addedTags;
}

/**
 * Remove tags from a manga
 */
export function untagManga(mangaId, tagIds) {
  const mangaTags = loadMangaTags();
  const tags = loadTags();
  
  if (!mangaTags.byManga[mangaId]) return [];
  
  const removedTags = [];
  
  for (const tagId of tagIds) {
    const index = mangaTags.byManga[mangaId].indexOf(tagId);
    if (index === -1) continue;
    
    // Remove from manga's tags
    mangaTags.byManga[mangaId].splice(index, 1);
    
    // Remove from tag's manga list
    if (mangaTags.byTag[tagId]) {
      const mangaIndex = mangaTags.byTag[tagId].indexOf(mangaId);
      if (mangaIndex !== -1) {
        mangaTags.byTag[tagId].splice(mangaIndex, 1);
      }
    }
    
    // Decrement usage count
    if (tags[tagId]) {
      tags[tagId].usageCount = Math.max(0, tags[tagId].usageCount - 1);
    }
    
    removedTags.push(tagId);
  }
  
  mangaTagsCache = mangaTags;
  tagsCache = tags;
  
  saveMangaTags();
  saveTags();
  
  return removedTags;
}

/**
 * Get all tags for a manga
 */
export function getMangaTags(mangaId) {
  const mangaTags = loadMangaTags();
  const tags = loadTags();
  
  const tagIds = mangaTags.byManga[mangaId] || [];
  return tagIds.map(id => tags[id]).filter(Boolean);
}

/**
 * Get all manga IDs with a specific tag
 */
export function getMangaByTag(tagId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const mangaTags = loadMangaTags();
  
  const mangaIds = mangaTags.byTag[tagId] || [];
  
  return {
    mangaIds: mangaIds.slice(offset, offset + limit),
    total: mangaIds.length,
    hasMore: offset + limit < mangaIds.length
  };
}

/**
 * Get all manga IDs matching all specified tags (AND query)
 */
export function getMangaByTags(tagIds, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const mangaTags = loadMangaTags();
  
  if (tagIds.length === 0) return { mangaIds: [], total: 0, hasMore: false };
  
  // Start with first tag's manga list
  let matchingManga = new Set(mangaTags.byTag[tagIds[0]] || []);
  
  // Intersect with each subsequent tag
  for (let i = 1; i < tagIds.length; i++) {
    const tagManga = new Set(mangaTags.byTag[tagIds[i]] || []);
    matchingManga = new Set([...matchingManga].filter(id => tagManga.has(id)));
  }
  
  const mangaIds = Array.from(matchingManga);
  
  return {
    mangaIds: mangaIds.slice(offset, offset + limit),
    total: mangaIds.length,
    hasMore: offset + limit < mangaIds.length
  };
}

/**
 * Delete a tag
 */
export function deleteTag(id) {
  const tags = loadTags();
  const index = loadTagIndex();
  const mangaTags = loadMangaTags();
  
  const tag = tags[id];
  if (!tag) return false;
  
  // Remove from index
  delete index.byName[tag.normalizedName];
  if (index.byGroup[tag.group]) {
    const groupIndex = index.byGroup[tag.group].indexOf(id);
    if (groupIndex !== -1) {
      index.byGroup[tag.group].splice(groupIndex, 1);
    }
  }
  
  // Remove from all manga
  const mangaWithTag = mangaTags.byTag[id] || [];
  for (const mangaId of mangaWithTag) {
    if (mangaTags.byManga[mangaId]) {
      const tagIndex = mangaTags.byManga[mangaId].indexOf(id);
      if (tagIndex !== -1) {
        mangaTags.byManga[mangaId].splice(tagIndex, 1);
      }
    }
  }
  delete mangaTags.byTag[id];
  
  // Delete tag
  delete tags[id];
  
  tagsCache = tags;
  tagIndexCache = index;
  mangaTagsCache = mangaTags;
  
  saveTags();
  saveTagIndex();
  saveMangaTags();
  
  return true;
}

/**
 * Get tag statistics
 */
export function getTagStats() {
  const tags = loadTags();
  const index = loadTagIndex();
  
  const totalTags = Object.keys(tags).length;
  const groupCounts = {};
  
  for (const group of TAG_GROUPS) {
    groupCounts[group] = (index.byGroup[group] || []).length;
  }
  
  const topTags = Object.values(tags)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);
  
  return {
    totalTags,
    groupCounts,
    topTags,
    groups: TAG_GROUPS
  };
}

/**
 * Sync tags from MangaDex API response
 */
export function syncMangaDexTags(mangaId, apiTags) {
  const results = { created: 0, existing: 0, tagged: 0 };
  const tagIds = [];
  
  for (const apiTag of apiTags) {
    const name = apiTag.name || apiTag.attributes?.name?.en || 'Unknown';
    const group = mapMangaDexGroup(apiTag.group || apiTag.attributes?.group);
    
    const result = createTag(name, group, {
      mangadexId: apiTag.id,
      description: apiTag.attributes?.description?.en
    });
    
    if (result.exists) {
      results.existing++;
    } else {
      results.created++;
    }
    
    tagIds.push(result.tag.id);
  }
  
  // Tag the manga
  const addedTags = tagManga(mangaId, tagIds);
  results.tagged = addedTags.length;
  
  return results;
}

/**
 * Map MangaDex tag group to our groups
 */
function mapMangaDexGroup(mdGroup) {
  const mapping = {
    'content': 'content',
    'format': 'format',
    'genre': 'genre',
    'theme': 'theme'
  };
  return mapping[mdGroup] || 'custom';
}

/**
 * Clear all caches (use after external modifications)
 */
export function clearCaches() {
  tagsCache = null;
  tagIndexCache = null;
  mangaTagsCache = null;
}

export default {
  TAG_GROUPS,
  createTag,
  createTags,
  getTag,
  getTagByName,
  searchTags,
  getTagsByGroup,
  getPopularTags,
  tagManga,
  untagManga,
  getMangaTags,
  getMangaByTag,
  getMangaByTags,
  deleteTag,
  getTagStats,
  syncMangaDexTags,
  clearCaches
};

/**
 * CMS API service layer for Strapi single-type endpoints
 * Provides fetch functions for all page content
 */

import { apiRequest } from './api';
import { 
  Homepage, 
  Academics, 
  Questionnaires, 
  Resources, 
  Announcements, 
  ContactUs,
  CmsMediaFile,
  StrapiCollectionResponse,
  StrapiSingleTypeResponse 
} from '../types/strapi';

const CMS_API_ENDPOINTS = {
  HOMEPAGE: '/api/homepage',
  ACADEMICS: '/api/academics',
  QUESTIONNAIRES: '/api/questionnaires',
  RESOURCES: '/api/resources',
  ANNOUNCEMENTS: '/api/announcements',
  CONTACT_US: '/api/contact-us',
  PAGES: '/api/pages',
} as const;

/** Default populate query to fetch all relations */
const DEFAULT_POPULATE = 'populate=*';
const PAGE_POPULATE = [
  'populate[blocks][on][shared.rich-text][populate]=*',
  'populate[blocks][on][shared.quote][populate]=*',
  'populate[blocks][on][shared.media][populate]=*',
  'populate[blocks][on][shared.slider][populate]=*',
].join('&');

type CmsBlock = {
  __component?: string;
  type?: string;
  content?: string;
  body?: string;
  title?: string;
  quote?: string;
  author?: string;
  anchor?: string;
  file?: unknown;
  media?: unknown;
  files?: unknown;
  slides?: unknown;
};

function unwrapRelationData(value: unknown): any {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const maybeData = (value as any).data;
  if (maybeData && typeof maybeData === 'object') {
    return unwrapRelationData(maybeData);
  }

  const maybeAttributes = (value as any).attributes;
  if (maybeAttributes && typeof maybeAttributes === 'object') {
    return {
      ...(value as any),
      ...maybeAttributes,
    };
  }

  return value;
}

function normalizeMediaFile(file: unknown): CmsMediaFile | null {
  const media = unwrapRelationData(file);

  if (!media || typeof media !== 'object') {
    return null;
  }

  const mediaObject = media as any;
  const url = mediaObject.url || mediaObject?.attributes?.url;

  if (!url || typeof url !== 'string') {
    return null;
  }

  const attributes = mediaObject.attributes && typeof mediaObject.attributes === 'object'
    ? mediaObject.attributes
    : {};

  return {
    id: typeof mediaObject.id === 'number' ? mediaObject.id : undefined,
    url,
    alternativeText: mediaObject.alternativeText ?? attributes.alternativeText,
    caption: mediaObject.caption ?? attributes.caption,
    name: mediaObject.name ?? attributes.name,
    mime: mediaObject.mime ?? attributes.mime,
    ext: mediaObject.ext ?? attributes.ext,
    width: mediaObject.width ?? attributes.width,
    height: mediaObject.height ?? attributes.height,
    size: mediaObject.size ?? attributes.size,
  };
}

function normalizeMediaFiles(files: unknown): CmsMediaFile[] {
  const rawFiles: unknown[] = Array.isArray(files)
    ? files
    : Array.isArray((files as any)?.data)
      ? (files as any).data
      : [];

  return rawFiles.map((file) => normalizeMediaFile(file)).filter((file): file is CmsMediaFile => file !== null);
}

function normalizeBlocks(blocks: unknown): Homepage['blocks'] {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return (blocks as CmsBlock[])
    .map((block) => {
      const component = block.__component || '';

      if (component === 'shared.rich-text' || block.type === 'rich-text') {
        const body = typeof block.body === 'string' ? block.body : (typeof block.content === 'string' ? block.content : '');

        if (!body) {
          return null;
        }

        return {
          __component: 'shared.rich-text' as const,
          body,
          anchor: block.anchor,
        };
      }

      if (component === 'shared.quote' || block.type === 'quote') {
        const title = typeof block.title === 'string' ? block.title : (typeof block.author === 'string' ? block.author : '');
        const body = typeof block.body === 'string' ? block.body : (typeof block.quote === 'string' ? block.quote : '');

        if (!title && !body) {
          return null;
        }

        return {
          __component: 'shared.quote' as const,
          title,
          body,
          anchor: block.anchor,
        };
      }

      if (component === 'shared.media' || block.type === 'media') {
        const file = normalizeMediaFile(block.file ?? block.media);

        if (!file) {
          return null;
        }

        return {
          __component: 'shared.media' as const,
          file,
          anchor: block.anchor,
        };
      }

      if (component === 'shared.slider' || block.type === 'slider') {
        const files = normalizeMediaFiles(block.files ?? block.slides);

        if (files.length === 0) {
          return null;
        }

        return {
          __component: 'shared.slider' as const,
          files,
          anchor: block.anchor,
        };
      }

      return null;
    })
    .filter((block): block is NonNullable<typeof block> => block !== null);
}

function unwrapSingleTypeData<T>(data: T | { attributes?: T }): T {
  if (data && typeof data === 'object' && 'attributes' in (data as any) && (data as any).attributes) {
    return {
      ...(data as any),
      ...(data as any).attributes,
    } as T;
  }

  return data as T;
}

function normalizeSingleTypeResponse<T extends { blocks?: unknown }>(data: T): T {
  const normalizedData = unwrapSingleTypeData(data);

  return {
    ...normalizedData,
    blocks: normalizeBlocks(normalizedData?.blocks),
  };
}

function normalizePageResponse<T extends { blocks?: unknown }>(page: T): T {
  return normalizeSingleTypeResponse(page);
}

/**
 * Fetch homepage content
 */
export async function getHomepage(): Promise<Homepage> {
  try {
    const response = await apiRequest<StrapiSingleTypeResponse<Homepage>>(
      `${CMS_API_ENDPOINTS.HOMEPAGE}?${PAGE_POPULATE}`,
      { auth: false }
    );
    return normalizeSingleTypeResponse((response.data || {}) as Homepage);
  } catch (error) {
    console.error('Error fetching homepage:', error);
    throw error;
  }
}

/**
 * Fetch a CMS page by slug from the generic pages collection.
 */
export async function getPageBySlug(slug: string): Promise<Homepage> {
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    throw new Error('Page slug is required.');
  }

  try {
    const response = await apiRequest<StrapiCollectionResponse<Homepage>>(
      `${CMS_API_ENDPOINTS.PAGES}?filters[slug][$eq]=${encodeURIComponent(normalizedSlug)}&${PAGE_POPULATE}`,
      { auth: false }
    );

    const page = Array.isArray(response.data) ? response.data[0] : undefined;

    if (!page) {
      throw new Error(`Page not found for slug: ${normalizedSlug}`);
    }

    return normalizePageResponse(page as Homepage);
  } catch (error) {
    console.error(`Error fetching page by slug (${normalizedSlug}):`, error);
    throw error;
  }
}

/**
 * Fetch academics content
 */
export async function getAcademics(): Promise<Academics> {
  try {
    const response = await apiRequest<StrapiSingleTypeResponse<Academics>>(
      `${CMS_API_ENDPOINTS.ACADEMICS}?${DEFAULT_POPULATE}`,
      { auth: false }
    );
    return normalizeSingleTypeResponse((response.data || {}) as Academics);
  } catch (error) {
    console.error('Error fetching academics:', error);
    throw error;
  }
}

/**
 * Fetch questionnaires content
 */
export async function getQuestionnaires(): Promise<Questionnaires> {
  try {
    const response = await apiRequest<StrapiSingleTypeResponse<Questionnaires>>(
      `${CMS_API_ENDPOINTS.QUESTIONNAIRES}?${DEFAULT_POPULATE}`,
      { auth: false }
    );
    return normalizeSingleTypeResponse((response.data || {}) as Questionnaires);
  } catch (error) {
    console.error('Error fetching questionnaires:', error);
    throw error;
  }
}

/**
 * Fetch resources content
 */
export async function getResources(): Promise<Resources> {
  try {
    const response = await apiRequest<StrapiSingleTypeResponse<Resources>>(
      `${CMS_API_ENDPOINTS.RESOURCES}?${DEFAULT_POPULATE}`,
      { auth: false }
    );
    return normalizeSingleTypeResponse((response.data || {}) as Resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
}

/**
 * Fetch announcements content
 */
export async function getAnnouncements(): Promise<Announcements> {
  try {
    const response = await apiRequest<StrapiSingleTypeResponse<Announcements>>(
      `${CMS_API_ENDPOINTS.ANNOUNCEMENTS}?${DEFAULT_POPULATE}`,
      { auth: false }
    );
    return normalizeSingleTypeResponse((response.data || {}) as Announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
}

/**
 * Fetch contact us content
 */
export async function getContactUs(): Promise<ContactUs> {
  try {
    // Use the exact single-type endpoint requested by backend contract.
    const directResponse = await apiRequest<StrapiSingleTypeResponse<ContactUs>>(
      CMS_API_ENDPOINTS.CONTACT_US,
      { auth: false }
    );

    const directData = normalizeSingleTypeResponse((directResponse.data || {}) as ContactUs);

    // If blocks are missing from direct response, fetch populated payload.
    if (!directData.blocks || directData.blocks.length === 0) {
      const populatedResponse = await apiRequest<StrapiSingleTypeResponse<ContactUs>>(
        `${CMS_API_ENDPOINTS.CONTACT_US}?${DEFAULT_POPULATE}`,
        { auth: false }
      );
      return normalizeSingleTypeResponse((populatedResponse.data || {}) as ContactUs);
    }

    return directData;
  } catch (error) {
    try {
      // Fallback for setups that require explicit relation population.
      const populatedResponse = await apiRequest<StrapiSingleTypeResponse<ContactUs>>(
        `${CMS_API_ENDPOINTS.CONTACT_US}?${DEFAULT_POPULATE}`,
        { auth: false }
      );
      return normalizeSingleTypeResponse((populatedResponse.data || {}) as ContactUs);
    } catch (fallbackError) {
      console.error('Error fetching contact us:', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Helper function to check if content is loaded and not empty
 */
export function isContentLoaded(content: any): boolean {
  if (!content) return false;
  if (!content.id) return false;
  return true;
}

/**
 * Helper function to construct proper media/image URL with Strapi base for relative paths
 */
export function getStrapiMediaUrl(relativePath: string): string {
  if (!relativePath) return '';
  
  // Already absolute URL
  if (relativePath.startsWith('http')) {
    return relativePath;
  }
  
  // Get the Strapi backend URL from env
  const strapiBase = (import.meta.env.VITE_STRAPI_URL || '').replace(/\/$/, '');
  if (!strapiBase) {
    // Fallback: return as-is, the server might handle it
    return relativePath;
  }
  
  // Construct full URL: base + path
  return `${strapiBase}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}

/**
 * Helper function to get image URL from Strapi media response
 */
export function getImageUrl(imageData: any): string | null {
  if (!imageData?.data?.attributes?.url) {
    return null;
  }
  const url = imageData.data.attributes.url;
  // Handle relative URLs from Strapi - construct absolute URL for production
  if (url.startsWith('/uploads') || url.startsWith('http')) {
    return getStrapiMediaUrl(url);
  }
  return url;
}

/**
 * Helper function to safely render rich text (basic HTML sanitization)
 * For production, consider using a library like DOMPurify
 */
export function renderRichText(html: string): string {
  if (!html) return '';
  // Basic XSS prevention - strip script tags
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

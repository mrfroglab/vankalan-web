/** Klien API galeri kenangan. Galeri butuh backend (tidak ada mode localStorage). */

import type { GalleryPhoto, GallerySettings, GalleryStatus, PublicGalleryPhoto } from '@/types';
import { apiRequest } from './client';

export interface PublicGalleryPage {
  photos: PublicGalleryPhoto[];
  nextCursor: string | null;
  submissionsOpen: boolean;
  limits: { nameMax: number; captionMax: number; maxBytes: number };
}

export function galleryImageUrl(id: string, size: 'thumb' | 'full' = 'full'): string {
  return `/api/gallery/${encodeURIComponent(id)}/image${size === 'thumb' ? '?size=thumb' : ''}`;
}

export const galleryService = {
  list(cursor?: string | null): Promise<PublicGalleryPage> {
    return apiRequest(`/api/gallery${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`);
  },

  submit(input: { photo: File; name: string; caption: string }): Promise<{ status: GalleryStatus }> {
    const form = new FormData();
    form.set('photo', input.photo);
    form.set('name', input.name);
    form.set('caption', input.caption);
    form.set('consent', 'true');
    return apiRequest('/api/gallery', { method: 'POST', body: form });
  },

  adminList(status: GalleryStatus): Promise<{ photos: GalleryPhoto[]; counts: Record<GalleryStatus, number> }> {
    return apiRequest(`/api/gallery/admin?status=${status}`);
  },

  approve(id: string, caption?: string): Promise<GalleryPhoto> {
    return apiRequest(`/api/gallery/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve', ...(caption !== undefined ? { caption } : {}) }),
    });
  },

  unpublish(id: string): Promise<GalleryPhoto> {
    return apiRequest(`/api/gallery/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'unpublish' }),
    });
  },

  remove(id: string): Promise<{ ok: true }> {
    return apiRequest(`/api/gallery/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getSettings(): Promise<GallerySettings> {
    return apiRequest('/api/gallery/settings');
  },

  saveSettings(s: GallerySettings): Promise<GallerySettings> {
    return apiRequest('/api/gallery/settings', { method: 'PUT', body: JSON.stringify(s) });
  },
};

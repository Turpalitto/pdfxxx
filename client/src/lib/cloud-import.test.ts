import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  availableCloudProviders,
  driveDownloadUrl,
  driveFileName,
  dropboxFileNameFromLink,
  fileFromDownload,
  getCloudImportConfig,
} from './cloud-import';

describe('cloud-import', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    vi.stubEnv('VITE_GOOGLE_PICKER_KEY', '');
    vi.stubEnv('VITE_DROPBOX_APP_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('offers no providers without env keys', () => {
    expect(availableCloudProviders()).toEqual([]);
  });

  it('requires BOTH Google keys to enable Google Drive', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-id');
    expect(availableCloudProviders()).toEqual([]);
    vi.stubEnv('VITE_GOOGLE_PICKER_KEY', 'picker-key');
    expect(availableCloudProviders()).toEqual(['google-drive']);
  });

  it('enables Dropbox from the app key alone', () => {
    vi.stubEnv('VITE_DROPBOX_APP_KEY', 'dropbox-key');
    expect(availableCloudProviders()).toEqual(['dropbox']);
    expect(getCloudImportConfig().dropbox).toEqual({ appKey: 'dropbox-key' });
  });

  it('lists both providers when all keys are set', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-id');
    vi.stubEnv('VITE_GOOGLE_PICKER_KEY', 'picker-key');
    vi.stubEnv('VITE_DROPBOX_APP_KEY', 'dropbox-key');
    expect(availableCloudProviders()).toEqual(['google-drive', 'dropbox']);
  });

  it('driveFileName sanitizes forbidden characters', () => {
    expect(driveFileName('a/b\\c:d*e?f"g<h>i|j', 'application/pdf')).toBe(
      'a_b_c_d_e_f_g_h_i_j.pdf',
    );
    expect(driveFileName('\\\\:*?"<>|', 'text/plain')).toBe('.txt'.replace('.txt', '_.txt'));
  });

  it('driveFileName appends ext from mime but never duplicates it', () => {
    expect(driveFileName('Quarterly Report', 'application/pdf')).toBe('Quarterly Report.pdf');
    expect(driveFileName('notes.PDF', 'application/pdf')).toBe('notes.PDF');
    expect(driveFileName('photo', 'image/jpeg')).toBe('photo.jpg');
    expect(driveFileName('scan', 'image/png')).toBe('scan.png');
    expect(driveFileName('archive', 'application/zip')).toBe('archive.zip');
    expect(driveFileName('readme', 'text/plain')).toBe('readme.txt');
    // Неизвестный mime → без расширения.
    expect(driveFileName('raw', 'application/octet-stream')).toBe('raw');
    expect(driveFileName('raw', '')).toBe('raw');
  });

  it('driveDownloadUrl targets v3 files with alt=media', () => {
    expect(driveDownloadUrl('abc123')).toBe(
      'https://www.googleapis.com/drive/v3/files/abc123?alt=media',
    );
    expect(driveDownloadUrl('a b')).toContain('a%20b');
  });

  it('dropboxFileNameFromLink decodes the last path segment', () => {
    expect(
      dropboxFileNameFromLink(
        'https://dl.dropboxusercontent.com/scl/fi/abc/Quarterly%20Report.pdf?rlkey=x&dl=1',
      ),
    ).toBe('Quarterly Report.pdf');
    expect(dropboxFileNameFromLink('not a url at all')).toBe('not a url at all');
    expect(dropboxFileNameFromLink('https://example.com/')).toBe('dropbox-file');
  });

  it('fileFromDownload wraps bytes into a File with name and type', () => {
    const file = fileFromDownload(new Uint8Array([1, 2, 3]), 'doc.pdf', 'application/pdf');
    expect(file.name).toBe('doc.pdf');
    expect(file.type).toBe('application/pdf');
    expect(file.size).toBe(3);
    const fallback = fileFromDownload(new ArrayBuffer(2), 'blob');
    expect(fallback.type).toBe('application/octet-stream');
  });
});

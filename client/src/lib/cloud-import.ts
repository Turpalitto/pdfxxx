// ============================================================
// Cloud import — Google Drive / Dropbox → File[] в общий пайплайн
// ============================================================
//
// Провайдеры появляются только при заданных env:
//   VITE_GOOGLE_CLIENT_ID + VITE_GOOGLE_PICKER_KEY → кнопка Google Drive
//   VITE_DROPBOX_APP_KEY                          → кнопка Dropbox
// Без ключей UI облачного импорта не рендерится вовсе.
//
// Чистые мапперы (driveFileName, driveDownloadUrl, dropboxFileNameFromLink,
// fileFromDownload) отделены от SDK-обёрток и покрыты unit-тестами.

export type CloudProviderId = 'google-drive' | 'dropbox';

export interface CloudImportConfig {
  google?: { clientId: string; pickerKey: string };
  dropbox?: { appKey: string };
}

interface CloudImportEnv {
  VITE_GOOGLE_CLIENT_ID?: string;
  VITE_GOOGLE_PICKER_KEY?: string;
  VITE_DROPBOX_APP_KEY?: string;
}

/** Конфиг облачного импорта из env: провайдер считается доступным только с полным набором ключей. */
export function getCloudImportConfig(
  env: CloudImportEnv = import.meta.env as CloudImportEnv,
): CloudImportConfig {
  const config: CloudImportConfig = {};
  const clientId = env.VITE_GOOGLE_CLIENT_ID?.trim();
  const pickerKey = env.VITE_GOOGLE_PICKER_KEY?.trim();
  if (clientId && pickerKey) {
    config.google = { clientId, pickerKey };
  }
  const appKey = env.VITE_DROPBOX_APP_KEY?.trim();
  if (appKey) {
    config.dropbox = { appKey };
  }
  return config;
}

/** Доступные провайдеры (порядок в UI: Drive, затем Dropbox). */
export function availableCloudProviders(
  config: CloudImportConfig = getCloudImportConfig(),
): CloudProviderId[] {
  const providers: CloudProviderId[] = [];
  if (config.google) providers.push('google-drive');
  if (config.dropbox) providers.push('dropbox');
  return providers;
}

/** Известные расширения по MIME (для восстановления имени Drive-файла). */
const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/zip': '.zip',
  'text/plain': '.txt',
};

/**
 * Безопасное имя файла из Drive: запрещённые символы [\\/:*?"<>|] → '_',
 * расширение добавляется по MIME, но не дублируется, если уже есть.
 */
export function driveFileName(name: string, mimeType: string): string {
  const clean = (name || 'document').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'document';
  const ext = EXT_BY_MIME[mimeType];
  if (!ext || clean.toLowerCase().endsWith(ext)) return clean;
  return `${clean}${ext}`;
}

/** Прямая ссылка на содержимое файла (Drive v3). */
export function driveDownloadUrl(fileId: string): string {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
}

/** Имя файла из direct-ссылки Dropbox Chooser (последний сегмент path, декодированный). */
export function dropboxFileNameFromLink(link: string): string {
  const fromPath = (path: string): string => {
    const last = path.split('/').filter(Boolean).pop() ?? '';
    try {
      return decodeURIComponent(last) || 'dropbox-file';
    } catch {
      return last || 'dropbox-file';
    }
  };
  try {
    return fromPath(new URL(link).pathname);
  } catch {
    return fromPath(link.split(/[?#]/)[0]);
  }
}

/** Скачанные байты → File для общего пайплайна валидации. */
export function fileFromDownload(
  bytes: Uint8Array | ArrayBuffer,
  name: string,
  type?: string,
): File {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return new File([data as BlobPart], name, { type: type || 'application/octet-stream' });
}

// ------------------------------------------------------------
// SDK-обёртки (локальные минимальные типы, без @types пакетов)
// ------------------------------------------------------------

interface GoogleTokenClient {
  requestAccessToken(overrideConfig?: object): void;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleAccountsNamespace {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
      }): GoogleTokenClient;
    };
  };
}

interface PickerDocument {
  id?: string;
  name?: string;
  mimeType?: string;
}

interface PickerCallbackData {
  action?: string;
  docs?: PickerDocument[];
}

interface PickerView {
  setMimeTypes?(types: string): PickerView;
}

/**
 * Цепочный builder Google Picker: каждый метод возвращает PickerBuilderInstance
 * (иначе на x.picker.PickerBuilder получаем TS2571 «object is of type unknown»).
 */
export interface PickerBuilderInstance {
  addView(view: PickerView): PickerBuilderInstance;
  setOAuthToken(token: string): PickerBuilderInstance;
  setDeveloperKey(key: string): PickerBuilderInstance;
  setCallback(callback: (data: PickerCallbackData) => void): PickerBuilderInstance;
  build(): { setVisible(visible: boolean): void };
}

interface GooglePickerNamespace {
  picker: {
    PickerBuilder: new () => PickerBuilderInstance;
    DocsView: new () => PickerView;
    Action: { PICKED: string; CANCEL: string };
  };
}

interface GapiNamespace {
  load(api: string, callback: () => void): void;
}

interface DropboxChooserFile {
  link?: string;
  name?: string;
}

interface DropboxNamespace {
  choose(options: {
    success(files: DropboxChooserFile[]): void;
    cancel?(): void;
    linkType: 'direct' | 'preview';
    multiselect: boolean;
  }): void;
}

const scriptPromises = new Map<string, Promise<void>>();

function loadScriptOnce(src: string): Promise<void> {
  let promise = scriptPromises.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
    scriptPromises.set(src, promise);
  }
  return promise;
}

/** GIS (accounts.google.com/gsi/client) + api.js с модулем picker. */
async function loadGoogleSdk(): Promise<GoogleAccountsNamespace & GooglePickerNamespace> {
  await loadScriptOnce('https://accounts.google.com/gsi/client');
  await loadScriptOnce('https://apis.google.com/js/api.js');
  const gapi = (window as unknown as { gapi?: GapiNamespace }).gapi;
  if (!gapi) throw new Error('Google API loader is unavailable.');
  await new Promise<void>((resolve, reject) => {
    try {
      gapi.load('picker', () => resolve());
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
  const google = (window as unknown as { google?: GoogleAccountsNamespace & GooglePickerNamespace })
    .google;
  if (!google?.accounts?.oauth2 || !google.picker) {
    throw new Error('Google SDK failed to initialize.');
  }
  return google;
}

function loadDropboxSdk(appKey: string): Promise<DropboxNamespace> {
  // dropins.js читает app key из data-app-key атрибута своего <script id="dropboxjs">.
  const promise = scriptPromises.get('dropbox');
  if (!promise) {
    const next = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'dropboxjs';
      script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
      script.async = true;
      script.setAttribute('data-app-key', appKey);
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load the Dropbox chooser.'));
      document.head.appendChild(script);
    });
    scriptPromises.set('dropbox', next);
    return next.then(() => {
      const dropbox = (window as unknown as { Dropbox?: DropboxNamespace }).Dropbox;
      if (!dropbox) throw new Error('Dropbox SDK failed to initialize.');
      return dropbox;
    });
  }
  return promise.then(() => {
    const dropbox = (window as unknown as { Dropbox?: DropboxNamespace }).Dropbox;
    if (!dropbox) throw new Error('Dropbox SDK failed to initialize.');
    return dropbox;
  });
}

async function downloadAsFile(url: string, name: string, headers?: HeadersInit): Promise<File> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Cloud download failed (HTTP ${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const type = response.headers.get('content-type') ?? undefined;
  return fileFromDownload(bytes, name, type);
}

/**
 * Google Drive: OAuth token (scope drive.readonly) → Picker (DocsView) →
 * скачивание выбранных файлов через alt=media c Bearer-токеном.
 * Отмена в picker'е возвращает пустой массив.
 */
export async function importFromGoogleDrive(
  config: CloudImportConfig = getCloudImportConfig(),
): Promise<File[]> {
  if (!config.google) {
    throw new Error('Google Drive import is not configured.');
  }
  const { clientId, pickerKey } = config.google;
  const google = await loadGoogleSdk();

  const token = await new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error ?? 'Google authorization failed.'));
      },
    });
    client.requestAccessToken();
  });

  const docs = await new Promise<PickerDocument[]>((resolve) => {
    const picker = new google.picker.PickerBuilder()
      .addView(new google.picker.DocsView())
      .setOAuthToken(token)
      .setDeveloperKey(pickerKey)
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) resolve(data.docs ?? []);
        else if (data.action === google.picker.Action.CANCEL) resolve([]);
      })
      .build();
    picker.setVisible(true);
  });

  const files: File[] = [];
  for (const doc of docs) {
    if (!doc.id) continue;
    const name = driveFileName(doc.name ?? 'document', doc.mimeType ?? '');
    files.push(
      await downloadAsFile(driveDownloadUrl(doc.id), name, { Authorization: `Bearer ${token}` }),
    );
  }
  return files;
}

/**
 * Dropbox: dropins.js Chooser (linkType direct, multiselect) → скачивание
 * direct-ссылок. Отмена в chooser возвращает пустой массив.
 */
export async function importFromDropbox(
  config: CloudImportConfig = getCloudImportConfig(),
): Promise<File[]> {
  if (!config.dropbox) {
    throw new Error('Dropbox import is not configured.');
  }
  const dropbox = await loadDropboxSdk(config.dropbox.appKey);

  const selected = await new Promise<DropboxChooserFile[]>((resolve) => {
    dropbox.choose({
      linkType: 'direct',
      multiselect: true,
      success: (files) => resolve(files),
      cancel: () => resolve([]),
    });
  });

  const files: File[] = [];
  for (const item of selected) {
    if (!item.link) continue;
    const name = item.name ?? dropboxFileNameFromLink(item.link);
    files.push(await downloadAsFile(item.link, name));
  }
  return files;
}

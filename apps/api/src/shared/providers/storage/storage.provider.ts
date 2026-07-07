/**
 * StorageProvider — PORT for file storage.
 *
 * Domain modules (e.g. Campaigns) depend ONLY on this interface and the
 * {@link STORAGE_PROVIDER} token — never on a concrete SDK. The MinIO adapter
 * lives beside it and is bound in `ProvidersModule`.
 */
export interface UploadFileParams {
  /** Object key/path within the bucket, e.g. "campaigns/{id}/cover/file.png". */
  path: string;
  buffer: Buffer;
  contentType: string;
}

export interface UploadedFile {
  path: string;
  url: string;
}

export interface StorageProvider {
  upload(params: UploadFileParams): Promise<UploadedFile>;
  delete(path: string): Promise<void>;
  /** Resolves a (public or otherwise reachable) URL for a stored path. */
  getPublicUrl(path: string): string;
}

/** DI token used to inject a {@link StorageProvider}. */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

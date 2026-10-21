// Object URLs for results (previews, download links) are freed in one place
// when the user clears the list or leaves the page.

export interface UrlRegistry {
  create(blob: Blob): string;
  revoke(url: string): void;
  revokeAll(): void;
  size(): number;
}

export function createUrlRegistry(
  api: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> = URL,
): UrlRegistry {
  const urls = new Set<string>();
  return {
    create(blob) {
      const url = api.createObjectURL(blob);
      urls.add(url);
      return url;
    },
    revoke(url) {
      if (urls.delete(url)) api.revokeObjectURL(url);
    },
    revokeAll() {
      for (const url of urls) api.revokeObjectURL(url);
      urls.clear();
    },
    size: () => urls.size,
  };
}

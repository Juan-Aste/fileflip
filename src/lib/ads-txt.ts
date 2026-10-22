// ads.txt for Google AdSense: declares the publisher account allowed to sell
// ads on this domain. Built from NEXT_PUBLIC_ADSENSE_CLIENT ("ca-pub-123…").

const GOOGLE_CERT_ID = "f08c47fec0942fa0";

export function adsTxt(client: string | undefined): string | null {
  const id = client?.trim().match(/^(?:ca-)?(pub-\d+)$/)?.[1];
  return id ? `google.com, ${id}, DIRECT, ${GOOGLE_CERT_ID}\n` : null;
}

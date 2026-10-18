export const HSC_SOURCE = {
  key: "hsc-mvs-ua-exam-bank",
  name: "Головний сервісний центр МВС України",
  pageUrl: "https://hsc.gov.ua/index/poslugi/vidacha-posvidchennya-vodiya/pitannya-ta-ispit-z-pdr/",
  edition: "Наказ ГСЦ МВС від 29.10.2025 № 225",
  sourceUpdatedAt: "2025-10-29",
  questionsUrl:
    "https://hsc.gov.ua/wp-content/uploads/2025/11/POLOTNO-NAKAZ_04_09_2025%20%281%29.pdf",
  answersUrl: "https://hsc.gov.ua/wp-content/uploads/2025/11/Numer_-vidpovidej-do-nakazu.pdf",
} as const;

export interface HscDiscovery {
  edition: string;
  sourceUpdatedAt: string;
  questionsUrl: string;
  answersUrl: string;
}

function officialPdf(value: string): string | null {
  try {
    const url = new URL(value, HSC_SOURCE.pageUrl);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "hsc.gov.ua" ||
      !url.pathname.startsWith("/wp-content/uploads/") ||
      !url.pathname.toLowerCase().endsWith(".pdf")
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parseHscSourcePage(html: string): HscDiscovery {
  if (new TextEncoder().encode(html).length > 2_000_000)
    throw new Error("Source page is too large");
  const anchors = [
    ...html.matchAll(/<a\b[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi),
  ];
  let questionsUrl: string | null = null;
  let answersUrl: string | null = null;
  for (const match of anchors) {
    const href = officialPdf((match[1] ?? match[2] ?? "").replaceAll("&amp;", "&"));
    if (!href) continue;
    const label = match[3]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (label.includes("екзаменаційні питання")) questionsUrl = href;
    if (label.includes("відповіді")) answersUrl = href;
  }
  const editionMatch = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .match(/від\s+(\d{2}\.\d{2}\.\d{4})\s+№\s*(\d+)/i);
  if (!questionsUrl || !answersUrl || !editionMatch)
    throw new Error("Official source links not found");
  const [, date, order] = editionMatch;
  const [day, month, year] = date.split(".");
  return {
    edition: `Наказ ГСЦ МВС від ${date} № ${order}`,
    sourceUpdatedAt: `${year}-${month}-${day}`,
    questionsUrl,
    answersUrl,
  };
}

export async function discoverHscSource(): Promise<HscDiscovery> {
  const response = await fetch(HSC_SOURCE.pageUrl, {
    headers: { Accept: "text/html", "User-Agent": "TrafficLawsMVP/1.0 source-check" },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok || new URL(response.url).hostname !== "hsc.gov.ua")
    throw new Error(`Official source returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) throw new Error("Unexpected source type");
  return parseHscSourcePage(await response.text());
}

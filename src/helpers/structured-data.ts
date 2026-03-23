const SITE = 'https://preturiservicii.ro';

export function buildWebSiteSchema(): string {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebSite',
    name: 'preturiservicii.ro', url: SITE, inLanguage: 'ro',
    description: 'Prețuri orientative pentru servicii în România.',
    publisher: { '@type': 'Organization', name: 'preturiservicii.ro', url: SITE },
  });
}

export function buildWebPageSchema(title: string, desc: string, url: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: title, description: desc, url: SITE + url, inLanguage: 'ro',
    isPartOf: { '@type': 'WebSite', name: 'preturiservicii.ro', url: SITE },
  });
}

export function buildBreadcrumbSchema(items: Array<{label: string; href?: string}>): string {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem', position: i + 1, name: item.label,
      ...(item.href ? { item: SITE + item.href } : {}),
    })),
  });
}

export function buildFAQSchema(items: Array<{question: string; answer: string}>): string {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question', name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  });
}

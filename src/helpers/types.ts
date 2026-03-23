export interface Serviciu {
  slug: string; nume: string; unitate: string; pretMin: number; pretMax: number; categorie: string;
}
export interface Oras { slug: string; nume: string; coef: number; }
export interface Sectiune { titlu: string; tip: 'lista' | 'pasi' | 'text'; items: Array<{ titlu?: string; text: string }>; }
export interface Pagina {
  slug: string; titlu: string; serviciuSlug: string; orasSlug: string; orasNume: string;
  pretMin: number; pretMax: number; pretMediu: number; unitate: string;
  intro: string; sectiuni: Sectiune[]; concluzie: string; metaTitle: string; metaDescription: string;
}
export interface BreadcrumbItem { label: string; href?: string; }

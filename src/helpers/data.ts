import type { Serviciu, Oras, Pagina } from './types';
import serviciiData from '../data/servicii.json';
import oraseData from '../data/orase.json';
import allPaginiData from '../data/all-pagini.json';

export const servicii: Serviciu[] = serviciiData as Serviciu[];
export const orase: Oras[] = oraseData as Oras[];
const allPagini: Pagina[] = allPaginiData as Pagina[];

export function getServiciuBySlug(s: string) { return servicii.find(x => x.slug === s); }
export function getOrasBySlug(s: string) { return orase.find(x => x.slug === s); }
export function getAllPagini() { return allPagini; }
export function getPaginiForServiciu(s: string) { return allPagini.filter(p => p.serviciuSlug === s); }
export function getPaginiForServiciuOras(s: string, o: string) { return allPagini.filter(p => p.serviciuSlug === s && p.orasSlug === o); }
export function getCategorii() { return [...new Set(servicii.map(s => s.categorie))]; }

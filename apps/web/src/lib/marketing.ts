import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import type { MarketingLang } from './site-routing';

/*
 * Marketing site content (staydirect.lk): Markdown files with front matter in
 * apps/web/content/marketing/{en,si}/. Read at build time only; every marketing page is static.
 * A Sinhala file that is missing falls back to the English one (flagged so the page can say so).
 */

const ROOT = path.join(process.cwd(), 'content', 'marketing');

export const CLUSTERS = ['mirissa', 'weligama', 'ella', 'arugam-bay', 'kandy', 'sigiriya'] as const;
export type Cluster = (typeof CLUSTERS)[number];

export type Meta = Record<string, string | number | string[]>;

export interface Doc {
  slug: string;
  lang: MarketingLang;
  /** The requested language was missing and this is the English text. */
  fallback: boolean;
  meta: Meta;
  body: string;
  html: string;
}

/** Front matter: `key: value` lines; JSON values ("…", […], numbers) are parsed, anything else is kept as text. */
export function parseFrontMatter(raw: string): { meta: Meta; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { meta: {}, body: raw };
  const meta: Meta = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const v = kv[2]!.trim();
    try {
      meta[kv[1]!] = JSON.parse(v) as string | number | string[];
    } catch {
      meta[kv[1]!] = v;
    }
  }
  return { meta, body: m[2]! };
}

/** Markdown → HTML: tables scroll sideways on phones, external links open in a new tab. */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false, gfm: true }) as string;
  return html
    .replace(/<table>/g, '<div class="m-table"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
}

function read(lang: MarketingLang, rel: string): { raw: string; fallback: boolean } | null {
  for (const [l, fallback] of [[lang, false], ['en', lang !== 'en']] as const) {
    const file = path.join(ROOT, l, `${rel}.md`);
    if (fs.existsSync(file)) return { raw: fs.readFileSync(file, 'utf8'), fallback };
  }
  return null;
}

export function getDoc(lang: MarketingLang, rel: string): Doc | null {
  const r = read(lang, rel);
  if (!r) return null;
  const { meta, body } = parseFrontMatter(r.raw);
  return { slug: path.basename(rel), lang: r.fallback ? 'en' : lang, fallback: r.fallback, meta, body, html: renderMarkdown(body) };
}

export function blogSlugs(): string[] {
  const dir = path.join(ROOT, 'en', 'blog');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)) : [];
}

/** Every post in a language, newest first. */
export function listPosts(lang: MarketingLang): Doc[] {
  return blogSlugs()
    .map((s) => getDoc(lang, `blog/${s}`)!)
    .sort((a, b) => String(b.meta.date).localeCompare(String(a.meta.date)));
}

/** "## Question" + answer sections of faq.md: answer HTML for the page, plain text for FAQPage JSON-LD. */
export function faqItems(doc: Doc): { q: string; html: string; text: string }[] {
  return doc.body
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const [q, ...rest] = part.split('\n');
      const md = rest.join('\n').trim();
      return { q: q!.trim(), html: renderMarkdown(md), text: plainText(md) };
    });
}

/** Markdown to one line of plain text: links keep their words, formatting goes. */
export function plainText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const str = (v: Meta[string] | undefined): string => (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v));

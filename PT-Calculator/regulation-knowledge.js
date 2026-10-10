/* TheWing.ai | PT-Calculator local Regulation Knowledge Engine
 * ESM / Node.js 20+. No scoring, network access, or external packages.
 * Matches the afman36-2905.json generated from the supplied 116-page PDF.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REGULATION = Object.freeze({
  id: "AFMAN36-2905", shortName: "AFMAN 36-2905",
  title: "Air Force Physical Fitness Readiness Program",
  publicationDate: "2026-03-24", pages: 116,
  officialUrl: "https://static.e-publishing.af.mil/production/1/af_a1/publication/afman36-2905/dafman36-2905.pdf"
});
const STOP = new Set("a about an and are as at be by can could do does explain for from how i in is it me my of on or our please say tell the their there this to under what when where which who why will with you your amy air force afman dafman 36 2905 paragraph para section regulation instruction manual policy mean means apply applies".split(" "));
const text = value => typeof value === "string" ? value.trim() : "";
const object = value => value && typeof value === "object" && !Array.isArray(value);
const list = value => Array.isArray(value) ? value : object(value) ? Object.values(value) : [];
const idOf = value => String(value ?? "").trim().replace(/^(?:paragraph|para\.?|section|table|figure|attachment|chapter|§)\s*/i, "").replace(/\.$/, "").toUpperCase();
const reviewed = item => item?.verified === true || ["verified", "visually_verified_against_supplied_pdf"].includes(item?.verification_status);
let cache = null;

function candidates() {
  return [...new Set([
    process.env.FITNESS_REGULATION_FILE,
    process.env.REGULATIONS_DIR && path.join(process.env.REGULATIONS_DIR, "afman36-2905.json"),
    path.resolve(process.cwd(), "PT-Calculator/afman36-2905.json"),
    process.env.LAMBDA_TASK_ROOT && path.resolve(process.env.LAMBDA_TASK_ROOT, "PT-Calculator/afman36-2905.json"),
    typeof import.meta.url === "string" ? fileURLToPath(new URL("./afman36-2905.json", import.meta.url)) : null
  ].filter(Boolean))];
}

function makeDocument(raw) {
  if (!object(raw) || !["AFMAN362905", "DAFMAN362905"].includes(String(raw.id ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""))) {
    throw new Error("Unexpected regulation document");
  }
  const date = text(raw.date || raw.publication_date || raw.version);
  if (date !== REGULATION.publicationDate) throw new Error("Unsupported publication edition");
  const entries = [], keys = new Set();
  const add = (item, kind) => {
    const id = idOf(item.number ?? item.id);
    const body = text(item.text ?? item.body ?? item.content);
    const start = Number(item.page_start ?? item.page ?? item.pdf_page);
    const end = Number(item.page_end ?? start);
    if (!id || !body) return;
    if (!Number.isInteger(start) || start < 1 || !Number.isInteger(end) || end < start || end > Number(raw.page_count ?? 116)) {
      throw new Error("Invalid source page");
    }
    const key = `${kind}:${id}`;
    if (keys.has(key)) throw new Error("Duplicate regulation reference");
    keys.add(key);
    entries.push({
      kind, id, title: text(item.title ?? item.heading), text: body,
      page: start, pageEnd: end, sectionId: text(item.section_id),
      verified: reviewed(item), references: list(item.references).filter(v => typeof v === "string"),
      numericUseAllowed: item.numeric_use_allowed === true && reviewed(item)
    });
  };
  for (const [field, kind] of [["paragraphs", "paragraph"], ["tables", "table"], ["figures", "figure"]]) {
    for (const item of list(raw[field])) if (object(item)) add(item, kind);
  }
  // Glossary/reference material is retained as page excerpts, not invented paragraphs.
  for (const block of list(raw.unnumbered_blocks)) {
    if (block?.type !== "unnumbered") continue;
    for (const segment of list(block.page_segments)) {
      if (!object(segment)) continue;
      add({ id: `${block.id}:PAGE-${segment.page}`, text: segment.text, page: segment.page,
        section_id: block.section_id, verified: false }, "page");
    }
  }
  return { date, entries, pages: list(raw.pages), chapters: list(raw.chapters),
    attachments: list(raw.attachments), anomalies: list(raw.source_anomalies) };
}

function loadDocument() {
  try {
    const file = candidates().find(value => fs.existsSync(value));
    if (!file) return { document: null, error: "REGULATION_DATA_MISSING" };
    const stat = fs.statSync(file);
    if (cache?.file === file && cache.mtime === stat.mtimeMs && cache.size === stat.size) return cache;
    const document = makeDocument(JSON.parse(fs.readFileSync(file, "utf8")));
    cache = { file, mtime: stat.mtimeMs, size: stat.size, document, error: null };
    return cache;
  } catch { return { document: null, error: "REGULATION_DATA_INVALID" }; }
}

export function getRegulationStatus() {
  const { document, error } = loadDocument();
  return { available: Boolean(document?.entries.length), indexedEntries: document?.entries.length ?? 0,
    verifiedEntries: document?.entries.filter(row => row.verified).length ?? 0, error,
    source: { id: REGULATION.id, title: REGULATION.title,
      publicationDate: document?.date ?? REGULATION.publicationDate,
      url: REGULATION.officialUrl, pageCount: document?.pages.length ?? 0 } };
}

export function findRequestedReferences(question = "") {
  const q = String(question).slice(0, 6000), hits = [];
  for (const [pattern, kind] of [
    [/\b(?:table|tbl\.?)\s*[:#]?\s*([A-Z]?\d+(?:\.\d+)+)/gi, "table"],
    [/\bfigure\s*[:#]?\s*([A-Z]?\d+(?:\.\d+)+)/gi, "figure"],
    [/\b(?:attachment|appendix)\s*[:#]?\s*(\d+)\b/gi, "attachment"],
    [/\bchapter\s*[:#]?\s*(\d+)\b/gi, "chapter"],
    [/(?:\b(?:paragraph|para\.?|section)\s*[:#]?\s*|§\s*)(A?\d+(?:\.\d+)+)/gi, "paragraph"]
  ]) for (const m of q.matchAll(pattern)) hits.push({ kind, id: idOf(m[1]), position: m.index });
  // Three-part paragraph numbers are unambiguous in normal fitness questions.
  for (const m of q.matchAll(/\b(A?\d+(?:\.\d+){2,})\b/gi)) {
    if (!hits.some(h => Math.abs(h.position - m.index) < 18 && h.id === idOf(m[1]))) {
      hits.push({ kind: "paragraph", id: idOf(m[1]), position: m.index });
    }
  }
  if (!hits.length && /\b(?:explain|interpret|look up|show|compare)\b/i.test(q)) {
    for (const m of q.matchAll(/\b(A?\d+\.\d+)\b/gi)) hits.push({ kind: "paragraph", id: idOf(m[1]), position: m.index });
  }
  const seen = new Set();
  return hits.sort((a, b) => a.position - b.position).filter(h => {
    const key = `${h.kind}:${h.id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 6).map(({ kind, id }) => ({ kind, id }));
}
export const findRequestedReference = question => findRequestedReferences(question)[0] ?? null;

export function matchesRegulationIntent(question = "") {
  return findRequestedReferences(question).length > 0 || /\b(?:afman|dafman)?\s*36[\s-]*2905\b|\b(?:pfra|pfrp|fitness assessment|fitness exemption|fitness appeal|hamr|whtr|myfitness|physical conditioning|retake|retest|exemptions?|waivers?|duty day|test frequency|decoupling)\b/i.test(question);
}

function toResult(document, row) {
  const sourceAnomalies = document.anomalies.filter(a => a.table === row.id ||
    (row.kind === "page" && Number(a.page) === row.page));
  return { source_id: `${row.kind}:${row.id}`, kind: row.kind, reference: row.id,
    title: row.title, text: row.text, page: row.page, page_end: row.pageEnd,
    verified: row.verified, references: row.references,
    numeric_use_allowed: row.numericUseAllowed === true, source_anomalies: sourceAnomalies,
    citation: { publication: REGULATION.shortName, publicationDate: document.date,
      kind: row.kind, reference: row.id, page: row.page, page_end: row.pageEnd,
      url: `${REGULATION.officialUrl}#page=${row.page}`, verified: row.verified } };
}

export function lookupRegulationParagraph(reference, options = {}) {
  const { document, error } = loadDocument();
  if (!document) return { ok: false, status: "data_unavailable", results: [], error };
  const kind = options.kind ?? "paragraph", id = idOf(reference);
  let rows;
  if (["attachment", "chapter"].includes(kind)) {
    const sections = kind === "attachment" ? document.attachments : document.chapters;
    const section = sections.find(s => String(s.number) === id);
    if (!section) return { ok: false, status: "reference_not_indexed", results: [] };
    rows = document.pages.filter(p => p.page >= section.page_start && p.page <= section.page_end).map(p => ({
      kind: "page", id: `${kind.toUpperCase()}-${id}:PAGE-${p.page}`, title: section.title,
      text: text(p.text), page: p.page, pageEnd: p.page,
      verified: p.verified_against_image === true, references: [], numericUseAllowed: false
    }));
  } else {
    rows = document.entries.filter(row => row.kind === kind && row.id === id);
    if (kind === "paragraph" && options.includeChildren !== false) {
      rows = [...rows, ...document.entries.filter(row => row.kind === kind && row.id.startsWith(id + "."))];
    }
  }
  const limit = Math.min(12, Math.max(1, Number(options.limit) || 6));
  return { ok: rows.length > 0, status: rows.length ? "found" : "reference_not_indexed",
    results: rows.slice(0, limit).map(row => toResult(document, row)), hasMore: rows.length > limit };
}

function words(value) {
  const normalized = String(value).toLowerCase()
    .replace(/\b(?:pt test|fitness test|physical fitness assessment)\b/g, "pfra")
    .replace(/waist[- ]to[- ]height(?: ratio)?/g, "whtr")
    .replace(/body fat assessment/g, "bfa").replace(/working out/g, "physical conditioning")
    .replace(/how often|when.*next test/g, "frequency assessment")
    .replace(/\b(?:exemptions?|exempted)\b/g, "exempt")
    .replace(/\bretakes?\b/g, "retest");
  return [...new Set((normalized.match(/[a-z][a-z0-9]+/g) ?? []).filter(w => !STOP.has(w)))];
}

export function searchRegulation(question, options = {}) {
  const { document, error } = loadDocument();
  if (!document) return { ok: false, status: "data_unavailable", results: [], error };
  const terms = words(question);
  if (!terms.length) return { ok: false, status: "no_search_terms", results: [] };
  const rows = document.entries.map(row => {
    const body = new Set(words(row.text)), title = new Set(words(row.title || row.text.split(/[.!?]/)[0]));
    const matches = terms.filter(term => body.has(term));
    return { row, score: matches.length + terms.filter(term => title.has(term)).length * 3,
      coverage: matches.length / terms.length };
  }).filter(r => r.score > 0 && r.coverage >= (terms.length > 2 ? 0.35 : 0.5))
    .sort((a, b) => b.score - a.score || a.row.page - b.row.page);
  const limit = Math.min(10, Math.max(1, Number(options.limit) || 5));
  return { ok: rows.length > 0, status: rows.length ? "found" : "no_topic_match", hasMore: rows.length > limit,
    results: rows.slice(0, limit).map(({ row, score }) => ({ ...toResult(document, row), score })) };
}

export function buildRegulationContext(question, options = {}) {
  const requested = findRequestedReferences(question);
  const responses = requested.length ? requested.map(ref => ({ ref, response: lookupRegulationParagraph(ref.id, { kind: ref.kind }) }))
    : [{ ref: null, response: searchRegulation(question, options) }];
  const unresolvedReferences = responses.filter(r => !r.response.ok && r.ref).map(r => r.ref);
  const results = [], seen = new Set();
  for (const { response } of responses) for (const item of response.results) {
    if (!seen.has(item.source_id)) { seen.add(item.source_id); results.push(item); }
  }
  const maxChars = Math.min(16000, Math.max(1500, Number(options.maxChars) || 10000));
  const included = []; let used = 0;
  for (const item of results) {
    const length = item.text.length + 350;
    if (used + length > maxChars) continue;
    used += length; included.push(item);
  }
  return { matched: true, found: included.length > 0,
    status: unresolvedReferences.length ? "reference_not_indexed" : included.length ? "found" : responses[0].response.ok ? "excerpts_exceed_context_limit" : responses[0].response.status,
    reference: requested[0] ?? null, requestedReferences: requested, unresolvedReferences,
    results: included, availableResults: results,
    needsVerification: included.some(item => !item.verified),
    truncatedResults: included.length < results.length || (requested.length > 0 && responses.some(r => r.response.hasMore)),
    context: included.map(item => JSON.stringify(item)).join("\n") };
}

export default Object.freeze({ REGULATION, getRegulationStatus, findRequestedReference,
  findRequestedReferences, matchesRegulationIntent, lookupRegulationParagraph,
  searchRegulation, buildRegulationContext });

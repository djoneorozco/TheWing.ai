/* TheWing.ai | Disability-Calculator Regulation Knowledge Engine
 * ESM / Node.js 20+. Built-in modules only; no network calls or AI calls.
 * Reads ./38-CFR.json: supplied 38 CFR Part 4 snapshot of October 7, 2026.
 * Retrieves source text. Does not calculate ratings or determine entitlement.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REGULATION = Object.freeze({
  id: "38-CFR-PART-4",
  shortName: "38 CFR Part 4",
  title: "Schedule for Rating Disabilities",
  asOfDate: "2026-10-07",
  dateType: "ecfr_snapshot_as_of_date_not_universal_effective_date",
  pages: 247,
  officialUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4",
  filename: "38-CFR.json"
});

export const AUTHORITY_CONTRACT = Object.freeze({
  consultRegulationOnEveryDisabilityQuestion: true,
  calculatorIsAuthorityForPersonalNumbers: true,
  calculatesRatings: false,
  assignsDiagnosticCodes: false,
  determinesEntitlement: false,
  numericUseAllowed: false,
  scope: "38 CFR Part 4 only",
  paymentRatesIncluded: false,
  preserveConditionsExceptionsAndSharedNotes: true,
  imagesAreNotVerifiedText: true
});

const STOP = new Set("a about an and are as at be been but by can could did do does for from get give has have how i if in into is it its me my of on or our please say says should show tell that the their them there these they this to under us use using was were what when where which who why will with would you your amy va cfr part title section paragraph code diagnostic disability disabilities rating ratings rated schedule according explain explanation regulation regulations percent percentage percentages".split(" "));
const text = value => typeof value === "string" ? value.trim() : "";
const object = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const array = value => Array.isArray(value) ? value : [];
const bounded = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, Math.floor(n))) : fallback;
};
const normalize = value => String(value ?? "").trim()
  .replace(/^(?:38\s*C\.?F\.?R\.?\s*|diagnostic\s+code\s*|DC\s*|section\s*|paragraph\s*|para\.?\s*|table\s*|appendix\s*|§+\s*)/i, "")
  .replace(/\.$/, "").replace(/\s+/g, "").toUpperCase();
const keyOf = (kind, id) => `${kind}:${normalize(id)}`;
let cache = null;

function candidateFiles() {
  // Every configured override is authoritative. Precedence: explicit file,
  // disability-specific directory, generic directory. Never substitute an
  // adjacent/default edition when a configured source is broken.
  for (const [name, directory] of [["DISABILITY_REGULATION_FILE", false],
    ["DISABILITY_REGULATIONS_DIR", true], ["REGULATIONS_DIR", true]]) {
    const configured = process.env[name];
    if (configured !== undefined) return [{ location: name,
      file: configured.trim() ? path.resolve(directory ? path.join(configured, REGULATION.filename) : configured) : null }];
  }
  const candidates = [];
  try {
    candidates.push({location: "module-adjacent", file: fileURLToPath(new URL("./38-CFR.json", import.meta.url))});
  } catch { /* esbuild's CommonJS output may have no usable import.meta.url. */ }
  candidates.push({location: "working-directory", file: path.resolve(process.cwd(), "Disability-Calculator", REGULATION.filename)});
  if (process.env.LAMBDA_TASK_ROOT) candidates.push({location: "lambda-task-root",
    file: path.resolve(process.env.LAMBDA_TASK_ROOT, "Disability-Calculator", REGULATION.filename)});
  // Native CommonJS bundles can run with a working directory outside /var/task.
  if (typeof __dirname !== "undefined") {
    candidates.push({location: "bundle-directory",
      file: path.resolve(__dirname, "Disability-Calculator", REGULATION.filename)});
    // Netlify's ZIP preserves the entry at netlify/functions/*.js while
    // included_files paths are rooted at the ZIP root, two levels above.
    candidates.push({location: "netlify-bundle-root",
      file: path.resolve(__dirname, "..", "..", "Disability-Calculator", REGULATION.filename)});
  }
  return candidates;
}

function makeDocument(raw) {
  if (!object(raw) || raw.id !== REGULATION.id || raw.schema_version !== "thewing.disability-regulation.v1") {
    throw new Error("Unexpected regulation schema");
  }
  if (raw.as_of_date !== REGULATION.asOfDate || raw.page_count !== REGULATION.pages) {
    throw new Error("Unexpected source snapshot");
  }
  if (!/^[a-f0-9]{64}$/i.test(raw.source?.sha256 || "")) throw new Error("Missing source fingerprint");
  const entries = [], byKey = new Map();
  const add = (item, kind) => {
    if (!object(item)) throw new Error("Invalid source entry");
    const id = text(item.number || item.id), body = text(item.text);
    const page = Number(item.page_start ?? item.page), pageEnd = Number(item.page_end ?? page);
    if (!id || !body || !Number.isInteger(page) || !Number.isInteger(pageEnd)
      || page < 1 || pageEnd < page || pageEnd > REGULATION.pages) throw new Error("Invalid source reference");
    const key = keyOf(kind, id);
    if (byKey.has(key)) throw new Error("Duplicate source reference");
    const row = {
      kind, id, title: text(item.title), text: body, page, pageEnd,
      sectionId: text(item.section_id), status: text(item.status) || (item.reserved ? "reserved" : "active"),
      verified: item.verified === true,
      verificationStatus: text(item.verification_status),
      verificationMethod: text(item.verification_method),
      humanVerifiedInFull: item.human_verified_in_full === true,
      numericUseAllowed: false,
      relatedSourceIds: array(item.related_source_ids).filter(v => typeof v === "string"),
      references: array(item.references).filter(v => typeof v === "string"),
      imageIds: array(item.image_ids || item.embedded_image_ids_on_source_pages),
      requiresVisualReview: kind === "figure" || item.requires_visual_review === true,
      searchTerms: text(item.search_terms),
      inAppendix: text(item.appendix),
      pageSegments: array(item.page_segments)
    };
    entries.push(row); byKey.set(key, row);
  };
  for (const [field, kind] of [
    ["sections", "section"], ["paragraphs", "paragraph"],
    ["diagnostic_codes", "diagnostic_code"], ["formulas", "formula"],
    ["tables", "table"], ["section_contexts", "section_context"],
    ["appendices", "appendix"], ["diagnostic_index", "diagnostic_index"], ["figures", "figure"]
  ]) for (const item of array(raw[field])) add(item, kind);
  if (!entries.length) throw new Error("Empty regulation index");
  if (array(raw.pages).length !== REGULATION.pages) throw new Error("Incomplete page corpus");
  const pages = new Map();
  for (const page of raw.pages) {
    if (!Number.isInteger(page.page) || pages.has(page.page) || !text(page.raw_text)
      || page.page < 1 || page.page > REGULATION.pages) throw new Error("Invalid source page");
    pages.set(page.page, page);
  }
  for (const row of entries) for (const ref of row.relatedSourceIds) {
    const split = ref.indexOf(":");
    if (split < 1 || !byKey.has(keyOf(ref.slice(0, split), ref.slice(split + 1)))) {
      throw new Error("Unresolved related source");
    }
  }
  return { entries, byKey, pages, source: raw.source,
    anomalies: array(raw.source_anomalies), validation: raw.validation };
}

function loadDocument() {
  let location = "default-locations", stage = "resolve";
  const failure = (error, reason) => ({document: null, error, diagnostics: {location, stage, reason}});
  try {
    const candidates = candidateFiles();
    // First existing default wins; malformed existing data must fail closed.
    const selected = candidates.find(candidate => candidate.file && fs.existsSync(candidate.file));
    if (!selected) {
      location = candidates.length === 1 ? candidates[0].location : location;
      return failure("REGULATION_DATA_MISSING", "No regulation file exists at the selected source location(s).");
    }
    const {file} = selected;
    location = selected.location;
    stage = "read";
    const stat = fs.statSync(file);
    if (!stat.isFile()) return failure("REGULATION_DATA_INVALID", "Configured source is not a regular file.");
    const diagnostics = {location, stage: "ready", reason: null};
    if (cache?.file === file && cache.mtime === stat.mtimeMs && cache.size === stat.size) return {...cache, diagnostics};
    const json = fs.readFileSync(file, "utf8");
    stage = "parse";
    let raw;
    try { raw = JSON.parse(json); }
    catch { return failure("REGULATION_DATA_INVALID", "Regulation file is not valid JSON."); }
    stage = "validate";
    let document;
    try { document = makeDocument(raw); }
    catch (error) { return failure("REGULATION_DATA_INVALID", error.message); }
    cache = {file, mtime: stat.mtimeMs, size: stat.size, document, error: null, diagnostics};
    return cache;
  } catch {
    // Do not return absolute paths or source text in the public API.
    return failure("REGULATION_DATA_INVALID", "Regulation file could not be resolved or read.");
  }
}

export function getRegulationStatus() {
  const { document, error, diagnostics } = loadDocument();
  return {
    diagnostics,
    available: Boolean(document?.entries.length), error,
    indexedEntries: document?.entries.length ?? 0,
    verifiedEntries: document?.entries.filter(r => r.verified).length ?? 0,
    sections: document?.entries.filter(r => r.kind === "section").length ?? 0,
    diagnosticCodes: document?.entries.filter(r => r.kind === "diagnostic_code").length ?? 0,
    source: { id: REGULATION.id, title: REGULATION.title, asOfDate: REGULATION.asOfDate,
      dateType: REGULATION.dateType, pageCount: document?.pages.size ?? 0,
      sha256: document?.source.sha256 ?? null, url: REGULATION.officialUrl,
      urlIsLive: true, humanVerifiedInFull: false },
    authority: AUTHORITY_CONTRACT,
    sourceAnomalies: document?.anomalies ?? []
  };
}

export function findRequestedReferences(question = "") {
  const q = String(question).slice(0, 6000), hits = [];
  const add = (kind, id, position) => hits.push({ kind, id: normalize(id), position });
  for (const m of q.matchAll(/(?:§+\s*|\b(?:sections?|paragraph|para\.?)\s*[:#]?\s*|\b38\s*C\.?F\.?R\.?\s*)(4\.\d{1,3}[a-z]?(?:\([a-z0-9]+\))*)/gi)) {
    add(m[1].includes("(") ? "paragraph" : "section", m[1], m.index);
  }
  // A bare section number is accepted in reference-style questions, but a
  // currency amount or a personal percentage is not a section citation.
  if (/\b(?:explain|interpret|compare|lookup|look up|section|paragraph|cfr|under)\b/i.test(q)) {
    for (const m of q.matchAll(/(?<![\d$])\b(4\.\d{1,3}[a-z]?(?:\([a-z0-9]+\))*)(?![\d%])/gi)) {
      add(m[1].includes("(") ? "paragraph" : "section", m[1], m.index);
    }
  }
  for (const m of q.matchAll(/\b(?:diagnostic\s+codes?|DCs?|code)\s*[:#]?\s*([5-9]\d{3}(?:\s*[-–]\s*[5-9]\d{3})?)/gi)) {
    for (const code of m[1].match(/[5-9]\d{3}/g)) add("diagnostic_code", code, m.index);
  }
  for (const m of q.matchAll(/\b(?:explain|interpret|lookup|look up|rating for|criteria for)\s+([5-9]\d{3})\b/gi)) add("diagnostic_code", m[1], m.index);
  if (/^[5-9]\d{3}[?.\s]*$/.test(q.trim())) add("diagnostic_code", q.trim().replace(/[?.\s]/g, ""), 0);
  for (const m of q.matchAll(/\btable\s*[:#]?\s*(VII|VIa|VI|III|II|I|TBI)\b/gi)) add("table", m[1], m.index);
  for (const m of q.matchAll(/\bappendix\s*[:#]?\s*([ABC])\b/gi)) add("appendix", m[1], m.index);
  const seen = new Set();
  return hits.sort((a,b) => a.position-b.position).filter(hit => {
    const key = keyOf(hit.kind, hit.id);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 8).map(({kind,id}) => ({kind,id}));
}

export const findRequestedReference = question => findRequestedReferences(question)[0] ?? null;

export function matchesRegulationIntent(question = "") {
  return findRequestedReferences(question).length > 0 || /\b38\s*c\.?f\.?r\.?|\b(?:disabilit(?:y|ies)|ratings?|combined|bilateral|pyramiding|tdiu|unemployability|ptsd|migraine|tinnitus|cpap|sleep apnea|service.connected|diagnostic|convalescence|hearing loss)\b/i.test(question);
}

function sourceRequestStatus(question, options = {}) {
  const q = String(question);
  if ([...q.matchAll(/\b(\d+)\s*C\.?F\.?R\.?\s*(?:part\s*)?(\d+)/gi)]
    .some(m => m[1] !== "38" || m[2] !== "4")) return "requested_publication_not_loaded";
  if (/\b38\s*C\.?F\.?R\.?\s*part\s+(?!4\b)\d+/i.test(q)
    || /§+\s*(?!4\.)\d+\.\d+/i.test(q)) return "requested_publication_not_loaded";
  const date = text(options.asOfDate || options.requestedAsOfDate);
  if (date && date !== REGULATION.asOfDate) return "requested_edition_not_loaded";
  const years = [...q.matchAll(/\b(\d{4})\s+(?:edition|version|snapshot)\b|\b(?:edition|version|snapshot)\s+(?:from\s+)?(\d{4})\b/gi)];
  if (years.some(m => (m[1] || m[2]) !== REGULATION.asOfDate.slice(0,4))) return "requested_edition_not_loaded";
  return null;
}

function resultOf(document, row) {
  const section = row.sectionId || (row.kind === "section" ? row.id : "");
  const officialUrl = section
    ? `${REGULATION.officialUrl}/section-${section}`
    : row.kind === "appendix" ? `${REGULATION.officialUrl}/appendix-Appendix%20${row.id}%20to%20Part%204` : REGULATION.officialUrl;
  const pdfUrl = text(process.env.DISABILITY_REGULATION_PDF_URL);
  const publicationUrl = /^https?:\/\//i.test(pdfUrl) ? `${pdfUrl.split("#")[0]}#page=${row.page}` : null;
  return {
    source_id: `${row.kind}:${row.id}`, kind: row.kind, reference: row.id,
    section_id: section, title: row.title, text: row.text,
    page: row.page, page_end: row.pageEnd, status: row.status,
    verified: row.verified, verification_status: row.verificationStatus,
    verification_method: row.verificationMethod, human_verified_in_full: row.humanVerifiedInFull,
    numeric_use_allowed: false, references: row.references,
    related_source_ids: row.relatedSourceIds,
    requires_visual_review: row.requiresVisualReview,
    embedded_image_ids: row.imageIds,
    source_anomalies: document.anomalies.filter(a => array(a.schedule_only).includes(row.id) || array(a.appendix_only).includes(row.id)),
    citation: {
      publication: REGULATION.shortName, asOfDate: REGULATION.asOfDate,
      dateType: REGULATION.dateType, kind: row.kind, reference: row.id,
      section, page: row.page, page_end: row.pageEnd, verified: row.verified,
      sourceFilename: document.source.filename,
      url: publicationUrl || officialUrl, officialUrl, officialUrlIsLive: true,
      pdfUrl: publicationUrl
    }
  };
}

function relatedRows(document, row, includeRelated) {
  const rows = [row], seen = new Set([keyOf(row.kind, row.id)]);
  if (includeRelated === false || row.status !== "active") return rows;
  const visit = (source, depth) => {
    if (depth > 2) return;
    for (const ref of source.relatedSourceIds) {
      const split = ref.indexOf(":"), key = keyOf(ref.slice(0, split), ref.slice(split+1));
      const target = document.byKey.get(key);
      if (!target || seen.has(key)) continue;
      seen.add(key); rows.push(target);
      // Cross-referenced codes may in turn depend on a shared formula.
      if (target.kind === "diagnostic_code") visit(target, depth+1);
    }
  };
  visit(row, 1);
  return rows;
}

function unavailable(error) {
  return { ok: false, status: "data_unavailable", results: [], hasMore: false, error };
}

export function lookupDiagnosticCode(reference, options = {}) {
  const { document, error } = loadDocument();
  if (!document) return unavailable(error);
  const id = normalize(reference);
  const row = document.byKey.get(keyOf("diagnostic_code", id));
  if (!row) {
    const index = document.byKey.get(keyOf("diagnostic_index", id));
    return { ok: false, status: index ? "index_only_no_rating_criteria" : "reference_not_indexed",
      results: index ? [resultOf(document, index)] : [], hasMore: false };
  }
  const rows = relatedRows(document, row, options.includeRelated);
  return { ok: true, status: row.status === "removed" ? "removed_code" : "found",
    results: rows.map(r => resultOf(document, r)), hasMore: false };
}

export function lookupRegulationSection(reference, options = {}) {
  const { document, error } = loadDocument();
  if (!document) return unavailable(error);
  const id = normalize(reference), kind = id.includes("(") ? "paragraph" : "section";
  let row = document.byKey.get(keyOf(kind, id));
  if (!row && /^4\.\d+$/.test(id)) {
    row = document.entries.find(r => r.kind === "section" && r.status === "reserved" && r.id.includes("-")
      && Number(id.slice(2)) >= Number(r.id.split("-")[0].slice(2))
      && Number(id.slice(2)) <= Number(r.id.split("-")[1].slice(2)));
  }
  if (!row) return { ok: false, status: "reference_not_indexed", results: [], hasMore: false };
  return { ok: true, status: row.status === "reserved" ? "reserved_section" : "found",
    results: [resultOf(document, row)], hasMore: false };
}

// Compatibility with the PT engine's public function name. CFR paragraphs
// use parentheses, e.g. 4.26(d), rather than AFMAN decimal paragraph numbers.
export function lookupRegulationParagraph(reference, options = {}) {
  const kind = options.kind || (/^[5-9]\d{3}$/.test(normalize(reference)) ? "diagnostic_code" : "section");
  if (kind === "diagnostic_code") return lookupDiagnosticCode(reference, options);
  if (kind === "section" || kind === "paragraph") return lookupRegulationSection(reference, options);
  const { document, error } = loadDocument();
  if (!document) return unavailable(error);
  const row = document.byKey.get(keyOf(kind, reference));
  return { ok: Boolean(row), status: row ? "found" : "reference_not_indexed",
    results: row ? [resultOf(document, row)] : [], hasMore: false };
}

function words(value) {
  const normalized = String(value).toLowerCase().normalize("NFKC")
    .replace(/post[ -]?traumatic stress disorder/g, "ptsd")
    .replace(/individual unemployability|\biu\b/g, "tdiu")
    .replace(/ringing (?:in (?:my|the) )?ears?/g, "tinnitus")
    .replace(/\bmigraines\b/g, "migraine")
    .replace(/\b(?:combining|combined|combination)\b/g, "combine")
    .replace(/\b(?:rounding|rounded)\b/g, "round")
    .replace(/\b(?:symptoms|conditions|evaluations|criteria)\b/g, match => ({symptoms:"symptom",conditions:"condition",evaluations:"evaluation",criteria:"criterion"}[match]));
  return [...new Set((normalized.match(/[a-z][a-z0-9]+/g) || []).filter(w => !STOP.has(w)))];
}

function preferredTopics(question) {
  const q = String(question).toLowerCase(), refs = [];
  if (/\bbilateral\b|both (?:arms|legs)|paired (?:limbs|muscles)/.test(q)) refs.push(["section","4.26"],["section","4.25"]);
  else if (/\b(?:combine[ds]?|combining|combined|round(?:ing|ed)?|va math)\b|ratings?.*(?:add|sum)|add.*ratings?/.test(q)) refs.push(["section","4.25"]);
  if (/\b(?:tdiu|unemployability|individual unemployability)\b/.test(q)) refs.push(["section","4.16"]);
  if (/\bpyramiding\b|double.count|overlapping symptoms/.test(q)) refs.push(["section","4.14"]);
  if (/\b(?:ptsd|post[ -]?traumatic stress disorder)\b/.test(q)) refs.push(["diagnostic_code","9411"]);
  if (/\bmigraines?\b/.test(q)) refs.push(["diagnostic_code","8100"]);
  if (/\btinnitus\b|ringing.*ears?/.test(q)) refs.push(["diagnostic_code","6260"]);
  if (/\bhearing (?:loss|impairment)\b/.test(q)) refs.push(["diagnostic_code","6100"]);
  if (/\bsleep apnea\b|\bcpap\b/.test(q)) refs.push(["diagnostic_code","6847"]);
  if (/\birritable bowel\b|\bibs\b/.test(q)) refs.push(["diagnostic_code","7319"]);
  if (/\bgastroesophageal reflux\b|\bgerd\b/.test(q)) refs.push(["diagnostic_code","7206"]);
  if (/\b(?:tbi|traumatic brain injury)\b/.test(q)) refs.push(["diagnostic_code","8045"]);
  return refs;
}

export function searchRegulation(question, options = {}) {
  const sourceStatus = sourceRequestStatus(question, options);
  if (sourceStatus) return {ok:false,status:sourceStatus,results:[],hasMore:false};
  const { document, error } = loadDocument();
  if (!document) return unavailable(error);
  const requested = findRequestedReferences(question);
  if (requested.length) {
    const results = [], seen = new Set(), unresolvedReferences = [];
    for (const ref of requested) {
      const answer = lookupRegulationParagraph(ref.id, {...options,kind:ref.kind});
      if (!answer.ok) unresolvedReferences.push(ref);
      for (const row of answer.results) if (!seen.has(row.source_id)) {seen.add(row.source_id);results.push(row);}
    }
    return {ok: !unresolvedReferences.length && results.length>0,
      status: unresolvedReferences.length ? "reference_not_indexed" : "found", results,
      unresolvedReferences, hasMore:false};
  }
  const preferred = preferredTopics(question);
  if (preferred.length) {
    const rows = [], seen = new Set();
    for (const [kind,id] of preferred) {
      const primary = document.byKey.get(keyOf(kind,id));
      if (!primary) continue;
      for (const row of relatedRows(document,primary,options.includeRelated)) {
        const key = keyOf(row.kind,row.id);
        if (!seen.has(key)) {seen.add(key);rows.push(row);}
      }
    }
    return {ok:rows.length>0,status:rows.length ? "found" : "no_topic_match",
      results:rows.map(row=>resultOf(document,row)),hasMore:false};
  }
  const terms = words(question);
  if (!terms.length) return {ok:false,status:"no_search_terms",results:[],hasMore:false};
  const corpus = document.entries.filter(row => ["section","diagnostic_code","formula","table"].includes(row.kind)
    && row.status === "active" && row.verified
    && !(row.kind === "section" && document.entries.some(d=>d.kind==="diagnostic_code"&&d.sectionId===row.id)))
    .map(row=>({row,body:words(row.text),title:new Set(words(row.title)),aliases:new Set(words(row.searchTerms))}));
  const averageLength = corpus.reduce((sum,item)=>sum+item.body.length,0)/corpus.length || 1;
  const frequency = new Map(terms.map(term=>[term,corpus.filter(item=>item.body.includes(term)||item.aliases.has(term)).length]));
  const ranked = corpus.map(({row,body,title,aliases})=>{
    const matches = terms.filter(term=>body.includes(term)||aliases.has(term));
    const score = matches.reduce((sum,term)=>{
      const df=frequency.get(term),weight=Math.log(1+(corpus.length-df+0.5)/(df+0.5));
      return sum+weight*2.2/(1+1.2*(0.25+0.75*body.length/averageLength))
        +(title.has(term)?weight:0)+(aliases.has(term)?2*weight:0);
    },0);
    return {row,score,coverage:matches.length/terms.length};
  }).filter(item=>item.score>0&&item.coverage>=0.5)
    .sort((a,b)=>b.score-a.score||a.row.page-b.row.page);
  const limit=bounded(options.limit,4,1,10);
  const selected=ranked.filter(item=>item.score>=((ranked[0]?.score??0)*0.65)).slice(0,limit);
  const results=[],seen=new Set();
  for(const {row,score} of selected) for(const related of relatedRows(document,row,options.includeRelated)) {
    const key=keyOf(related.kind,related.id);
    if(!seen.has(key)){seen.add(key);results.push({...resultOf(document,related),score});}
  }
  return {ok:results.length>0,status:results.length?"found":"no_topic_match",results,
    hasMore:ranked.filter(item=>item.score>=((ranked[0]?.score??0)*0.65)).length>limit};
}

export function buildRegulationContext(question, options = {}) {
  const sourceStatus = sourceRequestStatus(question, options);
  if (sourceStatus) return {
    matched:true,found:false,status:sourceStatus,error:null,
    reference:null,requestedReferences:findRequestedReferences(question),unresolvedReferences:[],
    results:[],availableResults:[],needsVerification:false,requiresVisualReview:false,
    truncatedResults:false,omittedSourceIds:[],
    sourceSnapshot:{id:REGULATION.id,asOfDate:REGULATION.asOfDate,dateType:REGULATION.dateType},
    authority:AUTHORITY_CONTRACT,scopeWarnings:[sourceStatus.toUpperCase()],context:""
  };
  const requested = findRequestedReferences(question);
  const responses = requested.length
    ? requested.map(ref=>({ref,response:lookupRegulationParagraph(ref.id,{...options,kind:ref.kind})}))
    : [{ref:null,response:searchRegulation(question,options)}];
  const unresolvedReferences = responses.filter(r=>r.ref&&!r.response.ok).map(r=>r.ref);
  const availableResults=[],seen=new Set();
  for(const {response} of responses) for(const item of response.results) {
    if(!seen.has(item.source_id)){seen.add(item.source_id);availableResults.push(item);}
  }
  const maxChars=bounded(options.maxChars,32000,1500,64000);
  const results=[],omittedSourceIds=[];
  let used=0;
  for(const item of availableResults){
    const line=JSON.stringify(item);
    if(used+line.length+1>maxChars){omittedSourceIds.push(item.source_id);continue;}
    used+=line.length+1;results.push(item);
  }
  const hasCriteria = results.some(r=>!["diagnostic_index","figure"].includes(r.kind));
  const unverified=results.filter(r=>!r.verified||r.requires_visual_review);
  const scopedWarnings=[];
  if(/\b(?:monthly|payment|dollars?|pay rates?|compensation rates?)\b/i.test(question)) scopedWarnings.push("PART_4_DOES_NOT_CONTAIN_BENEFIT_PAYMENT_TABLES");
  const errors=responses.map(r=>r.response.error).filter(Boolean);
  return {
    matched:true,found:hasCriteria,
    status:errors.length?"data_unavailable":unresolvedReferences.length
      ? responses.some(r=>r.response.status==="index_only_no_rating_criteria")?"index_only_no_rating_criteria":"reference_not_indexed"
      : responses.some(r=>r.response.status==="removed_code")?"removed_code"
      : responses.some(r=>r.response.status==="reserved_section")?"reserved_section"
      : hasCriteria?"found":availableResults.length?"excerpts_exceed_context_limit":responses[0].response.status,
    error:errors[0]??null,
    reference:requested[0]??null,requestedReferences:requested,unresolvedReferences,
    results,availableResults,
    needsVerification:unverified.length>0,
    requiresVisualReview:results.some(r=>r.requires_visual_review),
    truncatedResults:omittedSourceIds.length>0,
    omittedSourceIds,
    sourceSnapshot:{id:REGULATION.id,asOfDate:REGULATION.asOfDate,dateType:REGULATION.dateType},
    authority:AUTHORITY_CONTRACT,
    scopeWarnings:scopedWarnings,
    context:results.map(item=>JSON.stringify(item)).join("\n")
  };
}

export default Object.freeze({
  REGULATION,AUTHORITY_CONTRACT,getRegulationStatus,
  findRequestedReference,findRequestedReferences,matchesRegulationIntent,
  lookupDiagnosticCode,lookupRegulationSection,lookupRegulationParagraph,
  searchRegulation,buildRegulationContext
});

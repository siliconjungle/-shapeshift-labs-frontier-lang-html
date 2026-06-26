import * as parse5 from 'parse5';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';

const VoidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RuntimeBoundaryTags = new Set(['script', 'style', 'template', 'slot']);

function parseHtmlSemanticRecords(sourceText, options = {}) {
  const sourceHash = options.sourceHash ?? hashSemanticValue({ kind: 'frontier.lang.html.source.v1', sourceText });
  const parseErrors = [];
  const fragment = parse5.parseFragment(sourceText, {
    sourceCodeLocationInfo: true,
    onParseError: (error) => parseErrors.push(error)
  });
  const records = [];
  const root = { tagName: '#document', path: [], childCounts: new Map(), proofGaps: [] };
  for (const node of fragment.childNodes ?? []) visitSemanticNode(node, sourceText, options.sourcePath, sourceHash, root, records);
  const proofGaps = [
    ...parseErrors.map(parseErrorGap),
    ...records.flatMap((record) => record.proofGaps ?? [])
  ];
  return {
    records,
    proofGaps,
    sourceHash,
    treeHash: hashSemanticValue({ kind: 'frontier.lang.htmlSemanticTree.records.v2.parse5', records: records.map(hashableHtmlRecord), parseErrors: parseErrors.map((error) => error.code) }),
    parser: {
      name: 'parse5',
      sourceCodeLocationInfo: true,
      parseErrors: parseErrors.map((error) => compactRecord({ code: error.code, startLine: error.startLine, startColumn: error.startCol, endLine: error.endLine, endColumn: error.endCol }))
    }
  };
}

function parseHtmlMergeTree(sourceText, options = {}) {
  const sourcePath = options.sourcePath;
  const semantic = parseHtmlSemanticRecords(sourceText, {
    ...options,
    sourceHash: options.sourceHash ?? hashSemanticValue({ kind: 'frontier.lang.html.merge.source.v2.parse5', sourceText })
  });
  const records = semantic.records.map((record) => mergeRecordFromSemantic(record, sourceText, sourcePath));
  records.push(...childOrderRecords(records, semantic.sourceHash, sourcePath));
  const index = new Map(records.map((record) => [record.key, record]));
  return {
    records,
    index,
    sourceText,
    treeHash: hashSemanticValue({ kind: 'frontier.lang.html.merge.tree.v2.parse5', records: records.map(hashableMergeRecord), parseErrors: semantic.parser.parseErrors }),
    parser: semantic.parser,
    proofGaps: semantic.proofGaps
  };
}

function visitSemanticNode(node, sourceText, sourcePath, sourceHash, parent, records) {
  if (node.nodeName === '#text') return pushTextRecord(node, sourcePath, sourceHash, parent, records);
  if (node.nodeName === '#comment') return pushCommentRecord(node, sourceText, sourcePath, sourceHash, parent, records);
  if (!node.tagName) return undefined;
  const record = pushElementRecord(node, sourceText, sourcePath, sourceHash, parent, records);
  const childParent = {
    tagName: record.tagName,
    childCounts: new Map(),
    path: record.path,
    proofGaps: record.proofGaps ?? [],
    record
  };
  const childNodes = node.tagName === 'template' ? node.content?.childNodes : node.childNodes;
  for (const child of childNodes ?? []) visitSemanticNode(child, sourceText, sourcePath, sourceHash, childParent, records);
  return record;
}

function pushElementRecord(node, sourceText, sourcePath, sourceHash, parent, records) {
  const tagName = String(node.tagName ?? node.nodeName).toLowerCase();
  const ordinal = nextOrdinal(parent, tagName);
  const path = [...parent.path, `${tagName}[${ordinal}]`];
  const attributes = attributesObject(node, sourceText);
  const proofGaps = [...(parent.proofGaps ?? []), ...htmlProofGaps({ tagName, attributes })];
  const location = node.sourceCodeLocation;
  const startTag = location?.startTag ?? location;
  const endTag = location?.endTag;
  const sourceSpan = sourceSpanFromLocation(startTag ?? location, sourcePath);
  const fullSpan = sourceSpanFromLocation(location, sourcePath);
  const structuralSpan = sourceSpanFromOffsets(leadingTriviaStart(sourceText, sourceSpan?.startOffset ?? fullSpan?.startOffset ?? 0), sourceSpan?.endOffset ?? fullSpan?.endOffset ?? 0, sourceText, sourcePath);
  const record = compactRecord({
    kind: 'element',
    tagName,
    path,
    parentPath: parent.path,
    ordinal,
    identityKey: attributes.id ?? attributes['data-frontier-key'] ?? path.join('/'),
    explicitIdentity: attributes.id !== undefined || attributes['data-frontier-key'] !== undefined,
    attributes,
    attributeSpans: attributeSpans(node, sourcePath),
    classList: typeof attributes.class === 'string' ? attributes.class.split(/\s+/).filter(Boolean) : undefined,
    selfClosing: isSelfClosingElement(tagName, sourceText, startTag),
    sourceSpan,
    startTagSpan: sourceSpan,
    endTagSpan: sourceSpanFromLocation(endTag, sourcePath),
    structuralSpan,
    fullSpan,
    sourceHash,
    rawStartTag: sourceText.slice(startTag?.startOffset ?? location?.startOffset ?? 0, startTag?.endOffset ?? location?.endOffset ?? 0),
    rawEndTag: endTag ? sourceText.slice(endTag.startOffset, endTag.endOffset) : undefined,
    attributeHash: hashSemanticValue({ kind: 'frontier.lang.html.attributes.v2.parse5', attributes }),
    recordHash: hashSemanticValue({ kind: 'html.element.v2.parse5', tagName, attributes, selfClosing: isSelfClosingElement(tagName, sourceText, startTag) }),
    fullHash: fullSpan ? hashSemanticValue({ kind: 'html.element.full.v2.parse5', sourceHash, path, start: fullSpan.startOffset, end: fullSpan.endOffset }) : undefined,
    parser: 'parse5',
    proofGaps: proofGaps.length ? proofGaps : undefined
  });
  records.push(record);
  return record;
}

function pushTextRecord(node, sourcePath, sourceHash, parent, records) {
  const value = node.value ?? '';
  if (!String(value).trim()) return undefined;
  const ordinal = nextOrdinal(parent, '#text');
  const path = [...parent.path, `#text[${ordinal}]`];
  const parentIdentity = parent.record?.explicitIdentity === true ? parent.record.key ?? `element#${parent.record.identityKey}` : parent.path.join('/');
  const proofGaps = parent.proofGaps ?? [];
  records.push(compactRecord({
    kind: 'text',
    path,
    parentPath: parent.path,
    parentKey: parent.record?.key,
    value,
    key: `text#${parentIdentity}/#text[${ordinal}]`,
    textHash: hashSemanticValue({ kind: 'frontier.lang.html.text.v2.parse5', text: value }),
    recordHash: hashSemanticValue({ kind: 'html.text.v2.parse5', value }),
    sourceSpan: sourceSpanFromLocation(node.sourceCodeLocation, sourcePath),
    sourceHash,
    parser: 'parse5',
    proofGaps: proofGaps.length ? proofGaps : undefined
  }));
  return undefined;
}

function pushCommentRecord(node, sourceText, sourcePath, sourceHash, parent, records) {
  const ordinal = nextOrdinal(parent, '#comment');
  const path = [...parent.path, `#comment[${ordinal}]`];
  const parentIdentity = parent.record?.explicitIdentity === true ? parent.record.key ?? `element#${parent.record.identityKey}` : parent.path.join('/');
  const value = `<!--${node.data ?? ''}-->`;
  records.push(compactRecord({
    kind: 'comment',
    path,
    parentPath: parent.path,
    parentKey: parent.record?.key,
    value,
    key: `comment#${parentIdentity}/#comment[${ordinal}]`,
    commentHash: hashSemanticValue({ kind: 'frontier.lang.html.comment.v2.parse5', text: value }),
    recordHash: hashSemanticValue({ kind: 'html.comment.v2.parse5', value }),
    sourceSpan: sourceSpanFromLocation(node.sourceCodeLocation, sourcePath),
    sourceHash,
    parser: 'parse5',
    rawText: sourceText.slice(node.sourceCodeLocation?.startOffset ?? 0, node.sourceCodeLocation?.endOffset ?? 0)
  }));
}

function mergeRecordFromSemantic(record, sourceText, sourcePath) {
  if (record.kind === 'element') {
    return compactRecord({
      ...record,
      key: `element#${record.identityKey}`,
      parentKey: undefined,
      sourcePath,
      tokenText: record.rawStartTag,
      sourceSpan: record.startTagSpan ?? record.sourceSpan,
      structuralSpan: record.structuralSpan ?? record.startTagSpan ?? record.sourceSpan,
      fullSpan: record.fullSpan ?? record.sourceSpan,
      recordHash: hashSemanticValue({ kind: 'html.element.v2.parse5', tagName: record.tagName, attributes: record.attributes, selfClosing: record.selfClosing })
    });
  }
  return compactRecord({
    ...record,
    sourcePath,
    fullSpan: record.fullSpan ?? record.sourceSpan,
    structuralSpan: record.structuralSpan ?? record.sourceSpan,
    recordHash: record.recordHash ?? hashSemanticValue({ kind: `html.${record.kind}.v2.parse5`, value: record.value })
  });
}

function childOrderRecords(records, sourceHash, sourcePath) {
  const elementRecords = records.filter((record) => record.kind === 'element');
  const byPath = new Map(elementRecords.map((record) => [record.path.join('/'), record]));
  for (const record of elementRecords) {
    const parent = byPath.get((record.parentPath ?? record.path.slice(0, -1)).join('/'));
    if (parent) record.parentKey = parent.key;
  }
  const groups = new Map();
  for (const record of elementRecords) {
    if (record.explicitIdentity !== true) continue;
    const parentKey = record.parentKey ?? '#document';
    const group = groups.get(parentKey) ?? { parentKey, parentPath: record.parentPath, childKeys: [] };
    group.childKeys.push(record.key);
    groups.set(parentKey, group);
  }
  return [...groups.values()]
    .filter((group) => group.childKeys.length > 1)
    .map((group) => compactRecord({
      key: `child-order#${group.parentKey}`,
      kind: 'child-order',
      parentKey: group.parentKey === '#document' ? undefined : group.parentKey,
      parentPath: group.parentPath,
      childKeys: group.childKeys,
      sourceHash,
      sourcePath,
      recordHash: hashSemanticValue({ kind: 'html.child-order.v2.parse5', parentKey: group.parentKey, childKeys: group.childKeys })
    }));
}

function attributesObject(node, sourceText) {
  return Object.fromEntries((node.attrs ?? []).map((attribute) => [attribute.name, htmlAttributeValue(attribute, node.sourceCodeLocation?.attrs?.[attribute.name], sourceText)]));
}

function htmlAttributeValue(attribute, location, sourceText) {
  if (attribute.value !== '') return attribute.value;
  const raw = location ? sourceText.slice(location.startOffset, location.endOffset) : '';
  return raw.includes('=') ? '' : true;
}

function attributeSpans(node, sourcePath) {
  const spans = Object.entries(node.sourceCodeLocation?.attrs ?? {}).map(([name, location]) => [name, sourceSpanFromLocation(location, sourcePath)]);
  return spans.length ? Object.fromEntries(spans) : undefined;
}

function htmlProofGaps(parsed) {
  const gaps = [];
  if (RuntimeBoundaryTags.has(parsed.tagName)) gaps.push(proofGap(`${parsed.tagName}-runtime-boundary`, `HTML <${parsed.tagName}> runtime/template semantics require host evidence.`));
  if (parsed.tagName.includes('-')) gaps.push(proofGap('custom-element-runtime-boundary', 'Custom element upgrade and lifecycle semantics require browser/runtime evidence.'));
  if (Object.keys(parsed.attributes).some((key) => key.startsWith('@') || key.startsWith(':') || key.startsWith('v-') || key.startsWith('x-'))) gaps.push(proofGap('framework-directive-boundary', 'Framework directive semantics require framework-specific evidence.'));
  return gaps;
}

function parseErrorGap(error) {
  return proofGap('html-parser-recovery', `HTML parser recovered from ${error.code ?? 'parse-error'}; semantic merge requires parse-clean source.`);
}

function proofGap(code, summary) { return { code, status: 'not-claimed', summary, failClosed: true, semanticEquivalenceClaim: false }; }
function nextOrdinal(parent, key) { const next = (parent.childCounts.get(key) ?? 0) + 1; parent.childCounts.set(key, next); return next; }
function hashableHtmlRecord(record) { return { kind: record.kind, tagName: record.tagName, path: record.path, identityKey: record.identityKey, attributes: record.attributes, textHash: record.textHash, commentHash: record.commentHash, sourceSpan: record.sourceSpan, fullSpan: record.fullSpan, proofGaps: record.proofGaps?.map((gap) => gap.code), parser: record.parser }; }
function hashableMergeRecord(record) { return { key: record.key, kind: record.kind, tagName: record.tagName, path: record.path, identityKey: record.identityKey, attributes: record.attributes, recordHash: record.recordHash, fullHash: record.fullHash, proofGaps: record.proofGaps?.map((gap) => gap.code), parser: record.parser }; }
function isSelfClosingElement(tagName, sourceText, startTag) { return VoidTags.has(tagName) || sourceText.slice(startTag?.startOffset ?? 0, startTag?.endOffset ?? 0).endsWith('/>'); }
function sourceSpanFromLocation(location, path) { return location ? compactRecord({ path, startOffset: location.startOffset, endOffset: location.endOffset, startLine: location.startLine, startColumn: location.startCol, endLine: location.endLine, endColumn: location.endCol }) : undefined; }
function sourceSpanFromOffsets(start, end, sourceText, path) {
  const lineStarts = computeLineStarts(sourceText);
  const from = positionAt(start, lineStarts);
  const to = positionAt(end, lineStarts);
  return { path, startOffset: start, endOffset: end, startLine: from.line, startColumn: from.column, endLine: to.line, endColumn: to.column };
}
function leadingTriviaStart(sourceText, start) {
  let index = start;
  while (index > 0 && /\s/.test(sourceText[index - 1])) index -= 1;
  return index;
}
function positionAt(offset, lineStarts) { let line = 0; while (line + 1 < lineStarts.length && lineStarts[line + 1] <= offset) line += 1; return { line: line + 1, column: offset - lineStarts[line] + 1 }; }
function computeLineStarts(text) { const starts = [0]; for (let index = 0; index < text.length; index += 1) if (text[index] === '\n') starts.push(index + 1); return starts; }
function compactRecord(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }

export { parseHtmlMergeTree, parseHtmlSemanticRecords };

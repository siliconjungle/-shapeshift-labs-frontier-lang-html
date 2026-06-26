import { performance } from 'node:perf_hooks';
import { actionNode, createDocument, entityNode } from '@shapeshift-labs/frontier-lang-kernel';
import { createHtmlSemanticMergeEvidence, emitHtml, emitHtmlWithSourceMap } from '../dist/index.js';

const document = createDocument({ id: 'doc', name: 'Doc', nodes: [
  entityNode({ id: 'ent_todo', name: 'Todo', fields: [
    { id: 'field_title', name: 'title', type: 'Text' },
    { id: 'field_done', name: 'done', type: 'Bool' }
  ] }),
  actionNode({ id: 'action_update', name: 'toggleTodo', input: 'Todo', returns: 'Patch' })
] });
const source = '<main id="app"><article data-frontier-key="todo"><h1>Todo</h1><input checked></article></main>';
const start = performance.now();
let bytes = 0;
let mappedBytes = 0;
let mappings = 0;
let evidenceRecords = 0;
for (let index = 0; index < 500; index += 1) {
  bytes += emitHtml(document).length;
  const mapped = emitHtmlWithSourceMap(document, { targetPath: 'doc.html' });
  const evidence = createHtmlSemanticMergeEvidence(source);
  mappedBytes += mapped.code.length + JSON.stringify(mapped.sourceMap).length;
  mappings += mapped.sourceMap.mappings.length;
  evidenceRecords += evidence.records.length;
}
console.log(JSON.stringify({ emits: 500, bytes, mappedBytes, mappings, evidenceRecords, durationMs: Number((performance.now() - start).toFixed(2)) }));

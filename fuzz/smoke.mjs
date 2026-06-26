import assert from 'node:assert/strict';
import { actionNode, createDocument, entityNode } from '@shapeshift-labs/frontier-lang-kernel';
import { createHtmlSemanticMergeEvidence, emitHtml, emitHtmlWithSourceMap } from '../dist/index.js';

for (let index = 0; index < 100; index += 1) {
  const document = createDocument({ id: `doc_${index}`, name: `Doc${index}`, nodes: [
    entityNode({ id: `ent_${index}`, name: 'Todo', fields: [{ id: `field_title_${index}`, name: 'title', type: 'Text' }] }),
    actionNode({ id: `action_${index}`, name: 'toggleTodo', input: 'Todo', returns: 'Patch' })
  ] });
  const output = emitHtml(document);
  const mapped = emitHtmlWithSourceMap(document, { targetPath: `doc_${index}.html` });
  const evidence = createHtmlSemanticMergeEvidence(`<main><article id="todo-${index}"><h1>Todo ${index}</h1></article></main>`);
  assert.match(output, /data-frontier-kind="entity"/);
  assert.match(output, /data-frontier-action="toggleTodo"/);
  assert.equal(mapped.code, output);
  assert.equal(mapped.sourceMap.target.language, 'html');
  assert.equal(evidence.status, 'ready');
  assert.equal(evidence.records.some((record) => record.identityKey === `todo-${index}`), true);
}

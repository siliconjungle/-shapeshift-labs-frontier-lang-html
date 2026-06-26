import assert from 'node:assert/strict';
import { actionNode, capabilityNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { createHtmlSemanticMergeEvidence, emitHtml, emitHtmlWithSourceMap, parseHtmlSemanticTree, renderHtmlAst, renderHtmlAstWithSourceMap, toHtmlAst } from '../dist/index.js';

const document = createDocument({ id: 'doc', name: 'TodoHtml', nodes: [
  typeNode({ id: 'type_input', name: 'TodoInput', fields: [{ id: 'field_title', name: 'title', type: 'Text' }] }),
  entityNode({ id: 'entity_todo', name: 'Todo', fields: [{ id: 'field_done', name: 'done', type: 'Bool' }] }),
  capabilityNode({ id: 'cap_view', name: 'ViewRender', capability: 'view.render', category: 'dom' }),
  actionNode({ id: 'action_toggle', name: 'toggleTodo', input: 'TodoInput', returns: 'Patch' })
] });

const ast = toHtmlAst(document);
const out = emitHtml(document);
const rendered = renderHtmlAstWithSourceMap(ast, {
  sourceMapId: 'map_doc_html',
  sourcePath: 'doc.frontier',
  targetPath: 'doc.html',
  semanticIndexId: 'semantic_doc',
  sourceSpansBySemanticNodeId: {
    entity_todo: { path: 'doc.frontier', startLine: 5, startColumn: 1, endLine: 7, endColumn: 2 }
  },
  evidence: [{ id: 'evidence_projection', kind: 'projection', summary: 'html projection evidence' }]
});
const emitted = emitHtmlWithSourceMap(document, { targetPath: 'doc.html' });

assert.equal(ast.kind, 'html.document');
assert.equal(renderHtmlAst(ast), out);
assert.equal(rendered.code, out);
assert.equal(emitted.code, out);
assert.equal(emitted.ast.kind, 'html.document');
assert.equal(rendered.sourceMap.kind, 'frontier.lang.sourceMap');
assert.equal(rendered.sourceMap.id, 'map_doc_html');
assert.equal(rendered.sourceMap.target.language, 'html');
assert.equal(rendered.sourceMap.targetPath, 'doc.html');
assert.equal(rendered.sourceMap.semanticIndexId, 'semantic_doc');
assert.match(out, /data-frontier-kind="entity"/);
assert.match(out, /data-frontier-action="toggleTodo"/);
const todoMapping = rendered.sourceMap.mappings.find((mapping) => mapping.semanticNodeId === 'entity_todo' && mapping.generatedName === 'section');
assert.equal(todoMapping.generatedName, 'section');
assert.equal(todoMapping.precision, 'element-block');
assert.equal(todoMapping.sourceSpan.path, 'doc.frontier');

const source = [
  '<main id="app" class="shell app">',
  '  <article data-frontier-key="todo-1" aria-live="polite">',
  '    <!-- stable comment -->',
  '    <h1>Todo</h1>',
  '    <input type="checkbox" checked>',
  '    <x-widget :value="todo"></x-widget>',
  '    <template><span>{{ todo.title }}</span></template>',
  '    <style>.done { color: green; }</style>',
  '    <script>customElements.define("x-widget", class extends HTMLElement {});</script>',
  '  </article>',
  '</main>'
].join('\n');
const tree = parseHtmlSemanticTree(source, { sourcePath: 'view.html' });
const evidence = createHtmlSemanticMergeEvidence(source, { sourcePath: 'view.html' });
const article = tree.records.find((record) => record.tagName === 'article');
const input = tree.records.find((record) => record.tagName === 'input');
assert.equal(tree.kind, 'frontier.lang.htmlSemanticTree');
assert.equal(Boolean(tree.treeHash), true);
assert.equal(article.identityKey, 'todo-1');
assert.equal(article.attributes['aria-live'], 'polite');
assert.deepEqual(tree.records.find((record) => record.tagName === 'main').classList, ['shell', 'app']);
assert.equal(input.attributes.checked, true);
assert.equal(tree.records.some((record) => record.kind === 'comment'), true);
assert.equal(tree.proofGaps.some((gap) => gap.code === 'custom-element-runtime-boundary'), true);
assert.equal(tree.proofGaps.some((gap) => gap.code === 'framework-directive-boundary'), true);
assert.equal(tree.proofGaps.some((gap) => gap.code === 'template-runtime-boundary'), true);
assert.equal(tree.proofGaps.some((gap) => gap.code === 'style-runtime-boundary'), true);
assert.equal(tree.proofGaps.some((gap) => gap.code === 'script-runtime-boundary'), true);
assert.equal(evidence.kind, 'frontier.lang.htmlSemanticMergeEvidence');
assert.equal(evidence.status, 'needs-review');
assert.equal(evidence.autoMergeClaim, false);
assert.equal(evidence.semanticEquivalenceClaim, false);
assert.equal(evidence.browserRuntimeEquivalenceClaim, false);

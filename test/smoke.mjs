import assert from 'node:assert/strict';
import { actionNode, capabilityNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { createHtmlSemanticMergeEvidence, emitHtml, emitHtmlWithSourceMap, parseHtmlSemanticTree, renderHtmlAst, renderHtmlAstWithSourceMap, safeMergeHtmlSource, toHtmlAst } from '../dist/index.js';

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

const htmlMergeBase = [
  '<main id="app">',
  '  <h1>Todo</h1>',
  '  <button data-frontier-key="save" type="button">Save</button>',
  '</main>',
  ''
].join('\n');
const htmlMergeWorker = htmlMergeBase.replace('Todo</h1>', 'Todos</h1>');
const htmlMergeHead = htmlMergeBase.replace('type="button"', 'type="button" disabled');
const htmlMerged = safeMergeHtmlSource({
  id: 'html_independent_text_and_attribute',
  sourcePath: 'view.html',
  baseSourceText: htmlMergeBase,
  workerSourceText: htmlMergeWorker,
  headSourceText: htmlMergeHead
});
assert.equal(htmlMerged.kind, 'frontier.lang.htmlSafeMerge');
assert.equal(htmlMerged.status, 'merged');
assert.equal(htmlMerged.operation, 'semantic-html-merge');
assert.match(htmlMerged.mergedSourceText, /<h1>Todos<\/h1>/);
assert.match(htmlMerged.mergedSourceText, /<button data-frontier-key="save" type="button" disabled>/);
assert.equal(htmlMerged.autoMergeClaim, false);
assert.equal(htmlMerged.semanticEquivalenceClaim, false);
assert.equal(htmlMerged.browserRuntimeEquivalenceClaim, false);

const htmlAttributeMergeBase = [
  '<button data-frontier-key="save" type="button">Save</button>',
  ''
].join('\n');
const htmlAttributeMerge = safeMergeHtmlSource({
  id: 'html_independent_attributes',
  sourcePath: 'view.html',
  baseSourceText: htmlAttributeMergeBase,
  workerSourceText: htmlAttributeMergeBase.replace('type="button"', 'type="submit"'),
  headSourceText: htmlAttributeMergeBase.replace('type="button"', 'type="button" aria-label="Save item"')
});
assert.equal(htmlAttributeMerge.status, 'merged');
assert.match(htmlAttributeMerge.mergedSourceText, /aria-label="Save item"/);
assert.match(htmlAttributeMerge.mergedSourceText, /type="submit"/);

const htmlTextConflict = safeMergeHtmlSource({
  id: 'html_text_conflict',
  sourcePath: 'view.html',
  baseSourceText: htmlMergeBase,
  workerSourceText: htmlMergeWorker,
  headSourceText: htmlMergeBase.replace('Todo</h1>', 'Task</h1>')
});
assert.equal(htmlTextConflict.status, 'blocked');
assert.equal(htmlTextConflict.conflicts.some((conflict) => conflict.code === 'html-record-conflict'), true);

const htmlRuntimeConflict = safeMergeHtmlSource({
  id: 'html_script_conflict',
  sourcePath: 'view.html',
  baseSourceText: '<script>window.value = 1;</script>\n',
  workerSourceText: '<script>window.value = 2;</script>\n',
  headSourceText: '<script>window.value = 1;</script>\n'
});
assert.equal(htmlRuntimeConflict.status, 'blocked');
assert.equal(htmlRuntimeConflict.conflicts.some((conflict) => conflict.code === 'html-proof-gap-blocked'), true);

const htmlListBase = [
  '<ul id="todos">',
  '  <li data-frontier-key="a">A</li>',
  '</ul>',
  ''
].join('\n');
const htmlListHead = htmlListBase.replace('id="todos"', 'id="todos" class="list"');
const htmlListAdd = safeMergeHtmlSource({
  id: 'html_structural_add',
  sourcePath: 'view.html',
  baseSourceText: htmlListBase,
  workerSourceText: [
    '<ul id="todos">',
    '  <li data-frontier-key="a">A</li>',
    '  <li data-frontier-key="b">B</li>',
    '</ul>',
    ''
  ].join('\n'),
  headSourceText: htmlListHead
});
assert.equal(htmlListAdd.status, 'merged');
assert.match(htmlListAdd.mergedSourceText, /class="list"/);
assert.match(htmlListAdd.mergedSourceText, /data-frontier-key="b">B/);

const htmlListDelete = safeMergeHtmlSource({
  id: 'html_structural_delete',
  sourcePath: 'view.html',
  baseSourceText: htmlListBase,
  workerSourceText: ['<ul id="todos">', '</ul>', ''].join('\n'),
  headSourceText: htmlListHead
});
assert.equal(htmlListDelete.status, 'merged');
assert.doesNotMatch(htmlListDelete.mergedSourceText, /data-frontier-key="a"/);
assert.match(htmlListDelete.mergedSourceText, /class="list"/);

const htmlSameKeyAddConflict = safeMergeHtmlSource({
  id: 'html_same_key_add_conflict',
  sourcePath: 'view.html',
  baseSourceText: ['<ul id="todos">', '</ul>', ''].join('\n'),
  workerSourceText: ['<ul id="todos">', '  <li data-frontier-key="b">B</li>', '</ul>', ''].join('\n'),
  headSourceText: ['<ul id="todos">', '  <li data-frontier-key="b">Bee</li>', '</ul>', ''].join('\n')
});
assert.equal(htmlSameKeyAddConflict.status, 'blocked');
assert.equal(htmlSameKeyAddConflict.conflicts.some((conflict) => conflict.code === 'html-structural-overlap-conflict' || conflict.code === 'html-record-conflict'), true);

const htmlPathOnlyAddConflict = safeMergeHtmlSource({
  id: 'html_path_only_add_conflict',
  sourcePath: 'view.html',
  baseSourceText: ['<ul id="todos">', '</ul>', ''].join('\n'),
  workerSourceText: ['<ul id="todos">', '  <li>B</li>', '</ul>', ''].join('\n'),
  headSourceText: ['<ul id="todos">', '</ul>', ''].join('\n')
});
assert.equal(htmlPathOnlyAddConflict.status, 'blocked');
assert.equal(htmlPathOnlyAddConflict.conflicts.some((conflict) => conflict.code === 'html-structural-add-delete-unsupported'), true);

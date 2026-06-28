import assert from 'node:assert/strict';
import { actionNode, capabilityNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { createHtmlSemanticMergeEvidence, emitHtml, emitHtmlWithSourceMap, parseHtmlSemanticTree, renderHtmlAst, renderHtmlAstWithSourceMap, safeMergeHtmlSource, toHtmlAst } from '../dist/index.js';
import './runtime-proof-smoke.mjs';
import './runtime-proof-builder-smoke.mjs';
import './resource-runtime-proof-smoke.mjs';
import './structural-runtime-proof-smoke.mjs';
import './class-token-merge-smoke.mjs';
import './token-list-merge-smoke.mjs';
import './unkeyed-structural-add-smoke.mjs';

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
assert.equal(tree.parser.name, 'parse5');
assert.equal(tree.summary.parseErrors, 0);
assert.equal(article.identityKey, 'todo-1');
assert.equal(article.attributes['aria-live'], 'polite');
assert.equal(article.parser, 'parse5');
assert.equal(article.attributeSpans['data-frontier-key'].startLine, 2);
assert.match(article.rawStartTag, /data-frontier-key="todo-1"/);
assert.equal(article.fullSpan.endOffset > article.startTagSpan.endOffset, true);
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

const malformedTree = parseHtmlSemanticTree('<div id="a" id="b">Duplicate</div>\n', { sourcePath: 'bad.html' });
assert.equal(malformedTree.parser.parseErrors.some((error) => error.code === 'duplicate-attribute'), true);
assert.equal(malformedTree.proofGaps.some((gap) => gap.code === 'html-parser-recovery'), true);

const malformedMerge = safeMergeHtmlSource({
  id: 'html_parser_recovery_blocks_merge',
  sourcePath: 'bad.html',
  baseSourceText: '<div id="a" id="b">Duplicate</div>\n',
  workerSourceText: '<div id="a" id="b">Changed</div>\n',
  headSourceText: '<div id="a" id="b">Duplicate</div>\n'
});
assert.equal(malformedMerge.status, 'blocked');
assert.equal(malformedMerge.conflicts.some((conflict) => conflict.code === 'html-parser-recovery-blocked'), true);

const htmlMergeBase = [
  '<main id="app">',
  '  <h1>Todo</h1>',
  '  <button data-frontier-key="save" type="button">Save</button>',
  '</main>',
  ''
].join('\n');
const htmlMergeWorker = htmlMergeBase.replace('Todo</h1>', 'Todos</h1>');
const htmlMergeHead = htmlMergeBase.replace('type="button"', 'type="button" aria-label="Save item"');
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
assert.match(htmlMerged.mergedSourceText, /<button data-frontier-key="save" type="button" aria-label="Save item">/);
assert.equal(htmlMerged.autoMergeClaim, false);
assert.equal(htmlMerged.semanticEquivalenceClaim, false);
assert.equal(htmlMerged.browserRuntimeEquivalenceClaim, false);
assert.equal(htmlMerged.parserEvidence.parserNames.includes('parse5'), true);
assert.equal(htmlMerged.parserEvidence.parserBackedSourceSpans, true);
assert.equal(htmlMerged.parserEvidence.parserBackedAttributeSpans, true);
assert.equal(htmlMerged.parserEvidence.parserBackedTriviaSpans, true);
assert.equal(htmlMerged.parserEvidence.parseErrors, 0);
assert.equal(htmlMerged.parserEvidence.recordCount, Object.values(htmlMerged.parserEvidence.sides).reduce((sum, side) => sum + side.recordCount, 0));
assert.equal(htmlMerged.parserEvidence.sourceSpanMissingRecordCount, 0);
assert.equal(htmlMerged.parserEvidence.attributeSpanMissingElementCount, 0);
assert.equal(htmlMerged.parserEvidence.structuralSpanMissingRecordCount, 0);
assert.equal(htmlMerged.parserEvidence.leadingTriviaSpanRecordCount > 0, true);
assert.equal(htmlMerged.parserEvidence.sides.base.sourceSpanRecordCount, htmlMerged.parserEvidence.sides.base.recordCount);
assert.equal(htmlMerged.parserEvidence.sides.base.attributeSpanMissingElementCount, 0);
assert.equal(htmlMerged.parserEvidence.sides.base.structuralSpanRecordCount, htmlMerged.parserEvidence.sides.base.recordCount);
assert.equal(htmlMerged.identityEvidence.kind, 'frontier.lang.htmlSafeMergeIdentityEvidence');
assert.equal(htmlMerged.identityEvidence.parserBackedStructuralSpans, true);
assert.equal(htmlMerged.identityEvidence.structuralAddressability, true);
assert.equal(htmlMerged.identityEvidence.sides.base.explicitIdentityElementCount, 2);
assert.equal(htmlMerged.identityEvidence.sides.base.pathOnlyIdentityElementCount, 1);
assert.equal(htmlMerged.identityEvidence.duplicateExplicitIdentityElementCount, 0);
assert.deepEqual(htmlMerged.identityEvidence.duplicateExplicitIdentityKeys, []);

const htmlAttributeMergeBase = [
  '<button data-frontier-key="save" type="button">Save</button>',
  ''
].join('\n');
const htmlAttributeMerge = safeMergeHtmlSource({
  id: 'html_form_submitter_type_blocks_without_proof',
  sourcePath: 'view.html',
  baseSourceText: htmlAttributeMergeBase,
  workerSourceText: htmlAttributeMergeBase.replace('type="button"', 'type="submit"'),
  headSourceText: htmlAttributeMergeBase.replace('type="button"', 'type="button" aria-label="Save item"')
});
assert.equal(htmlAttributeMerge.status, 'blocked');
assert.equal(htmlAttributeMerge.conflicts.some((conflict) => conflict.details.reasonCode === 'form-submitter-runtime-boundary'), true);

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

const htmlDuplicateExplicitIdentity = safeMergeHtmlSource({
  id: 'html_duplicate_explicit_identity_blocks_package_api',
  sourcePath: 'view.html',
  baseSourceText: ['<ul id="todos">', '</ul>', ''].join('\n'),
  workerSourceText: ['<ul id="todos">', '  <li data-frontier-key="item">A</li>', '  <li data-frontier-key="item">B</li>', '</ul>', ''].join('\n'),
  headSourceText: ['<ul id="todos">', '</ul>', ''].join('\n')
});
assert.equal(htmlDuplicateExplicitIdentity.status, 'blocked');
assert.equal(htmlDuplicateExplicitIdentity.conflicts.some((conflict) => conflict.code === 'html-duplicate-explicit-identity'), true);
assert.equal(htmlDuplicateExplicitIdentity.identityEvidence.sides.worker.duplicateExplicitIdentityElementCount, 2);
assert.deepEqual(htmlDuplicateExplicitIdentity.identityEvidence.sides.worker.duplicateExplicitIdentityKeys, ['element#item']);

const htmlPathOnlyAddConflict = safeMergeHtmlSource({
  id: 'html_path_only_add_conflict',
  sourcePath: 'view.html',
  baseSourceText: ['<ul id="todos">', '</ul>', ''].join('\n'),
  workerSourceText: ['<ul id="todos">', '  <li>B</li>', '</ul>', ''].join('\n'),
  headSourceText: ['<ul id="todos">', '</ul>', ''].join('\n')
});
assert.equal(htmlPathOnlyAddConflict.status, 'merged');
assert.equal(htmlPathOnlyAddConflict.htmlUnkeyedStructuralAddEvidence.length, 1);
assert.equal(htmlPathOnlyAddConflict.htmlUnkeyedStructuralAddEvidence[0].parentExplicitIdentity, true);

const htmlListReorderBase = [
  '<ul id="todos">',
  '  <li data-frontier-key="a">A</li>',
  '  <li data-frontier-key="b">B</li>',
  '  <li data-frontier-key="c">C</li>',
  '</ul>',
  ''
].join('\n');
const htmlListReorder = safeMergeHtmlSource({
  id: 'html_keyed_child_reorder',
  sourcePath: 'view.html',
  baseSourceText: htmlListReorderBase,
  workerSourceText: [
    '<ul id="todos">',
    '  <li data-frontier-key="c">C</li>',
    '  <li data-frontier-key="a">A</li>',
    '  <li data-frontier-key="b">B</li>',
    '</ul>',
    ''
  ].join('\n'),
  headSourceText: htmlListReorderBase.replace('data-frontier-key="b">B', 'data-frontier-key="b" class="done">Bee')
});
assert.equal(htmlListReorder.status, 'merged');
assert.match(htmlListReorder.mergedSourceText, /data-frontier-key="c">C<\/li>\n  <li data-frontier-key="a">A<\/li>\n  <li data-frontier-key="b" class="done">Bee<\/li>/);
assert.equal(htmlListReorder.identityEvidence.sides.base.childOrderRecordCount, 1);
assert.equal(htmlListReorder.identityEvidence.sides.worker.explicitIdentityKeys.includes('element#c'), true);

const htmlUnkeyedReorderConflict = safeMergeHtmlSource({
  id: 'html_unkeyed_child_reorder_conflict',
  sourcePath: 'view.html',
  baseSourceText: ['<ul id="todos">', '  <li data-frontier-key="a">A</li>', '  <li>Loose</li>', '  <li data-frontier-key="b">B</li>', '</ul>', ''].join('\n'),
  workerSourceText: ['<ul id="todos">', '  <li data-frontier-key="b">B</li>', '  <li>Loose</li>', '  <li data-frontier-key="a">A</li>', '</ul>', ''].join('\n'),
  headSourceText: ['<ul id="todos" class="list">', '  <li data-frontier-key="a">A</li>', '  <li>Loose</li>', '  <li data-frontier-key="b">B</li>', '</ul>', ''].join('\n')
});
assert.equal(htmlUnkeyedReorderConflict.status, 'blocked');
assert.equal(htmlUnkeyedReorderConflict.conflicts.some((conflict) => conflict.code === 'html-child-order-unkeyed-sibling'), true);

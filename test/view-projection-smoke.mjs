import assert from 'node:assert/strict';
import { actionNode, createDocument, viewNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitHtmlWithSourceMap, parseHtmlSemanticTree } from '../dist/index.js';

const document = createDocument({ id: 'view_doc', name: 'ViewDoc', nodes: [
  actionNode({ id: 'action_save', name: 'saveTodo', input: 'TodoInput', returns: 'Patch' }),
  viewNode({
    id: 'view_todo_list',
    name: 'TodoList',
    reads: ['TodoDb.todos'],
    dispatches: ['action_save'],
    props: [{ id: 'prop_disabled', name: 'disabled', type: 'Boolean' }],
    events: [{ id: 'event_save', name: 'save', action: 'action_save' }],
    renders: [{
      id: 'render_root',
      kind: 'element',
      tagName: 'Article',
      identityKey: 'todo-root',
      children: ['render_save_button', 'render_filter_input']
    }, {
      id: 'render_save_button',
      kind: 'element',
      tagName: 'Button',
      identityKey: 'save',
      text: 'Save',
      props: [
        { name: 'aria-label', value: 'Save item' },
        { name: 'disabled', expression: 'disabled' }
      ],
      events: [{ name: 'press', action: 'save' }]
    }, {
      id: 'render_filter_input',
      kind: 'element',
      tagName: 'Input',
      identityKey: 'filter',
      props: [{ name: 'type', value: 'search' }]
    }]
  })
] });

const emitted = emitHtmlWithSourceMap(document, {
  sourcePath: 'view.frontier',
  targetPath: 'view.html',
  semanticIndexId: 'semantic_view'
});

assert.match(emitted.code, /data-frontier-view="TodoList"/);
assert.match(emitted.code, /data-frontier-render="render_root"/);
assert.match(emitted.code, /data-frontier-key="todo-root"/);
assert.match(emitted.code, /<button /);
assert.match(emitted.code, /data-frontier-render="render_save_button"/);
assert.match(emitted.code, /data-frontier-key="save"/);
assert.match(emitted.code, /aria-label="Save item"/);
assert.match(emitted.code, /data-frontier-prop-disabled="disabled"/);
assert.match(emitted.code, /data-frontier-on-press="save"/);
assert.match(emitted.code, /<input [^>]*data-frontier-render="render_filter_input"/);
assert.doesNotMatch(emitted.code, /<\/input>/);
assert.equal([...emitted.code.matchAll(/data-frontier-render="render_save_button"/g)].length, 1);

const renderMapping = emitted.sourceMap.mappings.find((mapping) => mapping.semanticNodeId === 'view_todo_list' && mapping.generatedName === 'button');
assert.equal(Boolean(renderMapping), true);
assert.deepEqual(renderMapping.metadata.regionIds, ['render_save_button']);
assert.equal(emitted.sourceMap.metadata.precision, 'element-block');

const tree = parseHtmlSemanticTree(emitted.code, { sourcePath: 'view.html' });
const button = tree.records.find((record) => record.attributes?.['data-frontier-render'] === 'render_save_button');
assert.equal(button.identityKey, 'save');
assert.equal(button.attributes['data-frontier-prop-disabled'], 'disabled');
assert.equal(button.attributes['data-frontier-on-press'], 'save');

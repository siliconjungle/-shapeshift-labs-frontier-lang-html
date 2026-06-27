import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { safeMergeHtmlSource } from '../dist/index.js';

function sourceBoundProof({ id, sourcePath = 'view.html', reasonCode, side = 'worker', boundary, boundaryAttributes, base, worker, head, output }) {
  return {
    id,
    kind: 'html-source-bound-runtime-boundary-proof',
    status: 'passed',
    sourcePath,
    reasonCode,
    side,
    boundary,
    boundaryAttributes,
    baseSourceHash: hashSemanticValue(base),
    workerSourceHash: hashSemanticValue(worker),
    headSourceHash: hashSemanticValue(head),
    outputSourceHash: hashSemanticValue(output),
    runtimeCommand: `node test/html-runtime/${id}.mjs`,
    runtimeProbeId: `html:${reasonCode}:${boundary}`,
    runtimeEvidenceHash: hashSemanticValue(`html-runtime-evidence:${reasonCode}:${boundary}:${id}`),
    runtimeSignals: runtimeSignals(reasonCode, boundary)
  };
}

function runtimeSignals(reasonCode, boundary) {
  const text = `${reasonCode ?? ''} ${boundary ?? ''}`.toLowerCase();
  if (text.includes('template')) return ['html-template-runtime'];
  if (text.includes('slot')) return ['html-slot-runtime'];
  if (text.includes('custom-element')) return ['html-custom-element-runtime'];
  if (text.includes('framework-directive')) return ['html-framework-directive-runtime'];
  return ['html-browser-runtime'];
}

const templateBase = '<template data-frontier-key="row"><span>A</span></template>\n';
const templateWorker = '<template data-frontier-key="row"><span>B</span></template>\n';
const templateBlocked = safeMergeHtmlSource({ id: 'html_template_runtime_blocked', sourcePath: 'view.html', baseSourceText: templateBase, workerSourceText: templateWorker, headSourceText: templateBase });
assert.equal(templateBlocked.status, 'blocked');
assert.equal(templateBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'template-runtime-boundary' && conflict.details.boundary === 'html-template-runtime'), true);
const templateProven = safeMergeHtmlSource({
  id: 'html_template_runtime_proven',
  sourcePath: 'view.html',
  baseSourceText: templateBase,
  workerSourceText: templateWorker,
  headSourceText: templateBase,
  htmlRuntimeBoundaryProofs: [sourceBoundProof({ id: 'proof_html_template_runtime', reasonCode: 'template-runtime-boundary', boundary: 'html-template-runtime', base: templateBase, worker: templateWorker, head: templateBase, output: templateWorker })]
});
assert.equal(templateProven.status, 'merged');
assert.equal(templateProven.htmlRuntimeProofs[0].boundary, 'html-template-runtime');
assert.equal(templateProven.mergedSourceText, templateWorker);

const slotBase = '<slot data-frontier-key="main-slot" name="summary"></slot>\n';
const slotWorker = '<slot data-frontier-key="main-slot" name="details"></slot>\n';
const slotBlocked = safeMergeHtmlSource({ id: 'html_slot_runtime_blocked', sourcePath: 'view.html', baseSourceText: slotBase, workerSourceText: slotWorker, headSourceText: slotBase });
assert.equal(slotBlocked.status, 'blocked');
assert.equal(slotBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'slot-runtime-boundary' && conflict.details.boundary === 'html-slot-runtime'), true);
const slotWrongBoundary = safeMergeHtmlSource({
  id: 'html_slot_runtime_wrong_boundary',
  sourcePath: 'view.html',
  baseSourceText: slotBase,
  workerSourceText: slotWorker,
  headSourceText: slotBase,
  htmlRuntimeBoundaryProofs: [sourceBoundProof({ id: 'proof_html_slot_wrong', reasonCode: 'slot-runtime-boundary', boundary: 'html-template-runtime', base: slotBase, worker: slotWorker, head: slotBase, output: slotWorker })]
});
assert.equal(slotWrongBoundary.status, 'blocked');
const slotProven = safeMergeHtmlSource({
  id: 'html_slot_runtime_proven',
  sourcePath: 'view.html',
  baseSourceText: slotBase,
  workerSourceText: slotWorker,
  headSourceText: slotBase,
  htmlRuntimeBoundaryProofs: [sourceBoundProof({ id: 'proof_html_slot_runtime', reasonCode: 'slot-runtime-boundary', boundary: 'html-slot-runtime', base: slotBase, worker: slotWorker, head: slotBase, output: slotWorker })]
});
assert.equal(slotProven.status, 'merged');
assert.equal(slotProven.htmlRuntimeProofs[0].boundary, 'html-slot-runtime');

const customBase = '<x-card data-frontier-key="card">A</x-card>\n';
const customWorker = '<x-card data-frontier-key="card">B</x-card>\n';
const customBlocked = safeMergeHtmlSource({ id: 'html_custom_element_runtime_blocked', sourcePath: 'view.html', baseSourceText: customBase, workerSourceText: customWorker, headSourceText: customBase });
assert.equal(customBlocked.status, 'blocked');
assert.equal(customBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'custom-element-runtime-boundary' && conflict.details.boundary === 'html-custom-element-runtime'), true);
const customProven = safeMergeHtmlSource({
  id: 'html_custom_element_runtime_proven',
  sourcePath: 'view.html',
  baseSourceText: customBase,
  workerSourceText: customWorker,
  headSourceText: customBase,
  htmlRuntimeBoundaryProofs: [sourceBoundProof({ id: 'proof_html_custom_element_runtime', reasonCode: 'custom-element-runtime-boundary', boundary: 'html-custom-element-runtime', base: customBase, worker: customWorker, head: customBase, output: customWorker })]
});
assert.equal(customProven.status, 'merged');
assert.equal(customProven.htmlRuntimeProofs[0].boundary, 'html-custom-element-runtime');

const directiveBase = '<div data-frontier-key="panel" :class="oldClass">Panel</div>\n';
const directiveWorker = '<div data-frontier-key="panel" :class="nextClass">Panel</div>\n';
const directiveBlocked = safeMergeHtmlSource({ id: 'html_framework_directive_blocked', sourcePath: 'view.html', baseSourceText: directiveBase, workerSourceText: directiveWorker, headSourceText: directiveBase });
assert.equal(directiveBlocked.status, 'blocked');
assert.equal(directiveBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'framework-directive-boundary' && conflict.details.boundary === 'html-framework-directive' && conflict.details.attributeName === ':class'), true);
const directiveWrongAttribute = safeMergeHtmlSource({
  id: 'html_framework_directive_wrong_attribute',
  sourcePath: 'view.html',
  baseSourceText: directiveBase,
  workerSourceText: directiveWorker,
  headSourceText: directiveBase,
  htmlRuntimeBoundaryProofs: [sourceBoundProof({ id: 'proof_html_framework_directive_wrong', reasonCode: 'framework-directive-boundary', boundary: 'html-framework-directive', boundaryAttributes: ['@click'], base: directiveBase, worker: directiveWorker, head: directiveBase, output: directiveWorker })]
});
assert.equal(directiveWrongAttribute.status, 'blocked');
const directiveProven = safeMergeHtmlSource({
  id: 'html_framework_directive_proven',
  sourcePath: 'view.html',
  baseSourceText: directiveBase,
  workerSourceText: directiveWorker,
  headSourceText: directiveBase,
  htmlRuntimeBoundaryProofs: [sourceBoundProof({ id: 'proof_html_framework_directive', reasonCode: 'framework-directive-boundary', boundary: 'html-framework-directive', boundaryAttributes: [':class'], base: directiveBase, worker: directiveWorker, head: directiveBase, output: directiveWorker })]
});
assert.equal(directiveProven.status, 'merged');
assert.equal(directiveProven.htmlRuntimeProofs[0].boundary, 'html-framework-directive');
assert.equal(directiveProven.htmlRuntimeProofs[0].attributeName, ':class');

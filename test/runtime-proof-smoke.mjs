import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { safeMergeHtmlSource } from '../dist/index.js';

const base = '<script>window.value = 1;</script>\n<h1>Todo</h1>\n';
const worker = '<script>window.value = 2;</script>\n<h1>Todo</h1>\n';
const head = '<script>window.value = 1;</script>\n<h1>Todos</h1>\n';
const output = '<script>window.value = 2;</script>\n<h1>Todos</h1>\n';
const proof = {
  id: 'proof_html_script_runtime',
  kind: 'html-source-bound-browser-runtime-proof',
  status: 'passed',
  sourcePath: 'view.html',
  reasonCode: 'script-runtime-boundary',
  side: 'worker',
  recordKey: 'text#script[1]/#text[1]',
  baseSourceHash: hashSemanticValue(base),
  workerSourceHash: hashSemanticValue(worker),
  headSourceHash: hashSemanticValue(head),
  outputSourceHash: hashSemanticValue(output)
};

const wrongOutputProof = safeMergeHtmlSource({
  id: 'html_runtime_wrong_output_proof',
  sourcePath: 'view.html',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  htmlBrowserRuntimeProofs: [{ ...proof, outputSourceHash: hashSemanticValue('wrong output') }]
});
assert.equal(wrongOutputProof.status, 'blocked');
assert.equal(wrongOutputProof.conflicts.some((conflict) => conflict.details.reasonCode === 'script-runtime-boundary'), true);

const wrongRecordProof = safeMergeHtmlSource({
  id: 'html_runtime_wrong_record_proof',
  sourcePath: 'view.html',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  htmlBrowserRuntimeProofs: [{ ...proof, recordKey: 'text#h1[1]/#text[1]' }]
});
assert.equal(wrongRecordProof.status, 'blocked');
assert.equal(wrongRecordProof.conflicts.some((conflict) => conflict.details.reasonCode === 'script-runtime-boundary'), true);

const proven = safeMergeHtmlSource({
  id: 'html_runtime_proven',
  sourcePath: 'view.html',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  htmlBrowserRuntimeProofs: [proof]
});
assert.equal(proven.status, 'merged');
assert.equal(proven.browserRuntimeEquivalenceClaim, true);
assert.equal(proven.admission.browserRuntimeEquivalenceClaim, true);
assert.equal(proven.htmlRuntimeProofs.length, 1);
assert.equal(proven.htmlRuntimeProofs[0].reasonCode, 'script-runtime-boundary');
assert.equal(proven.mergedSourceText, output);

const oneSided = safeMergeHtmlSource({
  id: 'html_runtime_one_sided',
  sourcePath: 'view.html',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: base,
  htmlBrowserRuntimeProofs: [{
    ...proof,
    headSourceHash: hashSemanticValue(base),
    outputSourceHash: hashSemanticValue(worker)
  }]
});
assert.equal(oneSided.status, 'merged');
assert.equal(oneSided.browserRuntimeEquivalenceClaim, true);

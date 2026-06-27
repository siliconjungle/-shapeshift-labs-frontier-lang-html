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

const eventBase = '<button data-frontier-key="save" onclick="save()">Save</button>\n';
const eventWorker = '<button data-frontier-key="save" onclick="saveAndClose()">Save</button>\n';
const eventHead = '<button data-frontier-key="save" onclick="save()" aria-label="Save item">Save</button>\n';
const eventOutput = '<button aria-label="Save item" data-frontier-key="save" onclick="saveAndClose()">Save</button>\n';
const eventProof = {
  id: 'proof_html_event_handler_runtime',
  kind: 'html-source-bound-runtime-boundary-proof',
  status: 'passed',
  sourcePath: 'view.html',
  reasonCode: 'event-handler-runtime-boundary',
  side: 'worker',
  boundary: 'html-event-handler-attribute',
  boundaryAttributes: ['onclick'],
  baseSourceHash: hashSemanticValue(eventBase),
  workerSourceHash: hashSemanticValue(eventWorker),
  headSourceHash: hashSemanticValue(eventHead),
  outputSourceHash: hashSemanticValue(eventOutput)
};

const eventBlocked = safeMergeHtmlSource({
  id: 'html_event_handler_blocked',
  sourcePath: 'view.html',
  baseSourceText: eventBase,
  workerSourceText: eventWorker,
  headSourceText: eventHead
});
assert.equal(eventBlocked.status, 'blocked');
assert.equal(eventBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'event-handler-runtime-boundary'), true);

const eventWrongOutputProof = safeMergeHtmlSource({
  id: 'html_event_handler_wrong_output',
  sourcePath: 'view.html',
  baseSourceText: eventBase,
  workerSourceText: eventWorker,
  headSourceText: eventHead,
  htmlRuntimeBoundaryProofs: [{ ...eventProof, outputSourceHash: hashSemanticValue('wrong output') }]
});
assert.equal(eventWrongOutputProof.status, 'blocked');

const eventWrongAttributeProof = safeMergeHtmlSource({
  id: 'html_event_handler_wrong_attribute',
  sourcePath: 'view.html',
  baseSourceText: eventBase,
  workerSourceText: eventWorker,
  headSourceText: eventHead,
  htmlRuntimeBoundaryProofs: [{ ...eventProof, boundaryAttributes: ['onmouseover'] }]
});
assert.equal(eventWrongAttributeProof.status, 'blocked');

const eventProven = safeMergeHtmlSource({
  id: 'html_event_handler_proven',
  sourcePath: 'view.html',
  baseSourceText: eventBase,
  workerSourceText: eventWorker,
  headSourceText: eventHead,
  htmlRuntimeBoundaryProofs: [eventProof]
});
assert.equal(eventProven.status, 'merged');
assert.equal(eventProven.browserRuntimeEquivalenceClaim, true);
assert.equal(eventProven.htmlRuntimeProofs[0].boundary, 'html-event-handler-attribute');
assert.equal(eventProven.htmlRuntimeProofs[0].attributeName, 'onclick');
assert.equal(eventProven.mergedSourceText, eventOutput);

const nonEventAttributeOnHandlerElement = safeMergeHtmlSource({
  id: 'html_event_handler_non_event_attribute',
  sourcePath: 'view.html',
  baseSourceText: eventBase,
  workerSourceText: eventBase.replace('data-frontier-key="save"', 'data-frontier-key="save" type="button"'),
  headSourceText: eventBase.replace('Save</button>', 'Save item</button>')
});
assert.equal(nonEventAttributeOnHandlerElement.status, 'merged');
assert.equal(nonEventAttributeOnHandlerElement.browserRuntimeEquivalenceClaim, false);

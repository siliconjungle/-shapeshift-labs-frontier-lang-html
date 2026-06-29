import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { createHtmlRuntimeBoundaryProof, createHtmlRuntimeProof, safeMergeHtmlSource } from '../dist/index.js';

const base = '<script>window.value = 1;</script>\n<h1>Todo</h1>\n';
const worker = '<script>window.value = 2;</script>\n<h1>Todo</h1>\n';
const head = '<script>window.value = 1;</script>\n<h1>Todos</h1>\n';
const output = '<script>window.value = 2;</script>\n<h1>Todos</h1>\n';
const scriptProof = createHtmlRuntimeProof({
  id: 'proof_html_builder_script_runtime',
  sourcePath: 'view.html',
  reasonCode: 'script-runtime-boundary',
  side: 'worker',
  recordKey: 'text#script[1]/#text[1]',
  base,
  worker,
  head,
  output,
  runtimeCommand: 'node test/html-runtime/script.mjs',
  runtimeProbeId: 'html:script-runtime-boundary',
  runtimeEvidenceHash: hashSemanticValue('html builder script runtime evidence'),
  runtimeSignals: ['html-script-runtime']
});

assert.equal(scriptProof.kind, 'html-source-bound-browser-runtime-proof');
assert.equal(scriptProof.status, 'passed');
assert.equal(scriptProof.baseSourceHash, hashSemanticValue(base));
assert.equal(scriptProof.outputSourceHash, hashSemanticValue(output));
assert.equal(scriptProof.runtimeEvidenceBound, true);
assert.equal(scriptProof.browserRuntimeEquivalenceClaim, false);
assert.equal(scriptProof.autoMergeClaim, false);

const capsuleScriptProof = createHtmlRuntimeProof({
  id: 'proof_html_builder_script_runtime_capsule',
  sourcePath: 'view.html',
  reasonCode: 'script-runtime-boundary',
  side: 'worker',
  recordKey: 'text#script[1]/#text[1]',
  base,
  worker,
  head,
  output,
  runtimeProofCapsule: {
    mode: 'app-shell-fixture',
    status: 'passed',
    command: 'playwright test html-builder-runtime-capsule.spec.ts',
    probeId: 'html:script-runtime-boundary:builder',
    evidenceHash: hashSemanticValue('html builder script runtime capsule evidence'),
    signals: ['html-script-runtime'],
    telemetry: {
      hash: 'html-builder-capsule-telemetry',
      domSnapshotHash: 'html-builder-capsule-dom',
      computedStyleHash: 'html-builder-capsule-style',
      layoutSnapshotHash: 'html-builder-capsule-layout',
      eventTraceHash: 'html-builder-capsule-events',
      accessibilitySnapshotHash: 'html-builder-capsule-accessibility',
      focusSnapshotHash: 'html-builder-capsule-focus',
      layoutShiftHash: 'html-builder-capsule-layout-shift',
      screenshotHash: 'html-builder-capsule-screenshot',
      cumulativeLayoutShift: 0
    }
  }
});
assert.equal(capsuleScriptProof.runtimeCommand, 'playwright test html-builder-runtime-capsule.spec.ts');
assert.equal(capsuleScriptProof.runtimeProofMode, 'app-shell-fixture');
assert.equal(capsuleScriptProof.runtimeTelemetryHash, 'html-builder-capsule-telemetry');
assert.equal(capsuleScriptProof.runtimeAccessibilitySnapshotHash, 'html-builder-capsule-accessibility');
assert.equal(capsuleScriptProof.runtimeFocusSnapshotHash, 'html-builder-capsule-focus');

const scriptMerged = safeMergeHtmlSource({
  id: 'html_builder_script_runtime_proven',
  sourcePath: 'view.html',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  htmlBrowserRuntimeProofs: [scriptProof]
});
assert.equal(scriptMerged.status, 'merged');
assert.equal(scriptMerged.htmlRuntimeProofs[0].runtimeEvidenceBound, true);
assert.equal(scriptMerged.htmlRuntimeProofs[0].browserRuntimeEquivalenceClaim, true);
assert.equal(scriptMerged.mergedSourceText, output);

const eventBase = '<button data-frontier-key="save" onclick="save()">Save</button>\n';
const eventWorker = '<button data-frontier-key="save" onclick="saveAndClose()">Save</button>\n';
const eventHead = '<button data-frontier-key="save" onclick="save()" aria-label="Save item">Save</button>\n';
const eventOutput = '<button aria-label="Save item" data-frontier-key="save" onclick="saveAndClose()">Save</button>\n';
const eventProof = createHtmlRuntimeBoundaryProof({
  id: 'proof_html_builder_event_runtime',
  sourcePath: 'view.html',
  reasonCode: 'event-handler-runtime-boundary',
  boundary: 'html-event-handler-attribute',
  boundaryAttributes: ['onclick'],
  base: eventBase,
  worker: eventWorker,
  head: eventHead,
  output: eventOutput,
  runtimeCommand: 'node test/html-runtime/event-handler.mjs',
  runtimeProbeId: 'html:event-handler-runtime-boundary',
  runtimeEvidenceHash: hashSemanticValue('html builder event runtime evidence'),
  runtimeSignals: ['html-event-handler-runtime']
});
assert.equal(eventProof.kind, 'html-source-bound-runtime-boundary-proof');

const capsuleEventProof = createHtmlRuntimeBoundaryProof({
  id: 'proof_html_builder_event_runtime_capsule',
  sourcePath: 'view.html',
  reasonCode: 'event-handler-runtime-boundary',
  boundary: 'html-event-handler-attribute',
  boundaryAttributes: ['onclick'],
  base: eventBase,
  worker: eventWorker,
  head: eventHead,
  output: eventOutput,
  runtimeProofCapsule: {
    mode: 'isolated-fixture',
    status: 'passed',
    command: 'playwright test html-builder-event-runtime-capsule.spec.ts',
    probeId: 'html:event-handler-runtime-boundary:builder',
    evidenceHash: hashSemanticValue('html builder event runtime capsule evidence'),
    signals: ['html-event-handler-runtime'],
    telemetry: {
      hash: 'html-builder-event-capsule-telemetry',
      domSnapshotHash: 'html-builder-event-capsule-dom',
      computedStyleHash: 'html-builder-event-capsule-style',
      layoutSnapshotHash: 'html-builder-event-capsule-layout',
      eventTraceHash: 'html-builder-event-capsule-events',
      accessibilitySnapshotHash: 'html-builder-event-capsule-accessibility',
      focusSnapshotHash: 'html-builder-event-capsule-focus',
      layoutShiftHash: 'html-builder-event-capsule-layout-shift',
      screenshotHash: 'html-builder-event-capsule-screenshot',
      cumulativeLayoutShift: 0
    }
  }
});
assert.equal(capsuleEventProof.runtimeProofMode, 'isolated-fixture');
assert.equal(capsuleEventProof.runtimeLayoutShiftHash, 'html-builder-event-capsule-layout-shift');

const eventMerged = safeMergeHtmlSource({
  id: 'html_builder_event_runtime_proven',
  sourcePath: 'view.html',
  baseSourceText: eventBase,
  workerSourceText: eventWorker,
  headSourceText: eventHead,
  htmlRuntimeBoundaryProofs: [eventProof]
});
assert.equal(eventMerged.status, 'merged');
assert.equal(eventMerged.htmlRuntimeProofs[0].attributeName, 'onclick');
assert.equal(eventMerged.mergedSourceText, eventOutput);

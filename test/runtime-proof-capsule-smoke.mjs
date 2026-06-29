import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { safeMergeHtmlSource } from '../dist/index.js';

const base = '<script>window.value = 1;</script>\n<h1>Todo</h1>\n';
const worker = '<script>window.value = 2;</script>\n<h1>Todo</h1>\n';
const head = '<script>window.value = 1;</script>\n<h1>Todos</h1>\n';
const output = '<script>window.value = 2;</script>\n<h1>Todos</h1>\n';
const capsuleProof = {
  id: 'proof_html_script_runtime_capsule',
  kind: 'html-source-bound-browser-runtime-proof',
  status: 'passed',
  sourcePath: 'view.html',
  reasonCode: 'script-runtime-boundary',
  side: 'worker',
  recordKey: 'text#script[1]/#text[1]',
  baseSourceHash: hashSemanticValue(base),
  workerSourceHash: hashSemanticValue(worker),
  headSourceHash: hashSemanticValue(head),
  outputSourceHash: hashSemanticValue(output),
  runtimeProofCapsule: {
    mode: 'isolated-fixture',
    status: 'passed',
    command: 'playwright test html-runtime-capsule.spec.ts',
    probeId: 'html:script-runtime-boundary:capsule',
    evidenceHash: hashSemanticValue('html script runtime capsule evidence'),
    signals: ['html-script-runtime'],
    browser: { name: 'chromium', version: 'stable' },
    viewport: { width: 1024, height: 768, deviceScaleFactor: 1 },
    telemetry: {
      hash: 'html-capsule-telemetry',
      domSnapshotHash: 'html-capsule-dom',
      computedStyleHash: 'html-capsule-style',
      layoutSnapshotHash: 'html-capsule-layout',
      eventTraceHash: 'html-capsule-events',
      accessibilitySnapshotHash: 'html-capsule-accessibility',
      focusSnapshotHash: 'html-capsule-focus',
      layoutShiftHash: 'html-capsule-layout-shift',
      screenshotHash: 'html-capsule-screenshot',
      cumulativeLayoutShift: 0
    }
  }
};

const capsuleProven = safeMergeHtmlSource({
  id: 'html_runtime_capsule_proven',
  sourcePath: 'view.html',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  htmlBrowserRuntimeProofs: [capsuleProof]
});
assert.equal(capsuleProven.status, 'merged');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeCommand, 'playwright test html-runtime-capsule.spec.ts');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeProofMode, 'isolated-fixture');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeBrowserName, 'chromium');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeViewport.width, 1024);
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeTelemetryHash, 'html-capsule-telemetry');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeDomSnapshotHash, 'html-capsule-dom');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeComputedStyleHash, 'html-capsule-style');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeLayoutSnapshotHash, 'html-capsule-layout');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeAccessibilitySnapshotHash, 'html-capsule-accessibility');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeFocusSnapshotHash, 'html-capsule-focus');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeLayoutShiftHash, 'html-capsule-layout-shift');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeScreenshotHash, 'html-capsule-screenshot');
assert.equal(capsuleProven.htmlRuntimeProofs[0].runtimeCumulativeLayoutShift, 0);
assert.equal(typeof capsuleProven.htmlRuntimeProofs[0].runtimeProofCapsuleHash, 'string');

const missingAccessibilityCapsule = safeMergeHtmlSource({
  id: 'html_runtime_capsule_missing_accessibility',
  sourcePath: 'view.html',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  htmlBrowserRuntimeProofs: [{
    ...capsuleProof,
    id: 'proof_html_script_runtime_capsule_missing_accessibility',
    runtimeProofCapsule: {
      ...capsuleProof.runtimeProofCapsule,
      telemetry: {
        ...capsuleProof.runtimeProofCapsule.telemetry,
        accessibilitySnapshotHash: undefined
      }
    }
  }]
});
assert.equal(missingAccessibilityCapsule.status, 'blocked');
assert.equal(missingAccessibilityCapsule.htmlRuntimeProofs.length, 0);
assert.equal(missingAccessibilityCapsule.conflicts.some((conflict) => conflict.details.reasonCode === 'script-runtime-boundary'), true);

const blockedCapsule = safeMergeHtmlSource({
  id: 'html_runtime_capsule_blocked',
  sourcePath: 'view.html',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  htmlBrowserRuntimeProofs: [{
    ...capsuleProof,
    id: 'proof_html_script_runtime_capsule_blocked',
    runtimeProofCapsule: {
      mode: 'environment-blocked',
      status: 'blocked',
      command: 'playwright test html-runtime-capsule.spec.ts',
      probeId: 'html:script-runtime-boundary:capsule',
      evidenceHash: hashSemanticValue('html script runtime capsule blocked'),
      signals: ['html-script-runtime']
    }
  }]
});
assert.equal(blockedCapsule.status, 'blocked');
assert.equal(blockedCapsule.conflicts.some((conflict) => conflict.details.reasonCode === 'script-runtime-boundary'), true);

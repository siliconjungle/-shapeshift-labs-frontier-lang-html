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

const styleBase = '<div data-frontier-key="card" style="color: red">Card</div>\n';
const styleWorker = '<div data-frontier-key="card" style="color: blue">Card</div>\n';
const styleHead = '<div data-frontier-key="card" style="color: red" aria-label="Card">Card</div>\n';
const styleOutput = '<div aria-label="Card" data-frontier-key="card" style="color: blue">Card</div>\n';
const styleProof = {
  id: 'proof_html_inline_style_runtime',
  kind: 'html-source-bound-runtime-boundary-proof',
  status: 'passed',
  sourcePath: 'view.html',
  reasonCode: 'inline-style-runtime-boundary',
  side: 'worker',
  boundary: 'html-inline-style-attribute',
  boundaryAttributes: ['style'],
  baseSourceHash: hashSemanticValue(styleBase),
  workerSourceHash: hashSemanticValue(styleWorker),
  headSourceHash: hashSemanticValue(styleHead),
  outputSourceHash: hashSemanticValue(styleOutput)
};

const styleBlocked = safeMergeHtmlSource({ id: 'html_inline_style_blocked', sourcePath: 'view.html', baseSourceText: styleBase, workerSourceText: styleWorker, headSourceText: styleHead });
assert.equal(styleBlocked.status, 'blocked');
assert.equal(styleBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'inline-style-runtime-boundary'), true);
const styleWrongBoundaryProof = safeMergeHtmlSource({ id: 'html_inline_style_wrong_boundary', sourcePath: 'view.html', baseSourceText: styleBase, workerSourceText: styleWorker, headSourceText: styleHead, htmlRuntimeBoundaryProofs: [{ ...styleProof, boundary: 'html-event-handler-attribute' }] });
assert.equal(styleWrongBoundaryProof.status, 'blocked');
const styleProven = safeMergeHtmlSource({ id: 'html_inline_style_proven', sourcePath: 'view.html', baseSourceText: styleBase, workerSourceText: styleWorker, headSourceText: styleHead, htmlRuntimeBoundaryProofs: [styleProof] });
assert.equal(styleProven.status, 'merged');
assert.equal(styleProven.browserRuntimeEquivalenceClaim, true);
assert.equal(styleProven.htmlRuntimeProofs[0].boundary, 'html-inline-style-attribute');
assert.equal(styleProven.htmlRuntimeProofs[0].attributeName, 'style');
assert.equal(styleProven.mergedSourceText, styleOutput);
const nonStyleAttributeOnStyledElement = safeMergeHtmlSource({ id: 'html_inline_style_non_style_attribute', sourcePath: 'view.html', baseSourceText: styleBase, workerSourceText: styleBase.replace('data-frontier-key="card"', 'data-frontier-key="card" role="region"'), headSourceText: styleBase.replace('Card</div>', 'Panel</div>') });
assert.equal(nonStyleAttributeOnStyledElement.status, 'merged');
assert.equal(nonStyleAttributeOnStyledElement.browserRuntimeEquivalenceClaim, false);

const iframeBase = '<iframe data-frontier-key="preview" src="/a.html" title="Preview"></iframe>\n';
const iframeWorker = '<iframe data-frontier-key="preview" src="/b.html" title="Preview"></iframe>\n';
const iframeHead = '<iframe class="embed" data-frontier-key="preview" src="/a.html" title="Preview"></iframe>\n';
const iframeOutput = '<iframe class="embed" data-frontier-key="preview" src="/b.html" title="Preview"></iframe>\n';
const iframeProof = {
  id: 'proof_html_iframe_runtime',
  kind: 'html-source-bound-runtime-boundary-proof',
  status: 'passed',
  sourcePath: 'view.html',
  reasonCode: 'iframe-runtime-boundary',
  side: 'worker',
  boundary: 'html-iframe-runtime-attribute',
  boundaryAttributes: ['src'],
  baseSourceHash: hashSemanticValue(iframeBase),
  workerSourceHash: hashSemanticValue(iframeWorker),
  headSourceHash: hashSemanticValue(iframeHead),
  outputSourceHash: hashSemanticValue(iframeOutput)
};
const iframeBlocked = safeMergeHtmlSource({ id: 'html_iframe_runtime_blocked', sourcePath: 'view.html', baseSourceText: iframeBase, workerSourceText: iframeWorker, headSourceText: iframeHead });
assert.equal(iframeBlocked.status, 'blocked');
assert.equal(iframeBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'iframe-runtime-boundary'), true);
const iframeWrongBoundaryProof = safeMergeHtmlSource({ id: 'html_iframe_runtime_wrong_boundary', sourcePath: 'view.html', baseSourceText: iframeBase, workerSourceText: iframeWorker, headSourceText: iframeHead, htmlRuntimeBoundaryProofs: [{ ...iframeProof, boundary: 'html-inline-style-attribute' }] });
assert.equal(iframeWrongBoundaryProof.status, 'blocked');
const iframeProven = safeMergeHtmlSource({ id: 'html_iframe_runtime_proven', sourcePath: 'view.html', baseSourceText: iframeBase, workerSourceText: iframeWorker, headSourceText: iframeHead, htmlRuntimeBoundaryProofs: [iframeProof] });
assert.equal(iframeProven.status, 'merged');
assert.equal(iframeProven.htmlRuntimeProofs[0].boundary, 'html-iframe-runtime-attribute');
assert.equal(iframeProven.htmlRuntimeProofs[0].attributeName, 'src');
assert.equal(iframeProven.mergedSourceText, iframeOutput);

const srcdocBase = '<iframe data-frontier-key="preview" srcdoc="&lt;p&gt;A&lt;/p&gt;"></iframe>\n';
const srcdocWorker = '<iframe data-frontier-key="preview" srcdoc="&lt;p&gt;B&lt;/p&gt;"></iframe>\n';
const srcdocHead = '<iframe aria-label="Preview" data-frontier-key="preview" srcdoc="&lt;p&gt;A&lt;/p&gt;"></iframe>\n';
const srcdocOutput = '<iframe aria-label="Preview" data-frontier-key="preview" srcdoc="&lt;p&gt;B&lt;/p&gt;"></iframe>\n';
const srcdocProof = { ...iframeProof, id: 'proof_html_iframe_srcdoc_runtime', reasonCode: 'iframe-srcdoc-runtime-boundary', boundary: 'html-iframe-srcdoc-attribute', boundaryAttributes: ['srcdoc'], baseSourceHash: hashSemanticValue(srcdocBase), workerSourceHash: hashSemanticValue(srcdocWorker), headSourceHash: hashSemanticValue(srcdocHead), outputSourceHash: hashSemanticValue(srcdocOutput) };
const srcdocBlocked = safeMergeHtmlSource({ id: 'html_iframe_srcdoc_blocked', sourcePath: 'view.html', baseSourceText: srcdocBase, workerSourceText: srcdocWorker, headSourceText: srcdocHead });
assert.equal(srcdocBlocked.status, 'blocked');
assert.equal(srcdocBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'iframe-srcdoc-runtime-boundary'), true);
const srcdocProven = safeMergeHtmlSource({ id: 'html_iframe_srcdoc_proven', sourcePath: 'view.html', baseSourceText: srcdocBase, workerSourceText: srcdocWorker, headSourceText: srcdocHead, htmlRuntimeBoundaryProofs: [srcdocProof] });
assert.equal(srcdocProven.status, 'merged');
assert.equal(srcdocProven.htmlRuntimeProofs[0].boundary, 'html-iframe-srcdoc-attribute');
assert.equal(srcdocProven.htmlRuntimeProofs[0].attributeName, 'srcdoc');
assert.equal(srcdocProven.mergedSourceText, srcdocOutput);
const iframeNonRuntimeBase = '<section id="preview"><iframe data-frontier-key="preview" src="/a.html" title="Preview"></iframe><h2>Preview</h2></section>\n';
const nonRuntimeAttributeOnIframe = safeMergeHtmlSource({ id: 'html_iframe_non_runtime_attribute', sourcePath: 'view.html', baseSourceText: iframeNonRuntimeBase, workerSourceText: iframeNonRuntimeBase.replace('title="Preview"', 'title="Embedded preview"'), headSourceText: iframeNonRuntimeBase.replace('<h2>Preview</h2>', '<h2>Live preview</h2>') });
assert.equal(nonRuntimeAttributeOnIframe.status, 'merged');
assert.equal(nonRuntimeAttributeOnIframe.browserRuntimeEquivalenceClaim, false);

import type { FrontierLangDocument } from '@shapeshift-labs/frontier-lang-kernel';
import type { HtmlBrowserRuntimeProof, HtmlBrowserRuntimeProofInput, HtmlBrowserRuntimeProofRecord } from './runtime-proof.js';
export type { HtmlBrowserRuntimeProof, HtmlBrowserRuntimeProofInput, HtmlBrowserRuntimeProofRecord } from './runtime-proof.js';

export interface HtmlProjectionOptions {
  readonly banner?: string;
  readonly sourceMapId?: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly targetPath?: string;
  readonly semanticIndexId?: string;
  readonly sourceSpansBySemanticNodeId?: Readonly<Record<string, HtmlSourceSpan>>;
  readonly evidence?: readonly HtmlProjectionEvidenceRecord[];
}

export interface HtmlProjectionEvidenceRecord {
  readonly id: string;
  readonly kind?: string;
  readonly summary?: string;
  readonly [key: string]: unknown;
}

export interface HtmlSourceSpan {
  readonly path?: string;
  readonly startOffset?: number;
  readonly endOffset?: number;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface HtmlParserDiagnostic {
  readonly code?: string;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly [key: string]: unknown;
}

export interface HtmlParserEvidence {
  readonly name: 'parse5' | string;
  readonly sourceCodeLocationInfo: boolean;
  readonly parseErrors: readonly HtmlParserDiagnostic[];
}

export interface HtmlSourceRef {
  readonly semanticNodeId: string;
  readonly semanticNodeKind?: string;
  readonly semanticNodeName?: string;
  readonly regionIds?: readonly string[];
}

export type HtmlAstNode =
  | HtmlAstElement
  | { readonly kind: 'text'; readonly value: string };

export interface HtmlAstElement {
  readonly kind: 'element';
  readonly tagName: string;
  readonly attributes?: Readonly<Record<string, string | boolean>>;
  readonly children?: readonly HtmlAstNode[];
  readonly sourceRef?: HtmlSourceRef;
}

export interface HtmlAstDocument {
  readonly kind: 'html.document';
  readonly banner: string;
  readonly children: readonly HtmlAstNode[];
}

export interface HtmlSourceMapMapping {
  readonly id: string;
  readonly semanticNodeId: string;
  readonly sourceSpan?: HtmlSourceSpan;
  readonly generatedSpan: HtmlSourceSpan & { readonly targetPath?: string; readonly generatedName?: string };
  readonly target?: { readonly language: 'html'; readonly [key: string]: unknown };
  readonly generatedName?: string;
  readonly precision: 'element-block';
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface HtmlSourceMap {
  readonly kind: 'frontier.lang.sourceMap';
  readonly version: 1;
  readonly id: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly target?: { readonly language: 'html'; readonly [key: string]: unknown };
  readonly targetPath?: string;
  readonly semanticIndexId?: string;
  readonly mappings: readonly HtmlSourceMapMapping[];
  readonly evidence: readonly HtmlProjectionEvidenceRecord[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface HtmlProjectionResult {
  readonly code: string;
  readonly sourceMap: HtmlSourceMap;
}

export interface HtmlProjectionWithAstResult extends HtmlProjectionResult {
  readonly ast: HtmlAstDocument;
}

export interface HtmlSemanticProofGap {
  readonly code: string;
  readonly status: 'not-claimed' | string;
  readonly summary: string;
  readonly failClosed: true;
  readonly semanticEquivalenceClaim: false;
}

export interface HtmlSemanticRecord {
  readonly kind: 'element' | 'text' | 'comment' | string;
  readonly key?: string;
  readonly tagName?: string;
  readonly path: readonly string[];
  readonly parentPath?: readonly string[];
  readonly parentKey?: string;
  readonly ordinal?: number;
  readonly identityKey?: string;
  readonly explicitIdentity?: boolean;
  readonly attributes?: Readonly<Record<string, string | boolean>>;
  readonly attributeSpans?: Readonly<Record<string, HtmlSourceSpan>>;
  readonly classList?: readonly string[];
  readonly sourceSpan: HtmlSourceSpan;
  readonly startTagSpan?: HtmlSourceSpan;
  readonly endTagSpan?: HtmlSourceSpan;
  readonly structuralSpan?: HtmlSourceSpan;
  readonly fullSpan?: HtmlSourceSpan;
  readonly sourceHash: string;
  readonly selfClosing?: boolean;
  readonly rawStartTag?: string;
  readonly rawEndTag?: string;
  readonly attributeHash?: string;
  readonly recordHash?: string;
  readonly fullHash?: string;
  readonly textHash?: string;
  readonly commentHash?: string;
  readonly parser?: 'parse5' | string;
  readonly proofGaps?: readonly HtmlSemanticProofGap[];
}

export interface HtmlSemanticTree {
  readonly kind: 'frontier.lang.htmlSemanticTree';
  readonly version: 1;
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly records: readonly HtmlSemanticRecord[];
  readonly treeHash: string;
  readonly summary: Readonly<Record<string, number>>;
  readonly proofGaps: readonly HtmlSemanticProofGap[];
  readonly parser: HtmlParserEvidence;
}

export interface HtmlSemanticMergeEvidence {
  readonly kind: 'frontier.lang.htmlSemanticMergeEvidence';
  readonly version: 1;
  readonly status: 'ready' | 'needs-review' | string;
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly treeHash: string;
  readonly records: readonly HtmlSemanticRecord[];
  readonly proofGaps: readonly HtmlSemanticProofGap[];
  readonly autoMergeClaim: false;
  readonly semanticEquivalenceClaim: false;
  readonly browserRuntimeEquivalenceClaim: false;
}

export interface HtmlSafeMergeConflict {
  readonly code: string;
  readonly gateId: 'html-semantic-merge' | string;
  readonly sourcePath?: string;
  readonly details: Readonly<Record<string, unknown>> & { readonly reasonCode: string; readonly conflictKey: string };
}
export interface HtmlSafeMergeAdmission {
  readonly status: 'auto-merge-candidate' | 'blocked' | string;
  readonly action: 'apply-html' | 'human-review' | string;
  readonly reviewRequired: boolean;
  readonly reasonCodes: readonly string[];
  readonly browserRuntimeEquivalenceClaim?: true;
  readonly htmlBrowserRuntimeProofs?: readonly HtmlBrowserRuntimeProofRecord[]; readonly htmlUnkeyedStructuralAddEvidence?: readonly HtmlUnkeyedStructuralAddEvidence[]; readonly htmlUnkeyedStructuralDeleteEvidence?: readonly HtmlUnkeyedStructuralDeleteEvidence[];
}
export interface HtmlSafeMergeResult {
  readonly kind: 'frontier.lang.htmlSafeMerge';
  readonly version: 1;
  readonly id: string;
  readonly sourcePath?: string;
  readonly status: 'merged' | 'blocked' | string;
  readonly operation: string;
  readonly mergedSourceText?: string;
  readonly mergedSourceHash?: string;
  readonly conflicts: readonly HtmlSafeMergeConflict[];
  readonly admission: HtmlSafeMergeAdmission;
  readonly autoMergeClaim: false;
  readonly semanticEquivalenceClaim: false;
  readonly browserRuntimeEquivalenceClaim: boolean;
  readonly baseTreeHash?: string;
  readonly workerTreeHash?: string;
  readonly headTreeHash?: string;
  readonly workerChangedRecords?: number;
  readonly headChangedRecords?: number;
  readonly parserEvidence?: HtmlSafeMergeParserEvidence;
  readonly identityEvidence?: HtmlSafeMergeIdentityEvidence;
  readonly htmlClassTokenMergeEvidence?: readonly HtmlTokenListMergeEvidence[];
  readonly htmlTokenListMergeEvidence?: readonly HtmlTokenListMergeEvidence[];
  readonly htmlRuntimeProofs?: readonly HtmlBrowserRuntimeProofRecord[]; readonly htmlUnkeyedStructuralAddEvidence?: readonly HtmlUnkeyedStructuralAddEvidence[]; readonly htmlUnkeyedStructuralDeleteEvidence?: readonly HtmlUnkeyedStructuralDeleteEvidence[];
}
export interface HtmlUnkeyedStructuralAddEvidence { readonly kind: 'frontier.lang.htmlUnkeyedStructuralAddEvidence'; readonly version: 1; readonly status: 'passed' | string; readonly sourcePath?: string; readonly recordKey?: string; readonly parentKey?: string; readonly tagName?: string; readonly parserBackedStructuralSpans: true; readonly parentExplicitIdentity: true; readonly addOnly: true; readonly siblingStructuralRace: false; readonly autoMergeClaim: false; readonly semanticEquivalenceClaim: false; readonly browserRuntimeEquivalenceClaim: false; readonly browserRenderEquivalenceClaim: false; readonly evidenceHash: string; readonly [key:string]: unknown; }
export interface HtmlUnkeyedStructuralDeleteEvidence { readonly kind: 'frontier.lang.htmlUnkeyedStructuralDeleteEvidence'; readonly version: 1; readonly status: 'passed' | string; readonly sourcePath?: string; readonly recordKey?: string; readonly parentKey?: string; readonly tagName?: string; readonly parserBackedStructuralSpans: true; readonly parentExplicitIdentity: true; readonly deleteOnly: true; readonly siblingStructuralRace: false; readonly autoMergeClaim: false; readonly semanticEquivalenceClaim: false; readonly browserRuntimeEquivalenceClaim: false; readonly browserRenderEquivalenceClaim: false; readonly evidenceHash: string; readonly [key:string]: unknown; }

export interface HtmlTokenListMergeEvidence {
  readonly kind: 'frontier.lang.htmlClassTokenMergeEvidence' | 'frontier.lang.htmlTokenListMergeEvidence' | string; readonly version: 1; readonly sourcePath?: string; readonly recordKey?: string; readonly attributeName: string;
  readonly parserBackedTokenList: true; readonly parserBackedClassList?: true; readonly tokenSetSemantics: string;
  readonly mergePolicy: 'head-order-plus-worker-additions-minus-either-side-removals' | string;
  readonly baseTokens: readonly string[]; readonly workerTokens: readonly string[]; readonly headTokens: readonly string[]; readonly mergedTokens: readonly string[];
  readonly workerAddedTokens: readonly string[]; readonly workerRemovedTokens: readonly string[]; readonly headAddedTokens: readonly string[]; readonly headRemovedTokens: readonly string[];
  readonly outputValue?: string; readonly autoMergeClaim: false; readonly semanticEquivalenceClaim: false; readonly browserRuntimeEquivalenceClaim: false; readonly browserRenderEquivalenceClaim: false;
  readonly evidenceHash: string; }

export interface HtmlSafeMergeParserEvidence {
  readonly kind: 'frontier.lang.htmlSafeMergeParserEvidence';
  readonly version: 1;
  readonly parserNames: readonly string[];
  readonly sourceCodeLocationInfo: boolean;
  readonly parserBackedSourceSpans: boolean;
  readonly parserBackedAttributeSpans: boolean;
  readonly parserBackedTriviaSpans: boolean;
  readonly parseErrors: number;
  readonly recordCount: number;
  readonly sourceSpanRecordCount: number;
  readonly sourceSpanMissingRecordCount: number;
  readonly attributeSpanElementCount: number;
  readonly attributeSpanMissingElementCount: number;
  readonly structuralSpanRecordCount: number;
  readonly structuralSpanMissingRecordCount: number;
  readonly leadingTriviaSpanRecordCount: number;
  readonly sides: Readonly<Record<string, HtmlSafeMergeParserSideEvidence>>;
}

export interface HtmlSafeMergeParserSideEvidence {
  readonly parserName: string;
  readonly sourceCodeLocationInfo: boolean;
  readonly parserBackedSourceSpans: boolean;
  readonly parserBackedAttributeSpans: boolean;
  readonly parserBackedTriviaSpans: boolean;
  readonly parseErrors: number;
  readonly recordCount: number;
  readonly sourceSpanRecordCount: number;
  readonly sourceSpanMissingRecordCount: number;
  readonly attributeSpanElementCount: number;
  readonly attributeSpanMissingElementCount: number;
  readonly structuralSpanRecordCount: number;
  readonly structuralSpanMissingRecordCount: number;
  readonly leadingTriviaSpanRecordCount: number;
}

export interface HtmlSafeMergeIdentityEvidence {
  readonly kind: 'frontier.lang.htmlSafeMergeIdentityEvidence';
  readonly version: 1;
  readonly explicitIdentityAvailable: boolean;
  readonly parserBackedStructuralSpans: boolean;
  readonly structuralAddressability: boolean;
  readonly pathOnlyIdentityElements: number;
  readonly duplicateExplicitIdentityElementCount: number;
  readonly duplicateExplicitIdentityKeys: readonly string[];
  readonly runtimeBoundaryElements: number;
  readonly frameworkBoundaryElements: number;
  readonly sides: Readonly<Record<string, HtmlSafeMergeIdentitySideEvidence>>;
}

export interface HtmlSafeMergeIdentitySideEvidence {
  readonly elementCount: number;
  readonly explicitIdentityElementCount: number;
  readonly pathOnlyIdentityElementCount: number;
  readonly structuralAddressableElementCount: number;
  readonly childOrderRecordCount: number;
  readonly parserBackedStructuralSpans: boolean;
  readonly explicitIdentityKeys: readonly string[];
  readonly duplicateExplicitIdentityElementCount: number;
  readonly duplicateExplicitIdentityKeys: readonly string[];
  readonly runtimeBoundaryElementCount: number;
  readonly frameworkBoundaryElementCount: number;
}

export interface HtmlSafeMergeInput {
  readonly id?: string;
  readonly sourcePath?: string;
  readonly baseSourceText?: string;
  readonly workerSourceText?: string;
  readonly headSourceText?: string;
  readonly htmlBrowserRuntimeProof?: HtmlBrowserRuntimeProof;
  readonly htmlBrowserRuntimeProofs?: readonly HtmlBrowserRuntimeProof[];
  readonly htmlBrowserRuntimeProofsByPath?: Readonly<Record<string, HtmlBrowserRuntimeProof | readonly HtmlBrowserRuntimeProof[]>>;
  readonly htmlSourceBoundRuntimeProof?: HtmlBrowserRuntimeProof;
  readonly htmlSourceBoundRuntimeProofs?: readonly HtmlBrowserRuntimeProof[];
  readonly htmlSourceBoundRuntimeProofsByPath?: Readonly<Record<string, HtmlBrowserRuntimeProof | readonly HtmlBrowserRuntimeProof[]>>;
  readonly htmlRuntimeBoundaryProof?: HtmlBrowserRuntimeProof;
  readonly htmlRuntimeBoundaryProofs?: readonly HtmlBrowserRuntimeProof[];
  readonly htmlRuntimeBoundaryProofsByPath?: Readonly<Record<string, HtmlBrowserRuntimeProof | readonly HtmlBrowserRuntimeProof[]>>;
  readonly browserRuntimeProof?: HtmlBrowserRuntimeProof;
  readonly browserRuntimeProofs?: readonly HtmlBrowserRuntimeProof[];
  readonly browserRuntimeProofsByPath?: Readonly<Record<string, HtmlBrowserRuntimeProof | readonly HtmlBrowserRuntimeProof[]>>;
  readonly sourceBoundRuntimeProof?: HtmlBrowserRuntimeProof;
  readonly sourceBoundRuntimeProofs?: readonly HtmlBrowserRuntimeProof[];
  readonly sourceBoundRuntimeProofsByPath?: Readonly<Record<string, HtmlBrowserRuntimeProof | readonly HtmlBrowserRuntimeProof[]>>;
}

export declare function toHtmlAst(document: FrontierLangDocument, options?: HtmlProjectionOptions): HtmlAstDocument;
export declare function renderHtmlAst(ast: HtmlAstDocument): string;
export declare function renderHtmlAstWithSourceMap(ast: HtmlAstDocument, options?: HtmlProjectionOptions): HtmlProjectionResult;
export declare function emitHtml(document: FrontierLangDocument, options?: HtmlProjectionOptions): string;
export declare function emitHtmlWithSourceMap(document: FrontierLangDocument, options?: HtmlProjectionOptions): HtmlProjectionWithAstResult;
export declare function parseHtmlSemanticTree(sourceText: string, options?: HtmlProjectionOptions): HtmlSemanticTree;
export declare function createHtmlSemanticMergeEvidence(sourceText: string, options?: HtmlProjectionOptions): HtmlSemanticMergeEvidence;
export declare function createHtmlRuntimeProof(input?: HtmlBrowserRuntimeProofInput): HtmlBrowserRuntimeProof;
export declare function createHtmlRuntimeBoundaryProof(input?: HtmlBrowserRuntimeProofInput): HtmlBrowserRuntimeProof;
export declare function safeMergeHtmlSource(input: HtmlSafeMergeInput): HtmlSafeMergeResult;

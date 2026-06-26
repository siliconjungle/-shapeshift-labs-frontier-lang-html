import type { FrontierLangDocument } from '@shapeshift-labs/frontier-lang-kernel';

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
  readonly tagName?: string;
  readonly path: readonly string[];
  readonly ordinal?: number;
  readonly identityKey?: string;
  readonly attributes?: Readonly<Record<string, string | boolean>>;
  readonly classList?: readonly string[];
  readonly sourceSpan: HtmlSourceSpan;
  readonly sourceHash: string;
  readonly attributeHash?: string;
  readonly textHash?: string;
  readonly commentHash?: string;
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

export declare function toHtmlAst(document: FrontierLangDocument, options?: HtmlProjectionOptions): HtmlAstDocument;
export declare function renderHtmlAst(ast: HtmlAstDocument): string;
export declare function renderHtmlAstWithSourceMap(ast: HtmlAstDocument, options?: HtmlProjectionOptions): HtmlProjectionResult;
export declare function emitHtml(document: FrontierLangDocument, options?: HtmlProjectionOptions): string;
export declare function emitHtmlWithSourceMap(document: FrontierLangDocument, options?: HtmlProjectionOptions): HtmlProjectionWithAstResult;
export declare function parseHtmlSemanticTree(sourceText: string, options?: HtmlProjectionOptions): HtmlSemanticTree;
export declare function createHtmlSemanticMergeEvidence(sourceText: string, options?: HtmlProjectionOptions): HtmlSemanticMergeEvidence;

export interface HtmlBrowserRuntimeProof {
  readonly id?: string;
  readonly kind: 'html-browser-runtime-proof' | 'html-source-bound-browser-runtime-proof' | 'html-source-bound-runtime-proof' | 'html-runtime-boundary-proof' | 'html-source-bound-runtime-boundary-proof' | string;
  readonly status: 'passed' | string;
  readonly proofLevel?: string;
  readonly sourcePath?: string;
  readonly reasonCode?: string;
  readonly reasonCodes?: readonly string[];
  readonly side?: 'worker' | 'head' | string;
  readonly sides?: readonly string[];
  readonly recordKey?: string;
  readonly recordKeys?: readonly string[];
  readonly boundaryKey?: string;
  readonly boundaryKeys?: readonly string[];
  readonly boundary?: string;
  readonly boundaries?: readonly string[];
  readonly attributeName?: string;
  readonly attributeNames?: readonly string[];
  readonly boundaryAttributes?: readonly string[];
  readonly changedBoundaryAttributes?: readonly string[];
  readonly baseSourceText?: string;
  readonly workerSourceText?: string;
  readonly headSourceText?: string;
  readonly outputSourceText?: string;
  readonly mergedSourceText?: string;
  readonly baseSourceHash?: string;
  readonly workerSourceHash?: string;
  readonly headSourceHash?: string;
  readonly outputSourceHash?: string;
  readonly mergedSourceHash?: string;
  readonly sourceTexts?: Readonly<Record<string, string>>;
  readonly sources?: Readonly<Record<string, string>>;
  readonly sourceHashes?: Readonly<Record<string, string>>;
  readonly hashes?: Readonly<Record<string, string>>;
  readonly runtimeCommand?: string;
  readonly browserCommand?: string;
  readonly command?: string;
  readonly commandId?: string;
  readonly probeCommand?: string;
  readonly runtimeProbeId?: string;
  readonly browserProbeId?: string;
  readonly probeId?: string;
  readonly probe?: HtmlBrowserRuntimeProofProbeRef;
  readonly runtimeEvidenceHash?: string;
  readonly browserEvidenceHash?: string;
  readonly evidenceHash?: string;
  readonly domEvidenceHash?: string;
  readonly renderEvidenceHash?: string;
  readonly hydrationEvidenceHash?: string;
  readonly resourceEvidenceHash?: string;
  readonly runtimeSignals?: HtmlBrowserRuntimeProofSignals;
  readonly browserSignals?: HtmlBrowserRuntimeProofSignals;
  readonly evidenceSignals?: HtmlBrowserRuntimeProofSignals;
  readonly probeSignals?: HtmlBrowserRuntimeProofSignals;
  readonly evidence?: HtmlBrowserRuntimeProofEvidenceRef;
  readonly runtimeEvidence?: HtmlBrowserRuntimeProofEvidenceRef;
  readonly browserEvidence?: HtmlBrowserRuntimeProofEvidenceRef;
}

export interface HtmlBrowserRuntimeProofProbeRef {
  readonly id?: string;
}

export interface HtmlBrowserRuntimeProofEvidenceRef {
  readonly command?: string;
  readonly probeId?: string;
  readonly hash?: string;
  readonly evidenceHash?: string;
  readonly signals?: HtmlBrowserRuntimeProofSignals;
}

export type HtmlBrowserRuntimeProofSignals = string | readonly string[] | Readonly<Record<string, boolean | 'passed' | string>>;

export interface HtmlBrowserRuntimeProofRecord {
  readonly id?: string;
  readonly kind: string;
  readonly status: 'passed';
  readonly proofLevel: string;
  readonly reasonCode: string;
  readonly side: string;
  readonly recordKey: string;
  readonly boundary?: string;
  readonly attributeName?: string;
  readonly boundaryAttributes?: readonly string[];
  readonly sourcePath?: string;
  readonly baseSourceHash?: string;
  readonly workerSourceHash?: string;
  readonly headSourceHash?: string;
  readonly outputSourceHash?: string;
  readonly runtimeCommand?: string;
  readonly runtimeProbeId?: string;
  readonly runtimeEvidenceHash?: string;
  readonly runtimeSignals?: readonly string[];
  readonly requiredRuntimeSignals?: readonly string[];
  readonly runtimeEvidenceBound: boolean;
  readonly browserRuntimeEquivalenceClaim: boolean;
  readonly browserRenderEquivalenceClaim: boolean;
  readonly semanticEquivalenceClaim: boolean;
  readonly autoMergeClaim: boolean;
}

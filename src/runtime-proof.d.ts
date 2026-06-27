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
}

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
}

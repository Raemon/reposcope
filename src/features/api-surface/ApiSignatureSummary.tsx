'use client';

import type { ApiInput, ApiOutput, ApiOutputType, ApiSignature } from './apiEndpointTypes';

export function apiSignatureIsEmpty(signature: ApiSignature): boolean {
  return signature.summary === '' && signature.inputs.length === 0 && signature.outputs.length === 0;
}

export function ApiSignatureSummary({ signature }: { signature: ApiSignature }) {
  const { summary, inputs, outputs } = signature;
  if (apiSignatureIsEmpty(signature)) return null;
  return (
    <div className="mb-2 border-b border-panel-edge pb-2">
      {summary !== '' ? <p className="mb-1.5 text-[10px] leading-4 text-ink-dim">{summary}</p> : null}
      <SignatureRows label="In" empty="nothing">
        {inputs.map((input) => <InputRow key={`${input.source}:${input.name}`} input={input} />)}
      </SignatureRows>
      <SignatureRows label="Out" empty="no JSON body">
        {outputs.map((output) => <OutputRow key={`${output.status}:${output.type}`} output={output} />)}
      </SignatureRows>
    </div>
  );
}

function SignatureRows({
  label,
  empty,
  children,
}: {
  label: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <div className="mb-1 flex gap-2 last:mb-0">
      <span className="w-6 shrink-0 pt-px text-[9px] uppercase tracking-[0.14em] text-ink-dim">{label}</span>
      <div className="min-w-0 flex-1">
        {children.length > 0 ? children : <p className="font-mono text-[10px] leading-4 text-ink-dim">{empty}</p>}
      </div>
    </div>
  );
}

function InputRow({ input }: { input: ApiInput }) {
  return (
    <div className="font-mono text-[10px] leading-4">
      <span className="text-ink">{input.name}{input.optional ? '?' : ''}</span>
      <span className="text-ink-dim">: {input.type}</span>
      <span className="ml-1.5 text-[9px] uppercase tracking-[0.1em] text-accent opacity-70">{input.source}</span>
      {input.help !== '' ? <span className="ml-1.5 font-sans text-ink-dim opacity-80">{input.help}</span> : null}
    </div>
  );
}

function OutputRow({ output }: { output: ApiOutput }) {
  return (
    <div className="font-mono text-[10px] leading-4">
      <span className="text-accent opacity-80">{output.status}</span>
      <span className="ml-1.5 text-ink">
        {output.fields.length > 0
          ? `{ ${output.fields.map(fieldText).join(', ')} }`
          : output.type}
      </span>
      {output.types.length > 0 ? (
        <span className="ml-1.5 text-ink-dim">{output.types.map(outputTypeText).join(', ')}</span>
      ) : null}
    </div>
  );
}

function outputTypeText(type: ApiOutputType): string {
  return type.through === '' ? type.name : `${type.name} via ${type.through}`;
}

function fieldText(field: { name: string; type: string }): string {
  return field.type === 'unknown' ? field.name : `${field.name}: ${field.type}`;
}

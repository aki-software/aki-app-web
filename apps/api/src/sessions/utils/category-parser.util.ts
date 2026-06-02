const DESCRIPTION_LABELS = [
  'descripcion breve',
  'algunas ocupaciones que se vinculan al area',
  'algunas ocupaciones que se vincular al area',
  'tambien puede incluir profesiones mas tecnicas o formales como',
  'competencias importantes para desempenarse en el area',
  'competencias importantes para desempenarse en el area',
  'competencias importantes',
] as const;

export function normalizeCategoryId(value: string): string {
  return value?.trim().toUpperCase() ?? '';
}

export function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function parseCategoryDescription(
  description: string,
): Array<{ subtitle?: string; content: string }> {
  const normalized = normalizeDescription(description);
  if (!normalized) {
    return [{ content: 'Informacion no disponible.' }];
  }

  const markerRegex = /([A-Za-zÀ-ÿ\s]+?):\s*/g;
  const markers: Array<{ start: number; end: number; label: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(normalized)) !== null) {
    const rawLabel = match[1]?.trim();
    if (!rawLabel) {
      continue;
    }

    const normalizedLabel = normalizeText(rawLabel);
    const isKnown = DESCRIPTION_LABELS.some(
      (known) => normalizedLabel === normalizeText(known),
    );

    if (isKnown) {
      markers.push({
        start: match.index,
        end: markerRegex.lastIndex,
        label: toTitleCaseLabel(rawLabel),
      });
    }
  }

  if (markers.length === 0) {
    return normalized
      .split('\n\n')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => ({ content: chunk }));
  }

  const blocks: Array<{ subtitle?: string; content: string }> = [];
  for (let index = 0; index < markers.length; index++) {
    const current = markers[index];
    const next = markers[index + 1];
    const segment = normalized
      .slice(current.end, next ? next.start : normalized.length)
      .replace(/\s+/g, ' ')
      .trim();

    if (!segment) {
      continue;
    }

    blocks.push({
      subtitle: current.label,
      content: segment,
    });
  }

  return blocks.length > 0 ? blocks : [{ content: normalized }];
}

function normalizeDescription(description: string): string {
  return description
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCaseLabel(label: string): string {
  const normalized = label.replace(/\s+/g, ' ').trim().toLowerCase();
  const fixed = normalized
    .replace(/^descripcion breve$/, 'Descripcion breve')
    .replace(
      /^algunas ocupaciones que se vincular al area$/,
      'Algunas ocupaciones que se vinculan al area',
    )
    .replace(
      /^algunas ocupaciones que se vinculan al area$/,
      'Algunas ocupaciones que se vinculan al area',
    )
    .replace(
      /^tambien puede incluir profesiones mas tecnicas o formales como$/,
      'Tambien puede incluir profesiones tecnicas o formales',
    )
    .replace(
      /^competencias importantes para desempenarse en el area$/,
      'Competencias importantes para desempenarse en el area',
    )
    .replace(/^competencias importantes$/, 'Competencias importantes');

  return fixed.charAt(0).toUpperCase() + fixed.slice(1);
}

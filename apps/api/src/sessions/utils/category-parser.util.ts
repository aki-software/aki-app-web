const markerRegex =
  /(descripci[oó]n\s+breve|algunas\s+ocupaciones\s*(?:u\s+oficios\s+)?(?:que\s+se\s+vincula[rn]|vinculadas)\s+al\s+[aá]rea|tambi[eé]n\s+puede\s+incluir\s+profesiones\s+m[aá]s\s+t[eé]cnicas\s+o\s+formales\s+como|competencias\s+importantes(?:\s+para\s+desempe[nñ]arse\s+en\s+el\s+[aá]rea)?)\s*:\s*/gi;

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
  const cleanDesc = description.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!cleanDesc) {
    return [{ content: 'Información no disponible.' }];
  }

  const markers: Array<{ start: number; end: number; label: string }> = [];
  let match: RegExpExecArray | null;

  markerRegex.lastIndex = 0;

  while ((match = markerRegex.exec(cleanDesc)) !== null) {
    markers.push({
      start: match.index,
      end: markerRegex.lastIndex,
      label: toTitleCaseLabel(match[1]),
    });
  }

  if (markers.length === 0) {
    return cleanDesc
      .split('\n\n')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => ({ content: chunk }));
  }

  const blocks: Array<{ subtitle?: string; content: string }> = [];
  for (let index = 0; index < markers.length; index++) {
    const current = markers[index];
    const next = markers[index + 1];
    let segment = cleanDesc
      .slice(current.end, next ? next.start : cleanDesc.length)
      .replace(/\s+/g, ' ')
      .trim();

    if (!segment) {
      continue;
    }

    // Fix lowercase starting letters (Requirement 1)
    segment = segment.charAt(0).toUpperCase() + segment.slice(1);

    blocks.push({
      subtitle: current.label,
      content: segment,
    });
  }

  return blocks.length > 0 ? blocks : [{ content: cleanDesc }];
}

function toTitleCaseLabel(label: string): string {
  const normalized = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

  if (normalized.includes('descripcion breve')) return 'Descripción breve';
  if (normalized.includes('ocupaciones'))
    return 'Algunas ocupaciones que se vinculan al área';
  if (normalized.includes('profesiones'))
    return 'También puede incluir profesiones técnicas o formales';
  if (normalized.includes('competencias'))
    return 'Competencias importantes para desempeñarse en el área';

  return label.charAt(0).toUpperCase() + label.slice(1);
}

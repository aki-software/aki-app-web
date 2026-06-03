/**
 * Psychometrics Utility — RIASEC Weighted Scoring Engine
 *
 * Responsabilidad única: calcular el perfil Holland a partir de los swipes
 * crudos de la App. La lógica es pura (sin side-effects) para garantizar
 * idempotencia: mismos swipes = mismo resultado, siempre.
 *
 * Reglas de desempate (estrictas, en orden):
 *   1. rawScore       → mayor likes gana
 *   2. weightedScore  → menor tiempo promedio (más instintivo) gana
 *   3. categoryId     → orden alfabético (garantía de determinismo absoluto)
 */

// ─── Tipos Públicos ────────────────────────────────────────────────────────────

export interface SwipeInput {
  categoryId: string;
  liked: boolean;
  timestamp: string | Date;
}

export interface CategoryResult {
  categoryId: string;
  /** Likes crudos sobre total de imágenes de esa categoría */
  rawScore: number;
  totalPossible: number;
  /** Porcentaje crudo (0-100), sin ponderar */
  percentage: number;
  /** Score ponderado por tiempo de respuesta (suma de likes * peso_temporal) */
  weightedScore: number;
  /** Tiempo de respuesta promedio en ms para los ítems de esta categoría */
  avgResponseTimeMs: number;
}

export interface HollandProfile {
  hollandCode: string;
  top3: CategoryResult[];
  bottom3: CategoryResult[];
  /** Todos los resultados ordenados de mayor a menor afinidad */
  radar: CategoryResult[];
}

// ─── Constantes ────────────────────────────────────────────────────────────────

/**
 * Tiempo base asignado al primer swipe de cada sesión.
 * No penalizamos el primer ítem porque el usuario recién empieza.
 */
const FIRST_SWIPE_DEFAULT_MS = 1500;

/**
 * Rangos de ponderación temporal.
 * Respuestas más rápidas = mayor peso (más instintivas/afines).
 */
const TIME_WEIGHTS = [
  { maxMs: 1200, weight: 1.0 },
  { maxMs: 2500, weight: 0.85 },
  { maxMs: Infinity, weight: 0.65 },
] as const;

// ─── Helpers privados ──────────────────────────────────────────────────────────

function getTimeWeight(responseTimeMs: number): number {
  for (const { maxMs, weight } of TIME_WEIGHTS) {
    if (responseTimeMs <= maxMs) return weight;
  }
  return 0.65;
}

function normalizeCategoryId(value: string): string {
  return value.trim().toUpperCase();
}

// ─── API Pública ───────────────────────────────────────────────────────────────

/**
 * Calcula el perfil Holland completo a partir de los swipes crudos.
 *
 * Orden de desempate garantizado:
 *   1. rawScore DESC
 *   2. weightedScore DESC
 *   3. categoryId ASC (alfabético — garantía de idempotencia)
 */
export function calculateHollandProfile(swipes: SwipeInput[]): HollandProfile {
  if (!swipes || swipes.length === 0) {
    return { hollandCode: '', top3: [], bottom3: [], radar: [] };
  }

  // 1. Ordenar por timestamp para inferir tiempos de respuesta
  const sorted = [...swipes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // 2. Calcular tiempo de respuesta por swipe
  const responseTimes: number[] = sorted.map((_, i) => {
    if (i === 0) return FIRST_SWIPE_DEFAULT_MS;
    const prev = new Date(sorted[i - 1].timestamp).getTime();
    const curr = new Date(sorted[i].timestamp).getTime();
    const diff = curr - prev;
    // Descartar tiempos imposibles (negativos o > 5 min, ej. pausa de pantalla)
    return diff > 0 && diff < 300_000 ? diff : FIRST_SWIPE_DEFAULT_MS;
  });

  // 3. Acumular por categoría
  interface CategoryAccumulator {
    rawScore: number;
    totalPossible: number;
    weightedScore: number;
    totalResponseTimeMs: number;
    likeCount: number; // para calcular el promedio sólo sobre los likes
    swipeCount: number; // total de swipes en esta categoría
  }

  const byCategory = new Map<string, CategoryAccumulator>();

  sorted.forEach((swipe, i) => {
    const catId = normalizeCategoryId(swipe.categoryId);
    if (!catId) return;

    const acc = byCategory.get(catId) ?? {
      rawScore: 0,
      totalPossible: 0,
      weightedScore: 0,
      totalResponseTimeMs: 0,
      likeCount: 0,
      swipeCount: 0,
    };

    const responseTime = responseTimes[i];
    const weight = getTimeWeight(responseTime);

    acc.totalPossible += 1;
    acc.swipeCount += 1;
    acc.totalResponseTimeMs += responseTime;

    if (swipe.liked) {
      acc.rawScore += 1;
      acc.weightedScore += weight;
      acc.likeCount += 1;
    }

    byCategory.set(catId, acc);
  });

  // 4. Construir los resultados finales
  const results: CategoryResult[] = Array.from(byCategory.entries()).map(
    ([categoryId, acc]) => ({
      categoryId,
      rawScore: acc.rawScore,
      totalPossible: acc.totalPossible,
      percentage:
        acc.totalPossible > 0
          ? Math.round((acc.rawScore / acc.totalPossible) * 100)
          : 0,
      weightedScore: acc.weightedScore,
      avgResponseTimeMs:
        acc.swipeCount > 0
          ? Math.round(acc.totalResponseTimeMs / acc.swipeCount)
          : 0,
    }),
  );

  // 5. Ordenar con desempate determinista
  results.sort((a, b) => {
    // 1° mayor rawScore
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    // 2° mayor weightedScore (más instintivo)
    if (b.weightedScore !== a.weightedScore)
      return b.weightedScore - a.weightedScore;
    // 3° alfabético (idempotencia absoluta)
    return a.categoryId.localeCompare(b.categoryId);
  });

  // 6. Armar perfil Holland
  const top3 = results.slice(0, 3);
  const bottom3 = results.slice(-3).reverse();
  const hollandCode = top3.map((r) => r.categoryId.charAt(0)).join('');

  return { hollandCode, top3, bottom3, radar: results };
}

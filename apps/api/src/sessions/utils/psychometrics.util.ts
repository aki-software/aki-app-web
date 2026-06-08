/**
 * Psychometrics Utility — RIASEC Weighted Scoring Engine
 *
 * ⚠️ ATENCION DEVS - CODIGO DUPLICADO POR DISEÑO ⚠️
 * Este algoritmo existe de manera identica en la App Android:
 * CotejoApp/app/src/main/java/com/akit/app/domain/usecase/CalculatePsychometricProfileUseCase.kt
 *
 * La App lo necesita para mostrar resultados inmediatos sin conexión (offline-first).
 * El Backend lo usa en modo Server-Authoritative (ignora lo que envía la app y re-calcula desde los swipes).
 *
 * Si modificas pesos, reglas de desempate, o lógicas de tiempo, DEBES modificar
 * también la contraparte en la app Android para no generar discrepancias.
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
  cardId?: string;
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
 *   1. percentage DESC
 *   2. weightedScore DESC
 *   3. categoryId ASC (alfabético — garantía de idempotencia)
 */
export function calculateHollandProfile(swipes: SwipeInput[]): HollandProfile {
  if (!swipes || swipes.length === 0) {
    return { hollandCode: '', top3: [], bottom3: [], radar: [] };
  }

  // 1. Deduplicar por cardId (manteniendo el último swipe para cada tarjeta)
  const latestSwipesMap = new Map<string, SwipeInput>();
  const chronologicalSwipes = [...swipes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (const swipe of chronologicalSwipes) {
    if (swipe.cardId) {
      latestSwipesMap.set(swipe.cardId, swipe);
    }
  }

  // Si no hay cardIds (versiones muy antiguas), fallamos con gracia a chronologicalSwipes
  const uniqueSwipes =
    latestSwipesMap.size > 0
      ? Array.from(latestSwipesMap.values())
      : chronologicalSwipes;

  // 2. Extraer tiempos de respuesta
  const responseTimes: number[] = uniqueSwipes.map((swipe, i) => {
    if (i === 0) return FIRST_SWIPE_DEFAULT_MS;
    const diff =
      new Date(swipe.timestamp).getTime() -
      new Date(uniqueSwipes[i - 1].timestamp).getTime();

    // Descartar tiempos irreales (>15s o <200ms)
    if (diff >= 200 && diff <= 15000) return diff;
    return FIRST_SWIPE_DEFAULT_MS;
  });

  // 3. Acumular por categoría
  interface CategoryAccumulator {
    rawScore: number;
    totalPossible: number;
    weightedScore: number;
    totalResponseTimeMs: number;
    swipeCount: number; // total de swipes en esta categoría
  }

  const byCategory = new Map<string, CategoryAccumulator>();

  for (let i = 0; i < uniqueSwipes.length; i++) {
    const swipe = uniqueSwipes[i];
    const catId = normalizeCategoryId(swipe.categoryId);
    if (!catId) continue;

    const acc = byCategory.get(catId) ?? {
      rawScore: 0,
      totalPossible: 0,
      weightedScore: 0,
      totalResponseTimeMs: 0,
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
    }

    byCategory.set(catId, acc);
  }

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

  // 5. Ordenar con el mismo desempate que Android
  results.sort((a, b) => {
    // 1. Percentage (DESC)
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    // 2. Weighted score (DESC)
    if (b.weightedScore !== a.weightedScore)
      return b.weightedScore - a.weightedScore;
    // 3° alfabético (idempotencia absoluta)
    return a.categoryId.localeCompare(b.categoryId);
  });

  // 6. Armar perfil Holland
  const top3 = results.slice(0, 3);
  const bottom3 = results.slice(-3).reverse();
  const hollandCode = top3.map((r) => r.categoryId.charAt(0)).join('');
  const radar = [...results].sort((a, b) =>
    a.categoryId.localeCompare(b.categoryId),
  );

  return { hollandCode, top3, bottom3, radar };
}

export function planJsonlChunks(entries, batchSize, strategy = 'cost-balanced') {
  if (!Array.isArray(entries)) {
    throw new Error('entries must be an array.');
  }
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error('batchSize must be a positive integer.');
  }

  if (strategy === 'sequential') {
    return createSequentialChunks(entries, batchSize);
  }
  if (strategy === 'cost-balanced') {
    return createCostBalancedChunks(entries, batchSize);
  }

  throw new Error('ANALYTICS_CHUNK_STRATEGY must be sequential or cost-balanced.');
}

export function estimateEntryCost(entry) {
  const days = readPositiveNumber(entry.daysCount, 1);
  const medics = readPositiveNumber(entry.medicsCount, 1);
  const periods = readPositiveNumber(entry.periodsCount, 1);
  const density = readDensity(entry.availabilityDensity);
  const availabilityPairs = readPositiveNumber(entry.availabilityPairs, days * medics * density);

  return days + medics + periods + availabilityPairs;
}

function createSequentialChunks(entries, batchSize) {
  const chunks = [];
  for (let index = 0; index < entries.length; index += batchSize) {
    chunks.push({
      entries: entries.slice(index, index + batchSize),
      estimatedCost: sumCost(entries.slice(index, index + batchSize))
    });
  }
  return chunks;
}

function createCostBalancedChunks(entries, batchSize) {
  if (entries.length === 0) {
    return [];
  }

  const chunkCount = Math.ceil(entries.length / batchSize);
  const chunks = Array.from({ length: chunkCount }, () => ({
    entries: [],
    estimatedCost: 0
  }));
  const plannedEntries = entries
    .map((entry, originalIndex) => ({
      entry,
      originalIndex,
      estimatedCost: estimateEntryCost(entry)
    }))
    .sort((left, right) => right.estimatedCost - left.estimatedCost || left.originalIndex - right.originalIndex);

  for (const plannedEntry of plannedEntries) {
    const target = chunks
      .filter((chunk) => chunk.entries.length < batchSize)
      .sort(
        (left, right) =>
          left.estimatedCost - right.estimatedCost ||
          left.entries.length - right.entries.length
      )[0];

    target.entries.push(plannedEntry.entry);
    target.estimatedCost += plannedEntry.estimatedCost;
  }

  return chunks.sort((left, right) => right.estimatedCost - left.estimatedCost);
}

function sumCost(entries) {
  return entries.reduce((total, entry) => total + estimateEntryCost(entry), 0);
}

function readPositiveNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function readDensity(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, value));
}

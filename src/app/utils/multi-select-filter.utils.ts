export function normalizeMultiSelectValues(
  values: readonly string[] = [],
  exclusiveValues: readonly string[] = [],
): string[] {
  const normalized = [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ]
  const exclusive = exclusiveValues.find((value) => normalized.includes(value))
  return exclusive ? [exclusive] : normalized.sort()
}

/**
 * Build a URL query string from a params object.
 *
 * - Filters out `null`, `undefined`, and empty-string values.
 * - URL-encodes keys/values via URLSearchParams.
 * - Returns `""` when no params remain, otherwise a string starting with `"?"`.
 *
 * Usage: api.get(`/admin/projects${buildQuery({ workspace_id, limit })}`)
 */
export function buildQuery(
  params: Record<string, string | number | boolean | null | undefined>
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

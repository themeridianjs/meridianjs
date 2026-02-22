import type { LinkDefinition, LinkEndpoint, LinkableEntry } from "@meridian/types"

type LinkEndpointInput =
  | LinkableEntry
  | LinkEndpoint

function normalizeEndpoint(input: LinkEndpointInput): LinkEndpoint {
  if ("linkable" in input) {
    return input as LinkEndpoint
  }
  return { linkable: input as LinkableEntry }
}

/**
 * Defines a cross-module relationship as a junction table.
 * Neither module holds a foreign key — the link table is independent.
 *
 * @example
 * export default defineLink(
 *   ProjectModule.linkable.project,
 *   { linkable: IssueModule.linkable.issue, isList: true }
 * )
 */
export function defineLink(
  left: LinkEndpointInput,
  right: LinkEndpointInput,
  options?: {
    readOnly?: boolean
    database?: { extraColumns?: Record<string, { type: string }> }
  }
): LinkDefinition {
  const leftEndpoint = normalizeEndpoint(left)
  const rightEndpoint = normalizeEndpoint(right)

  const linkTableName = [
    leftEndpoint.linkable.tableName,
    rightEndpoint.linkable.tableName,
  ].join("_")

  return {
    left: leftEndpoint,
    right: rightEndpoint,
    readOnly: options?.readOnly,
    extraColumns: options?.database?.extraColumns,
    linkTableName,
    entryPoint: linkTableName,
  }
}

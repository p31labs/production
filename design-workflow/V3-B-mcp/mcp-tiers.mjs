/**
 * @file mcp-tiers.mjs — resolve_device_tier + get_tier_tokens (B4).
 *
 * Thin JSON-RPC adapters over the canonical tier module
 * (runbook v3.0 §5 B-4, spec in V2-B-laneE/mcp-resolution.md §c). No new
 * logic: every call goes straight to `B-device-tiers/device-tiers.mjs`.
 *
 * FAIL CLOSED (never a guess): the underlying resolver throws TypeError on
 * non-numeric/negative width or unknown pointer/hover (device-tiers.mjs:42-61).
 * This adapter catches and returns that as a JSON-RPC error object
 * { code: -32000, message }, exactly as mcp-resolution.md §c specifies — the
 * agent gets an error object, never a synthetic tier.
 *
 * Adapter contract: every call returns
 *   { ok: true,  result }            on success
 *   { ok: false, error: { code, message } }  on any failure
 */

import { resolveDeviceTier, TIERS } from '../B-device-tiers/device-tiers.mjs';

const JSON_RPC_ERROR = -32000;

/**
 * MCP tool `resolve_device_tier` (spec mcp-resolution.md §c Tool 1).
 * Param names are the MCP snake_case schema (width_dp / pointer / hover);
 * they map 1:1 onto the resolver's camelCase input.
 *
 * @param {{ width_dp: number, pointer: string, hover: string }} params
 * @returns {{ok: true, result: object} | {ok: false, error: {code: number, message: string}}}
 */
export function resolve_device_tier(params = {}) {
  try {
    const result = resolveDeviceTier({
      widthDp: params.width_dp,
      pointer: params.pointer,
      hover: params.hover,
    });
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: JSON_RPC_ERROR,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * MCP tool `get_tier_tokens` (spec mcp-resolution.md §c Tool 2).
 * Returns the frozen per-tier manifest object verbatim. Unknown tier →
 * error object naming the valid set — never a guess.
 *
 * @param {{ tier: string }} params
 * @returns {{ok: true, result: object} | {ok: false, error: {code: number, message: string}}}
 */
export function get_tier_tokens(params = {}) {
  const { tier } = params;
  if (!(tier in TIERS)) {
    return {
      ok: false,
      error: {
        code: JSON_RPC_ERROR,
        message: `getTierTokens: unknown tier ${JSON.stringify(tier)} — valid: embedded, mobile, tablet, desktop (refusing to guess)`,
      },
    };
  }
  return { ok: true, result: TIERS[tier] };
}
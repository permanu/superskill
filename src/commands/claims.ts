// SPDX-License-Identifier: Apache-2.0

import {
  parseClaims,
  verifyClaims,
  type ClaimsReport,
} from "../lib/codegraph/claims.js";

export interface ClaimsCommandArgs {
  claims?: unknown;
  root?: string;
}

export async function claimsCommand(args: ClaimsCommandArgs): Promise<ClaimsReport> {
  if (args.claims === undefined) throw new Error("claims: required");
  const claims = parseClaims(args.claims);
  return verifyClaims(claims, { root: args.root });
}

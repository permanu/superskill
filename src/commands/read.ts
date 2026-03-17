import { VaultFS } from "../lib/vault-fs.js";

export async function readCommand(vaultFs: VaultFS, path: string): Promise<string> {
  return await vaultFs.read(path);
}

export async function listCommand(vaultFs: VaultFS, path: string, depth: number): Promise<string[]> {
  return await vaultFs.list(path, depth);
}

# Sourcify Global Migration — State Tracker

Human-maintained log of migration runs. Update after each batch.
Machine-level detail lives in `export-log-{chainId}.json`.

## Overview
Last updated : 2026-03-24

| Chain     | ID  | Full matches | Partial matches | Status    |
|-----------|-----|---------|-----------------|-----------|
| Testnet   | 296 | 5630    | 427             | In progress |
| Mainnet   | 295 | 842        | 204             | Not started |

## Run History

| Date       | Engineer     | Chain | Match type | Amount | ✅ Success | ❌ Failed | Notes           |
|------------|--------------|-------|------------|--------|-----------|----------|-----------------|
| 2026-03-19 | @thomas.boot | 296   | full       | 5484   | 5443      | 41       | First migration |
| 2026-03-24 | @thomas.boot | 296   | partial    | 427    | 427       |          | First migration |

## How to Update This File

Before each run, update the table with the latest amount of contracts per chain:

For testnet:
```bash
curl https://server-verify.hashscan.io/files/contracts/296 | python3 -c "import sys,json; d=json.load(sys.stdin); print('full:', len(d.get('full',[])), 'partial:', len(d.get('partial',[])))"
```

For mainnet:
```bash
curl https://server-verify.hashscan.io/files/contracts/295 | python3 -c "import sys,json; d=json.load(sys.stdin); print('full:', len(d.get('full',[])), 'partial:', len(d.get('partial',[])))"
```
> Run the migration in --dry-run to obtain the up-to-date status of migrated contracts.
> This will allow to filter pre-migrated contracts out.

After each run, add a row to Run History:
```bash
cat export-log-296.json | python3 -c "
import sys, json; d = json.load(sys.stdin); s = d['stats']
print(f\"Success: {s['success']}, Failed: {s['failed']}, Skipped: {s['skipped']}\")
"
```

## Known Errors

### 1. `compiler_error` — File outside of allowed directories

**Cause:** Contracts that use deep relative imports (e.g. `../../../dependencies/openzeppelin/...`) are stored in local Sourcify with only the file basename as the source key. When Sourcify recompiles, the relative path escapes the sandbox root, producing:
```
ParserError: Source "dependencies/openzeppelin/contracts/SafeMath.sol" not found:
File outside of allowed directories.
```

**Fix:** Submit sources keyed by their full path as declared in `metadata.sources` instead of just the basename. `node scripts/export-to-global.mjs --chain-id 296 --retry-failed` implements this via `resolveSourcePaths()`, which extracts the correct key from `file.path` in the local API response.

**Status: Fixable.** Run `node scripts/export-to-global.mjs --chain-id 296 --retry-failed` against the affected contracts.

---

### 2. `missing_source` — Sources referenced in metadata but not fetchable

**Cause:** The metadata references source files by GitHub URL (e.g. `https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/interfaces/IERC165.sol`). When sources are submitted keyed only by basename (`IERC165.sol`), Sourcify cannot match them to the metadata key and attempts to fetch from GitHub — which may fail or return a content hash mismatch.

Local Sourcify stores files with their original full URL path embedded in the filesystem path (`sources/https:/github.com/...`). Extracting the key from `file.path` and normalising `https:/` → `https://` produces the exact key the metadata expects.

**Fix:** Same `resolveSourcePaths()` fix as above — deriving the submission key from `file.path` rather than the basename resolves the mismatch.

**Status: Fixable.** Run `node scripts/export-to-global.mjs --chain-id 296 --retry-failed` against the affected contracts.

---

### 3. `extra_file_input_bug` — Metadata hash matches, bytecode does not (Solidity 0.6.12)

**Cause:** This is a known Sourcify bug ([sourcify#618](https://github.com/ethereum/sourcify/issues/618)) specific to Solidity `0.6.12+commit.27d51765` with the optimizer enabled.

When a contract is originally compiled with extra source files beyond those listed in `metadata.sources` (e.g. other contracts in the same Hardhat project compiled in one batch), Solidity assigns AST IDs based on the full file set. Those AST IDs are embedded as placeholder offsets for immutable variables in the bytecode. When Sourcify recompiles using only `metadata.sources`, the AST IDs differ → the immutable offsets differ → the bytecode does not match, even though the metadata hash is correct.

Affected compiler configuration observed on chain 296:
- Solidity `0.6.12+commit.27d51765`
- EVM version: `istanbul`
- Optimizer: enabled, 200 runs

**Fix:** Recompile with the full original set of source files, including the extra unused ones. The extra files were part of the original compilation but are not stored in local Sourcify — only files listed in `metadata.sources` are retained after verification. Without the original build artifacts (e.g. a Hardhat `build-info/*.json` containing the full `input.sources`), the exact original compilation cannot be reproduced.

**Status: Not automatically fixable.** The deployer must provide the original Hardhat/Foundry build-info artifact. If available, pass the extra source files alongside `metadata.sources` when submitting to Sourcify.

---

## Next Steps

- [ ] Decommission local instance once all chains complete
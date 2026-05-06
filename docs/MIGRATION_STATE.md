# Sourcify Global Migration — State Tracker

Human-maintained log of migration runs. Update after each batch.
Machine-level detail lives in `export-log-{chainId}.json`.

## Overview
Last updated : 2026-05-06

| Chain     | ID  | Full matches | Partial matches | Status    |
|-----------|-----|---------|-----------------|-----------|
| Testnet   | 296 | 6092    | 437             | In progress |
| Mainnet   | 295 | 882        | 210             | In progress |

## Run History

| Date       | Engineer     | Chain | Match type | Amount | ✅ Success | ❌ Failed | Notes           |
|------------|--------------|-------|------------|--------|-----------|----------|-----------------|
| 2026-03-19 | @thomas.boot | 296   | full       | 5484   | 5443      | 41       | First migration |
| 2026-03-24 | @thomas.boot | 296   | partial    | 427    | 427       |          | First migration |
| 2026-03-25 | @thomas.boot | 295   | full       | 842    | 841       | 1        | Pending job     |
| 2026-03-25 | @thomas.boot | 295   | partial    | 204    | 204       |          |  |
| 2026-05-06 | @thomas.boot | 296   | full       | 6099   | 6055      | 44       |  |
| 2026-05-06 | @thomas.boot | 296   | partial    | 434    | 434       |          |  |
| 2026-05-06 | @thomas.boot | 295   | full       | 882    | 882       |          |  |
| 2026-05-06 | @thomas.boot | 295   | partial    | 210    | 209       | 1        |  |

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

### Retrieve the list of failed contracts for a run:
```bash
cat export-log-296.json | python3 -c "import sys, json, re
from collections import defaultdict

d = json.load(sys.stdin)
contracts = d['contracts']

groups = defaultdict(list)
for addr, v in contracts.items():
    if v.get('status') != 'FAILED':
        continue
    err_raw = v.get('error', '')
    err_str = err_raw if isinstance(err_raw, str) else json.dumps(err_raw)
    m = re.search(r'\{.*\}', err_str)
    custom_code = 'UNKNOWN'
    if m:
        try:
            err_obj = json.loads(m.group())
            custom_code = err_obj.get('customCode', 'NO_customCode')
        except json.JSONDecodeError:
            custom_code = 'PARSE_ERROR'
    groups[custom_code].append(addr)

import pprint
pprint.pprint(dict(groups))
print()
print('Counts:', {k: len(v) for k, v in groups.items()})"
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

## Failed Contracts Summary

Latest update : 2026-05-06
```
{
   "export-log-295-partial.json":{
      "no_match":[
         "0x00000000000000000000000000000000009Fb089"
      ]
   },
   "export-log-296.json":{
      "compiler_error":[
         "0x0030c6525eA570F6c1c1f0C4049A93EAC8097Bf2",
         "0x046B6AB33737F9658880b5636493B3E80183e1D1",
         "0x09f6AC86c34f2aa48f843231b14e0039559E0fE2",
         "0x0A31eD393930297b7CCd81142E640077A5EfA3D0",
         "0x0DD3BF006E1441dA92358c637bd4493c9232C358",
         "0x0eb1d38d7E511E139F7e29635aCE58E62b845891",
         "0x1A65091953FEA919C5964aB4b59aF8e52f41b623",
         "0x24630c8945C9099876cea73B7130d55835152fdc",
         "0x32494CBB2FC859e1E1092e5cb0C526eA9ee6c256",
         "0x38589bB19018Cd7715E9db1f42b00e5f64880534",
         "0x4013F97ED33D1979C8414291939D1D4bE312cd7D",
         "0x5BA7583B81770A78A1980D51805149Dd73270a7c",
         "0x5E2C974d157Ac975d750b6cbE5842D9D653f4E73",
         "0x6164Cbe514F8ec1A4e644161842bbCe6254e918C",
         "0x6252100ab64aabcb099a73DeC71366dcdeB5b8c0",
         "0x635c23a6aa2feC935971c387749967587f6237F6",
         "0x8298E55ddFA89Ec942cE7C7e81DD4BbD0d69f00a",
         "0x8508c3715162f2f4b3bD4d1da6012574D34E4F5E",
         "0x85C0BFF3e80b8856590A75e60a42AFf9A0173258",
         "0x9181f02EA150601424Bd36e8A61AE67063a85875",
         "0x92b9e1850e93bf6181b1F58cBc43A1903e5A0ca6",
         "0x94dBAEf01cFCdb52Fd4DB7B87b75918816bB52DF",
         "0x9a661B0199FB8761d22260982396564d347730c1",
         "0x9d02163817d883c26467a91CF9F0994bDf285a92",
         "0xA6067101D10c8B368757a99306A22F555c788E10",
         "0xB2265FcAe6f03dc8B52De3aBb67043397dFCe3BF",
         "0xB3C3789dAe98AD94e11D14AE3a240738129708Ae",
         "0xC2230E6936dc648DE5f72dfe380e622792b12226",
         "0xCcA3Eb0763d5DDB9279304E361C19574FF461D9b",
         "0xE2Ed0C3aEeeaEAe07906aC57Bc3EBA005496a89f",
         "0xF6cEfeB7D48419F93dbD73444B33d72bd94973F5",
         "0xaC7CbFc7a3DB5e80EEB394570f22F542b4a945b7",
         "0xaE4D2E3ea15DF049d187627Ae5C86F70B2834888",
         "0xb559ba578Accb860451E3c10bfA209E94169184D",
         "0xbE70f92026d6d83769aF99Fd681658f23F810223",
         "0xcFD97A66099965818fD7913a5da4Ad9D6309e1C3",
         "0xcd16e58F62EE665DE8A6188fC50B265E315b4ad0",
         "0xe862bF58C8e8D8450628152CdD00E37f7df4Ea44",
         "0xea9A5C9d61d4F4518f84f84Ff71CA1Ded2Fce503",
         "0xf0F9b65B381904Db3977906fAD56458b654af550",
         "0xf6E6d89667e17E6B3544F05C1485f437eC301aF1",
         "0xfc110936189AFd02b983aDBeC491bBF2E0d1B03A"
      ]
   }
}
```

## Next Steps

- [ ] Decommission local instance once all chains complete
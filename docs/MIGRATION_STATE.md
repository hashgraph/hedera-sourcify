# Sourcify Global Migration — State Tracker

Human-maintained log of migration runs. Update after each batch.
Machine-level detail lives in `export-log-{chainId}.json`.

## Overview
Last updated : 2026-03-17

| Chain     | ID  | Full matches | Partial matches | Status    |
|-----------|-----|---------|--------------|-----------|
| Testnet   | 296 | 5484    | 418          | In progress |
| Mainnet   | 295 | 831        | 203             | Not started |

## Run History

| Date       | Engineer     | Chain | Match type | Amount | ✅ Success | ❌ Failed | Notes             |
|------------|--------------|-------|------------|--------|-----------|----------|-------------------|
| 2026-03-19 | @thomas.boot | 296 | full | 5484 | 46 | 0        | Initial migration |

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

## Known Issues / Failures to Investigate

- (Add any FAILED contracts or recurring errors here)

## Next Steps

- [ ] Decommission local instance once all chains complete
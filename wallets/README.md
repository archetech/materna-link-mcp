# MaternaLink Demo Wallets

This directory contains **4 independent Archon wallets**, one per roleplay persona.

## Structure

| Folder | Persona | Role | Gatekeeper |
|--------|---------|------|------------|
| `alice/` | Dr. Alice Chen | Nurse (human) | archon.technology |
| `sofia/` | Sofia Martinez | Patient (human) | archon.technology |
| `valleyvista/` | Valley Vista Medical | Institution (issuer) | archon.technology |
| `eva/` | Eva AI | Healthcare AI (agent) | flaxlap.local:4222 |
| `vcs/` | VC templates | JSON claim files | — |

## How to Use

Each wallet is self-contained:

```bash
cd wallets/alice
source .env          # Loads ARCHON_PASSPHRASE + ARCHON_GATEKEEPER_URL
archon list-ids
archon list-credentials
```

You must `cd` into the wallet directory and `source .env` before any keymaster command.

## Security

- `.env` and `.mnemonic` are **.gitignored** — never committed
- `wallet.json` is **.gitignored** — encrypted, do not share
- Mnemonics are saved only in `.mnemonic` files with `chmod 600`

## Recovery

If you need to import a wallet on another device:

```bash
# Get mnemonic
cd wallets/alice
cat .mnemonic        # 12-word recovery phrase

# Import in browser / CLI
npx @didcid/keymaster create-wallet  # or browser import
# Paste mnemonic + use matching passphrase from .env
```

## DID Registry

See [DID_REGISTRY.md](DID_REGISTRY.md) for all resolved DIDs.
See [DEMO_PREP_REPORT.md](DEMO_PREP_REPORT.md) for full status.

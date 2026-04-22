# MaternaLink MCP

> **Healthcare Identity Verification for AI Agents**
>
> Verify patients, caregivers, and medical teams using Archon decentralized identity. HIPAA-aware, FHIR-ready, stateless by design.

---

## What It Does

MaternaLink MCP gives any AI agent the ability to **verify healthcare identities** through the Model Context Protocol — without ever touching private keys, wallets, or PII.

Built for the maternal health vertical where the stakes are highest: every identity decision affects a mother and her unborn child.

```
┌───────────────────────────────────────────────────┐
│   AI Agent (OB assistant, nurse bot, scheduler)  │
│         via MCP stdio or SSE transport           │
└──────────────────┬────────────────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────────────────┐
│        MaternaLink MCP Server (stateless)         │
│  ┌─────────────────────────────────────────────┐  │
│  │  verify-patient-identity                    │  │
│  │  verify-caregiver                           │  │
│  │  verify-medical-team                        │  │
│  │  verify-credential                          │  │
│  │  verify-delegation                          │  │
│  │  create-challenge / verify-signature        │  │
│  └──────────────────┬──────────────────────────┘  │
│                     │ REST (fetch)                 │
├─────────────────────┼─────────────────────────────┤
│  Archon Gatekeeper  │  DID resolution             │
│  (public API)       │  VC verification            │
│                     │  Delegation records         │
└─────────────────────┴─────────────────────────────┘
```

**✅ No wallet. No passphrase. No private keys. No PII handled.**

The server resolves and verifies DIDs through the public Archon Gatekeeper REST API — stateless by design. Full cryptographic verification (ECDSA signatures, vault claims) requires the Archon Keymaster wallet and is available as a production upgrade.

---

## Quick Start

### Install

```bash
git clone https://github.com/archetech/materna-link-mcp.git
cd maternalink-mcp
npm install
npm run build
```

### Configure your MCP client

Add to your `mcp.json` (Cursor, Claude Desktop, Windsurf, etc.):

```json
{
  "mcpServers": {
    "maternalink": {
      "command": "node",
      "args": ["/absolute/path/to/materna-link-mcp/dist/index.js"],
      "env": {
        "GATEKEEPER_URL": "https://archon.technology"
      }
    }
  }
}
```

### Try it

Ask your AI agent:

> "Verify this patient DID: did:cid:bafyreibz4..."

> "Check if caregiver did:cid:bafyreiay3... is authorized for medical:read on patient did:cid:bafyreibz4..."

> "Verify all 4 members of the OB team"

---

## Tools

| Tool | Description | Maternal Health Use Case |
|------|-------------|------------------------|
| `verify-identity` | Resolve any `did:cid:...` via the gatekeeper | Confirm patient, provider, or agent exists |
| `verify-credential` | Validate a VC's structure + issuer DID | Insurance card, pregnancy confirmation, prescriptions |
| `verify-delegation` | Check if delegate DID is authorized for a scope | Partner accessing records, AI agent refilling Rx |
| `create-challenge` | Generate a nonce for DID ownership proof | Prove you control this identity |
| `verify-signature` | Verify a signed nonce against DID public keys | Authenticate before sensitive action |
| `verify-medical-team` | Batch-verify a team of provider DIDs | Trust score for OB + nurse + anesthesiologist + AI |
| `verify-patient-identity` | Selective-disclosure identity proof | Prove pregnancy/insurance/age without full PII |
| `verify-caregiver` | Verify caregiver authorization for patient data | Partner, doula, nurse, AI coordinator |

---

## The MaternaLink Vision

MaternaLink is a maternal health AI companion that bridges **consumer wellness** and **clinical medicine** — using one identity wallet, two audiences:

| For Community | For Medical Systems |
|---------------|---------------------|
| Anonymous participation | HIPAA-grade verification |
| "BabyMama2026" | "Jane Smith, DOB 1990-03-15" |
| Share symptoms freely | Request prescription refills |
| Zero PII exposed | Insurance + pharmacy integration |

**The patient controls what each audience sees — from a single identity wallet.**

This MCP server provides the **identity verification layer** that makes this possible. The app facilitates medical transactions without holding PII. Lower liability. Better privacy. Regulatory unlock.

### Why This Matters for Healthcare

- **HIPAA** requires verified identity for PHI access
- **DEA** requires verified identity for controlled substances
- **State pharmacy boards** require verified patient-pharmacist relationship

Archon flips the model:
- App never sees your real name
- Pharmacy sees your verified credential
- **App facilitates without liability**

---

## Architecture

### Stateless by Design

```
Patient DID ──→ Gatekeeper REST API ──→ DID Document
                                          │
                                          ├── verificationMethod (public keys)
                                          ├── service endpoints (vault, insurance)
                                          └── assertionMethod (signing capability)
```

The server makes **no assumptions about persistence**. Every call resolves fresh from the gatekeeper. This means:

- No database to manage
- No session state to leak
- No PII cached anywhere
- Horizontally scalable

### Production Upgrade Path

For deployments requiring **full cryptographic verification**:

1. Add wallet initialization (`KeymasterClient.createWallet`)
2. Unlock vault with `ARCHON_PASSPHRASE`
3. Use `cipher.verify()` for ECDSA signature verification
4. Use `vault.getCredential()` for claim verification

These layer into `MaternaLinkIdentityService` as a `FullStackIdentityService` without breaking the stateless interface.

---

## Demo Scripts

| Script | What It Shows |
|--------|---------------|
| `demos/demo-patient.ts` | Verify a patient DID with selective disclosure |
| `demos/demo-delegation.ts` | Verify caregiver authorization for patient data |
| `demos/demo-team.ts` | Batch-verify an OB medical team |

Run with:
```bash
npm run dev -- demos/demo-patient.ts
npm run dev -- demos/demo-delegation.ts
npm run dev -- demos/demo-team.ts
```

---

## File Structure

```
materna-link-mcp/
├── src/
│   ├── index.ts              # MCP server (stdio), tool definitions, handler routing
│   ├── server-http.ts        # MCP server (HTTP/SSE), dual transport
│   └── identity-service.ts   # Stateless service — all gatekeeper REST calls
├── demos/
│   ├── demo-patient.ts       # Patient identity verification demo
│   ├── demo-delegation.ts    # Caregiver delegation verification demo
│   └── demo-team.ts          # Medical team batch verification demo
├── docs/
│   ├── ARCHITECTURE.md       # Detailed architecture and data flow
│   └── FHIR-INTEGRATION.md   # FHIR mapping and healthcare standards
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## Built On

- **Archon Protocol** — W3C-compliant `did:cid` DID method with multi-registry architecture
- **Model Context Protocol (MCP)** — Standard for AI tool integration
- **Archon Gatekeeper** — Public REST API for DID resolution and verification

Key Archon advantages for healthcare:
- ✅ **P2P architecture** — No centralized identity provider
- ✅ **Registry agnostic** — Bitcoin, Hyperswarm, Signet — choose your security/cost trade-off
- ✅ **Open source** — Auditable, no vendor lock-in
- ✅ **Selective disclosure** — Prove claims without exposing PII
- ✅ **Verifiable delegation** — AI agents act with patient consent
- ✅ **Audit trail** — Cryptographically signed for HIPAA compliance

---

## License

Apache-2.0 © 2026 Archetech

---

## Links

- **Archon Protocol:** https://archon.technology
- **Whitepaper:** https://github.com/archetech/archon/blob/main/docs/WHITEPAPER.md
- **Archon MCP (generic):** https://github.com/archetech/archon-identity-mcp
- **Gatekeeper MCP:** https://github.com/archetech/gatekeeper-mcp-server
- **Issues:** https://github.com/archetech/materna-link-mcp/issues
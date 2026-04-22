# MaternaLink MCP — Architecture

## Overview

MaternaLink MCP is a **stateless identity verification layer** for healthcare AI agents. It provides DID resolution, verifiable credential verification, delegation authorization, and selective-disclosure proofs through the Model Context Protocol (MCP).

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    AI Agent Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐  │
│  │ OB Assistant │ │ Nurse Bot  │ │ Scheduling Agent  │  │
│  └──────┬──────┘ └──────┬──────┘ └────────┬─────────┘  │
│         │               │                 │             │
│         ▼               ▼                 ▼             │
│  ┌──────────────────────────────────────────────────┐   │
│  │           MCP Client (stdio / SSE)              │   │
│  └──────────────────────────┬───────────────────────┘   │
└─────────────────────────────┼──────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│             MaternaLink MCP Server                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │       MaternaLinkIdentityService                  │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │ DID        │ │ VC           │ │ Delegation  │  │   │
│  │  │ Resolution │ │ Verification │ │ + VRC       │  │   │
│  │  └────────────┘ └──────────────┘ └────────────┘  │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │ Challenge  │ │ Signature    │ │ Selective  │  │   │
│  │  │ + Nonce    │ │ (structural) │ │ Disclosure  │  │   │
│  │  └────────────┘ └──────────────┘ └────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                                │
│                     fetch()                              │
└─────────────────────────┼────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Archon Gatekeeper (public API)              │
│                                                          │
│  GET /api/v1/did/{did}     — Resolve DID Document       │
│  POST /api/v1/verify/vc    — Verify credential          │
│  GET /api/v1/did/{did}/ops — DID operation history      │
│                                                          │
│  ┌─────────────┐ ┌───────────────┐ ┌────────────────┐   │
│  │ IPFS / CID  │ │ Bitcoin       │ │ Hyperswarm     │   │
│  │ (creation)  │ │ (anchor)      │ │ (gossip)       │   │
│  └─────────────┘ └───────────────┘ └────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Data Flow: Patient Identity Proof

```
1. AI Agent calls verify-patient-identity(patientDid, "pregnancy-confirmation", ["due-date"])

2. MaternaLinkIdentityService:
   a. GET /api/v1/did/{patientDid} → DID Document
   b. Check: DID exists? Has verificationMethod? (proves wallet controls this DID)
   c. Extract: service endpoints (vault, insurance, pharmacy)
   d. Build proof: { verified, did, claimType, disclosed, timestamp }

3. AI Agent receives proof:
   {
     "verified": true,
     "did": "did:cid:bafyreibz4...",
     "claimType": "pregnancy-confirmation",
     "disclosed": ["due-date"],
     "services": [
       { "type": "HealthVault", "id": "...vault-endpoint" },
       { "type": "InsuranceVerification", "id": "...insurance-endpoint" }
     ],
     "timestamp": "2026-04-22T14:30:00Z"
   }
```

## Data Flow: Caregiver Delegation

```
1. AI Agent calls verify-caregiver(patientDid, caregiverDid, "medical:read", vrc?)

2. MaternaLinkIdentityService:
   a. GET /api/v1/did/{patientDid}     → Resolve patient
   b. GET /api/v1/did/{caregiverDid}   → Resolve caregiver
   c. If VRC provided:
      - Parse VRC JSON
      - Extract authorizedScopes from credentialSubject
      - Check: scopeMatches("medical:read", "medical:read") → true
   d. Return: { authorized: true/false, delegator, delegate, scope, requestedScope }

3. AI Agent decision:
   - authorized=true → Proceed (show patient data, schedule appointment, refill Rx)
   - authorized=false → Deny, log attempt, notify patient
```

## Delegation Scopes

MaternaLink defines these scope families for maternal health:

| Scope Family | Examples | Typical Delegator | Typical Delegate |
|-------------|----------|-------------------|------------------|
| `medical:*` | `medical:read`, `medical:admin`, `medical:write` | Patient | Provider, Nurse |
| `pregnancy:*` | `pregnancy:read`, `pregnancy:write` | Patient | Partner, Doula |
| `prescription:*` | `prescription:read`, `prescription:refill` | Patient | AI Agent |
| `insurance:*` | `insurance:verify`, `insurance:claim` | Patient | AI Agent, Admin |
| `appointment:*` | `appointment:read`, `appointment:schedule` | Patient | AI Agent, Partner |

Wildcard: `medical:*` matches `medical:read`, `medical:admin`, etc.

## Trust Model

```
┌─────────────┐     VRC      ┌──────────────┐
│  Patient    │ ────────── → │  Caregiver   │
│  (Delegator)│   scopes:    │  (Delegate)   │
│             │   medical:   │              │
│  did:cid:A  │   read       │  did:cid:B    │
└─────────────┘              └──────┬───────┘
                                    │
                              acts on behalf
                                    │
                                    ▼
                             ┌──────────────┐
                             │  AI Agent    │
                             │  verifies   │
                             │  delegation  │
                             └──────────────┘
```

**Key principle:** The AI agent never trusts the caregiver's word alone. It verifies the delegation through the cryptographic VRC anchored on the Archon network.

## Security Properties

| Property | How Achieved |
|----------|-------------|
| **No PII handled** | Server only resolves DIDs — never sees names, DOBs, medical records |
| **Stateless** | Every call fresh from gatekeeper — no cached data to leak |
| **No private keys** | Server has no wallet — cannot sign or decrypt |
| **Audit trail** | Every DID operation is anchored on Bitcoin or Hyperswarm |
| **Scope-limited** | Delegation is scoped — caregiver can't escalate permissions |
| **Revocable** | Patient can revoke VRC at any time via Archon wallet |

## Production Considerations

### HIPAA Compliance Checklist

- [ ] Gatekeeper runs on encrypted channel (TLS 1.3)
- [ ] MCP server deployed in compliant cloud (AWS GovCloud, Azure Government)
- [ ] Audit logging for all verification calls
- [ ] BAA (Business Associate Agreement) with gatekeeper host
- [ ] Access control for SSE endpoint (if HTTP mode)
- [ ] Full ECDSA signature verification (requires Keymaster wallet)

### Scaling

- Stateless design → horizontal scaling behind load balancer
- Gatekeeper caching → TTL-based cache for frequent DID lookups
- Connection pooling → persistent fetch connections to gatekeeper

### Full Stack Upgrade

When you need the full cryptographic stack:

```
MaternaLinkIdentityService  (stateless — this repo)
        ↓ upgrade path
FullStackIdentityService  (wallet-backed)
  + KeymasterClient.createWallet(cipher, password)
  + cipher.verify(credential, publicKeyJwk)
  + vault.getCredential(credentialId)
  + cipher.sign(did, operation, keyPair)
```
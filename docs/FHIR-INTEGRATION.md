# MaternaLink MCP — FHIR Integration Guide

## Overview

MaternaLink MCP is designed to work alongside FHIR (Fast Healthcare Interoperability Resources) systems. This document maps Archon identity concepts to FHIR resources and shows how to integrate.

## FHIR-to-Archon Mapping

| FHIR Resource | Archon Concept | MaternaLink MCP Tool |
|---------------|---------------|---------------------|
| `Patient` | Agent DID | `verify-identity`, `verify-patient-identity` |
| `Practitioner` | Agent DID | `verify-identity` |
| `RelatedPerson` | Delegated DID + VRC | `verify-caregiver`, `verify-delegation` |
| `Consent` | VRC (Verifiable Relationship Credential) | `verify-delegation` (with VRC) |
| `VerificationResult` | Selective Disclosure Proof | `verify-patient-identity` |
| `Provenance` | DID Operation History (anchored on Bitcoin) | Gatekeeper API (external) |

## Integration Patterns

### Pattern 1: Patient Identity Verification → FHIR Patient

```
┌─────────────┐                    ┌──────────────┐
│ MaternaLink │  verify-identity   │   FHIR       │
│ MCP         │ ─────────────────→ │   Server     │
│             │  did:cid:bafy...    │              │
│             │                    │ Patient?      │
│             │  ←── Patient found │ identifier=DID│
│             │                    └──────────────┘
└─────────────┘
```

1. AI agent resolves patient DID via MaternaLink MCP
2. DID Document `service` endpoints may include FHIR server URL
3. Agent queries FHIR server with DID as identifier

### Pattern 2: Caregiver Delegation → FHIR Consent

```
┌─────────────┐                     ┌──────────────┐
│ MaternaLink │  verify-caregiver    │   FHIR       │
│ MCP         │ ──────────────────→ │   Server      │
│             │  patient + caregiver │               │
│             │  scope: medical:read │               │
│             │                     │ Consent:       │
│             │  ←── authorized     │ active, Bearer │
│             │                     └──────────────┘
└─────────────┘
```

1. AI agent verifies delegation via MaternaLink MCP
2. If authorized, agent presents VRC as consent proof
3. FHIR server validates consent and grants access

### Pattern 3: Selective Disclosure → FHIR VerificationResult

```
┌─────────────┐                          ┌──────────────┐
│ MaternaLink │  verify-patient-identity   │   Claim      │
│ MCP         │ ────────────────────────→ │   Consumer   │
│             │  claimType: age-verify    │               │
│             │  disclosed: ['age-over-18']│ Needs:        │
│             │                          │ age ≥ 18      │
│             │  ←── proof returned       │               │
│             │                          │ ✓ Verified    │
└─────────────┘                          └──────────────┘
```

## FHIR Resource Examples

### Patient with DID Identifier

```json
{
  "resourceType": "Patient",
  "identifier": [
    {
      "system": "https://archon.technology/did",
      "value": "did:cid:bafyreibz4examplepatientdid0000001"
    }
  ],
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["Jane"]
    }
  ],
  "birthDate": "1990-03-15"
}
```

### Consent with VRC Reference

```json
{
  "resourceType": "Consent",
  "status": "active",
  "scope": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/consentscope",
        "code": "patient-privacy",
        "display": "Privacy Consent"
      }
    ]
  },
  "policy": [
    {
      "authority": "https://archon.technology/vrc",
      "uri": "did:cid:bafyreivrcexample00000000000000000001"
    }
  ],
  "provision": {
    "type": "permit",
    "actor": [
      {
        "role": {
          "coding": [{"code": "PART", "display": "Partner"}]
        },
        "reference": {
          "reference": "RelatedPerson/jane-partner"
        }
      }
    ],
    "purpose": [
      {
        "system": "https://archon.technology/scope",
        "code": "pregnancy:read"
      }
    ]
  }
}
```

### VerificationResult from Selective Disclosure

```json
{
  "resourceType": "VerificationResult",
  "target": [
    {
      "reference": "Patient/jane-smith",
      "identifier": {
        "system": "https://archon.technology/did",
        "value": "did:cid:bafyreibz4..."
      }
    }
  ],
  "status": "attested",
  "primarySource": [
    {
      "who": {
        "identifier": {
          "system": "https://archon.technology",
          "value": "maternalink-mcp"
        }
      },
      "validationType": [
        {"code": "primary", "display": "Primary Source"}
      ]
    }
  ],
  "attestation": {
    "method": "did:cid:bafyreibz4...",
    "date": "2026-04-22T14:30:00Z"
  }
}
```

## Scope Mapping: Archon ↔ FHIR

| Archon Scope | FHIR Equivalent | SMART on FHIR Scope |
|-------------|-----------------|---------------------|
| `medical:read` | `Patient.read` | `patient/Patient.read` |
| `medical:write` | `Patient.write` | `patient/Patient.write` |
| `pregnancy:read` | `Observation.read` (pregnancy category) | `patient/Observation.read` |
| `prescription:read` | `MedicationRequest.read` | `patient/MedicationRequest.read` |
| `prescription:refill` | `MedicationRequest.create` | `patient/MedicationRequest.write` |
| `insurance:verify` | `Coverage.read` | `patient/Coverage.read` |
| `appointment:read` | `Appointment.read` | `patient/Appointment.read` |
| `appointment:schedule` | `Appointment.create` | `patient/Appointment.write` |

## SMART on FHIR Integration

MaternaLink MCP can complement SMART on FHIR by providing:

1. **Pre-authorization check:** Verify delegation before requesting OAuth token
2. **Cross-system identity:** Same DID works across multiple FHIR servers
3. **Audit enhancement:** Every access has a cryptographically verifiable delegation chain
4. **Patient-controlled:** Patient revokes VRC → all downstream access stops

## SHARP (Societal Harms and Risks in AI Health) Compliance

MaternaLink MCP supports SHARP principles:

| Principle | How MaternaLink Supports |
|-----------|------------------------|
| Identity verification | DID resolution proves agent identity |
| Consent enforcement | VRC-backed delegation with scoped access |
| Audit trail | All operations anchored on Archon network |
| Data minimization | Selective disclosure — prove claims without full PII |
| Revocability | Patient can revoke any delegation instantly |
| Transparency | Full operation history on public network |
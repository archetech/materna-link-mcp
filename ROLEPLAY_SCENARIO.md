# MaternaLink MCP — Roleplay Scenario

**Objective:** Demonstrate Archon SSI capabilities via interactive roleplay using real DID wallets, challenge/response, and the MaternaLink MCP server.

**Important:** All human-playable roles (Dr. Alice Chen, Sofia Martinez, Valley Vista Medical) live in the **same wallet**. Import the single mnemonic, then switch IDs with `archon use-id`. Eva AI Assistant (`eva-ai`) is the AI agent and lives in a separate wallet.

---

## Wallet 1: Genitrix Demo Wallet (archon.technology gatekeeper)

**Location:** `~/wallets/genitrix`  
**Passphrase:** in .env (AI agent only — never output raw value)  
**Gatekeeper:** https://archon.technology  
**IDs (all demo-only, not the real GenitriX admin):**

```
  • Alice_Chen          → did:cid:bagaaieraq6saevblxlqaalolq7bjfhtzpgeb4bdtbi3wj6ubv3tlutap2d5a
  • Sofia_Martinez      → did:cid:bagaaieraejvkvjhneipzdl5wsxhdw74qxx4qpn4p3okatgdcfbrm5bkwi2sa
  • ValleyVista_Medical → did:cid:bagaaierab72x6xswxll4d57o5mig2is5nywconwyqo6fb6vrbrcms356mgzq
```

## Wallet 2: Eva AI (flaxlap.local gatekeeper)

**Location:** `~/wallets/nursing_demo`  
**Passphrase:** in .env  
**Gatekeeper:** http://flaxlap.local:4222

```
  • eva-ai → did:cid:bagaaiera4jmdvjwlqffmhgofvf46izjpqvmmepimeg7eoclfrmc5nc2zgt4a
```

---

## Role Mapping

```
┌─────────────────────────────────────────────────────────┐
│                   ROLEPLAY SCENARIO                      │
│                                                          │
│  👩‍⚕️ Dr. Alice Chen (Nurse/Drs.)   🤖 Eva AI Assistant  │
│  Identity: Alice_Chen              Identity: eva-ai       │
│  Wallet:   genitrix (demo)          Wallet: nursing_demo   │
│  Role:     Human (you play)         Role: AI Agent       │
│                                                          │
│  🤰 Sofia Martinez (Patient)         🏥 Valley Vista Med │
│  Identity: Sofia_Martinez          Identity: ValleyVista│
│  Wallet:   genitrix (demo)          Wallet: genitrix     │
│  Role:     Human (you play)         Role: Institution    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

| Role | Identity | Wallet | Played By |
|------|----------|--------|-----------|
| Dr. Alice Chen | Alice_Chen | genitrix | **Human (you)** |
| Sofia Martinez (patient) | Sofia_Martinez | genitrix | **Human (you)** |
| Valley Vista Medical Center | ValleyVista_Medical | genitrix | **Human (you)** |
| Eva AI Assistant | eva-ai | nursing_demo | **Eva (AI agent)** |

---

## Pre-Issued Verifiable Credentials (all live)

| # | VC Type | Issuer (ID) | Subject (Holder) | VC DID |
|---|---------|-------------|------------------|--------|
| 1 | **MedicalLicense** | ValleyVista_Medical | Alice_Chen | did:cid:bagaaierabggbc4nnxtxyxbdv7dw2yn7imwpzjehfkmboaa3b7e6r62pt3bna |
| 2 | **PregnancyRecord** | ValleyVista_Medical | Sofia_Martinez | did:cid:bagaaierayuobdsjc54a3e6h3vvzpxer6ezbijdt6fzqzczj7x2hk3vzt6e7a |
| 3 | **CaregiverAuthorization** | ValleyVista_Medical | Alice_Chen | did:cid:bagaaieraboatf42ks4rr727ndv2gvbwc35mvvnxvsrtqf7g7vsga77lyforq |
| 4 | **PatientConsent** | Sofia_Martinez | Sofia_Martinez | did:cid:bagaaierapewo2au3jzoqtuorthmbulivk26bqvuhj3wkhyrygbmhfexe34fa |

### VC Claims Summary

**1. MedicalLicense (Dr. Alice Chen)**
- License #: RN-2025-CA-00142
- Specialty: Maternal-Fetal Medicine
- Authority: Valley Vista Medical Center
- Scope: prenatal-care, labor-delivery, postpartum-monitoring
- Valid: 2025-01-15 → 2027-01-15

**2. PregnancyRecord (Sofia Martinez)**
- Gestational Age: 32 weeks
- EDD: 2025-07-15
- Blood Type: A+, High Risk: No
- Allergies: penicillin, latex
- Care Plan: biweekly ultrasound, GD screening

**3. CaregiverAuthorization (Alice → Sofia)**
- Scope: pregnancy:read, ultrasound:order, lab:read
- Dept: Maternal-Fetal Medicine
- Valid: 2025-04-01 → 2025-12-31

**4. PatientConsent (Sofia → Alice)**
- Scope: pregnancy:read, lab:read, ultrasound:order
- Exclusions: psychiatric, substance-abuse, family-history
- Consent Date: 2025-04-20
- Revocable: Yes

---

## Scenario Flow

### Phase 1: Identity Verification (Challenge/Response)

```
You (as Alice_Chen) → archon create-challenge
Eva (eva-ai)          → archon verify-response <challenge_did>
Eva                   → MCP verify-identity(Alice_Chen DID)
```

### Phase 2: Patient Verification

```
You provides Sofia_Martinez DID
Eva → MCP verify-patient-identity(Sofia_Martinez DID)
```

### Phase 3: Caregiver Authorization

```
You ask: "Am I authorized to access Sofia's pregnancy records?"
Eva → MCP verify-caregiver(
        patientDid=Sofia_Martinez,
        caregiverDid=Alice_Chen,
        scope="pregnancy:read"
      )
```

### Phase 4: Credential Verification

```
Eva → verify MedicalLicense VC (Alice_Chen)
Eva → verify CaregiverAuthorization VC (Alice_Chen)
Eva → verify PregnancyRecord VC (Sofia_Martinez)
```

### Phase 5: Consent & Selective Disclosure

```
You (as Sofia) → present PatientConsent VC
Eva → MCP verify-consent
→ Confirms exclusions NOT in scope
```

---

## Commands Cheat Sheet (for you, the human)

You only need **one wallet** (genitrix). Switch identities as you play each role.

### Switch identity in genitrix wallet:
```bash
cd ~/wallets/genitrix && source .env

# Switch to Dr. Alice Chen
archon use-id Alice_Chen

# Switch to Sofia Martinez
archon use-id Sofia_Martinez

# Switch to Valley Vista Medical
archon use-id ValleyVista_Medical

# Create challenge (as Dr. Alice)
archon create-challenge

# Resolve any DID
archon resolve-did did:cid:...

# List your credentials
archon list-credentials
```

---

## What Eva (AI Agent) Will Do During Roleplay

1. **Listen** for your in-character messages
2. **Run keymaster commands** on the `eva-ai` wallet for challenge/response
3. **Execute MCP calls** against the MaternaLink server when you request verification
4. **Narrate** results in a clinical-friendly tone
5. **Track the scenario state** so we don't lose context

## What You Do

1. **Play Dr. Alice** — create challenges, show MedicalLicense
2. **Play Sofia** — show PatientConsent, grant/revoke scope
3. **Play Valley Vista** — if you need to issue or view institutional VCs
4. **Share challenge DIDs** when you create them
5. **Guide the narrative** — you're the human in the loop

---

## Starting the Roleplay

Say something like:

> "Good morning. I'm Dr. Alice Chen. I need to verify my credentials before
> accessing patient records for Sofia Martinez."

And Eva will respond, using the real Archon infrastructure behind the scenes.

---

*Prepared by GenitriX Agency — April 23, 2026*

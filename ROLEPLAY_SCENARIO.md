# MaternaLink MCP — Roleplay Scenario

**Objective:** Demonstrate Archon SSI capabilities via interactive roleplay
using real DID wallets, challenge/response, and the MaternaLink MCP server.

---

## Available Wallets & Identities

### Wallet 1: Genitrix (archon.social gatekeeper)
```
Location:   ~/wallets/genitrix
Gatekeeper:  https://archon.technology
IDs:
  • GenitriX      → did:cid:bagaaieraxdxq4fm2kjh6yqjxjor3t2idczkmxd4v7in4u353fa6m6sms2pnq
  • Nurse_Demo    → did:cid:bagaaieraywvvtun2bv5fi4lp7y4kcdk7kvhlcswu6r5hjeoah5wp7wzbcjhq
  • Patient_Demo  → did:cid:bagaaieray2f67vmn3thdyvrduezo27ql4tiywtbc4bzkscpmruxusqxxf6ia
```

### Wallet 2: Nursing Demo (flaxlap.local gatekeeper)
```
Location:   ~/wallets/nursing_demo
Gatekeeper:  http://flaxlap.local:4222
IDs:
  • eva-ai  → did:cid:bagaaiera4jmdvjwlqffmhgofvf46izjpqvmmepimeg7eoclfrmc5nc2zgt4a
```

## Role Mapping

```
┌─────────────────────────────────────────────────────────┐
│                   ROLEPLAY SCENARIO                      │
│                                                          │
|  👩‍⚕️ Dr. Alice Chen (Nurse)         🤖 Eva AI Assistant   |
|  Identity: Nurse_Demo              Identity: eva-ai     |
│  Wallet:   ~/wallets/genitrix       Wallet: nursing_demo │
│  Role:     Human (you play)         Role: AI Assistant   │
│                                                          │
│  🤰 Patient Maria                   🏥 Hospital Admin   │
│  Identity: Patient_Demo             Identity: GenitriX    │
│  Wallet:   ~/wallets/genitrix       Wallet: genitrix     │
│  Role:     Human (you play)         Role: Institutional   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Scenario Flow

### Phase 1: Identity Verification (Challenge/Response)

```
Dr. Alice ──▶ "I need to verify my credentials before accessing records"
           ──▶ creates challenge from Nurse_Demo wallet
           ──▶ shares challenge DID with Hermes (eva-ai)

Hermes    ──▶ receives challenge DID
           ──▶ verify-response against eva-ai wallet
           ──▶ confirms Alice's identity
           ──▶ calls MaternaLink MCP: verify-identity(Nurse_Demo DID)
```

### Phase 2: Patient Verification

```
Dr. Alice ──▶ "Please verify Maria's identity for prenatal check-in"
           ──▶ provides Patient_Demo DID

Hermes    ──▶ calls MaternaLink MCP: verify-patient-identity(Patient_Demo DID)
           ──▶ returns verified patient record with timestamp
```

### Phase 3: Caregiver Authorization

```
Dr. Alice ──▶ "Am I authorized to access Maria's pregnancy records?"
           ──▶ provides both DIDs + scope: "pregnancy:read"

Hermes    ──▶ calls MaternaLink MCP: verify-caregiver(
                 patientDid=Patient_Demo,
                 caregiverDid=Nurse_Demo,
                 scope="pregnancy:read"
               )
           ──▶ returns authorization result
```

### Phase 4: Credential Issuance (VC Flow)

```
Hospital Admin (GenitriX) ──▶ "Issue a nursing credential to Dr. Alice"
                            ──▶ bind-credential(nurse_schema, Nurse_Demo)
                            ──▶ issue-credential(bound_vc_file)

Dr. Alice  ──▶ accept-credential(vc_did)
            ──▶ "Show me my credentials"
            ──▶ list-credentials

Hermes    ──▶ calls MaternaLink MCP: verify-credential(vc_json)
           ──▶ confirms credential is structurally valid
```

### Phase 5: Consent & Selective Disclosure

```
Patient Maria ──▶ "I want to authorize Dr. Alice but only for pregnancy:read"
               ──▶ records consent in wallet (or VRC delegation)

Hermes    ──▶ calls verify-consent (if wireframe completed)
           ──▶ confirms scope-limited authorization
           ──▶ Dr. Alice can access pregnancy data but NOT full medical history
```

---

## Commands Cheat Sheet (for you, the human)

### Switch identity in Genitrix wallet:
```bash
cd ~/wallets/genitrix && source .env

# Switch to Nurse_Demo
archon use-id Nurse_Demo

# Switch to Patient_Demo  
archon use-id Patient_Demo

# Switch to GenitriX (admin)
archon use-id GenitriX

# Create challenge (as nurse)
archon create-challenge

# Resolve any DID
archon resolve-did did:cid:...
```

### Nursing demo wallet:
```bash
cd ~/wallets/nursing_demo && source .env

# eva-ai is the only ID
archon resolve-id
archon verify-response <challenge_did>
```

### Switch identity in nursing_demo wallet:
```bash
cd ~/wallets/nursing_demo && source .env
# eva-ai is the only ID
archon resolve-id
archon verify-response <challenge_did>
```

## What I (Hermes) Will Do During Roleplay

1. **Listen** for your in-character messages
2. **Execute MCP calls** against the MaternaLink server when you request verification
3. **Run keymaster commands** on the eva-ai wallet for challenge/response
4. **Narrate** results in a clinical-friendly tone
5. **Track the scenario state** so we don't lose context

## What You Do

1. **Play Dr. Alice** (or Patient Maria, or both — switch as needed)
2. **Tell me what you want to verify/access/issue**
3. **Share challenge DIDs** when you create them
4. **Guide the narrative** — you're the human in the loop

---

## Starting the Roleplay

Say something like:

> "Good morning. I'm Dr. Alice Chen, I need to access the prenatal records
> for patient Maria. Can you verify my identity?"

And I'll respond as Eva (the AI assistant), using the real Archon infrastructure
behind the scenes.

---

*Prepared by Hermes Agent — April 22, 2026*
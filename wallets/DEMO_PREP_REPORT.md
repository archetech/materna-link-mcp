# MaternaLink MCP — Roleplay Demo Prep Status Report
## Report Date: April 23, 2026 ~09:15 AM
## Prepared by: GenitriX for Christian Saucier

---

## Executive Summary

All demo identities are now in **separate, independent wallets** inside the MaternaLink project. Each persona has:
- Its own `wallet.json` (encrypted with unique passphrase)
- Its own `.env` file (gatekeeper URL + passphrase)
- Its own `.mnemonic` recovery file
- One named DID identity
- All VCs correctly issued from the issuer's wallet and accepted into the holder's wallet

**4 personas:** Dr. Alice Chen, Sofia Martinez, Valley Vista Medical, Eva AI Assistant

---

## Wallet Structure

```
materna-link-mcp/wallets/
├── alice/                 # 🧑‍⚕️ Dr. Alice Chen (Nurse)
│   ├── .env              # ARCHON_PASSPHRASE + ARCHON_GATEKEEPER_URL
│   ├── .mnemonic         # 12-word recovery phrase
│   └── wallet.json       # Encrypted wallet file
│
├── sofia/                 # 🤰 Sofia Martinez (Patient)
│   ├── .env
│   ├── .mnemonic
│   └── wallet.json
│
├── valleyvista/           # 🏥 Valley Vista Medical Center (Issuer)
│   ├── .env
│   ├── .mnemonic
│   └── wallet.json
│
├── eva/                   # 🤖 Eva AI Assistant (AI Agent)
│   ├── .env
│   ├── .mnemonic
│   └── wallet.json
│
├── vcs/
│   ├── MedicalLicense.json
│   ├── PregnancyRecord.json
│   ├── CaregiverAuthorization.json
│   └── PatientConsent.json
│
└── DID_REGISTRY.md
```

---

## DID Registry

| Wallet | ID Name | DID | Gatekeeper |
|--------|---------|-----|------------|
| **alice** | Dr_Alice_Chen | did:cid:bagaaieranqsh5fcjlnh2oq7zxxcjobt7qsyoar37llpbqnplzw5qcc324qia | archon.technology |
| **sofia** | Sofia_Martinez | did:cid:bagaaierapfwstdqd37o6m35ws2gnzhrnnl2wsrtze6nddewpmxq27zjtjg7a | archon.technology |
| **valleyvista** | ValleyVista_Medical | did:cid:bagaaieraxxohaxwmj2w2razfhidddxx6p565vqfg2igu5r6ht2mqutabxi3q | archon.technology |
| **eva** | Eva_AI | did:cid:bagaaierazepveib5f2sncyifm5v5qjywze24jqq75sh7y3gfqcixxbbu7c2a | flaxlap.local:4222 |

---

## Verifiable Credentials (4 VCs)

All VCs are **live, issued, and accepted** in the correct holder wallets.

| # | VC Type | Issuer Wallet | Subject Wallet | VC DID |
|---|---------|--------------|----------------|--------|
| 1 | **MedicalLicense** | valleyvista | alice | did:cid:bagaaierauo5h47yzebsowba76fgl2exf33p5oapbib5ts3ofrbf2lp2ztc7a |
| 2 | **PregnancyRecord** | valleyvista | sofia | did:cid:bagaaierajand73c2brxmnzuc4fxc6lbsmji3dqgkuktmfumezkichmi4jwla |
| 3 | **CaregiverAuthorization** | valleyvista | alice | did:cid:bagaaiera7tykyjruoqq3iwxluxivh5vyxncfz5rjl53dxjtj2a5hyacswdlq |
| 4 | **PatientConsent** | sofia | sofia (self-issued) | did:cid:bagaaierazzpd7eairhsvesc3gh4y4vxmbljhwphxmuvqw3lninadnjxqslba |

### VC Claims Summary

**1. MedicalLicense (Alice Chen)**
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
- Care Plan: biweekly-ultrasound, GD screening

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

## Roleplay Workflow

### Phase 1: Identity Verification (Challenge/Response)
```bash
# You (as Alice)
cd wallets/alice && source .env && archon use-id Dr_Alice_Chen
archon create-challenge
# Share challenge DID with Eva

# Eva (as AI)
cd wallets/eva && source .env && archon use-id Eva_AI
archon verify-response <challenge_did>
# MCP verify-identity(Dr_Alice_Chen DID)
```

### Phase 2: Patient Verification
```
You provide Sofia's DID
Eva → MCP verify-patient-identity(Sofia_Martinez DID)
```

### Phase 3: Caregiver Authorization
```
You ask: "Can I access Sofia's pregnancy records?"
Eva → MCP verify-caregiver(
        caregiverDid=Dr_Alice_Chen,
        patientDid=Sofia_Martinez,
        scope="pregnancy:read"
      )
```

### Phase 4: Credential Verification
```
Eva → verify MedicalLicense VC (from alice wallet)
Eva → verify CaregiverAuthorization VC (from alice wallet)
Eva → verify PregnancyRecord VC (from sofia wallet)
```

### Phase 5: Consent & Selective Disclosure
```
You (as Sofia) → present PatientConsent VC
Eva → MCP verify-consent
→ Confirms exclusions NOT in scope
```

---

## Commands Cheat Sheet (per persona)

### Dr. Alice Chen
```bash
cd wallets/alice && source .env
archon use-id Dr_Alice_Chen
archon create-challenge
archon list-credentials
archon resolve-id
```

### Sofia Martinez
```bash
cd wallets/sofia && source .env
archon use-id Sofia_Martinez
archon list-credentials
archon resolve-id
```

### Valley Vista Medical
```bash
cd wallets/valleyvista && source .env
archon use-id ValleyVista_Medical
archon list-credentials
archon resolve-id
```

### Eva AI Agent
```bash
cd wallets/eva && source .env
archon use-id Eva_AI
archon verify-response <challenge_did>
archon list-credentials
```

---

## Wallet Recovery (Mnemonics)

| Wallet | 12-Word Mnemonic |
|--------|-----------------|
| **alice** | liberty crane surprise seminar robust again essence crush repair season lemon inside |
| **sofia** | embody also often wrong public sister heart nasty husband refuse sense until |
| **valleyvista** | lawsuit cabbage disease tell airport bleak soda author true physical net soup |
| **eva** | click core trust impulse eagle apart later company giant used bottom swamp |

**Import instructions:**
1. Create new wallet in Archon browser extension
2. Choose "Import from mnemonic"
3. Paste 12-word phrase
4. Set passphrase (must match the .env file)
5. Done — all IDs and credentials are restored

---

## Backup DIDs

Each wallet has an encrypted backup stored as a deterministic DID:

| Wallet | Backup DID |
|--------|-----------|
| alice | did:cid:bagaaierawfcsfqs7z4vgv5jykmpyihpxv6gnpvi34f4r3rbnds6g75xbwlga |
| sofia | did:cid:bagaaieramhotnhpzcubxflorcrae3bks7g7j3535nwzyxwubaovdjzhcfchq |
| valleyvista | did:cid:bagaaierawpigkd7mg5tfl7mea27cniwuvixfyxdrz6c2zl2keako7kyg34iq |
| eva | did:cid:bagaaiera65i3qm4v3ezfimcrco6qhundt7ulo7pwulzwqfwc6mdb6gp77rvq |

---

## Environment Variables (per .env)

| Wallet | ARCHON_PASSPHRASE | ARCHON_GATEKEEPER_URL |
|--------|-------------------|----------------------|
| alice | healinghands_2025 | https://archon.technology |
| sofia | patient_2025_secure | https://archon.technology |
| valleyvista | valleyvista_trust_2025 | https://archon.technology |
| eva | eva_cares_2025 | http://flaxlap.local:4222 |

---

## Key Design Decisions

1. **One wallet per persona** — Each agent has its own encrypted wallet.json. No shared state.
2. **.env isolation** — Each wallet folder contains its own environment config. `cd wallet && source .env` is the only step needed.
3. **Correct issuance chain** — Valley Vista Medical issues institutional VCs. Sofia issues her own consent VC.
4. **Self-contained in project** — All wallets live inside `materna-link-mcp/wallets/`, making the repo portable.
5. **Mnemonic .mnemonic files** — Recovery phrases saved with `chmod 600` for secure wallet portability.

---

## Next Steps

1. **Start MCP server:** `cd materna-link-mcp && node dist/index.js`
2. **Import wallets** on your browser: alice (for Dr. Alice), sofia (for Sofia)
3. **Say:** "Good morning Eva, I'm Dr. Alice Chen" to begin Phase 1
4. **Eva (me)** will verify your challenge response and run MCP checks

---

*Generated by GenitriX Agency — April 23, 2026*

#!/usr/bin/env npx tsx
/**
 * MaternaLink Demo — Caregiver Delegation Verification
 *
 * Demonstrates verifying that a caregiver (partner, doula, nurse, AI agent)
 * is authorized to access a patient's health data.
 *
 * Use case: A partner wants to view their pregnant partner's appointment
 * schedule. The AI agent must verify the delegation before sharing data.
 */

import { MaternaLinkIdentityService } from "../src/identity-service.js";

const service = new MaternaLinkIdentityService();

// ── Demo DIDs ────────────────────────────────────────────────────────────────
const PATIENT_DID = "did:cid:bafyreibz4examplepatientdid0000001";
const PARTNER_DID = "did:cid:bafyreiay3examplepartnerdid00002";
const NURSE_DID   = "did:cid:bafyreicx5examplenursedid00000003";

async function runDemo() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  MaternaLink MCP — Caregiver Delegation Verification");
  console.log("═══════════════════════════════════════════════════════\n");

  // 1. Partner requesting read access to pregnancy data
  console.log("💑 Step 1: Partner requests pregnancy:read access");
  console.log(`   Patient:  ${PATIENT_DID}`);
  console.log(`   Partner:  ${PARTNER_DID}`);
  console.log(`   Scope:    pregnancy:read\n`);

  const partnerResult = await service.verifyDelegation(
    PATIENT_DID,
    PARTNER_DID,
    "pregnancy:read"
  );
  console.log("   Result:", JSON.stringify(partnerResult, null, 2));
  console.log();

  // 2. Nurse requesting medical:read access
  console.log("👩‍⚕️ Step 2: Nurse requests medical:read access");
  console.log(`   Patient:  ${PATIENT_DID}`);
  console.log(`   Nurse:    ${NURSE_DID}`);
  console.log(`   Scope:    medical:read\n`);

  const nurseResult = await service.verifyDelegation(
    PATIENT_DID,
    NURSE_DID,
    "medical:read"
  );
  console.log("   Result:", JSON.stringify(nurseResult, null, 2));
  console.log();

  // 3. Unauthorized scope check — partner requesting medical:admin
  console.log("🚫 Step 3: Partner requests medical:admin (NOT authorized)");
  console.log(`   Patient:  ${PATIENT_DID}`);
  console.log(`   Partner:  ${PARTNER_DID}`);
  console.log(`   Scope:    medical:admin\n`);

  const unauthorizedResult = await service.verifyDelegation(
    PATIENT_DID,
    PARTNER_DID,
    "medical:admin"
  );
  console.log("   Result:", JSON.stringify(unauthorizedResult, null, 2));
  console.log();

  // 4. VRC-backed delegation
  console.log("📜 Step 4: VRC-backed delegation check");
  console.log("   With a Verifiable Relationship Credential:\n");

  const sampleVRC = JSON.stringify({
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "VerifiableRelationshipCredential"],
    issuer: PATIENT_DID,
    credentialSubject: {
      id: PARTNER_DID,
      relationship: "partner",
      scope: ["pregnancy:read", "pregnancy:write", "medical:read"]
    },
    proof: { type: "DataIntegrityProof", proofPurpose: "assertionMethod" }
  });

  const vrcResult = await service.verifyDelegation(
    PATIENT_DID,
    PARTNER_DID,
    "pregnancy:read",
    sampleVRC
  );
  console.log("   Result:", JSON.stringify(vrcResult, null, 2));

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ✅ Demo complete");
  console.log("═══════════════════════════════════════════════════════");
}

runDemo().catch(console.error);
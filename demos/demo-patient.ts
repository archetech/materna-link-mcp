#!/usr/bin/env npx tsx
/**
 * MaternaLink Demo — Patient Identity Verification
 *
 * Demonstrates verifying a patient DID with selective disclosure.
 * Use case: An OB reception AI agent needs to confirm a patient exists
 * and verify insurance eligibility without seeing full PII.
 */

import { MaternaLinkIdentityService } from "../src/identity-service.js";

const service = new MaternaLinkIdentityService();

// ── Demo Patient DIDs ───────────────────────────────────────────────────────
// These are example DIDs — replace with real ones from your Archon wallet
const EXAMPLE_PATIENT_DID = "did:cid:bafyreibz4examplepatientdid0000001";

async function runDemo() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  MaternaLink MCP — Patient Identity Verification");
  console.log("═══════════════════════════════════════════════════════\n");

  // 1. Basic identity verification
  console.log("📋 Step 1: Verify patient DID exists");
  console.log(`   DID: ${EXAMPLE_PATIENT_DID}\n`);
  
  const identityResult = await service.verifyAgentIdentity(EXAMPLE_PATIENT_DID);
  console.log("   Result:", JSON.stringify(identityResult, null, 2));
  console.log();

  // 2. Selective disclosure — insurance verification
  console.log("🏥 Step 2: Insurance verification (selective disclosure)");
  console.log("   Claim: insurance-verification");
  console.log("   Disclosed: ['insurance-active', 'provider-name']\n");

  const insuranceResult = await service.patientIdentityProof(
    EXAMPLE_PATIENT_DID,
    "insurance-verification",
    ["insurance-active", "provider-name"]
  );
  console.log("   Result:", JSON.stringify(insuranceResult, null, 2));
  console.log();

  // 3. Selective disclosure — age verification
  console.log("🎂 Step 3: Age verification (selective disclosure)");
  console.log("   Claim: age-verification");
  console.log("   Disclosed: ['age-over-18']\n");

  const ageResult = await service.patientIdentityProof(
    EXAMPLE_PATIENT_DID,
    "age-verification",
    ["age-over-18"]
  );
  console.log("   Result:", JSON.stringify(ageResult, null, 2));
  console.log();

  // 4. Pregnancy confirmation
  console.log("🤰 Step 4: Pregnancy confirmation (selective disclosure)");
  console.log("   Claim: pregnancy-confirmation");
  console.log("   Disclosed: ['pregnancy-status', 'due-date']\n");

  const pregnancyResult = await service.patientIdentityProof(
    EXAMPLE_PATIENT_DID,
    "pregnancy-confirmation",
    ["pregnancy-status", "due-date"]
  );
  console.log("   Result:", JSON.stringify(pregnancyResult, null, 2));

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ✅ Demo complete");
  console.log("═══════════════════════════════════════════════════════");
}

runDemo().catch(console.error);
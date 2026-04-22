#!/usr/bin/env npx tsx
/**
 * MaternaLink Demo — Medical Team Verification
 *
 * Demonstrates batch-verifying an entire OB medical team.
 * Use case: Before a delivery, the hospital AI coordinator verifies
 * all team members are legitimate Archon identities.
 *
 * This is the Multi-Agent Trust (MART) pattern for healthcare.
 */

import { MaternaLinkIdentityService } from "../src/identity-service.js";

const service = new MaternaLinkIdentityService();

// ── Demo Team DIDs ───────────────────────────────────────────────────────────
const TEAM = [
  { role: "OB/GYN",            did: "did:cid:bafyreibz4exampleobgyn000001" },
  { role: "Nurse Practitioner", did: "did:cid:bafyreicx5examplernp0000002" },
  { role: "Anesthesiologist",  did: "did:cid:bafyreidy6exampleanes0000003" },
  { role: "AI Coordinator",    did: "did:cid:bafyreiez7exampleaico0000004" },
];

async function runDemo() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  MaternaLink MCP — Medical Team Verification");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log("🏥 Verifying delivery room team:\n");
  for (const member of TEAM) {
    console.log(`   ${member.role}: ${member.did}`);
  }
  console.log();

  // Batch verify all team members
  console.log("⏳ Running batch verification...\n");

  const results = await Promise.all(
    TEAM.map(async (member) => {
      const r = await service.verifyAgentIdentity(member.did);
      return {
        role: member.role,
        did: member.did,
        verified: r.verified,
        error: r.error
      };
    })
  );

  const verifiedCount = results.filter(r => r.verified).length;

  console.log("📊 Team Trust Report:");
  console.log("┌──────────────────────┬──────────┬─────────┐");
  console.log("│ Role                 │ Verified │ Error   │");
  console.log("├──────────────────────┼──────────┼─────────┤");
  
  for (const r of results) {
    const status = r.verified ? "✓ YES" : "✗ NO";
    const error = r.error || "—";
    console.log(`│ ${r.role.padEnd(20)} │ ${status.padEnd(8)} │ ${error.padEnd(7)} │`);
  }
  
  console.log("├──────────────────────┼──────────┼─────────┤");
  console.log(`│ Trust Score           │ ${verifiedCount}/${TEAM.length}       │         │`);
  console.log("└──────────────────────┴──────────┴─────────┘");
  console.log();

  if (verifiedCount === TEAM.length) {
    console.log("✅ All team members verified. Proceeding with delivery protocol.");
  } else {
    console.log(`⚠️  ${TEAM.length - verifiedCount} team member(s) could not be verified.`);
    console.log("   Review unverified identities before proceeding.");
  }

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ✅ Demo complete");
  console.log("═══════════════════════════════════════════════════════");
}

runDemo().catch(console.error);
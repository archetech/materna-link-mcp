#!/usr/bin/env node
/**
 * MaternaLink MCP — Healthcare Identity Verification Server (v1.0)
 *
 * Provides patient identity verification, caregiver delegation, medical team
 * verification, and selective-disclosure proofs for maternal health AI agents.
 *
 * Uses gatekeeper REST API (no wallet, no passphrase, no private keys).
 * Stateless — resolves and verifies DIDs from any network, any host.
 *
 * Built on: Archon Protocol (https://archon.technology)
 *
 * Usage:  node dist/index.js
 * Env:    GATEKEEPER_URL (default: https://archon.technology)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  MaternaLinkIdentityService,
  type VerificationResult,
  type CredentialVerification,
  type DelegationVerification,
  type ChallengeResult,
  type DIDDocument
} from "./identity-service.js";

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const NAME = "maternalink-mcp";
const VERSION = "1.0.0";
const GATEKEEPER_URL = process.env.GATEKEEPER_URL || 'https://archon.technology';

// ── Identity Service Instance ─────────────────────────────────────────────────
const identityService = new MaternaLinkIdentityService();

// ── Tool Schema Definitions ───────────────────────────────────────────────────
const tools: Tool[] = [

  // ── Identity Verification ──
  {
    name: "verify-identity",
    description:
      "Verify an Archon DID resolution. Returns the full DID Document if the DID is " +
      "resolvable via the gatekeeper. No private keys needed — pure stateless resolution.",
    inputSchema: {
      type: "object",
      properties: {
        did: { type: "string", description: "DID to verify (e.g. did:cid:b5...)." }
      },
      required: ["did"]
    }
  },
  {
    name: "verify-credential",
    description:
      "Verify a Verifiable Credential (VC). Accepts VC JSON. Validates structural " +
      "integrity: checks presence of proof, correct type, and that the issuer DID resolves. " +
      "NOTE: Full cryptographic signature verification requires a wallet.",
    inputSchema: {
      type: "object",
      properties: {
        credential: { type: "string", description: "The VC as a JSON string." }
      },
      required: ["credential"]
    }
  },
  {
    name: "verify-delegation",
    description:
      "Verify whether one DID is authorized to act on behalf of another (delegation). " +
      "Useful for caregiver authorization: verify a nurse or partner agent can access " +
      "patient data. If a VRC is provided, validates that its scope covers the requested action.",
    inputSchema: {
      type: "object",
      properties: {
        delegatorDid: { type: "string", description: "Patient's DID" },
        delegateDid:  { type: "string", description: "Caregiver's DID" },
        scope:        { type: "string", description: "Requested action, e.g. medical:read" },
        vrc:          { type: "string", description: "(optional) VRC credential as JSON" }
      },
      required: ["delegatorDid", "delegateDid", "scope"]
    }
  },
  {
    name: "create-challenge",
    description:
      "Create a one-time identity challenge (nonce) for a DID. The caller must send " +
      "this nonce back, signed, to prove ownership (verify-signature).",
    inputSchema: {
      type: "object",
      properties: {
        did: { type: "string" }
      },
      required: ["did"]
    }
  },
  {
    name: "verify-signature",
    description:
      "Verify a signature over a nonce (from create-challenge). Checks that the DID " +
      "has matching public keys in its DID Document. NOTE: Full ECDSA verification " +
      "requires wallet access to the Archon cipher module.",
    inputSchema: {
      type: "object",
      properties: {
        did:       { type: "string" },
        nonce:     { type: "string" },
        signature: { type: "string" }
      },
      required: ["did", "nonce", "signature"]
    }
  },

  // ── Maternal Health Tools ──
  {
    name: "verify-medical-team",
    description:
      "Verify that every member of a medical team (array of DIDs) is a legitimate Archon identity. " +
      "Useful for multi-agent workflows: OB, nurse, anesthesiologist, AI coordinator — all verified. " +
      "Returns per-member status and overall team trust score.",
    inputSchema: {
      type: "object",
      properties: {
        team: {
          type: "array",
          items: { type: "string" },
          description: "List of provider or staff DIDs"
        }
      },
      required: ["team"]
    }
  },
  {
    name: "verify-patient-identity",
    description:
      "Verify a patient DID and generate a selective-disclosure identity proof. " +
      "Ideal for maternal health: prove pregnancy status, insurance eligibility, or age " +
      "without exposing full PII. Extracts service endpoints (vault, insurance) from DID Document.",
    inputSchema: {
      type: "object",
      properties: {
        patientDid:  { type: "string" },
        claimType:   { type: "string", description: "e.g. insurance-verification, age-verification, pregnancy-confirmation" },
        discloseFields: {
          type: "array",
          items: { type: "string" },
          description: "Fields to expose in the proof (e.g. ['age', 'blood-type', 'due-date'])"
        }
      },
      required: ["patientDid"]
    }
  },
  {
    name: "verify-caregiver",
    description:
      "Verify a caregiver's authorization to access a patient's health data. " +
      "Primary MaternaLink use case: partner or doula accessing pregnancy records, " +
      "nurse reading charts, AI agent drafting pre-visit reports. " +
      "Checks that both DIDs resolve and that the delegation scope includes the requested action.",
    inputSchema: {
      type: "object",
      properties: {
        patientDid:   { type: "string", description: "Patient's DID" },
        caregiverDid: { type: "string", description: "Caregiver/partner/nurse DID" },
        scope:        { type: "string", description: "e.g. medical:read, medical:admin, pregnancy:read" },
        vrc:          { type: "string", description: "(optional) VRC proving delegation" }
      },
      required: ["patientDid", "caregiverDid", "scope"]
    }
  }
];

// ── Tool Handler ────────────────────────────────────────────────────────────
async function handleToolCall(name: string, args: any): Promise<{ content: { type: string; text: string }[] }> {
  let result: any;
  let duration = 0;

  try {
    switch (name) {
      case "verify-identity": {
        const t0 = Date.now();
        result = await identityService.verifyAgentIdentity(args.did);
        duration = Date.now() - t0;
        break;
      }
      case "verify-credential": {
        const t0 = Date.now();
        result = await identityService.verifyCredential(args.credential);
        duration = Date.now() - t0;
        break;
      }
      case "verify-delegation": {
        const t0 = Date.now();
        result = await identityService.verifyDelegation(
          args.delegatorDid,
          args.delegateDid,
          args.scope,
          args.vrc
        );
        duration = Date.now() - t0;
        break;
      }
      case "create-challenge": {
        const t0 = Date.now();
        result = await identityService.createChallenge(args.did);
        duration = Date.now() - t0;
        break;
      }
      case "verify-signature": {
        const t0 = Date.now();
        result = await identityService.verifySignature(args.did, args.nonce, args.signature);
        duration = Date.now() - t0;
        break;
      }
      case "verify-medical-team": {
        const t0 = Date.now();
        const team = args.team || [];
        const results = await Promise.all(
          team.map(async (did: string) => {
            const r = await identityService.verifyAgentIdentity(did);
            return { did, status: r.verified ? "✓ verified" : `✗ ${r.error}` };
          })
        );
        const verifiedCount = results.filter((r: any) => r.status.startsWith("✓")).length;
        result = {
          teamSize: team.length,
          verified: verifiedCount,
          members: results,
          allVerified: verifiedCount === team.length,
          trustScore: team.length > 0 ? `${verifiedCount}/${team.length}` : "0/0"
        };
        duration = Date.now() - t0;
        break;
      }
      case "verify-patient-identity": {
        const t0 = Date.now();
        result = await identityService.patientIdentityProof(
          args.patientDid,
          args.claimType || "general-identity",
          args.discloseFields
        );
        duration = Date.now() - t0;
        break;
      }
      case "verify-caregiver": {
        const t0 = Date.now();
        result = await identityService.verifyDelegation(
          args.patientDid,
          args.caregiverDid,
          args.scope,
          args.vrc
        );
        duration = Date.now() - t0;
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    result = { error: err.message, context: name };
  }

  const payload = {
    server: "maternalink-mcp",
    tool: name,
    duration,
    gatekeeper: GATEKEEPER_URL,
    ...result
  };
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

// ── Server Bootstrap ──────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const server = new Server({ name: NAME, version: VERSION }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request.params.name, request.params.arguments ?? {});
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${NAME} v${VERSION} connected via stdio (gatekeeper: ${GATEKEEPER_URL})`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
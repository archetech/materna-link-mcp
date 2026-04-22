#!/usr/bin/env node
/**
 * MaternaLink MCP — HTTP/SSE and stdio endpoints (dual transport)
 *
 * Healthcare identity verification server for AI agents.
 * Uses stateless Gatekeeper REST API — no wallet, no passphrase.
 *
 * Built on: Archon Protocol (https://archon.technology)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { identityService } from "./identity-service.js";

const GATEKEEPER_URL = process.env.GATEKEEPER_URL || 'https://archon.technology';
const PORT = process.env.PORT || 3008;

const app = express();
const transports: Map<string, SSEServerTransport> = new Map();

// ── Tool Definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "verify-identity",
    description: "Resolve a DID via the Archon Gatekeeper. Works for patients, providers, caregivers, and AI agents.",
    inputSchema: {
      type: "object",
      properties: { did: { type: "string" } },
      required: ["did"]
    }
  },
  {
    name: "verify-credential",
    description: "Verify a VC structurally. Supports insurance cards, pregnancy confirmations, prescriptions.",
    inputSchema: {
      type: "object",
      properties: { credential: { type: "string" } },
      required: ["credential"]
    }
  },
  {
    name: "verify-delegation",
    description: "Verify delegation between DIDs. MaternaLink use: patient authorizes caregiver or AI agent.",
    inputSchema: {
      type: "object",
      properties: {
        delegatorDid: { type: "string" },
        delegateDid: { type: "string" },
        scope: { type: "string" },
        vrc: { type: "string" }
      },
      required: ["delegatorDid", "delegateDid", "scope"]
    }
  },
  {
    name: "create-challenge",
    description: "Generate a nonce challenge for a DID. Prove identity before sensitive operations.",
    inputSchema: {
      type: "object",
      properties: { did: { type: "string" } },
      required: ["did"]
    }
  },
  {
    name: "verify-signature",
    description: "Verify a signature structurally. Full ECDSA requires wallet.",
    inputSchema: {
      type: "object",
      properties: {
        did: { type: "string" },
        nonce: { type: "string" },
        signature: { type: "string" }
      },
      required: ["did", "nonce", "signature"]
    }
  },
  {
    name: "verify-medical-team",
    description: "Batch-verify a team of provider DIDs. OB, nurse, anesthesiologist, AI coordinator — all verified.",
    inputSchema: {
      type: "object",
      properties: {
        team: { type: "array", items: { type: "string" } }
      },
      required: ["team"]
    }
  },
  {
    name: "verify-patient-identity",
    description: "Verify patient DID with selective disclosure. Prove pregnancy/insurance/age without full PII.",
    inputSchema: {
      type: "object",
      properties: {
        patientDid: { type: "string" },
        claimType: { type: "string" },
        discloseFields: { type: "array", items: { type: "string" } }
      },
      required: ["patientDid"]
    }
  },
  {
    name: "verify-caregiver",
    description: "Verify caregiver authorization to access patient data. Partner, doula, nurse, AI agent.",
    inputSchema: {
      type: "object",
      properties: {
        patientDid: { type: "string" },
        caregiverDid: { type: "string" },
        scope: { type: "string" },
        vrc: { type: "string" }
      },
      required: ["patientDid", "caregiverDid", "scope"]
    }
  }
];

// ── SSE Server ──────────────────────────────────────────────────────────────
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/message", res);
  transports.set(transport.sessionId, transport);
  
  const server = new Server(
    { name: "maternalink-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await handleToolCall(request.params.name, request.params.arguments ?? {});
    return result;
  });

  res.on("close", () => { transports.delete(transport.sessionId); });
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  const sid = req.query.sessionId as string;
  const transport = transports.get(sid);
  if (transport) { await transport.handlePostMessage(req, res); }
  else { res.status(404).send("Session not found"); }
});

// ── Tool Handler ────────────────────────────────────────────────────────────
async function handleToolCall(name: string, args: any) {
  let result: any;
  let duration = 0;
  const t0 = Date.now();

  try {
    switch (name) {
      case "verify-identity":
        result = await identityService.verifyAgentIdentity(args.did);
        break;
      case "verify-credential":
        result = await identityService.verifyCredential(args.credential);
        break;
      case "verify-delegation":
        result = await identityService.verifyDelegation(args.delegatorDid, args.delegateDid, args.scope, args.vrc);
        break;
      case "create-challenge":
        result = await identityService.createChallenge(args.did);
        break;
      case "verify-signature":
        result = await identityService.verifySignature(args.did, args.nonce, args.signature);
        break;
      case "verify-medical-team": {
        const team = args.team || [];
        const results = await Promise.all(team.map(async (did: string) => {
          const r = await identityService.verifyAgentIdentity(did);
          return { did, status: r.verified ? "✓ verified" : `✗ ${r.error}` };
        }));
        const verifiedCount = results.filter((r: any) => r.status.startsWith("✓")).length;
        result = {
          teamSize: team.length,
          verified: verifiedCount,
          members: results,
          allVerified: verifiedCount === team.length,
          trustScore: `${verifiedCount}/${team.length}`
        };
        break;
      }
      case "verify-patient-identity":
        result = await identityService.patientIdentityProof(args.patientDid, args.claimType || "general-identity", args.discloseFields);
        break;
      case "verify-caregiver":
        result = await identityService.verifyDelegation(args.patientDid, args.caregiverDid, args.scope, args.vrc);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    result = { error: err.message };
  }

  duration = Date.now() - t0;
  const payload = { server: "maternalink-mcp", tool: name, duration, gatekeeper: GATEKEEPER_URL, ...result };
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`MaternaLink MCP — HTTP/SSE endpoint`);
  console.log(`  Base:       http://localhost:${PORT}/`);
  console.log(`  SSE:        http://localhost:${PORT}/sse`);
  console.log(`  Message:    http://localhost:${PORT}/message?sessionId=<ID>`);
  console.log(`  Gatekeeper: ${GATEKEEPER_URL}`);
  console.log(`  Mode:       stateless (no wallet)`);
  console.log(`  Vertical:   Maternal Health`);
});
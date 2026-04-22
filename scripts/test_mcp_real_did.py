#!/usr/bin/env python3
"""
MaternaLink MCP — Real DID Test Script

Tests the local MCP server with REAL DIDs from the Archon network.
Connects via stdio transport, calls verify-identity, verify-patient-identity,
and verify-credential with actual DIDs.

Usage:
    python3 scripts/test_mcp_real_did.py

Env:
    GATEKEEPER_URL  (default: https://archon.technology)
"""

import json
import subprocess
import sys
import urllib.request
import ssl

# ── Config ──────────────────────────────────────────────────────────────────
SERVER_CMD = ["node", "dist/index.js"]
GATEKEEPER_URL = "https://archon.technology"
REAL_DID = "did:cid:bagaaieradmbzmds74vq4yb6czxrblupatp4n54fopqbp3ezbzuuqxebkztfa"

# ── Helpers ──────────────────────────────────────────────────────────────────
def ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def gatekeeper_get(path):
    url = f"{GATEKEEPER_URL}{path}"
    resp = urllib.request.urlopen(url, timeout=15, context=ssl_ctx())
    return json.loads(resp.read().decode())

def send_request(proc, req):
    payload = json.dumps(req) + "\n"
    proc.stdin.write(payload.encode())
    proc.stdin.flush()

    # Read until we get a JSON response line
    line = proc.stdout.readline().decode().strip()
    while line:
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            line = proc.stdout.readline().decode().strip()
    return None

# ── Main ────────────────────────────────────────────────────────────────────
def main():
    print("═══════════════════════════════════════════════════════")
    print("  MaternaLink MCP — Live DID Test")
    print("═══════════════════════════════════════════════════════\n")

    # Step 1: Direct gatekeeper check
    print("[1] Direct gatekeeper resolution")
    try:
        doc = gatekeeper_get(f"/api/v1/did/{urllib.parse.quote(REAL_DID, safe='')}")
        did_doc = doc.get("didDocument", {})
        print(f"   ✅ DID: {did_doc.get('id')}")
        print(f"   ✅ verificationMethods: {len(did_doc.get('verificationMethod', []))}")
        print(f"   ✅ services: {len(did_doc.get('service', []))}")
    except Exception as e:
        print(f"   ✗ Gatekeeper error: {e}")
        return

    # Step 2: Start MCP server and call tools
    print("\n[2] Starting MCP server via stdio...")
    proc = subprocess.Popen(
        SERVER_CMD,
        cwd=".",
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Wait for startup line on stderr
    startup = proc.stderr.readline().decode().strip()
    print(f"   Server: {startup}\n")

    # Step 3: Initialize
    print("[3] MCP Initialize")
    req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "clientInfo": {"name": "test-maternalink", "version": "1.0"},
            "capabilities": {}
        }
    }
    resp = send_request(proc, req)
    print(f"   Result: {resp.get('result', {}).get('serverInfo', {}).get('name') if resp else 'N/A'}\n")

    # Step 4: List tools
    print("[4] List Tools")
    req = {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}
    resp = send_request(proc, req)
    tools = resp.get("result", {}).get("tools", []) if resp else []
    print(f"   Found {len(tools)} tools:")
    for t in tools:
        print(f"     • {t['name']}")
    print()

    # Step 5: Call verify-identity with REAL DID
    print("[5] CALL: verify-identity")
    print(f"   DID: {REAL_DID}")
    req = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "verify-identity",
            "arguments": {"did": REAL_DID}
        }
    }
    resp = send_request(proc, req)
    content = resp.get("result", {}).get("content", [{}])[0].get("text", "{}")
    result = json.loads(content)
    verified = result.get("verified", False)
    duration = result.get("duration", 0)
    print(f"   Result: {'✅ verified' if verified else '✗ not verified'}")
    print(f"   Duration: {duration}ms")
    print(f"   Gatekeeper: {result.get('gatekeeper')}")
    if result.get("document"):
        print(f"   DID Document ID: {result['document'].get('id', 'N/A')}")
    print()

    # Step 6: Call verify-patient-identity with REAL DID
    print("[6] CALL: verify-patient-identity")
    print(f"   DID: {REAL_DID}")
    req = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "verify-patient-identity",
            "arguments": {
                "patientDid": REAL_DID,
                "claimType": "general-identity",
                "discloseFields": ["identity-verified"]
            }
        }
    }
    resp = send_request(proc, req)
    content = resp.get("result", {}).get("content", [{}])[0].get("text", "{}")
    result = json.loads(content)
    print(f"   Result: {'✅ verified' if result.get('verified') else '✗ not verified'}")
    print(f"   Claim: {result.get('claimType')}")
    print(f"   Timestamp: {result.get('timestamp')}")
    services = result.get("services", [])
    if services:
        print(f"   Services: {len(services)}")
        for s in services[:3]:
            print(f"     • {s['type']} -> {s['id'][:40]}...")
    else:
        print("   Services: 0")
    print()

    # Step 7: Call verify-credential with a sample VC (structural check)
    print("[7] CALL: verify-credential")
    sample_vc = json.dumps({
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "type": ["VerifiableCredential", "InsuranceCard"],
        "issuer": {"id": REAL_DID, "type": "Profile"},
        "credentialSubject": {
            "id": REAL_DID,
            "coverageType": "maternal-health",
            "groupNumber": "GRP-12345"
        },
        "proof": {
            "type": "DataIntegrityProof",
            "proofPurpose": "assertionMethod"
        }
    })
    req = {
        "jsonrpc": "2.0",
        "id": 5,
        "method": "tools/call",
        "params": {
            "name": "verify-credential",
            "arguments": {"credential": sample_vc}
        }
    }
    resp = send_request(proc, req)
    content = resp.get("result", {}).get("content", [{}])[0].get("text", "{}") if resp else "{}"
    result = json.loads(content)
    print(f"   Result: {'✅ valid' if result.get('valid') else '✗ invalid'}")
    if result.get('error'):
        print(f"   Error: {result['error']}")
    else:
        print(f"   Issuer: {result.get('issuer', 'N/A')}")
        print(f"   Schema: {result.get('schema', 'N/A')}")
        print(f"   Subject: {result.get('subject', {}).get('id', 'N/A')}")
    print()

    # Step 8: Call verify-caregiver (delegation check)
    print("[8] CALL: verify-caregiver")
    req = {
        "jsonrpc": "2.0",
        "id": 6,
        "method": "tools/call",
        "params": {
            "name": "verify-caregiver",
            "arguments": {
                "patientDid": REAL_DID,
                "caregiverDid": REAL_DID,
                "scope": "pregnancy:read",
                "vrc": None
            }
        }
    }
    resp = send_request(proc, req)
    content = resp.get("result", {}).get("content", [{}])[0].get("text", "{}") if resp else "{}"
    result = json.loads(content)
    print(f"   Result: {'✅ authorized' if result.get('authorized') else '✗ not authorized'}")
    print(f"   Requested scope: {result.get('requestedScope')}")
    print()

    # Cleanup
    print("[9] Shutting down MCP server...")
    proc.stdin.close()
    proc.terminate()
    print("   ✅ Done\n")

    print("═══════════════════════════════════════════════════════")
    print("  Test Complete")
    print("═══════════════════════════════════════════════════════")


if __name__ == "__main__":
    import urllib.parse
    main()

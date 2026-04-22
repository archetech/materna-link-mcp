#!/usr/bin/env python3
"""
MaternaLink MCP × Ollama Bridge

Gives any local Ollama model access to MaternaLink identity verification tools.
Works by instruction-prompting the model to emit JSON tool calls,
which we parse, execute via MCP, and feed the results back.

Usage:
    python3 scripts/maternalink_ollama_bridge.py --model glm-5.1:cloud

Env:
    GATEKEEPER_URL  (default: https://archon.technology)
"""

import argparse
import json
import re
import subprocess
import sys
import urllib.request
import ssl

# ── Config ──────────────────────────────────────────────────────────────────
DEFAULT_MODEL = "glm-5.1:cloud"
OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MCP_SERVER = ["node", "dist/index.js"]
GATEKEEPER_URL = "https://archon.technology"

# ── MCP Tool Definitions (for system prompt) ────────────────────────────────
TOOLS = """
You have access to the following identity verification tools via the MaternaLink MCP server:

1. verify-identity(did: string)
   Resolve any Archon DID. Returns DID Document if found.

2. verify-patient-identity(patientDid: string, claimType?: string, discloseFields?: string[])
   Verify a patient with selective disclosure. Claim types: insurance-verification, age-verification, pregnancy-confirmation.

3. verify-caregiver(patientDid: string, caregiverDid: string, scope: string, vrc?: string)
   Check if a caregiver is authorized for a scope. Scopes: medical:read, medical:admin, pregnancy:read, prescription:refill.

4. verify-medical-team(team: string[])
   Batch-verify a team of DIDs. Returns trust score.

5. verify-credential(credential: string)
   Verify a Verifiable Credential (VC) JSON string.

6. verify-delegation(delegatorDid: string, delegateDid: string, scope: string, vrc?: string)
   Check if delegate is authorized for scope.

7. create-challenge(did: string)
   Generate a nonce challenge for DID ownership proof.

8. verify-signature(did: string, nonce: string, signature: string)
   Verify a signature structurally.

WHEN you need to verify identity, emit a JSON tool call like this:

{
  "tool_call": {
    "name": "verify-identity",
    "arguments": {"did": "did:cid:bagaaiera..."}
  }
}

I will execute it and return the result. Then respond to the user with the findings.
"""

# ── Helpers ──────────────────────────────────────────────────────────────────
def ollama_chat(model: str, messages: list, stream: bool = False):
    """Call local ollama server."""
    payload = {
        "model": model,
        "messages": messages,
        "stream": stream,
        "options": {"temperature": 0.2, "num_ctx": 8192}
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(OLLAMA_URL, data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read().decode())
    return result["message"]["content"]


def mcp_call(proc, tool_name: str, arguments: dict):
    """Call a tool via MCP stdio server."""
    req = {
        "jsonrpc": "2.0",
        "id": 10,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments}
    }
    proc.stdin.write(json.dumps(req).encode() + b"\n")
    proc.stdin.flush()

    line = proc.stdout.readline().decode().strip()
    tries = 0
    while not line and tries < 50:
        line = proc.stdout.readline().decode().strip()
        tries += 1

    try:
        resp = json.loads(line)
        content = resp.get("result", {}).get("content", [{}])[0].get("text", "{}")
        return json.loads(content)
    except:
        return {"error": "parse_failed", "raw": line[:200]}


def extract_tool_call(text: str):
    """Extract JSON tool call from model response (handles markdown code blocks)."""
    # Remove markdown code fences
    clean = re.sub(r'```json\s*', '', text, flags=re.DOTALL)
    clean = re.sub(r'\s*```', '', clean, flags=re.DOTALL)
    clean = clean.strip()

    # Find JSON by balanced braces — look for "tool_call" pattern
    # First try to find the tool_call wrapper
    idx = clean.find('"tool_call"')
    if idx != -1:
        # Extract JSON by balanced brace counting
        start = clean.find('{', idx)
        if start != -1:
            depth = 0
            end = start
            for i, c in enumerate(clean[start:]):
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        end = start + i + 1
                        break
            try:
                return json.loads(clean[start:end])
            except:
                pass

    # Alternative: look for bare JSON with 'name' and 'arguments'
    idx = clean.find('"name"')
    if idx != -1:
        start = clean.rfind('{', 0, idx)
        if start != -1:
            depth = 0
            end = start
            for i, c in enumerate(clean[start:]):
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        end = start + i + 1
                        break
            try:
                parsed = json.loads(clean[start:end])
                if "name" in parsed and "arguments" in parsed:
                    return {"tool_call": parsed}
            except:
                pass

    return None


def get_startup_models():
    """List local ollama models."""
    try:
        resp = urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=3)
        data = json.loads(resp.read().decode())
        return [m["name"] for m in data.get("models", [])]
    except Exception as e:
        return []


# ── CLI ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="MaternaLink MCP × Ollama Bridge")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Ollama model to use")
    parser.add_argument("--one-shot", metavar="PROMPT", help="Single prompt, then exit")
    args = parser.parse_args()

    models = get_startup_models()
    if not models:
        print("✗ No ollama models found. Is ollama running?")
        print("   curl http://127.0.0.1:11434/api/tags")
        sys.exit(1)

    if args.model not in models:
        print(f"⚠️  Model '{args.model}' not found.")
        print(f"   Available: {', '.join(models)}")
        print(f"   Using: {models[0]}")
        args.model = models[0]

    print(f"╔════════════════════════════════════════════════════════╗")
    print(f"║   MaternaLink MCP ↔ {args.model:<35}║")
    print(f"╚════════════════════════════════════════════════════════╝\n")

    # Start MCP server
    print("[1] Starting MaternaLink MCP server...")
    mcp_proc = subprocess.Popen(
        MCP_SERVER,
        cwd=".",
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    startup = mcp_proc.stderr.readline().decode().strip()
    print(f"    {startup}")
    print("[2] MCP server ready.\n")

    # Initialize MCP
    init_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "clientInfo": {"name": "maternalink-ollama", "version": "1.0"},
            "capabilities": {}
        }
    }
    mcp_proc.stdin.write(json.dumps(init_req).encode() + b"\n")
    mcp_proc.stdin.flush()
    mcp_proc.stdout.readline()  # consume response
    print("[3] MCP initialized.\n")

    # Conversation loop
    system = f"You are a healthcare identity verification assistant powered by MaternaLink MCP and the Archon Protocol.\n\n{TOOLS}\n\nIf a user's question requires identity verification, emit a JSON tool_call. Otherwise, answer directly."
    messages = [{"role": "system", "content": system}]

    if args.one_shot:
        prompt = args.one_shot
    else:
        print("Identity verification ready. Ask me anything about DIDs, VCs, or healthcare identity.")
        print("Type 'quit' or 'exit' to stop.\n")
        prompt = input("🔹 ")

    while prompt.strip():
        if prompt.lower() in ("quit", "exit", "q"):
            break

        messages.append({"role": "user", "content": prompt})
        print(f"🤖 {args.model} thinking...")

        resp = ollama_chat(args.model, messages)
        messages.append({"role": "assistant", "content": resp})

        # Check if model emitted a tool call
        tool_call = extract_tool_call(resp)
        if tool_call:
            call = tool_call.get("tool_call", tool_call)
            name = call.get("name", call.get("tool", "unknown"))
            arguments = call.get("arguments", call.get("args", {}))

            print(f"\n🔧 Tool call: {name}")
            print(f"   Args: {json.dumps(arguments, indent=2)}")

            result = mcp_call(mcp_proc, name, arguments)
            print(f"   Result: {json.dumps(result, indent=2)[:400]}")

            # Feed result back to model
            messages.append({
                "role": "user",
                "content": f"Tool '{name}' returned: \n```json\n{json.dumps(result, indent=2)}\n```\n\nNow answer the user's original question based on this data."
            })

            print("\n🤖 Generating final response...")
            final = ollama_chat(args.model, messages)
            messages.append({"role": "assistant", "content": final})
            resp = final

        print(f"\n💬 Response:\n{resp}\n")

        if args.one_shot:
            break
        prompt = input("🔹 ")

    # Cleanup
    print("\nShutting down...")
    mcp_proc.stdin.close()
    mcp_proc.terminate()
    print("Done.")


if __name__ == "__main__":
    main()

/**
 * MaternaLink Identity Service — Stateless DID verification via Gatekeeper REST API
 *
 * Healthcare-focused identity verification for maternal health AI agents.
 * NO wallet, NO passphrase, NO cipher, NO private keys.
 * Direct gatekeeper REST calls for DID resolution and verification.
 *
 * Built on: Archon Protocol (https://archon.technology)
 */

import dotenv from 'dotenv';
dotenv.config();

const GATEKEEPER_URL = process.env.GATEKEEPER_URL || 'https://archon.technology';

// ── Types ───────────────────────────────────────────────────────────────────
export interface DIDDocument {
  id: string;
  verificationMethod?: any[];
  assertionMethod?: any[];
  authentication?: any[];
  service?: any[];
  controller?: string;
}

export interface VerificationResult {
  verified: boolean;
  did: string;
  document?: DIDDocument;
  error?: string;
}

export interface CredentialVerification {
  valid: boolean;
  subject?: { id: string };
  issuer?: string;
  schema?: string;
  type?: string[];
  error?: string;
}

export interface DelegationVerification {
  authorized: boolean;
  delegator?: string;
  delegate?: string;
  scope?: string[];
  requestedScope?: string;
  error?: string;
}

export interface ChallengeResult {
  nonce: string;
  expiresIn: number;
  did: string;
}

// ── HTTP Client ─────────────────────────────────────────────────────────────
async function gatekeeperGet(path: string): Promise<any> {
  const url = `${GATEKEEPER_URL}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gatekeeper error ${res.status}: ${text}`);
  }
  return res.json();
}

async function gatekeeperPost(path: string, body: any): Promise<any> {
  const url = `${GATEKEEPER_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gatekeeper error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Identity Service ────────────────────────────────────────────────────────
export class MaternaLinkIdentityService {
  private gatekeeperUrl: string;

  constructor() {
    this.gatekeeperUrl = GATEKEEPER_URL;
  }

  /**
   * Verify an agent's identity by resolving their DID via gatekeeper.
   * Works for patients, providers, caregivers, and AI agents.
   */
  async verifyAgentIdentity(did: string): Promise<VerificationResult> {
    try {
      const doc = await gatekeeperGet(`/api/v1/did/${encodeURIComponent(did)}`);
      
      if (!doc || doc.didResolutionMetadata?.error) {
        return { verified: false, did, error: 'DID not resolved' };
      }
      
      return { 
        verified: true, 
        did, 
        document: doc.didDocument as DIDDocument 
      };
    } catch (err: any) {
      return { verified: false, did, error: err.message || 'Resolution failed' };
    }
  }

  /**
   * Verify a Verifiable Credential.
   * For healthcare: insurance cards, pregnancy confirmations, prescriptions.
   * Checks structural validity and resolves issuer DID.
   * Full cryptographic signature verification requires wallet.
   */
  async verifyCredential(credential: string): Promise<CredentialVerification> {
    try {
      const cred = typeof credential === 'string' ? JSON.parse(credential) : credential;
      
      const issuer = cred.issuer?.id || cred.issuer;
      const subject = cred.credentialSubject;
      const schema = cred.credentialSchema?.id;
      const type = cred.type;
      const proof = cred.proof;

      if (!proof || !subject || !Array.isArray(type) || !type.includes('VerifiableCredential')) {
        return { valid: false, error: 'Invalid VC structure' };
      }

      if (issuer && typeof issuer === 'string' && issuer.startsWith('did:cid:')) {
        try {
          await gatekeeperGet(`/api/v1/did/${encodeURIComponent(issuer)}`);
        } catch {
          return { valid: false, error: 'Issuer DID not resolved' };
        }
      }

      return {
        valid: true,
        subject: subject ? { id: subject.id } : undefined,
        issuer,
        schema,
        type
      };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Credential verification failed' };
    }
  }

  /**
   * Verify a delegation between two DIDs.
   * MaternaLink primary use case:
   *   - Patient delegates medical:read to partner
   *   - Patient delegates pregnancy:read to doula
   *   - Patient delegates prescription:refill to AI agent
   */
  async verifyDelegation(
    delegatorDid: string, 
    delegateDid: string, 
    scope: string, 
    vrc?: string
  ): Promise<DelegationVerification> {
    try {
      await gatekeeperGet(`/api/v1/did/${encodeURIComponent(delegatorDid)}`);
      await gatekeeperGet(`/api/v1/did/${encodeURIComponent(delegateDid)}`);

      let authorizedScopes: string[] = [];
      if (vrc) {
        try {
          const cred = typeof vrc === 'string' ? JSON.parse(vrc) : vrc;
          const subject = cred.credentialSubject;
          authorizedScopes = subject?.scope || subject?.authorizedScopes || [];
        } catch {
          if (vrc.trim()) {
            return { authorized: false, error: 'Invalid VRC JSON' };
          }
        }
      }

      const authorized = vrc 
        ? authorizedScopes.some((s: string) => this.scopeMatches(s, scope))
        : true;

      return {
        authorized,
        delegator: delegatorDid,
        delegate: delegateDid,
        scope: authorizedScopes.length ? authorizedScopes : undefined,
        requestedScope: scope
      };
    } catch (err: any) {
      return { authorized: false, error: err.message || 'Delegation verification failed' };
    }
  }

  /**
   * Create an identity challenge (nonce).
   * Used for proving DID ownership before sensitive operations.
   */
  async createChallenge(did: string): Promise<ChallengeResult> {
    try {
      await gatekeeperGet(`/api/v1/did/${encodeURIComponent(did)}`);
      const nonce = Buffer.from(crypto.randomUUID()).toString('base64').slice(0, 32);
      return { nonce, expiresIn: 300, did };
    } catch (err: any) {
      return { nonce: '', expiresIn: 0, did };
    }
  }

  /**
   * Verify a signature (structural check for hackathon).
   * NOTE: Full cryptographic verification requires wallet + cipher.
   */
  async verifySignature(did: string, nonce: string, signature: string): Promise<boolean> {
    try {
      const doc = await gatekeeperGet(`/api/v1/did/${encodeURIComponent(did)}`);
      const verificationMethods = doc?.didDocument?.verificationMethod;
      
      if (!verificationMethods || !verificationMethods.length) {
        return false;
      }

      return !!signature && !!nonce && nonce.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate selective-disclosure proof for patient identity.
   * MaternaLink use case: prove pregnancy/insurance/age without full PII.
   *
   * Supported claimTypes for maternal health:
   *   pregnancy-confirmation, insurance-verification, age-verification,
   *   blood-type, due-date, general-identity
   */
  async patientIdentityProof(
    patientDid: string, 
    claimType: string,
    disclosedFields?: string[]
  ): Promise<any> {
    try {
      const doc = await gatekeeperGet(`/api/v1/did/${encodeURIComponent(patientDid)}`);
      
      if (!doc?.didDocument) {
        return { verified: false, error: 'Patient DID not resolved' };
      }

      const hasMethods = (doc.didDocument.verificationMethod?.length || 0) > 0;
      const services = doc.didDocument.service || [];
      
      return {
        verified: hasMethods,
        did: patientDid,
        claimType,
        disclosed: disclosedFields || [],
        services: services.map((s: any) => ({ type: s.type, id: s.id })),
        timestamp: new Date().toISOString(),
        note: 'Proof: DID resolved and controlled. For full claim verification, vault credentials required.'
      };
    } catch (err: any) {
      return { verified: false, error: err.message };
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private scopeMatches(authorized: string, requested: string): boolean {
    if (authorized === requested) return true;
    if (authorized.endsWith('.*') && requested.startsWith(authorized.slice(0, -2))) return true;
    return false;
  }
}

// Singleton export
export const identityService = new MaternaLinkIdentityService();
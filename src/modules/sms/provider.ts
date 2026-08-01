/**
 * CONTRAT SmsProvider
 * Traduction du contrat defini dans SPEC_Module_OTP_SMS v0.1 §3.
 *
 * Ce module TRANSPORTE un message. Il ne genere pas d'OTP, ne le verifie pas,
 * n'applique aucune politique. Voir SPEC §2 : trois responsabilites separees.
 *
 * Multi-fournisseurs OBLIGATOIRE : Orange documente des difficultes de
 * livraison vers les abonnes MTN, or Orange + MTN representent 85-90 % du parc
 * mobile ivoirien. Un fournisseur unique ne couvre pas la population cible.
 */

/** Numero au format E.164 normalise (+225XXXXXXXXXX). */
export type Msisdn = string & { readonly __brand: 'Msisdn' };

export interface OutboundSms {
  readonly msisdn: Msisdn;
  readonly body: string;
  readonly senderId: string;
  readonly idempotencyKey: string;
  readonly ttlSeconds: number;
}

export type SmsErrorCode =
  | 'INVALID_NUMBER'
  | 'UNSUPPORTED_NETWORK'
  | 'INSUFFICIENT_CREDIT'
  | 'SENDER_ID_REJECTED'
  | 'RATE_LIMITED_BY_PROVIDER'
  | 'PROVIDER_UNAVAILABLE'
  | 'AUTH_FAILED'
  | 'UNKNOWN';

export interface SendResult {
  readonly status: 'ACCEPTED' | 'REJECTED' | 'ERROR';
  readonly providerMessageId: string | null;
  readonly errorCode: SmsErrorCode | null;
  readonly costEstimate: number | null;
}

export interface DeliveryStatus {
  readonly state: 'PENDING' | 'DELIVERED' | 'FAILED' | 'EXPIRED' | 'UNKNOWN';
  readonly updatedAt: Date;
}

export interface ProviderHealth {
  readonly available: boolean;
  readonly latencyMs: number;
  readonly checkedAt: Date;
  readonly balanceRemaining: number | null;
}

export interface SmsProvider {
  readonly name: string;
  send(message: OutboundSms): Promise<SendResult>;
  getStatus?(providerMessageId: string): Promise<DeliveryStatus>;
  supports(msisdn: Msisdn): boolean;
  healthCheck(): Promise<ProviderHealth>;
}

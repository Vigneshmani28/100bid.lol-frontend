/**
 * Types mirroring the 100BID backend API contracts exactly.
 * Money is always represented in integer cents unless a field name ends in
 * "Dollars" (request-only) or "Display" (pre-formatted string for rendering).
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "SLOT_NOT_FOUND"
  | "BID_TOO_LOW"
  | "SLOT_ALREADY_TAKEN"
  | "SLOT_RESERVED"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_ALREADY_PROCESSED"
  | "PAYMENT_VERIFICATION_FAILED"
  | "BID_EXPIRED"
  | "METADATA_FETCH_FAILED"
  | "UNSAFE_URL"
  | "MANAGEMENT_TOKEN_INVALID"
  | "MANAGEMENT_TOKEN_EXPIRED"
  | "ADMIN_UNAUTHORIZED"
  | "DATAFAST_REQUEST_FAILED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface AdSummary {
  brandName: string;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  websiteUrl: string;
}

export interface SlotSummary {
  number: number;
  occupied: boolean;
  currentBidCents: number;
  minimumNextBidCents: number;
  ownershipStartedAt: string | null;
  ad: AdSummary | null;
}

export interface OwnershipHistoryEntry {
  brandName: string;
  imageUrl: string | null;
  faviconUrl: string | null;
  websiteUrl: string;
  amountCents: number;
  startedAt: string;
  endedAt: string | null;
}

export interface SlotDetail {
  slot: SlotSummary;
  history: OwnershipHistoryEntry[];
}

export interface BrandMetadata {
  brandName: string;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  canonicalUrl: string;
  websiteUrl: string;
}

export interface BidPreparation {
  bidId: string;
  slotNumber: number;
  amountCents: number;
  amountDisplay: string;
  expiresAt: string;
  advertisement: AdSummary;
}

export interface BidStatus {
  bidId: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELLED";
  slotNumber: number;
  amountCents: number;
  amountDisplay: string;
  brandName: string;
  /** PAID does not guarantee the spot — a bid can win the payment yet lose the race. */
  holdsSlot: boolean;
}

export interface PaymentCreation {
  paymentId: string;
  provider: string;
  providerOrderId: string;
  amountCents: number;
  currency: string;
  checkout: unknown;
}

export interface PaymentOutcome {
  alreadyProcessed: boolean;
  won: boolean;
}

export interface ManageAdvertisement extends AdSummary {
  status: string;
}

export interface ManageData {
  slotNumber: number;
  /** The slot's live price — what it'd currently take to win/reclaim it. */
  currentBidCents: number;
  currentBidDisplay: string;
  isCurrentOwner: boolean;
  /**
   * The management token holder's own ownership period on this slot.
   * When `isCurrentOwner` is true this period is still ongoing (`endedAt`
   * is null). When false, this is a past holder viewing/editing their own
   * historical listing — `endedAt` marks when they were outbid.
   */
  ownershipStartedAt: string | null;
  ownershipEndedAt: string | null;
  /** The amount this advertiser held the slot at (current bid, or their winning bid if outbid since). */
  yourBidCents: number;
  yourBidDisplay: string;
  advertisement: ManageAdvertisement | null;
}

export type ReportReason =
  | "INAPPROPRIATE_CONTENT"
  | "MISLEADING"
  | "MALWARE_OR_PHISHING"
  | "TRADEMARK"
  | "OTHER";

export interface DatafastOverview {
  visitors: number;
  pageviews: number;
  sessions: number;
  revenue: number;
  payments: number;
}

export interface DatafastTimeseriesPoint {
  date: string;
  visitors: number;
  pageviews: number;
  sessions: number;
  revenue: number;
  payments: number;
}

export interface DatafastStats {
  overview: DatafastOverview;
  timeseries: DatafastTimeseriesPoint[];
  range: { startAt: string; endAt: string };
}

export interface DatafastOnline {
  online: number;
  // Optional defensively — older/stale backend deployments only return
  // `online`, so the frontend shouldn't crash if `visitors` is missing.
  visitors?: number;
}

export interface RecentClaim {
  brandName: string;
  websiteUrl: string;
  faviconUrl: string | null;
  slotNumber: number;
  amountCents: number;
  claimedAt: string;
}

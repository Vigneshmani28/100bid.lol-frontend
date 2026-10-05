import type {
  ApiResponse,
  BidPreparation,
  BidStatus,
  BrandMetadata,
  DatafastOnline,
  DatafastStats,
  ManageData,
  PaymentCreation,
  PaymentOutcome,
  RecentClaim,
  ReportReason,
  SlotDetail,
  SlotSummary,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/** Thrown for any non-2xx or malformed API response. Carries the structured error code. */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError("NETWORK_ERROR", "Could not reach the server. Check your connection and try again.", 0);
  }

  let body: ApiResponse<T> | undefined;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiRequestError("INTERNAL_ERROR", "The server returned an unexpected response.", res.status);
  }

  if (!body.success) {
    throw new ApiRequestError(body.error.code, body.error.message, res.status, body.error.details);
  }

  return body.data;
}

function postJson<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(payload) });
}

async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  let res: Response;
  try {
    // No content-type header here — the browser sets multipart/form-data
    // with the correct boundary itself when given a FormData body.
    res = await fetch(`${API_BASE_URL}${path}`, { method: "POST", body: formData, cache: "no-store" });
  } catch {
    throw new ApiRequestError("NETWORK_ERROR", "Could not reach the server. Check your connection and try again.", 0);
  }

  let body: ApiResponse<T> | undefined;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiRequestError("INTERNAL_ERROR", "The server returned an unexpected response.", res.status);
  }

  if (!body.success) {
    throw new ApiRequestError(body.error.code, body.error.message, res.status, body.error.details);
  }

  return body.data;
}

export const api = {
  listSlots: () => request<{ slots: SlotSummary[] }>("/slots"),

  listRecentClaims: () => request<{ claims: RecentClaim[] }>("/claims/recent"),

  getSlot: (slotNumber: number) => request<SlotDetail>(`/slots/${slotNumber}`),

  previewMetadata: (websiteUrl: string) => postJson<BrandMetadata>("/metadata/preview", { websiteUrl }),

  prepareBid: (input: {
    slotNumber: number;
    websiteUrl: string;
    email: string;
    bidDollars: number;
    brandName?: string;
    description?: string;
    imageUrl?: string;
  }) => postJson<BidPreparation>("/bids/prepare", input),

  getBid: (bidId: string) => request<BidStatus>(`/bids/${bidId}`),

  cancelBid: (bidId: string) => postJson<{ cancelled: boolean }>(`/bids/${bidId}/cancel`, {}),

  createPayment: (bidId: string) => postJson<PaymentCreation>("/payments/create", { bidId }),

  completeMockPayment: (orderId: string, outcome: "success" | "failure" = "success") =>
    postJson<PaymentOutcome>(`/payments/mock/${orderId}/complete`, { outcome }),

  getManage: (token: string) => request<ManageData>(`/manage/${token}`),

  refreshManageMetadata: (token: string) =>
    postJson<{ brandName: string; description: string | null; imageUrl: string | null; faviconUrl: string | null; websiteUrl: string }>(
      `/manage/${token}/refresh-metadata`,
      {},
    ),

  updateManageAdvertisement: (
    token: string,
    input: { brandName: string; description: string; imageUrl: string },
  ) =>
    postJson<{ brandName: string; description: string | null; imageUrl: string | null; faviconUrl: string | null; websiteUrl: string }>(
      `/manage/${token}/update`,
      input,
    ),

  submitReport: (input: { slotNumber: number; reason: ReportReason; details?: string; reporterEmail?: string }) =>
    postJson<{ reportId: string }>("/reports", input),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return postFormData<{ url: string }>("/uploads/image", formData);
  },

  // Internal-only. Requires the admin shared secret (see backend
  // ADMIN_STATS_TOKEN) — the /admin stats page prompts for and stores it.
  getDatafastStats: (adminToken: string, range?: { startAt: string; endAt: string }) => {
    const query = range ? `?startAt=${range.startAt}&endAt=${range.endAt}` : "";
    return request<DatafastStats>(`/admin/datafast/stats${query}`, {
      headers: { "x-admin-token": adminToken },
    });
  },

  // Public — the live "N online" nav badge. No token: the df_ key stays
  // server-side, this just returns the count.
  getDatafastOnline: () => request<DatafastOnline>("/datafast/online"),
};

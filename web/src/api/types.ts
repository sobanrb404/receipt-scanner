export type ReceiptStatus = "processing" | "needs_review" | "confirmed" | "failed";

export interface LineItem {
  description: string;
  amount: number;
}

export interface Receipt {
  id: string;
  status: ReceiptStatus;
  source: "scanned" | "manual";
  vendor: string | null;
  purchase_date: string | null;
  total: number | null;
  tax: number | null;
  currency: string | null;
  category: string | null;
  line_items: LineItem[] | null;
  confidence: Record<string, number> | null;
  created_at: string;
}

export interface ManualReceiptPayload {
  vendor: string;
  purchase_date?: string | null;
  total: number;
  tax?: number | null;
  currency?: string | null;
  category?: string | null;
}

export interface ReceiptUpdatePayload {
  vendor?: string | null;
  purchase_date?: string | null;
  total?: number | null;
  tax?: number | null;
  currency?: string | null;
  category?: string | null;
  status?: ReceiptStatus;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface ReceiptFilters {
  vendor?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
}

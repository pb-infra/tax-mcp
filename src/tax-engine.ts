/**
 * Prismberry Tax Calculator — Tax Engine
 * Indian tax and investment calculation API client
 */

const BASE_URL = process.env.TAXSPANNER_BASE_URL;
const AUTH = process.env.TAXSPANNER_AUTH;

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
  Authorization: AUTH,
  Origin: "https://taxspanner.com",
  Referer: "https://taxspanner.com/",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
};

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}/${endpoint}/`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Tax engine error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ─── Response types ────────────────────────────────────────────────────────────

export interface SIPResponse {
  total_wealth: number;
  invested_amount: number;
  wealth_gained: number;
}

export interface RDResponse {
  invested_amount: number;
  estimated_returns: number;
  total_maturity_amount: number;
}

export interface NPSResponse {
  invested_amount: number;
  pension_wealth: number;
  lumpsum_amount: number;
  monthly_pension: number;
}

export interface LeaveEncashmentResponse {
  leave_encashment_available: number;
  exemption: number;
  taxable_leave_salary: number;
}

export interface TDSResponse {
  tds: number;
}

export interface EMILoanDetails {
  emi: number;
  total_interest_payable: number;
  total_payment: number;
}

export interface EMIYearlySummary {
  total_emi: number;
  total_principal: number;
  total_interest: number;
  remaining_balance: number;
  loan_paid_percentage: number;
}

export interface EMIResponse {
  loan_basic_details: EMILoanDetails;
  yearly_summary: Record<string, EMIYearlySummary>;
  monthly_schedule: Array<{
    year: number;
    month: number;
    emi: number;
    principal_payment: number;
    interest_payment: number;
    remaining_balance: number;
    loan_paid_percentage: number;
  }>;
}

export interface HRAResponse {
  status: number;
  Amount_of_exempted_HRA: number;
  HRA_chargeable_to_tax: number;
  basic_salary: number;
  HRA_reccive: number;
  excess_rent_paid?: number;
}

// ─── Calculator API ────────────────────────────────────────────────────────────

export const TaxEngine = {
  sip: (body: {
    sip_investment_or_lumpsum: "SIP" | "Lumpsum";
    monthly_sip_amount?: number;
    lumpsum_amount?: number;
    sip_period: number;
    expected_return_rate: number;
  }) => post<SIPResponse>("sip-calculator", body),

  rd: (body: {
    monthly_rd_investment: number;
    time_period: number;
    rd_interest_rate: number;
  }) => post<RDResponse>("rd-calculator", body),

  nps: (body: {
    your_age: number;
    monthly_investment: number;
    expected_return_on_investment: number;
    percentage_of_annuity_purchase: number;
    expected_return_of_annuity: number;
  }) => post<NPSResponse>("nps-calculator", body),

  leaveEncashment: (body: {
    employee_type: "government" | "non_government";
    encashed_during: "during_service" | "at_retirement";
    basic_salary: number;
    total_years_of_service: number;
    total_unused_leaves: number;
    total_leaves_per_year: number;
  }) => post<LeaveEncashmentResponse>("leaveencashment-calculator", body),

  tds: (body: {
    pan: "yes" | "no";
    nature_of_payment: string;
    amount: string;
    recipient_type: string;
  }) => post<TDSResponse>("tds-calculator", body),

  salary: (body: {
    gross_salary: string;
    professional_tax: string;
    employee_pf_contribution: string;
    csr_contribution: string;
    labour_welfare_fund: string;
    tax_deducted_at_source: string;
    other_deductions: string;
  }) => post<Record<string, unknown>>("salary-calculator", body),

  emi: (body: {
    type_of_loan: "home_loan" | "car_loan" | "personal_loan";
    loan_amount: number;
    interest_rate: number;
    loan_tenure: number;
  }) => post<EMIResponse>("emi-calculator", body),

  hra: (body: {
    base_salary: string;
    da_received: string;
    hra_received: string;
    rent_paid: string;
    city: "metro" | "non-metro";
    name?: string;
    email?: string;
    contact_number?: string;
  }) => post<HRAResponse>("HRAExemption-Calculator", body),
};

/**
 * Prismberry Tax Calculator — MCP Tool Definitions
 * Protocol: Model Context Protocol 2025-03-26 (Streamable HTTP)
 */

export interface MCPTool {
  name: string;
  description: string;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
  };
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: { tools: { listChanged?: boolean } };
  serverInfo: { name: string; version: string };
}

export interface MCPListToolsResult {
  tools: MCPTool[];
}

export interface MCPCallToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

export const TOOLS: MCPTool[] = [
  {
    name: "calculate_sip",
    annotations: TOOL_ANNOTATIONS,
    description:
      `This tool calculates SIP (monthly) or Lumpsum (one-time) mutual fund returns.

MULTI-TOOL: If user asks about NPS, RD, or other investments → call those tools separately. For comparisons → call each tool one by one.

MANDATORY: Collect ALL fields before calling:
        You MUST collect ALL required fields before calling: sip_investment_or_lumpsum, sip_period, expected_return_rate, AND either monthly_sip_amount (if SIP) OR lumpsum_amount (if Lumpsum).

        CRITICAL: Do NOT call this tool until user provides ALL fields. No exceptions. No assumptions.
        - If user says "SIP" → need monthly_sip_amount
        - If user says "Lumpsum" → need lumpsum_amount  
        - Missing any field? STOP and ASK
        - Take as many turns as needed

Example: "Calculate SIP for 15 years at 12%"
→ Ask: "Monthly investment amount?"
→ Do NOT call yet

Do not call this tool multiple times for same query unless user requests new calculation.`,
    inputSchema: {
      type: "object",
      properties: {
        sip_investment_or_lumpsum: {
          type: "string",
          enum: ["SIP", "Lumpsum"],
          description: "Investment type: SIP (monthly) or Lumpsum (one-time)",
        },
        monthly_sip_amount: {
          type: "number",
          description: "Monthly SIP amount in INR (required if SIP)",
        },
        lumpsum_amount: {
          type: "number",
          description: "One-time investment amount in INR (required if Lumpsum)",
        },
        sip_period: {
          type: "number",
          description: "Investment duration in years",
        },
        expected_return_rate: {
          type: "number",
          description: "Expected annual return rate in % (e.g. 12 for 12%)",
        },
      },
      required: ["sip_investment_or_lumpsum", "sip_period", "expected_return_rate"],
    },
  },
  {
    name: "calculate_rd",
    annotations: TOOL_ANNOTATIONS,
    description:
      `This tool calculates Recurring Deposit maturity (monthly bank deposits with fixed interest).

MULTI-TOOL: If user asks about SIP, NPS, or other investments → call those tools separately. For comparisons → call each tool one by one.

MANDATORY: Collect ALL 3 fields before calling:
        You MUST collect ALL 3 fields before calling: monthly_rd_investment, time_period (in months), rd_interest_rate.

        CRITICAL: Do NOT call this tool until user provides ALL 3 fields. No exceptions. No assumptions.
        - Missing 1 field? STOP and ASK
        - User says "5 years"? Ask: "Is that 60 months?" (do NOT convert yourself)
        - Do NOT assume any interest rate
        - Take as many turns as needed

Example: "RD for ₹5K monthly at 7.5% for 5 years"
→ Ask: "Confirm 60 months?"
→ Do NOT call yet

Do not callthis tool multiple times for same query unless user requests new calculation.`,
    inputSchema: {
      type: "object",
      properties: {
        monthly_rd_investment: {
          type: "number",
          description: "Monthly RD deposit amount in INR",
        },
        time_period: {
          type: "number",
          description: "RD tenure in months",
        },
        rd_interest_rate: {
          type: "number",
          description: "Annual interest rate in % (e.g. 7.5)",
        },
      },
      required: ["monthly_rd_investment", "time_period", "rd_interest_rate"],
    },
  },
  {
    name: "calculate_nps",
    annotations: TOOL_ANNOTATIONS,
    description:
      `This tool calculates NPS retirement planning (pension corpus, lumpsum, monthly pension).

MULTI-TOOL: If user asks about SIP, EPF, or other plans → call those tools separately. For comparisons → call each tool one by one.

MANDATORY: Collect ALL 5 fields before calling:
        You MUST collect ALL 5 fields before calling: your_age, monthly_investment, expected_return_on_investment, percentage_of_annuity_purchase, expected_return_of_annuity.

        CRITICAL: Do NOT call this tool until user provides ALL 5 fields. No exceptions. No assumptions.
        - Missing 1 field? STOP and ASK
        - Do NOT assume retirement age as 60
        - Do NOT default annuity percentage to 40%
        - Do NOT assume any return rates
        - Take as many turns as needed

Example: "NPS: age 30, monthly ₹10K, 8% return, 40% annuity"
→ Ask: "Annuity return rate?"
→ Do NOT call yet

Do not callthis tool  multiple times for same query unless user requests new calculation.`,
    inputSchema: {
      type: "object",
      properties: {
        your_age: {
          type: "number",
          description: "Current age in years",
        },
        monthly_investment: {
          type: "number",
          description: "Monthly NPS contribution in INR",
        },
        expected_return_on_investment: {
          type: "number",
          description: "Expected annual return on NPS corpus in % (e.g. 8)",
        },
        percentage_of_annuity_purchase: {
          type: "number",
          description: "% of corpus used to buy annuity at retirement (min 40%, e.g. 40)",
        },
        expected_return_of_annuity: {
          type: "number",
          description: "Expected annuity return rate in % (e.g. 6)",
        },
      },
      required: [
        "your_age",
        "monthly_investment",
        "expected_return_on_investment",
        "percentage_of_annuity_purchase",
        "expected_return_of_annuity",
      ],
    },
  },
  {
    name: "calculate_leave_encashment",
    annotations: TOOL_ANNOTATIONS,
    description:
      `This tool calculates leave encashment tax exemption for employees.

MULTI-TOOL: If user asks about TDS on leave → call TDS tool separately. If user asks about salary → call salary tool separately.

MANDATORY: Collect ALL 6 fields before calling:
        You MUST collect ALL 6 fields before calling: employee_type, encashed_during, basic_salary, total_years_of_service, total_unused_leaves, total_leaves_per_year.

        CRITICAL: Do NOT call this tool until user provides ALL 6 fields. No exceptions. No assumptions.
        - Missing 1 field? STOP and ASK
        - Do NOT assume employee_type as 'non_government'
        - Do NOT assume encashed_during as 'at_retirement'
        - Do NOT default leaves_per_year to 15 or 30
        - Take as many turns as needed

Example: "Leave: non-govt, retirement, ₹30K basic, 20 years, 100 leaves"
→ Ask: "Leaves per year?"
→ Do NOT call yet

Do not call this tool multiple times for same query unless user requests new calculation.`,
    inputSchema: {
      type: "object",
      properties: {
        employee_type: {
          type: "string",
          enum: ["government", "non_government"],
          description: "Type of employee",
        },
        encashed_during: {
          type: "string",
          enum: ["during_service", "at_retirement"],
          description: "When the leave is being encashed",
        },
        basic_salary: {
          type: "number",
          description: "Monthly basic salary in INR",
        },
        total_years_of_service: {
          type: "number",
          description: "Total years of service",
        },
        total_unused_leaves: {
          type: "number",
          description: "Total unused/accumulated leave days",
        },
        total_leaves_per_year: {
          type: "number",
          description: "Leave days earned per year",
        },
      },
      required: [
        "employee_type",
        "encashed_during",
        "basic_salary",
        "total_years_of_service",
        "total_unused_leaves",
        "total_leaves_per_year",
      ],
    },
  },
  {
    name: "calculate_tds",
    annotations: TOOL_ANNOTATIONS,
    description:
      `This tool calculates TDS for payments under sections 192A, 193, 194A, 194C, 194D, 194H, 194I, 194J, 194IC, 194BA, etc.

MULTI-TOOL: If user asks about salary, HRA, EMI, or investments → call those tools separately. For multiple calculations → call each tool one by one.

MANDATORY: Collect ALL 4 fields before calling:
        You MUST collect ALL 4 fields before calling: pan, nature_of_payment(section code), amount, recipient_type.

        CRITICAL: Do NOT call this tool until user provides ALL 4 fields. No exceptions. No assumptions.
        - Missing 1 field? STOP and ASK
        - Do NOT assume PAN status
        - Do NOT assume recipient_type from context
        - Take as many turns as needed

Example: "TDS for 194J, ₹1L, PAN available"
→ Ask: "Recipient: individual, company, or others?"
→ Do NOT call yet

Do not this tool multiple times for same query unless user requests new calculation.`,
    inputSchema: {
      type: "object",
      properties: {
        pan: {
          type: "string",
          enum: ["yes", "no"],
          description: "Whether recipient has a PAN card",
        },
        nature_of_payment: {
          type: "string",
          description:
            "TDS section code: 194 (dividends), 194A (interest), 194C (contractor), 194D (insurance), 194H (commission), 194I (rent), 194J (professional fees), etc.",
        },
        amount: {
          type: "string",
          description: "Payment amount in INR as string (e.g. '100000')",
        },
        recipient_type: {
          type: "string",
          description: "Type of recipient: 'individual', 'company', 'others'",
        },
      },
      required: ["pan", "nature_of_payment", "amount", "recipient_type"],
    },
  },
  {
    name: "calculate_salary_breakup",
    annotations: TOOL_ANNOTATIONS,
    description:
      `This tool calculates take-home salary (monthly/annual) after deductions from CTC.

MULTI-TOOL: If user asks about HRA → call HRA tool separately. If user asks about EMI/loans → call EMI tool separately. If user asks about investments → call SIP/NPS/RD separately.

MANDATORY: Collect gross_salary AND ALL deductions before calling:
        You MUST collect gross_salary AND ALL deduction fields before calling: professional_tax, employee_pf_contribution, tax_deducted_at_source, other_deductions.

        CRITICAL: Do NOT call this tool until user confirms ALL deduction fields. No exceptions.
        - User only provides gross_salary? STOP and ASK: "Provide: 1) Professional tax, 2) PF contribution, 3) TDS, 4) Other deductions. Enter 0 if none."
        - Do NOT assume any deduction is 0 without confirmation
        - Take as many turns as needed

Example: "Salary for ₹6L CTC"
→ Ask: "PT? PF? TDS? Other deductions? (0 if none)"
→ Do NOT call yet

Do not call this tool multiple times for same query unless user requests new calculation.`,
    inputSchema: {
      type: "object",
      properties: {
        gross_salary: {
          type: "string",
          description: "Annual gross salary in INR as string (e.g. '600000')",
        },
        professional_tax: {
          type: "string",
          description: "Annual professional tax in INR (default '0')",
        },
        employee_pf_contribution: {
          type: "string",
          description: "Annual employee PF contribution in INR (default '0')",
        },
        tax_deducted_at_source: {
          type: "string",
          description: "Annual TDS deducted in INR (default '0')",
        },
        other_deductions: {
          type: "string",
          description: "Any other annual deductions in INR (default '0')",
        },
      },
      required: ["gross_salary"],
    },
  },
  {
    name: "calculate_emi",
    annotations: TOOL_ANNOTATIONS,
    description:
      `This tool calculates monthly EMI for home/car/personal loans.

MULTI-TOOL: If user asks about salary or affordability → call salary tool separately. If comparing loan vs investment → call both EMI and SIP/RD separately.

MANDATORY: Collect ALL 4 fields before calling:
        You MUST collect ALL 4 fields before calling: type_of_loan, loan_amount, interest_rate, loan_tenure.

        CRITICAL: Do NOT call this tool until user provides ALL 4 fields. No exceptions. No assumptions.
        - Missing 1 field? STOP and ASK
        - Do NOT assume interest rate (like 8.5% or 9%)
        - Do NOT default tenure to any value
        - User says "home loan"? That counts as type_of_loan provided
        - Take as many turns as needed

Example: "Home loan EMI for ₹75L at 9%"
→ Ask: "Loan tenure in years?"
→ Do NOT call yet

Do not call this tool multiple times for same query unless user requests new calculation.`,
    inputSchema: {
      type: "object",
      properties: {
        type_of_loan: {
          type: "string",
          enum: ["home_loan", "car_loan", "personal_loan"],
          description: "Type of loan",
        },
        loan_amount: {
          type: "number",
          description: "Principal loan amount in INR",
        },
        interest_rate: {
          type: "number",
          description: "Annual interest rate in % (e.g. 8.5)",
        },
        loan_tenure: {
          type: "number",
          description: "Loan tenure in years",
        },
      },
      required: ["type_of_loan", "loan_amount", "interest_rate", "loan_tenure"],
    },
  },
  {
    name: "calculate_hra_exemption",
    annotations: TOOL_ANNOTATIONS,
    description:
      `This tool calculates HRA tax exemption under Section 10(13A).

MULTI-TOOL: If user asks about salary → call salary tool separately. If user asks about other deductions → call relevant tools separately.

MANDATORY: Collect ALL 5 fields before calling:
        You MUST collect ALL 5 fields before calling: base_salary, da_received, hra_received, rent_paid, city.

        CRITICAL: Do NOT call this tool until user provides ALL 5 fields. No exceptions. No assumptions.
        - Missing 1 field? STOP and ASK
        - Do NOT assume da_received as '0' → explicitly ask "What is your DA (Dearness Allowance)?"
        - Do NOT assume city → explicitly ask "Is your city metro or non-metro?"
        - Do NOT convert city name yourself → ask user to confirm
        - Take as many turns as needed

Example: "HRA: basic ₹6L, HRA ₹1.2L, rent ₹1.8L, Mumbai"
→ Ask: "DA amount? (0 if none)"
→ Do NOT call yet

Do not call this tool  multiple times for same query unless user requests new calculation.`,
    inputSchema: {
      type: "object",
      properties: {
        base_salary: {
          type: "string",
          description: "Annual basic salary in INR as string (REQUIRED - ask user if not provided)",
        },
        da_received: {
          type: "string",
          description: "Annual DA (Dearness Allowance) forming part of salary in INR (REQUIRED - MUST ask user explicitly, DO NOT assume as '0')",
        },
        hra_received: {
          type: "string",
          description: "Annual HRA received from employer in INR (REQUIRED - ask user if not provided)",
        },
        rent_paid: {
          type: "string",
          description: "Annual rent paid in INR (REQUIRED - ask user if not provided)",
        },
        city: {
          type: "string",
          enum: ["metro", "non-metro"],
          description: "metro = Mumbai/Delhi/Kolkata/Chennai, non-metro = all other cities (REQUIRED - ask user if not provided)",
        },
      },
      required: ["base_salary", "da_received", "hra_received", "rent_paid", "city"],
    },
  },
];

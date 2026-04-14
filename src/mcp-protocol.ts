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
      `This tool calculates returns on SIP (monthly investments) or Lumpsum (one-time investments) in mutual funds.
      NOTE: This tool ONLY calculates investment returns for SIP or Lumpsum.
        - If the user also asks about NPS, RD, or other investments, you MUST call those calculators separately.
        - If the user asks to compare multiple investment types, call each relevant tool one by one.

      RULE 1 — COLLECT ALL FIELDS BEFORE CALLING (MANDATORY):
      You MUST have ALL required values explicitly from the user before calling this tool: sip_investment_or_lumpsum, sip_period, expected_return_rate, AND either monthly_sip_amount (if SIP) or lumpsum_amount (if Lumpsum).
      
      CRITICAL: Do NOT call this tool until the user has provided ALL required fields. No exceptions. No assumptions.
      - If user says "SIP", you need monthly_sip_amount
      - If user says "Lumpsum", you need lumpsum_amount
      - If user provides type and period but not amount, STOP and ask for the amount
      - Take as many chat turns as needed to collect all required fields
      
      Example: User says "Calculate SIP for 15 years at 12% return"
      → You MUST respond: "I need one more detail. What is your monthly SIP investment amount?"
      → Do NOT call the tool yet`,
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
      `This tool calculates maturity amount for Recurring Deposits (monthly bank deposits with fixed interest).
      
      NOTE: This tool ONLY calculates RD maturity.
      - If the user also asks about SIP, NPS, or other investments, you MUST call those calculators separately.
      - If the user asks to compare RD with other options, call each relevant tool one by one.

      RULE 1 — COLLECT ALL 3 FIELDS BEFORE CALLING (MANDATORY):
      You MUST have ALL 3 values explicitly from the user before calling this tool: monthly_rd_investment, time_period (in months), rd_interest_rate.
      
      CRITICAL: Do NOT call this tool until the user has provided ALL 3 fields. No exceptions. No assumptions.
      - If user provides 2 out of 3, STOP and ask for the missing one
      - If user says "5 years", ask them to confirm "Is that 60 months?" — do NOT convert yourself
      - Do NOT assume any standard interest rate
      - Take as many chat turns as needed to collect all 3 fields
      
      Example: User says "Calculate RD for ₹5K monthly at 7.5% for 5 years"
      → You MUST respond: "Just to confirm, is the tenure 60 months (5 years × 12)?"
      → Wait for confirmation before calling the tool`,
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
      `This tool calculates NPS retirement planning including pension corpus, lumpsum withdrawal, and monthly pension.

      NOTE: This tool ONLY calculates NPS retirement benefits.
      - If the user also asks about SIP, EPF, or other retirement plans, you MUST call those calculators separately.
      - If the user asks to compare retirement options, call each relevant tool one by one.

      RULE 1 — COLLECT ALL 5 FIELDS BEFORE CALLING (MANDATORY):
      You MUST have ALL 5 values explicitly from the user before calling this tool: your_age, monthly_investment, expected_return_on_investment, percentage_of_annuity_purchase, expected_return_of_annuity.
      
      CRITICAL: Do NOT call this tool until the user has provided ALL 5 fields. No exceptions. No assumptions.
      - If user provides 4 out of 5, STOP and ask for the missing one
      - Do NOT assume retirement age as 60 and calculate age from that
      - Do NOT default percentage_of_annuity_purchase to 40%
      - Do NOT assume any return rates
      - Take as many chat turns as needed to collect all 5 fields
      
      Example: User says "Calculate NPS: age 30, monthly ₹10K, 8% return, 40% annuity"
      → You MUST respond: "I need one more detail. What is the expected return rate on the annuity?"
      → Do NOT call the tool yet`,
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
      `This tool calculates taxable and tax-exempt portions of leave encashment for employees.

      NOTE: This tool ONLY calculates leave encashment exemption.
      - If the user also asks about TDS on leave encashment, you MUST call the TDS calculator separately after this.
      - If the user asks about salary or other tax calculations, call those tools separately.

      RULE 1 — COLLECT ALL 6 FIELDS BEFORE CALLING (MANDATORY):
      You MUST have ALL 6 values explicitly from the user before calling this tool: employee_type, encashed_during, basic_salary, total_years_of_service, total_unused_leaves, total_leaves_per_year.
      
      CRITICAL: Do NOT call this tool until the user has provided ALL 6 fields. No exceptions. No assumptions.
      - If user provides 5 out of 6, STOP and ask for the missing one
      - Do NOT assume employee_type as 'non_government'
      - Do NOT assume encashed_during as 'at_retirement'
      - Do NOT default total_leaves_per_year to any standard value (like 15 or 30)
      - Take as many chat turns as needed to collect all 6 fields
      
      Example: User says "Calculate leave encashment: non-government, at retirement, basic ₹30K, 20 years service, 100 leaves"
      → You MUST respond: "I need one more detail. How many leaves do you earn per year?"
      → Do NOT call the tool yet.`,
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
      `This tool calculates TDS (Tax Deducted at Source) for payments made under various sections including 194A (interest), 194C (contractor), 194J (professional fees), 194I (rent), and others.

      NOTE: This tool calculates TDS for payments TO vendors, freelancers, contractors, etc.
      - This tool supports sections: 192A, 193, 194IC, Subsection-2 of 194BA,  194A, 194C, 194D, 194H, 194I, 194J, and more.
      - - If the user asks about salary, HRA, EMI, or other calculations, call those tools separately.
.

      RULE 1 — COLLECT ALL 4 FIELDS BEFORE CALLING (MANDATORY):
      You MUST have ALL 4 values explicitly from the user before calling this tool: pan, section/nature_of_payment, amount, recipient_type.
      
      CRITICAL: Do NOT call this tool until the user has provided ALL 4 fields. No exceptions. No assumptions.
      - If user provides 3 out of 4, STOP and ask for the missing one
      - Do NOT assume PAN status
      - Do NOT assume recipient_type from context
      - Take as many chat turns as needed to collect all 4 fields
      
      Example: User says "Calculate TDS for Section 194J, amount ₹1L, PAN available"
      → You MUST respond: "I need one more detail. Is the recipient an individual, company, or others?"
      → Do NOT call the tool yet
      `,
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
      `This tool calculates net take-home salary (monthly and annual) after all deductions from gross salary/CTC.
      NOTE: This tool ONLY calculates salary breakup and take-home pay.
      - If the user also asks about HRA exemption, you MUST call the HRA calculator separately.
      - If the user asks about loan affordability or EMI, call the EMI calculator separately.
      - If the user asks about investments, call SIP/NPS/RD calculators separately.

      RULE 1 — COLLECT ALL DEDUCTION FIELDS BEFORE CALLING (MANDATORY):
      You MUST have gross_salary and ALL deduction fields from the user before calling this tool: professional_tax, employee_pf_contribution, tax_deducted_at_source, other_deductions.
      
      CRITICAL: Do NOT call this tool until the user has confirmed ALL deduction fields. No exceptions.
      - If user only provides gross_salary, STOP and ask: "Please provide your professional tax, PF contribution, TDS, and any other deductions. If any of these is 0, please confirm that."
      - Do NOT assume any deduction is 0 without user confirmation
      - Take as many chat turns as needed to collect all fields
      
      Example: User says "Calculate salary for ₹6L CTC"
      → You MUST respond: "I need your deduction details. What are your: 1) Professional tax, 2) PF contribution, 3) TDS, 4) Other deductions? (Enter 0 for any that don't apply)"
      → Do NOT call the tool yet
      `,
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
      `This tool calculates monthly EMI (loan installment) for home loans, car loans, and personal loans.
      NOTE: This tool ONLY calculates EMI and loan repayment details.
      - If the user also asks about salary or affordability, you MUST call the salary calculator separately.
      - If the user asks to compare loan vs investment, call both EMI and SIP/RD calculators separately.

      RULE 1 — COLLECT ALL 4 FIELDS BEFORE CALLING (MANDATORY):
      You MUST have ALL 4 values explicitly from the user before calling this tool: type_of_loan, loan_amount, interest_rate, loan_tenure.
      
      CRITICAL: Do NOT call this tool until the user has provided ALL 4 fields. No exceptions. No assumptions.
      - If user provides 3 out of 4, STOP and ask for the missing one
      - Do NOT assume a standard interest rate (like 8.5% or 9%)
      - Do NOT default tenure to any value
      - If user says "home loan", that counts as type_of_loan being provided
      - Take as many chat turns as needed to collect all 4 fields
      
      Example: User says "Calculate home loan EMI for ₹75L at 9%"
      → You MUST respond: "I need one more detail. What is the loan tenure in years?"
      → Do NOT call the tool yet
      `,
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
      `This tool calculates HRA (House Rent Allowance) tax exemption under Section 10(13A).
      NOTE: This tool ONLY calculates HRA exemption.
      - If the user also asks about salary calculation, you MUST call the salary calculator separately.
      - If the user asks about other tax deductions, call the relevant calculators separately.

      RULE 1 — COLLECT ALL 5 FIELDS BEFORE CALLING (MANDATORY):
      You MUST have ALL 5 values explicitly from the user before calling this tool: base_salary, da_received, hra_received, rent_paid, city.
      
      CRITICAL: Do NOT call this tool until the user has provided ALL 5 fields. No exceptions. No assumptions.
      - If user provides 4 out of 5, STOP and ask for the missing one
      - Do NOT assume da_received as '0' — explicitly ask "What is your DA (Dearness Allowance)?"
      - Do NOT assume city from context — explicitly ask "Is your city metro or non-metro?"
      - Do NOT convert user's city name to metro/non-metro yourself — ask them to confirm
      - Take as many chat turns as needed to collect all 5 fields
      
      Example: User says "Calculate HRA: basic ₹6L, HRA ₹1.2L, rent ₹1.8L, Mumbai"
      → You MUST respond: "I need one more detail before calculating. What is your DA (Dearness Allowance) amount? If you don't receive DA, please confirm by saying '0'."
      → Do NOT call the tool yet
      `,
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

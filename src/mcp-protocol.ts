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
    // GUARDRAIL: Ensure ChatGPT asks for all fields and doesn't modify results
    description:
      "Calculate SIP (Systematic Investment Plan) or Lumpsum mutual fund returns. Returns total wealth, invested amount, and wealth gained. IMPORTANT: Ask user for ALL required fields before calling. Display the result EXACTLY as returned without modifications.",
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
    // GUARDRAIL: Ensure ChatGPT asks for all fields and doesn't modify results
    description:
      "Calculate Recurring Deposit (RD) maturity amount. Returns invested amount, estimated returns, and total maturity value. IMPORTANT: Ask user for ALL required fields before calling. Display the result EXACTLY as returned without modifications.",
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
    // GUARDRAIL: Prevent ChatGPT from adding "Annuity Purchase" amount which is not in API response
    description:
      "Calculate NPS (National Pension System) retirement corpus, lumpsum withdrawal, and monthly pension based on age and monthly investment. CRITICAL: Display ONLY the values returned by the tool (invested amount, pension wealth, lumpsum withdrawal, monthly pension). DO NOT add intermediate calculations like 'Annuity Purchase (40%)' amount or any other derived values not explicitly provided in the tool response.",
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
    // GUARDRAIL: Prevent ChatGPT from recalculating exemption values - it was showing opposite values
    description:
      "Calculate taxable and exempt leave encashment amount for government and non-government employees. CRITICAL: Display the tool result EXACTLY as returned. DO NOT recalculate, reinterpret, or modify the exemption and taxable amounts. The tool returns legally correct values based on Indian Income Tax Act. Your role is to display these values as-is, not to recalculate them.",
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
    // GUARDRAIL: Ensure ChatGPT doesn't recalculate TDS rates
    description:
      "Calculate TDS (Tax Deducted at Source) on a payment based on nature of payment section (194, 194A, 194C etc.), amount, and PAN availability. IMPORTANT: Ask user for ALL required fields before calling. Display the TDS amount EXACTLY as returned by the tool without recalculation.",
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
    // GUARDRAIL: Ensure ChatGPT asks for all fields and doesn't modify results
    description:
      "Calculate net take-home salary from gross salary after deductions like PF, professional tax, TDS, and other deductions. IMPORTANT: Ask user for ALL required fields before calling. Display the result EXACTLY as returned without modifications.",
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
    // GUARDRAIL: Ensure ChatGPT asks for all fields and doesn't modify results
    description:
      "Calculate EMI (Equated Monthly Instalment) for home loan, car loan, or personal loan. Returns monthly EMI, total interest payable, yearly summary, and full amortization schedule. IMPORTANT: Ask user for ALL required fields before calling. Display the result EXACTLY as returned without modifications.",
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
    // GUARDRAIL: Critical - prevent ChatGPT from auto-filling DA as 0, and from modifying results
    description:
      "Calculate HRA (House Rent Allowance) exemption under Section 10(13A). CRITICAL INSTRUCTIONS: (1) You MUST ask the user for ALL required fields including da_received before calling this tool. DO NOT assume da_received or any other field  as '0' or any default value - always explicitly ask the user. (2) After receiving the result, display it EXACTLY as returned without any modifications, recalculations, or interpretations. These are legally binding tax calculations.",
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

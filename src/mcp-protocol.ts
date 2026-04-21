/**
 * Prismberry Tax Calculator — MCP Tool Definitions
 * Protocol: Model Context Protocol 2025-03-26 (Streamable HTTP)
 * 
 * ONLY TDS CALCULATOR IS ACTIVE - All other calculators are commented out
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

// ONLY TDS CALCULATOR IS ACTIVE
export const TOOLS: MCPTool[] = [
  {
    name: "calculate_tds",
    annotations: TOOL_ANNOTATIONS,
    description:
      `Calculate TDS (Tax Deducted at Source) on a payment, salary and more under various sections .

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
      
      RULES 2 & 3 — Display response as-is, don't recalculate TDS rates (detailed instructions in tool response).`,
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
];

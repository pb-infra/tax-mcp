/**
 * Prismberry Tax Calculator — MCP Server
 * Compatible with ChatGPT Connectors (MCP 2025-03-26)
 */

import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { MCPRequest, MCPResponse, MCPInitializeResult, MCPListToolsResult, TOOLS } from "./mcp-protocol";
import { TaxEngine } from "./tax-engine";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT;
const HOST = process.env.HOST || "localhost";
const APP_NAME = "Prismberry Tax Calculator";

// ─── MCP Streamable HTTP endpoint ─────────────────────────────────────────────
app.post("/mcp", async (req: Request, res: Response) => {
  const body = req.body as MCPRequest;
  if (!body || body.jsonrpc !== "2.0") {
    res.status(400).json(errResp(null, -32600, "Invalid JSON-RPC request"));
    return;
  }
  try {
    const result = await dispatch(body.method, body.params ?? {});
    res.json({ jsonrpc: "2.0", id: body.id, result } as MCPResponse);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    res.json(errResp(body.id, -32603, msg));
  }
});

// ─── OpenAI domain verification ───────────────────────────────────────────────
app.get("/.well-known/openai-domain-verification.txt", (_req: Request, res: Response) => {
  res.type("text/plain").send(process.env.OPENAI_DOMAIN_TOKEN ?? "REPLACE_WITH_YOUR_TOKEN");
});

app.get("/health", (_req: Request, res: Response) =>
  res.json({ status: "ok", app: APP_NAME, version: "1.0.0" })
);

// ─── Method dispatcher ─────────────────────────────────────────────────────────
async function dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "prismberry-tax-calculator", version: "1.0.0" },
      } as MCPInitializeResult;

    case "tools/list":
      return { tools: TOOLS } as MCPListToolsResult;

    case "tools/call":
      return callTool(params.name as string, (params.arguments ?? {}) as Record<string, unknown>);

    case "ping":
      return {};

    default:
      throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
  }
}

// ─── Tool handler ──────────────────────────────────────────────────────────────
async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "calculate_sip": {
      const data = await TaxEngine.sip(args as Parameters<typeof TaxEngine.sip>[0]);
      return text(
        `📈 ${APP_NAME} — SIP / LUMPSUM CALCULATOR\n\n` +
        `Invested Amount:   ₹${fmt(data.invested_amount)}\n` +
        `Wealth Gained:     ₹${fmt(Math.round(data.wealth_gained))}\n` +
        `Total Wealth:      ₹${fmt(Math.round(data.total_wealth))}\n\n` +
        `Returns are ${((data.wealth_gained / data.invested_amount) * 100).toFixed(1)}% of your investment.`
      );
    }

    case "calculate_rd": {
      const data = await TaxEngine.rd(args as Parameters<typeof TaxEngine.rd>[0]);
      return text(
        `🏦 ${APP_NAME} — RECURRING DEPOSIT CALCULATOR\n\n` +
        `Invested Amount:      ₹${fmt(data.invested_amount)}\n` +
        `Estimated Returns:    ₹${fmt(Math.round(data.estimated_returns))}\n` +
        `Total Maturity Value: ₹${fmt(Math.round(data.total_maturity_amount))}`
      );
    }

    case "calculate_nps": {
      const data = await TaxEngine.nps(args as Parameters<typeof TaxEngine.nps>[0]);
      return text(
        `🏛️ ${APP_NAME} — NPS RETIREMENT CALCULATOR\n\n` +
        `Total Invested:       ₹${fmt(data.invested_amount)}\n` +
        `Pension Wealth:       ₹${fmt(data.pension_wealth)}\n` +
        `Lumpsum Withdrawal:   ₹${fmt(data.lumpsum_amount)}\n` +
        `Monthly Pension:      ₹${fmt(data.monthly_pension)}\n\n` +
        `Wealth grew ${((data.pension_wealth / data.invested_amount) * 100 - 100).toFixed(1)}% over your contribution period.`
      );
    }

    case "calculate_leave_encashment": {
      const data = await TaxEngine.leaveEncashment(
        args as Parameters<typeof TaxEngine.leaveEncashment>[0]
      );
      return text(
        `📋 ${APP_NAME} — LEAVE ENCASHMENT CALCULATOR\n\n` +
        `Leave Encashment Amount: ₹${fmt(data.leave_encashment_available)}\n` +
        `Exemption:               ₹${fmt(data.exemption)}\n` +
        `Taxable Leave Salary:    ₹${fmt(data.taxable_leave_salary)}`
      );
    }

    case "calculate_tds": {
      const data = await TaxEngine.tds(args as Parameters<typeof TaxEngine.tds>[0]);
      const amount = parseFloat(args.amount as string);
      const rate = amount > 0 ? ((data.tds / amount) * 100).toFixed(2) : "0";
      return text(
        `🧾 ${APP_NAME} — TDS CALCULATOR\n\n` +
        `Payment Amount:  ₹${fmt(amount)}\n` +
        `TDS Deducted:    ₹${fmt(data.tds)}\n` +
        `Effective Rate:  ${rate}%\n` +
        `Net Receivable:  ₹${fmt(amount - data.tds)}`
      );
    }

    case "calculate_salary_breakup": {
      const body = {
        gross_salary: (args.gross_salary as string) ?? "0",
        professional_tax: (args.professional_tax as string) ?? "0",
        employee_pf_contribution: (args.employee_pf_contribution as string) ?? "0",
        csr_contribution: "0",
        labour_welfare_fund: "0",
        tax_deducted_at_source: (args.tax_deducted_at_source as string) ?? "0",
        other_deductions: (args.other_deductions as string) ?? "0",
      };
      const data = await TaxEngine.salary(body);
      const lines = [`💼 ${APP_NAME} — SALARY BREAKUP\n`];
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === "number") {
          const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          lines.push(`${label.padEnd(28)} ₹${fmt(Math.round(val))}`);
        }
      }
      return text(lines.join("\n"));
    }

    case "calculate_emi": {
      const data = await TaxEngine.emi(args as Parameters<typeof TaxEngine.emi>[0]);
      const d = data.loan_basic_details;
      const yearLines = Object.entries(data.yearly_summary)
        .slice(0, 5)
        .map(([yr, s]) =>
          `  ${yr}: EMI paid ₹${fmt(Math.round(s.total_emi))} | Principal ₹${fmt(Math.round(s.total_principal))} | Interest ₹${fmt(Math.round(s.total_interest))} | Balance ₹${fmt(Math.round(s.remaining_balance))}`
        )
        .join("\n");
      return text(
        `🏠 ${APP_NAME} — EMI CALCULATOR\n\n` +
        `Monthly EMI:             ₹${fmt(Math.round(d.emi))}\n` +
        `Total Interest Payable:  ₹${fmt(Math.round(d.total_interest_payable))}\n` +
        `Total Payment:           ₹${fmt(Math.round(d.total_payment))}\n\n` +
        `Year-wise Summary (first 5 years):\n${yearLines}\n\n` +
        `Full amortization schedule has ${data.monthly_schedule.length} monthly entries.`
      );
    }

    case "calculate_hra_exemption": {
      const data = await TaxEngine.hra({
        base_salary: args.base_salary as string,
        da_received: args.da_received as string,
        hra_received: args.hra_received as string,
        rent_paid: args.rent_paid as string,
        city: args.city as "metro" | "non-metro",
        name: "User",
        email: "user@prismberry.com",
        contact_number: "0000000000",
      });
      return text(
        `🏠 ${APP_NAME} — HRA EXEMPTION CALCULATOR\n\n` +
        `Basic Salary (annual):   ₹${fmt(data.basic_salary)}\n` +
        `HRA Received:            ₹${fmt(data.HRA_reccive)}\n` +
        `Exempted HRA:            ₹${fmt(data.Amount_of_exempted_HRA)}\n` +
        `Taxable HRA:             ₹${fmt(data.HRA_chargeable_to_tax)}\n\n` +
        `You can claim ₹${fmt(data.Amount_of_exempted_HRA)} as HRA exemption under Section 10(13A).`
      );
    }

    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32601 });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}

function errResp(id: unknown, code: number, message: string): MCPResponse {
  return { jsonrpc: "2.0", id: id as string | number | null, error: { code, message } };
}

export { app };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`${APP_NAME} MCP server running on http://${HOST}:${PORT}`);
    console.log(`MCP endpoint → http://${HOST}:${PORT}/mcp`);
  });
}
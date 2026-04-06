/**
 * Unit tests — MCP server request handling
 * TaxSpannerAPI is fully mocked — no real HTTP calls
 */

import request from "supertest";
import { app } from "../../src/index";

// ─── Mock TaxSpannerAPI ────────────────────────────────────────────────────────
jest.mock("../../src/tax-engine", () => ({
  TaxEngine: {
    sip: jest.fn().mockResolvedValue({
      total_wealth: 50457600,
      invested_amount: 1800000,
      wealth_gained: 48657600,
    }),
    rd: jest.fn().mockResolvedValue({
      invested_amount: 285000,
      estimated_returns: 59991,
      total_maturity_amount: 344991,
    }),
    nps: jest.fn().mockResolvedValue({
      invested_amount: 3600000,
      pension_wealth: 15002951,
      lumpsum_amount: 9001771,
      monthly_pension: 30005,
    }),
    leaveEncashment: jest.fn().mockResolvedValue({
      leave_encashment_available: 12000,
      exemption: 0,
      taxable_leave_salary: 12000,
    }),
    tds: jest.fn().mockResolvedValue({ tds: 10000 }),
    salary: jest.fn().mockResolvedValue({
      gross_salary: 600000,
      net_salary: 540000,
      total_deductions: 60000,
    }),
    emi: jest.fn().mockResolvedValue({
      loan_basic_details: {
        emi: 43391,
        total_interest_payable: 5413879,
        total_payment: 10413879,
      },
      yearly_summary: {
        "2026": {
          total_emi: 390520,
          total_principal: 73838,
          total_interest: 316683,
          remaining_balance: 4926162,
          loan_paid_percentage: 1.48,
        },
      },
      monthly_schedule: new Array(240).fill({
        year: 2026,
        month: 4,
        emi: 43391,
        principal_payment: 7974,
        interest_payment: 35417,
        remaining_balance: 4992026,
        loan_paid_percentage: 0.16,
      }),
    }),
    hra: jest.fn().mockResolvedValue({
      status: 200,
      Amount_of_exempted_HRA: 120000,
      HRA_chargeable_to_tax: 0,
      basic_salary: 300000,
      HRA_reccive: 120000,
    }),
  },
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────
function mcpPost(method: string, params: Record<string, unknown> = {}) {
  return request(app)
    .post("/mcp")
    .send({ jsonrpc: "2.0", id: 1, method, params });
}

function toolCall(name: string, args: Record<string, unknown>) {
  return mcpPost("tools/call", { name, arguments: args });
}

// ─── Protocol tests ────────────────────────────────────────────────────────────
describe("MCP Protocol", () => {
  describe("initialize", () => {
    it("returns protocolVersion 2025-03-26", async () => {
      const res = await mcpPost("initialize");
      expect(res.status).toBe(200);
      expect(res.body.result.protocolVersion).toBe("2025-03-26");
    });

    it("returns correct serverInfo name", async () => {
      const res = await mcpPost("initialize");
      expect(res.body.result.serverInfo.name).toBe("prismberry-tax-calculator");
    });

    it("advertises tools capability", async () => {
      const res = await mcpPost("initialize");
      expect(res.body.result.capabilities.tools).toBeDefined();
    });
  });

  describe("tools/list", () => {
    it("returns 8 tools", async () => {
      const res = await mcpPost("tools/list");
      expect(res.body.result.tools).toHaveLength(8);
    });

    it("each tool has name, description, inputSchema", async () => {
      const res = await mcpPost("tools/list");
      for (const tool of res.body.result.tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });

  describe("ping", () => {
    it("returns empty object", async () => {
      const res = await mcpPost("ping");
      expect(res.body.result).toEqual({});
    });
  });

  describe("unknown method", () => {
    it("returns JSON-RPC error -32603", async () => {
      const res = await mcpPost("nonexistent/method");
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(-32603);
    });
  });

  describe("invalid JSON-RPC", () => {
    it("returns 400 for missing jsonrpc field", async () => {
      const res = await request(app)
        .post("/mcp")
        .send({ id: 1, method: "initialize" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(-32600);
    });
  });
});

// ─── Health & domain verification ─────────────────────────────────────────────
describe("HTTP endpoints", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.app).toBe("Prismberry Tax Calculator");
  });

  it("GET /.well-known/openai-domain-verification.txt returns text", async () => {
    const res = await request(app).get("/.well-known/openai-domain-verification.txt");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text/);
  });
});

// ─── Tool: calculate_sip ───────────────────────────────────────────────────────
describe("tools/call — calculate_sip", () => {
  const args = {
    sip_investment_or_lumpsum: "SIP",
    monthly_sip_amount: 10000,
    sip_period: 15,
    expected_return_rate: 12,
  };

  it("returns content array with text type", async () => {
    const res = await toolCall("calculate_sip", args);
    expect(res.body.result.content[0].type).toBe("text");
  });

  it("response text contains Prismberry Tax Calculator branding", async () => {
    const res = await toolCall("calculate_sip", args);
    expect(res.body.result.content[0].text).toContain("Prismberry Tax Calculator");
  });

  it("response text contains Invested Amount", async () => {
    const res = await toolCall("calculate_sip", args);
    expect(res.body.result.content[0].text).toContain("Invested Amount");
  });

  it("response text contains Total Wealth", async () => {
    const res = await toolCall("calculate_sip", args);
    expect(res.body.result.content[0].text).toContain("Total Wealth");
  });
});

// ─── Tool: calculate_rd ───────────────────────────────────────────────────────
describe("tools/call — calculate_rd", () => {
  const args = { monthly_rd_investment: 5000, time_period: 57, rd_interest_rate: 7.75 };

  it("response contains Total Maturity Value", async () => {
    const res = await toolCall("calculate_rd", args);
    expect(res.body.result.content[0].text).toContain("Total Maturity Value");
  });

  it("response contains Estimated Returns", async () => {
    const res = await toolCall("calculate_rd", args);
    expect(res.body.result.content[0].text).toContain("Estimated Returns");
  });
});

// ─── Tool: calculate_nps ──────────────────────────────────────────────────────
describe("tools/call — calculate_nps", () => {
  const args = {
    your_age: 30,
    monthly_investment: 10000,
    expected_return_on_investment: 8,
    percentage_of_annuity_purchase: 40,
    expected_return_of_annuity: 6,
  };

  it("response contains Monthly Pension", async () => {
    const res = await toolCall("calculate_nps", args);
    expect(res.body.result.content[0].text).toContain("Monthly Pension");
  });

  it("response contains Pension Wealth", async () => {
    const res = await toolCall("calculate_nps", args);
    expect(res.body.result.content[0].text).toContain("Pension Wealth");
  });

  it("response contains Lumpsum Withdrawal", async () => {
    const res = await toolCall("calculate_nps", args);
    expect(res.body.result.content[0].text).toContain("Lumpsum Withdrawal");
  });
});

// ─── Tool: calculate_leave_encashment ─────────────────────────────────────────
describe("tools/call — calculate_leave_encashment", () => {
  const args = {
    employee_type: "non_government",
    encashed_during: "during_service",
    basic_salary: 30000,
    total_years_of_service: 19,
    total_unused_leaves: 12,
    total_leaves_per_year: 4,
  };

  it("response contains Leave Encashment Amount", async () => {
    const res = await toolCall("calculate_leave_encashment", args);
    expect(res.body.result.content[0].text).toContain("Leave Encashment Amount");
  });

  it("response contains Taxable Leave Salary", async () => {
    const res = await toolCall("calculate_leave_encashment", args);
    expect(res.body.result.content[0].text).toContain("Taxable Leave Salary");
  });
});

// ─── Tool: calculate_tds ──────────────────────────────────────────────────────
describe("tools/call — calculate_tds", () => {
  const args = { pan: "yes", nature_of_payment: "194J", amount: "100000", recipient_type: "others" };

  it("response contains TDS Deducted", async () => {
    const res = await toolCall("calculate_tds", args);
    expect(res.body.result.content[0].text).toContain("TDS Deducted");
  });

  it("response contains Net Receivable", async () => {
    const res = await toolCall("calculate_tds", args);
    expect(res.body.result.content[0].text).toContain("Net Receivable");
  });

  it("calculates net receivable correctly (amount - tds)", async () => {
    const res = await toolCall("calculate_tds", args);
    // amount=100000, tds=10000 → net=90000
    expect(res.body.result.content[0].text).toContain("90,000");
  });

  it("calculates effective rate correctly", async () => {
    const res = await toolCall("calculate_tds", args);
    // 10000/100000 = 10%
    expect(res.body.result.content[0].text).toContain("10.00%");
  });
});

// ─── Tool: calculate_salary_breakup ───────────────────────────────────────────
describe("tools/call — calculate_salary_breakup", () => {
  const args = { gross_salary: "600000" };

  it("response contains SALARY BREAKUP header", async () => {
    const res = await toolCall("calculate_salary_breakup", args);
    expect(res.body.result.content[0].text).toContain("SALARY BREAKUP");
  });

  it("response contains numeric salary values", async () => {
    const res = await toolCall("calculate_salary_breakup", args);
    // mock returns gross_salary: 600000
    expect(res.body.result.content[0].text).toContain("₹");
  });
});

// ─── Tool: calculate_emi ──────────────────────────────────────────────────────
describe("tools/call — calculate_emi", () => {
  const args = {
    type_of_loan: "home_loan",
    loan_amount: 5000000,
    interest_rate: 8.5,
    loan_tenure: 20,
  };

  it("response contains Monthly EMI", async () => {
    const res = await toolCall("calculate_emi", args);
    expect(res.body.result.content[0].text).toContain("Monthly EMI");
  });

  it("response contains Total Interest Payable", async () => {
    const res = await toolCall("calculate_emi", args);
    expect(res.body.result.content[0].text).toContain("Total Interest Payable");
  });

  it("response contains Year-wise Summary", async () => {
    const res = await toolCall("calculate_emi", args);
    expect(res.body.result.content[0].text).toContain("Year-wise Summary");
  });

  it("response mentions amortization schedule entry count", async () => {
    const res = await toolCall("calculate_emi", args);
    // mock has 240 monthly entries
    expect(res.body.result.content[0].text).toContain("240 monthly entries");
  });
});

// ─── Tool: calculate_hra_exemption ────────────────────────────────────────────
describe("tools/call — calculate_hra_exemption", () => {
  const args = {
    base_salary: "600000",
    da_received: "0",
    hra_received: "120000",
    rent_paid: "180000",
    city: "metro",
  };

  it("response contains Exempted HRA", async () => {
    const res = await toolCall("calculate_hra_exemption", args);
    expect(res.body.result.content[0].text).toContain("Exempted HRA");
  });

  it("response contains Taxable HRA", async () => {
    const res = await toolCall("calculate_hra_exemption", args);
    expect(res.body.result.content[0].text).toContain("Taxable HRA");
  });

  it("response mentions Section 10(13A)", async () => {
    const res = await toolCall("calculate_hra_exemption", args);
    expect(res.body.result.content[0].text).toContain("Section 10(13A)");
  });
});

// ─── Unknown tool ──────────────────────────────────────────────────────────────
describe("tools/call — unknown tool", () => {
  it("returns JSON-RPC error for unknown tool name", async () => {
    const res = await toolCall("calculate_unicorn", {});
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe(-32603);
  });
});

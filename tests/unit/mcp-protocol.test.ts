/**
 * Unit tests — MCP protocol definitions
 * Validates tool schemas are well-formed and complete
 */

import { TOOLS } from "../../src/mcp-protocol";

const EXPECTED_TOOLS = [
  "calculate_sip",
  "calculate_rd",
  "calculate_nps",
  "calculate_leave_encashment",
  "calculate_tds",
  "calculate_salary_breakup",
  "calculate_emi",
  "calculate_hra_exemption",
];

describe("TOOLS registry", () => {
  it("exports exactly 8 tools", () => {
    expect(TOOLS).toHaveLength(8);
  });

  it("contains all expected tool names", () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(EXPECTED_TOOLS));
  });

  it("every tool has a non-empty description", () => {
    for (const tool of TOOLS) {
      expect(tool.description.trim().length).toBeGreaterThan(10);
    }
  });

  it("every tool has a valid inputSchema of type object", () => {
    for (const tool of TOOLS) {
      expect(tool.inputSchema.type).toBe("object");
      expect(typeof tool.inputSchema.properties).toBe("object");
    }
  });

  it("every tool declares at least one required field", () => {
    for (const tool of TOOLS) {
      expect(tool.inputSchema.required?.length).toBeGreaterThan(0);
    }
  });
});

describe("calculate_sip schema", () => {
  const tool = TOOLS.find((t) => t.name === "calculate_sip")!;

  it("requires sip_investment_or_lumpsum, sip_period, expected_return_rate", () => {
    expect(tool.inputSchema.required).toEqual(
      expect.arrayContaining(["sip_investment_or_lumpsum", "sip_period", "expected_return_rate"])
    );
  });

  it("sip_investment_or_lumpsum is an enum of SIP and Lumpsum", () => {
    const prop = tool.inputSchema.properties.sip_investment_or_lumpsum as { enum: string[] };
    expect(prop.enum).toEqual(["SIP", "Lumpsum"]);
  });
});

describe("calculate_emi schema", () => {
  const tool = TOOLS.find((t) => t.name === "calculate_emi")!;

  it("requires type_of_loan, loan_amount, interest_rate, loan_tenure", () => {
    expect(tool.inputSchema.required).toEqual(
      expect.arrayContaining(["type_of_loan", "loan_amount", "interest_rate", "loan_tenure"])
    );
  });

  it("type_of_loan enum includes home_loan, car_loan, personal_loan", () => {
    const prop = tool.inputSchema.properties.type_of_loan as { enum: string[] };
    expect(prop.enum).toEqual(expect.arrayContaining(["home_loan", "car_loan", "personal_loan"]));
  });
});

describe("calculate_hra_exemption schema", () => {
  const tool = TOOLS.find((t) => t.name === "calculate_hra_exemption")!;

  it("requires base_salary, da_received, hra_received, rent_paid, city", () => {
    expect(tool.inputSchema.required).toEqual(
      expect.arrayContaining(["base_salary", "da_received", "hra_received", "rent_paid", "city"])
    );
  });

  it("city enum is metro and non-metro", () => {
    const prop = tool.inputSchema.properties.city as { enum: string[] };
    expect(prop.enum).toEqual(["metro", "non-metro"]);
  });
});

describe("calculate_tds schema", () => {
  const tool = TOOLS.find((t) => t.name === "calculate_tds")!;

  it("pan enum is yes and no", () => {
    const prop = tool.inputSchema.properties.pan as { enum: string[] };
    expect(prop.enum).toEqual(["yes", "no"]);
  });
});

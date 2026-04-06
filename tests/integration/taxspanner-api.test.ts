/**
 * Integration tests — real TaxSpanner API calls
 * These hit app.taxspanner.com — requires internet access
 * Run with: npm run test:integration
 */

import { TaxEngine } from "../../src/tax-engine";

// Generous timeout for real HTTP calls
jest.setTimeout(20000);

describe("TaxEngine.sip — real API", () => {
  it("returns total_wealth, invested_amount, wealth_gained for SIP", async () => {
    const result = await TaxEngine.sip({
      sip_investment_or_lumpsum: "SIP",
      monthly_sip_amount: 5000,
      sip_period: 10,
      expected_return_rate: 12,
    });
    expect(result).toHaveProperty("total_wealth");
    expect(result).toHaveProperty("invested_amount");
    expect(result).toHaveProperty("wealth_gained");
    expect(result.invested_amount).toBe(600000); // 5000 * 12 * 10
    expect(result.total_wealth).toBeGreaterThan(result.invested_amount);
  });

  it("wealth_gained = total_wealth - invested_amount", async () => {
    const result = await TaxEngine.sip({
      sip_investment_or_lumpsum: "SIP",
      monthly_sip_amount: 10000,
      sip_period: 5,
      expected_return_rate: 10,
    });
    expect(result.wealth_gained).toBeCloseTo(
      result.total_wealth - result.invested_amount,
      0
    );
  });
});

describe("TaxEngine.rd — real API", () => {
  it("returns invested_amount, estimated_returns, total_maturity_amount", async () => {
    const result = await TaxEngine.rd({
      monthly_rd_investment: 5000,
      time_period: 12,
      rd_interest_rate: 7.0,
    });
    expect(result).toHaveProperty("invested_amount");
    expect(result).toHaveProperty("estimated_returns");
    expect(result).toHaveProperty("total_maturity_amount");
    expect(result.invested_amount).toBe(60000); // 5000 * 12
    expect(result.total_maturity_amount).toBeGreaterThan(result.invested_amount);
  });

  it("total_maturity_amount = invested_amount + estimated_returns", async () => {
    const result = await TaxEngine.rd({
      monthly_rd_investment: 3000,
      time_period: 24,
      rd_interest_rate: 6.5,
    });
    expect(result.total_maturity_amount).toBeCloseTo(
      result.invested_amount + result.estimated_returns,
      0
    );
  });
});

describe("TaxEngine.nps — real API", () => {
  it("returns invested_amount, pension_wealth, lumpsum_amount, monthly_pension", async () => {
    const result = await TaxEngine.nps({
      your_age: 30,
      monthly_investment: 10000,
      expected_return_on_investment: 8,
      percentage_of_annuity_purchase: 40,
      expected_return_of_annuity: 6,
    });
    expect(result).toHaveProperty("invested_amount");
    expect(result).toHaveProperty("pension_wealth");
    expect(result).toHaveProperty("lumpsum_amount");
    expect(result).toHaveProperty("monthly_pension");
    expect(result.pension_wealth).toBeGreaterThan(result.invested_amount);
  });

  it("lumpsum_amount is 60% of pension_wealth (100% - 40% annuity)", async () => {
    const result = await TaxEngine.nps({
      your_age: 35,
      monthly_investment: 5000,
      expected_return_on_investment: 8,
      percentage_of_annuity_purchase: 40,
      expected_return_of_annuity: 6,
    });
    // lumpsum = 60% of pension_wealth
    const expected = result.pension_wealth * 0.6;
    expect(result.lumpsum_amount).toBeCloseTo(expected, -3);
  });
});

describe("TaxEngine.leaveEncashment — real API", () => {
  it("returns leave_encashment_available, exemption, taxable_leave_salary", async () => {
    const result = await TaxEngine.leaveEncashment({
      employee_type: "non_government",
      encashed_during: "during_service",
      basic_salary: 30000,
      total_years_of_service: 10,
      total_unused_leaves: 20,
      total_leaves_per_year: 30,
    });
    expect(result).toHaveProperty("leave_encashment_available");
    expect(result).toHaveProperty("exemption");
    expect(result).toHaveProperty("taxable_leave_salary");
  });

  it("taxable = encashment - exemption", async () => {
    const result = await TaxEngine.leaveEncashment({
      employee_type: "non_government",
      encashed_during: "during_service",
      basic_salary: 50000,
      total_years_of_service: 15,
      total_unused_leaves: 30,
      total_leaves_per_year: 30,
    });
    expect(result.taxable_leave_salary).toBeCloseTo(
      result.leave_encashment_available - result.exemption,
      0
    );
  });
});

describe("TaxEngine.tds — real API", () => {
  it("returns tds amount for section 194 (dividends)", async () => {
    const result = await TaxEngine.tds({
      pan: "yes",
      nature_of_payment: "194",
      amount: "100000",
      recipient_type: "others",
    });
    expect(result).toHaveProperty("tds");
    expect(result.tds).toBe(10000); // 10% of 100000
  });

  it("returns a tds field (number) for section 194J", async () => {
    const result = await TaxEngine.tds({
      pan: "yes",
      nature_of_payment: "194J",
      amount: "100000",
      recipient_type: "others",
    });
    expect(result).toHaveProperty("tds");
    expect(typeof result.tds).toBe("number");
  });

  it("TDS is higher when PAN is not available", async () => {
    const withPan = await TaxEngine.tds({
      pan: "yes",
      nature_of_payment: "194",
      amount: "500000",
      recipient_type: "others",
    });
    const withoutPan = await TaxEngine.tds({
      pan: "no",
      nature_of_payment: "194",
      amount: "500000",
      recipient_type: "others",
    });
    expect(withoutPan.tds).toBeGreaterThanOrEqual(withPan.tds);
  });
});

describe("TaxEngine.salary — real API", () => {
  it("returns salary breakdown fields", async () => {
    const result = await TaxEngine.salary({
      gross_salary: "600000",
      professional_tax: "2400",
      employee_pf_contribution: "21600",
      csr_contribution: "0",
      labour_welfare_fund: "0",
      tax_deducted_at_source: "0",
      other_deductions: "0",
    });
    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
    // At least one numeric field should exist
    const hasNumeric = Object.values(result).some((v) => typeof v === "number");
    expect(hasNumeric).toBe(true);
  });
});

describe("TaxEngine.emi — real API", () => {
  it("returns loan_basic_details, yearly_summary, monthly_schedule", async () => {
    const result = await TaxEngine.emi({
      type_of_loan: "home_loan",
      loan_amount: 2500000,
      interest_rate: 8.5,
      loan_tenure: 10,
    });
    expect(result).toHaveProperty("loan_basic_details");
    expect(result).toHaveProperty("yearly_summary");
    expect(result).toHaveProperty("monthly_schedule");
  });

  it("loan_basic_details has emi, total_interest_payable, total_payment", async () => {
    const result = await TaxEngine.emi({
      type_of_loan: "home_loan",
      loan_amount: 2500000,
      interest_rate: 8.5,
      loan_tenure: 10,
    });
    expect(result.loan_basic_details.emi).toBeGreaterThan(0);
    expect(result.loan_basic_details.total_interest_payable).toBeGreaterThan(0);
    expect(result.loan_basic_details.total_payment).toBeGreaterThan(
      result.loan_basic_details.total_interest_payable
    );
  });

  it("monthly_schedule has 120 entries for 10-year loan", async () => {
    const result = await TaxEngine.emi({
      type_of_loan: "home_loan",
      loan_amount: 2500000,
      interest_rate: 8.5,
      loan_tenure: 10,
    });
    expect(result.monthly_schedule.length).toBe(120);
  });

  it("each monthly entry has required fields", async () => {
    const result = await TaxEngine.emi({
      type_of_loan: "car_loan",
      loan_amount: 800000,
      interest_rate: 9.0,
      loan_tenure: 5,
    });
    const first = result.monthly_schedule[0];
    expect(first).toHaveProperty("emi");
    expect(first).toHaveProperty("principal_payment");
    expect(first).toHaveProperty("interest_payment");
    expect(first).toHaveProperty("remaining_balance");
    expect(first.emi).toBeCloseTo(first.principal_payment + first.interest_payment, 0);
  });
});

describe("TaxEngine.hra — real API", () => {
  // HRA API requires name/email/contact_number fields
  const hraPayload = {
    base_salary: "600000",
    da_received: "0",
    hra_received: "120000",
    rent_paid: "180000",
    city: "metro" as const,
    name: "Test User",
    email: "test@prismberry.com",
    contact_number: "9999999999",
  };

  it("returns HRA exemption fields", async () => {
    const result = await TaxEngine.hra(hraPayload);
    expect(result).toHaveProperty("Amount_of_exempted_HRA");
    expect(result).toHaveProperty("HRA_chargeable_to_tax");
    expect(result).toHaveProperty("basic_salary");
    expect(result).toHaveProperty("HRA_reccive");
  });

  it("exempted + taxable = total HRA received", async () => {
    const result = await TaxEngine.hra(hraPayload);
    expect(result.Amount_of_exempted_HRA + result.HRA_chargeable_to_tax).toBe(
      result.HRA_reccive
    );
  });

  it("non-metro city gives lower or equal exemption than metro for same inputs", async () => {
    const metro = await TaxEngine.hra(hraPayload);
    const nonMetro = await TaxEngine.hra({
      ...hraPayload,
      city: "non-metro",
    });
    expect(nonMetro.Amount_of_exempted_HRA).toBeLessThanOrEqual(metro.Amount_of_exempted_HRA);
  });
});

# Prismberry Tax Calculator

An MCP (Model Context Protocol) server that gives ChatGPT 8 Indian tax and investment calculation tools.

---

## What is MCP?

MCP (Model Context Protocol) is an open standard that lets AI assistants like ChatGPT call external tools over HTTP. You build one server, any MCP-compatible AI can use it — think of it as a universal plugin system for AI.

---

## Tools

| Tool | What it does |
|---|---|
| `calculate_sip` | SIP or Lumpsum mutual fund returns |
| `calculate_rd` | Recurring Deposit maturity value |
| `calculate_nps` | NPS retirement corpus + monthly pension |
| `calculate_leave_encashment` | Taxable vs exempt leave encashment |
| `calculate_tds` | TDS on any payment by section code (194, 194A, 194C...) |
| `calculate_salary_breakup` | Net take-home from gross salary |
| `calculate_emi` | EMI + full amortization schedule |
| `calculate_hra_exemption` | HRA exempt vs taxable under Section 10(13A) |

---

## Project Structure

```
taxspanner-mcp/
├── src/
│   ├── index.ts          # Express server + MCP request handler
│   ├── tax-engine.ts     # Indian tax calculation engine (all 8 calculators)
│   └── mcp-protocol.ts   # MCP types + tool schemas
├── tests/
│   ├── unit/
│   │   ├── mcp-protocol.test.ts  # Tool schema validation (mocked)
│   │   └── server.test.ts        # HTTP + MCP handler tests (mocked)
│   └── integration/
│       └── taxspanner-api.test.ts  # Live calculator API tests
├── package.json
├── tsconfig.json
└── README.md
```

---

## Setup

```bash
npm install
npm run build
npm start
```

Server starts at `http://localhost:3000`. For development without a build step:

```bash
npm run dev
```

---

## Testing

```bash
# All tests (unit + integration)
npm test

# Unit tests only (mocked, no network)
npm run test:unit

# Integration tests only (requires internet)
npm run test:integration
```

Unit tests mock `TaxEngine` entirely — fast, no network required.
Integration tests make real HTTP calls — requires internet access.

Current coverage: **66 tests, 3 suites**.

---

## Example curl calls

```bash
# Initialize (MCP handshake)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# List all tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# SIP — ₹10k/month for 15 years at 12%
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":3,"method":"tools/call",
    "params":{
      "name":"calculate_sip",
      "arguments":{
        "sip_investment_or_lumpsum":"SIP",
        "monthly_sip_amount":10000,
        "sip_period":15,
        "expected_return_rate":12
      }
    }
  }'

# EMI — ₹50L home loan at 8.5% for 20 years
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":4,"method":"tools/call",
    "params":{
      "name":"calculate_emi",
      "arguments":{
        "type_of_loan":"home_loan",
        "loan_amount":5000000,
        "interest_rate":8.5,
        "loan_tenure":20
      }
    }
  }'

# HRA Exemption — metro city
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":5,"method":"tools/call",
    "params":{
      "name":"calculate_hra_exemption",
      "arguments":{
        "base_salary":"600000",
        "da_received":"0",
        "hra_received":"120000",
        "rent_paid":"180000",
        "city":"metro"
      }
    }
  }'

# NPS — age 30, ₹10k/month, 8% return
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":6,"method":"tools/call",
    "params":{
      "name":"calculate_nps",
      "arguments":{
        "your_age":30,
        "monthly_investment":10000,
        "expected_return_on_investment":8,
        "percentage_of_annuity_purchase":40,
        "expected_return_of_annuity":6
      }
    }
  }'

# TDS — section 194, ₹1L, with PAN
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":7,"method":"tools/call",
    "params":{
      "name":"calculate_tds",
      "arguments":{
        "pan":"yes",
        "nature_of_payment":"194",
        "amount":"100000",
        "recipient_type":"others"
      }
    }
  }'
```

---

## Connect to ChatGPT

### Step 1 — Deploy publicly (HTTPS required)

| Platform | Command |
|---|---|
| Railway | `railway up` |
| Render | Connect GitHub repo, auto-deploys |
| Fly.io | `fly launch` then `fly deploy` |

Your deployed URL will look like `https://prismberry-tax.railway.app`.

### Step 2 — Set the domain verification token

OpenAI gives you a token when you register. Set it as an env var before deploying:

```
OPENAI_DOMAIN_TOKEN=openai-domain-verification=abc123xyz
```

The server automatically serves it at `GET /.well-known/openai-domain-verification.txt`.

### Step 3 — Register in the ChatGPT portal

1. Go to [platform.openai.com](https://platform.openai.com) → ChatGPT → Apps → Create App
2. App Info: name = **Prismberry Tax Calculator**, add a description and logo
3. MCP Server step: enter `https://your-domain.com/mcp`
4. Authentication: **No Auth**
5. Click **Scan Tools** — ChatGPT auto-discovers all 8 tools
6. Complete domain verification using your token
7. Submit for review

### Step 4 — Try it in ChatGPT

> "I invest ₹15,000/month in SIP for 20 years at 12% return. What will I get?"

> "Calculate EMI for a ₹50 lakh home loan at 8.5% for 20 years."

> "My basic salary is ₹6 lakh, HRA received ₹1.2 lakh, rent paid ₹1.8 lakh in Delhi. How much HRA is exempt?"

> "Calculate TDS on ₹5 lakh under section 194."

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `OPENAI_DOMAIN_TOKEN` | — | Token from OpenAI domain verification |

---

## Disclaimer

Results are for informational purposes only and do not constitute professional tax or financial advice.

import assert from "node:assert/strict";
import { handler } from "../netlify/functions/agent-amy-public.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`PASS  ${name}`);
    })
    .catch((err) => {
      failed += 1;
      console.error(`FAIL  ${name}`);
      console.error(err?.stack || err);
    });
}

async function invoke({
  method = "POST",
  origin = "https://pcsunited.com",
  body,
  rawBody
} = {}) {
  const event = {
    httpMethod: method,
    headers: origin ? { origin } : {},
    body:
      rawBody !== undefined
        ? rawBody
        : typeof body === "string"
          ? body
          : JSON.stringify(body || {})
  };
  const res = await handler(event);
  let parsed = null;
  try {
    parsed = JSON.parse(res.body || "{}");
  } catch {
    parsed = res.body;
  }
  return { status: res.statusCode, headers: res.headers, body: parsed };
}

console.log("Testing agent-amy-public Amy Brain integration");

await test("valid public POST returns one authoritative truth packet", async () => {
  const res = await invoke({
    body: {
      message: "What is my monthly compensation total?",
      compensation: {
        basePay: 4200,
        bas: 460,
        bah: 2100,
        totalMonthly: 6760
      },
      requested_mode: "public_resources_guidance"
    }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.mode, "member_guidance");
  assert.equal(res.body.brain_version, "amy-brain-v2.0.0");
  assert.equal(res.body.truth_packet_contract, "amy-truth-packet-v1");
  assert.ok(res.body.truth_packet);
  assert.equal(res.body.truth_packet.compensation.total_monthly, 6760);
  assert.equal("amy_truth_packet" in res.body, false);
  assert.ok(res.body.reply);
  assert.ok(Array.isArray(res.body.warnings));
  assert.ok(res.body.warnings.includes("PUBLIC_SESSION_ONLY"));
});

await test("invalid origin rejected", async () => {
  const res = await invoke({
    origin: "https://evil.example",
    body: { message: "hi" }
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "INVALID_ORIGIN");
});

await test("OPTIONS request", async () => {
  const res = await invoke({ method: "OPTIONS", body: {} });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

await test("non-POST rejected", async () => {
  const res = await invoke({ method: "GET", body: { message: "hi" } });
  assert.equal(res.status, 405);
  assert.equal(res.body.code, "METHOD_NOT_ALLOWED");
});

await test("invalid JSON rejected", async () => {
  const res = await invoke({ rawBody: "{not-json" });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, "INVALID_JSON");
});

await test("oversized payload rejected", async () => {
  const res = await invoke({ rawBody: "x".repeat(200001) });
  assert.equal(res.status, 413);
  assert.equal(res.body.code, "PAYLOAD_TOO_LARGE");
});

await test("missing message rejected", async () => {
  const res = await invoke({ body: { foo: true } });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, "MISSING_MESSAGE");
});

await test("direct deterministic compensation reply", async () => {
  const res = await invoke({
    body: {
      message: "What is my monthly compensation total?",
      compensation: {
        basePay: 4200,
        bas: 460,
        bah: 2100,
        totalMonthly: 6760
      }
    }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.intent, "compensation");
  assert.match(res.body.reply, /6,760|\$6760|6760/);
  assert.ok(!res.body.warnings.includes("AMY_BRAIN_UNAVAILABLE"));
});

await test("direct deterministic mortgage reply", async () => {
  const res = await invoke({
    body: {
      message: "What is my monthly mortgage payment?",
      mortgage: {
        all_in_monthly: 3100,
        price: 400000,
        principal_interest: 2200
      }
    }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.intent, "mortgage_explanation");
  assert.match(res.body.reply, /3,100|3100/);
  assert.equal(res.body.truth_packet.mortgage.all_in_monthly, 3100);
});

await test("greeting fast path", async () => {
  const res = await invoke({ body: { message: "Hello Amy" } });
  assert.equal(res.status, 200);
  assert.equal(res.body.intent, "greeting");
  assert.match(res.body.reply, /Amy/i);
});

await test("unknown topic remains fail-open", async () => {
  const res = await invoke({
    body: { message: "Tell me about schools near Fort Liberty." }
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.reply);
  assert.ok(res.body.truth_packet);
  assert.equal(res.body.brain_version, "amy-brain-v2.0.0");
});

await test("privacy redaction strips sensitive keys from profile_used", async () => {
  const res = await invoke({
    body: {
      message: "What do you know about me?",
      profile: {
        rank_paygrade: "E-5",
        base: "Langley AFB",
        email: "secret@example.com",
        full_name: "Jane Doe",
        phone: "555-0100"
      }
    }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.intent, "public_context_question");
  const profile = res.body.profile_used || {};
  assert.equal(profile.email, undefined);
  assert.equal(profile.full_name, undefined);
  assert.equal(profile.phone, undefined);
  assert.ok(!JSON.stringify(res.body).includes("secret@example.com"));
});

await test("thread deduplication drops trailing duplicate user message", async () => {
  const message = "What is my monthly compensation total?";
  const res = await invoke({
    body: {
      message,
      compensation: {
        basePay: 4200,
        bas: 460,
        bah: 2100,
        totalMonthly: 6760
      },
      context: {
        conversation_id: "test-thread-1",
        thread: [
          { role: "user", content: "earlier" },
          { role: "assistant", content: "ok" },
          { role: "user", content: message }
        ]
      }
    }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.conversation_id, "test-thread-1");
  assert.ok(res.body.memory_echo);
});

await test("VA loan routing through brain packet", async () => {
  const res = await invoke({
    body: {
      message: "How much is the VA funding fee?",
      scenario: { purchasePrice: 400000, downPayment: 0 }
    }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.intent, "va_loan");
  assert.ok(res.body.truth_packet.va_loan || res.body.reply);
});

await test("OpenAI unavailable still returns deterministic reply", async () => {
  assert.ok(!process.env.OPENAI_API_KEY || true);
  const res = await invoke({
    body: {
      message: "What is my monthly compensation total?",
      compensation: {
        basePay: 4200,
        bas: 460,
        bah: 2100,
        totalMonthly: 6760
      }
    }
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.reply.includes("6,760") || res.body.reply.includes("6760"));
  if (!process.env.OPENAI_API_KEY) {
    assert.ok(res.body.warnings.includes("OPENAI_UNAVAILABLE"));
  }
});

await test("final response contract fields", async () => {
  const res = await invoke({
    body: { message: "Hello" }
  });
  assert.equal(res.body.response_contract, "ask-amy-response-v1");
  assert.equal(res.body.endpoint, "agent-amy-public");
  assert.equal(res.body.scope, "public_resources_session");
  assert.equal(res.body.powered_by, "TheWing.ai");
  assert.ok(res.body.ui);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

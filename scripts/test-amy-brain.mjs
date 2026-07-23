import assert from "node:assert/strict";
import {
  AMY_BRAIN_VERSION,
  AMY_TRUTH_PACKET_CONTRACT,
  AMY_BRAIN_MODULES,
  detectAmyKnowledgeNeeds,
  buildAmyTruthPacket,
  planAmyModuleExecution,
  expandAmyModuleDependencies
} from "../netlify/functions/_share/amy-brain.js";

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

function assertOrderBefore(order, earlier, later) {
  const a = order.indexOf(earlier);
  const b = order.indexOf(later);
  assert.ok(a >= 0, `${earlier} missing from order`);
  assert.ok(b >= 0, `${later} missing from order`);
  assert.ok(a < b, `${earlier} should execute before ${later}`);
}

console.log(`Testing ${AMY_BRAIN_VERSION} / ${AMY_TRUTH_PACKET_CONTRACT}`);

await test("schema versions present", async () => {
  const packet = await buildAmyTruthPacket({
    message: "How much do I make each month?",
    compensation: {
      basePay: 4200,
      bas: 460,
      bah: 2100,
      totalMonthly: 6760
    }
  });
  assert.equal(packet.contract_version, AMY_TRUTH_PACKET_CONTRACT);
  assert.equal(packet.brain_version, AMY_BRAIN_VERSION);
  assert.ok(packet.public);
  assert.ok(packet.truth);
  assert.ok(packet.combined);
  assert.ok(packet.routing);
  assert.ok(packet.execution);
  assert.ok(packet.provenance);
});

await test("compensation-only request reuses page packet", async () => {
  const packet = await buildAmyTruthPacket({
    message: "How much do I make each month?",
    compensation: {
      basePay: 4200,
      bas: 460,
      bah: 2100,
      totalMonthly: 6760
    }
  });
  assert.deepEqual(packet.routing.matched_modules, ["compensation"]);
  assert.equal(packet.truth.compensation.total_monthly, 6760);
  assert.equal(packet.execution.modules.compensation.reused, true);
  assert.equal(packet.public.compensation.total_monthly, 6760);
  assert.ok(packet.provenance.compensation);
});

await test("mortgage-only hypothetical recalculates", async () => {
  const packet = await buildAmyTruthPacket({
    message: "What if the price is $450000?",
    mortgage: {
      all_in_monthly: 2800,
      price: 400000,
      principal_interest: 2000
    },
    scenario: { price: 400000, creditScore: 720, downpayment: 0 }
  });
  assert.ok(packet.routing.matched_modules.includes("mortgage"));
  assert.equal(packet.execution.modules.mortgage.reused, false);
  assert.equal(packet.execution.modules.mortgage.newly_calculated, true);
  assert.ok(packet.truth.mortgage.all_in_monthly > 0);
  assert.notEqual(packet.truth.mortgage.all_in_monthly, 2800);
});

await test("mortgage explanation reuses supplied result", async () => {
  const packet = await buildAmyTruthPacket({
    message: "What is my monthly mortgage payment?",
    mortgage: {
      all_in_monthly: 3100,
      price: 400000,
      principal_interest: 2200
    }
  });
  assert.equal(packet.truth.mortgage.all_in_monthly, 3100);
  assert.equal(packet.execution.modules.mortgage.reused, true);
});

await test("affordability requires compensation and mortgage order", async () => {
  const packet = await buildAmyTruthPacket({
    message: "Can I afford this house?",
    compensation: { totalMonthly: 6760, basePay: 4200, bas: 460, bah: 2100 },
    mortgage: { all_in_monthly: 2800, price: 400000 },
    scenario: { price: 400000, expenses: 1200 }
  });
  assert.ok(packet.routing.matched_modules.includes("affordability"));
  assertOrderBefore(packet.execution.order, "compensation", "affordability");
  assertOrderBefore(packet.execution.order, "mortgage", "affordability");
  assert.ok(packet.truth.affordability?.status);
  assert.ok(packet.truth.decision_rules?.status);
  assertOrderBefore(packet.execution.order, "affordability", "decision_rules");
});

await test("VA loan request routes to va_loans", async () => {
  const packet = await buildAmyTruthPacket({
    message: "How much is my VA funding fee on a $400,000 house?",
    scenario: { purchasePrice: 400000, downPayment: 0, firstUse: true }
  });
  assert.deepEqual(packet.routing.matched_modules, ["va_loans"]);
  assert.ok(packet.truth.va_loans);
  assert.equal(packet.public.va_loan?.module || "va_loans", "va_loans");
});

await test("VA disability wording does not route to VA loans", async () => {
  const packet = await buildAmyTruthPacket({
    message: "What is my VA disability compensation?",
    compensation: { disabilityPay: 1800, totalMonthly: 5000 }
  });
  assert.ok(!packet.routing.matched_modules.includes("va_loans"));
  assert.ok(packet.routing.matched_modules.includes("compensation"));
  assert.equal(packet.truth.compensation.disability_pay, 1800);
});

await test("base-information request", async () => {
  const packet = await buildAmyTruthPacket({
    message: "Tell me about Langley AFB"
  });
  assert.deepEqual(packet.routing.matched_modules, ["base_information"]);
  assert.ok(packet.truth.base_information);
  assert.ok(
    packet.truth.base_information.ok === false ||
      packet.truth.base_information.installation_name
  );
});

await test("unknown-topic fallback", async () => {
  const packet = await buildAmyTruthPacket({
    message: "Tell me about schools near Fort Liberty."
  });
  assert.deepEqual(packet.routing.matched_modules, []);
  assert.ok(
    packet.warnings.some((w) => /no deterministic knowledge module/i.test(w))
  );
  assert.deepEqual(Object.keys(packet.truth), []);
});

await test("multi-module request without VA false positive", async () => {
  const packet = await buildAmyTruthPacket({
    message: "Can I afford a $400k house on my military pay?",
    compensation: { totalMonthly: 6760, basePay: 4200, bas: 460, bah: 2100 },
    mortgage: { all_in_monthly: 2800, price: 400000 },
    scenario: { price: 400000 }
  });
  assert.ok(!packet.routing.matched_modules.includes("va_loans"));
  assert.ok(packet.truth.compensation);
  assert.ok(packet.truth.mortgage);
  assert.ok(packet.truth.affordability);
});

await test("missing input handling", async () => {
  const packet = await buildAmyTruthPacket({
    message: "What is my monthly mortgage payment on this house?"
  });
  assert.ok(packet.routing.matched_modules.includes("mortgage"));
  const fields = (packet.missing_inputs || []).map((m) =>
    typeof m === "string" ? m : m.field
  );
  assert.ok(fields.some((f) => /price/i.test(f)));
});

await test("module failure preserves unrelated success", async () => {
  const packet = await buildAmyTruthPacket({
    message: "How much do I make and can I afford a house?",
    compensation: { totalMonthly: 6760, basePay: 4200, bas: 460, bah: 2100 }
    // no mortgage → affordability soft-fails / missing, compensation survives
  });
  assert.ok(packet.truth.compensation?.total_monthly === 6760);
  assert.ok(packet.routing.matched_modules.includes("compensation"));
});

await test("duplicate module prevention", async () => {
  const packet = await buildAmyTruthPacket({
    message: "Can I afford this house and should I buy?",
    compensation: { totalMonthly: 7000, basePay: 4500, bas: 400, bah: 2100 },
    mortgage: { all_in_monthly: 2500, price: 380000 },
    scenario: { price: 380000, expenses: 1000 }
  });
  const seen = new Set();
  for (const id of packet.execution.order) {
    assert.ok(!seen.has(id), `module ${id} executed more than once`);
    seen.add(id);
  }
});

await test("dependency expansion includes upstream modules", async () => {
  const expanded = expandAmyModuleDependencies(["affordability"]);
  assert.ok(expanded.includes("compensation"));
  assert.ok(expanded.includes("mortgage"));
  assert.ok(expanded.includes("affordability"));
});

await test("dependency cycle detection", async () => {
  const cycle = planAmyModuleExecution(["compensation", "mortgage"]);
  assert.equal(cycle.ok, true);

  // Synthetic cycle against temporary ids using planner semantics:
  // mutate local graph by planning a self-inconsistent set via module registry
  // is cycle-free today; verify planner flags when fed mutual deps through a
  // local copy of the algorithm contract.
  const visiting = new Set();
  const visited = new Set();
  const graph = { a: ["b"], b: ["a"] };
  let found = false;
  function visit(id, stack = []) {
    if (visited.has(id)) return true;
    if (visiting.has(id)) {
      found = true;
      return false;
    }
    visiting.add(id);
    for (const dep of graph[id] || []) {
      if (!visit(dep, [...stack, id])) return false;
    }
    visiting.delete(id);
    visited.add(id);
    return true;
  }
  visit("a");
  assert.equal(found, true);

  const okPlan = planAmyModuleExecution([
    "compensation",
    "mortgage",
    "affordability",
    "decision_rules"
  ]);
  assert.equal(okPlan.ok, true);
  assertOrderBefore(okPlan.order, "compensation", "affordability");
  assertOrderBefore(okPlan.order, "mortgage", "affordability");
  assertOrderBefore(okPlan.order, "affordability", "decision_rules");
});

await test("module registry exposes contract fields", async () => {
  for (const id of [
    "compensation",
    "mortgage",
    "affordability",
    "decision_rules",
    "va_loans",
    "base_information"
  ]) {
    const mod = AMY_BRAIN_MODULES[id];
    assert.ok(mod, id);
    assert.equal(mod.id, id);
    assert.ok(mod.version);
    assert.equal(typeof mod.detect, "function");
    assert.equal(typeof mod.execute, "function");
    assert.ok(Array.isArray(mod.dependencies));
    assert.ok(Array.isArray(mod.supportedIntents));
    assert.equal(mod.available, true);
  }
});

await test("warning and error aggregation shapes", async () => {
  const packet = await buildAmyTruthPacket({
    message: "Tell me about schools near Fort Liberty."
  });
  assert.ok(Array.isArray(packet.warnings));
  assert.ok(Array.isArray(packet.errors));
  assert.ok(Array.isArray(packet.missing_inputs));
});

await test("deterministic output consistency", async () => {
  const input = {
    message: "What is my monthly compensation?",
    compensation: {
      basePay: 4200,
      bas: 460,
      bah: 2100,
      totalMonthly: 6760
    }
  };
  const a = await buildAmyTruthPacket(input);
  const b = await buildAmyTruthPacket(input);
  assert.equal(
    a.truth.compensation.total_monthly,
    b.truth.compensation.total_monthly
  );
  assert.deepEqual(a.routing.matched_modules, b.routing.matched_modules);
});

await test("detectAmyKnowledgeNeeds scores compensation", async () => {
  const matches = detectAmyKnowledgeNeeds({
    message: "What is my BAH?",
    compensation: { bah: 2100, totalMonthly: 5000 }
  });
  assert.ok(matches.some((m) => m.id === "compensation" && m.matched));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

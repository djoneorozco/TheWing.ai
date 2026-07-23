import {
  AMY_BRAIN_VERSION,
  detectAmyKnowledgeNeeds,
  routeAmyKnowledge,
  buildAmyTruthPacket
} from "../netlify/functions/_share/amy-brain.js";

function printSection(title, value) {
  console.log("\n");
  console.log("==================================================");
  console.log(title);
  console.log("==================================================");
  console.dir(value, { depth: null });
}

async function runTest(name, input) {
  printSection(`${name} — INPUT`, input);

  const detected = detectAmyKnowledgeNeeds(input);
  printSection(`${name} — DETECTED MODULES`, detected);

  const routed = await routeAmyKnowledge(input);
  printSection(`${name} — ROUTED KNOWLEDGE`, routed);

  const truthPacket = await buildAmyTruthPacket(input);
  printSection(`${name} — AMY TRUTH PACKET`, truthPacket);
}

console.log(`Testing ${AMY_BRAIN_VERSION}`);

await runTest("TEST 1: Compensation", {
  message: "How much do I make each month?",
  profile: {
    mode: "active-duty"
  },
  compensation: {
    basePay: 4200,
    bas: 460,
    bah: 2100,
    totalMonthly: 6760
  }
});

await runTest("TEST 2: VA Funding Fee", {
  message: "How much is my VA funding fee on a $400,000 house?",
  profile: {
    serviceStatus: "active-duty",
    vaFundingFeeExempt: false
  },
  scenario: {
    purchasePrice: 400000,
    downPayment: 0,
    firstUse: true
  }
});

await runTest("TEST 3: Compensation and VA Loan", {
  message: "Can I afford a VA loan based on my military pay?",
  profile: {
    mode: "active-duty",
    serviceStatus: "active-duty"
  },
  compensation: {
    basePay: 4200,
    bas: 460,
    bah: 2100,
    totalMonthly: 6760
  },
  scenario: {
    purchasePrice: 400000,
    downPayment: 0
  }
});

await runTest("TEST 4: VA Disability Only", {
  message: "What is my VA disability compensation?",
  profile: {
    mode: "veteran"
  },
  compensation: {
    disabilityPay: 1800,
    retirementPay: 3200,
    totalMonthly: 5000
  }
});

await runTest("TEST 5: No Matching Module", {
  message: "Tell me about schools near Fort Liberty.",
  profile: {
    mode: "active-duty"
  }
});

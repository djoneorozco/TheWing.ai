import { calculateMilitaryMortgage } from './military-mortgage.js';
import { purchasePriceForPayment } from './purchase-price.js';

export const PLANNING_VERSION = 'financial-planning-v1';
const cents = n => Math.round((n + Number.EPSILON) * 100) / 100;
const ratio = (n, d) => n !== null && d > 0 ? n / d * 100 : null;
const finite = n => typeof n === 'number' && Number.isFinite(n);

function stressInputs(value, summary) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['housingMonthly','expensesMonthly'].includes(k))) throw new Error('Provide mortgage and expense amounts for the budget test.');
  if (summary.housingMonthly === null || summary.nonHousingExpenses === null) throw new Error('Connect your mortgage and expense totals before testing a budget.');
  for (const key of ['housingMonthly','expensesMonthly']) {
    const n = value[key];
    if (!finite(n) || n < 0 || n > 1000000 || Math.abs(n - cents(n)) > 1e-7) throw new Error('Budget test amounts must be between $0 and $1,000,000, with at most two decimal places.');
  }
  return {housingMonthly:value.housingMonthly, expensesMonthly:value.expensesMonthly};
}

function health(analysis, summary, upper) {
  const cash = summary.cashFlow, reserve = summary.reserveMonths;
  const missing = [];
  if (!(analysis.income.netMonthly > 0)) missing.push('positive take-home income');
  if (!(analysis.income.grossMonthly > 0)) missing.push('positive gross income');
  if (!analysis.mortgage || summary.example) missing.push('confirmed mortgage assumptions');
  if (!analysis.budget || !summary.reviewed) missing.push('reviewed expense budget');
  const factors = {
    cashAfterSavings:cash, monthlyCushion:analysis.budget?.affordability.bufferMonthly ?? null,
    housingAndDebtRatio:summary.combinedDebtHousingRatio, reserveMonths:reserve,
    creditScore:analysis.mortgage?.inputs.creditScore ?? null,
    estimatedLtv:analysis.mortgage ? ratio(analysis.mortgage.loan.loanAmount, analysis.mortgage.inputs.homePrice) : null
  };
  let status = 'incomplete', label = 'Needs inputs', reason = missing.length ? 'Add or review: ' + missing.join(', ') + '.' : '';
  if (!missing.length) {
    if (cash < 0) { status='at-risk'; label='At risk'; reason='Entered costs and savings exceed take-home income.'; }
    else if (reserve !== null && reserve < 1) { status='at-risk'; label='At risk'; reason='After-closing reserves cover less than one month of entered costs.'; }
    else if (summary.housingMonthly > upper || cash < factors.monthlyCushion || (reserve !== null && reserve < 3)) {
      status='stretched'; label='Stretched'; reason=reserve !== null && reserve < 3 ? 'Reserves are below the three-month planning cushion.' : 'This payment exceeds the budget guideline or your cash-cushion goal.';
    } else if (reserve === null && summary.reservesAfterClosing !== null) { status='incomplete'; label='Review expenses'; reason='Reserve coverage needs an entered monthly expense basis.'; }
    else if (reserve === null) { status='provisional'; label='Check reserves'; reason='The monthly budget fits the planning guideline. Add after-closing reserves to complete the budget signal.'; }
    else { status='stable'; label='Stable'; reason='The payment fits the budget guideline and at least three months of entered costs remain in reserves.'; }
  }
  return {status,label,reason,missing,factors,residualPercent:ratio(cash,analysis.income.netMonthly),
    scope:'Budget planning signal; closing costs, credit underwriting and VA residual-income qualification are not assessed.',
    rules:'Uses the existing 28% housing / 36% housing-plus-debt planning guideline, your monthly cushion, and reserve bands below 1 month, 1–3 months, and 3+ months. These are planning assumptions, not loan approval rules. Credit and LTV are financing context, not an approval score.'};
}

function homeRange(analysis, upper, comfortable, termYears) {
  if (!analysis.mortgage || analysis.summary.example || upper === null) return {status:'incomplete',lower:null,target:null,upper:null,reason:'Add take-home income, review expenses and confirm the mortgage assumptions.'};
  const original = analysis.mortgage.inputs;
  // Fixed cash down payment; taxes and insurance scale with price at the entered rates.
  // All fees, PMI/MIP, and principal/interest come from the same Section 02 engine.
  const quote = rawPrice => {
    const price = cents(rawPrice);
    const result = calculateMilitaryMortgage({...original, homePrice:price, downPayment:Math.min(original.downPayment,price),
      termYears,
      propertyTaxAnnual:cents(original.propertyTaxAnnual * price / original.homePrice),
      insuranceAnnual:cents(original.insuranceAnnual * price / original.homePrice)});
    return {monthlyHousing:result.monthly.totalHousing, rate:original.interestRate};
  };
  const floor = Math.max(100, Math.ceil(original.downPayment / 100) * 100);
  const costCap = Math.min(10000000,...[original.propertyTaxAnnual,original.insuranceAnnual].filter(n=>n>0).map(n=>Math.floor(1000000*original.homePrice/n*100)/100));
  const ceiling = original.loanType === 'FHA' ? Math.min(costCap,Math.floor(original.downPayment / .035 * 100) / 100) : costCap;
  const high = purchasePriceForPayment(upper,quote,floor,ceiling);
  const low = purchasePriceForPayment(comfortable,quote,floor,ceiling);
  if (!high) return {status:'unavailable',lower:null,target:null,upper:null,reason:'The payment budget does not cover this loan and cost scenario. Review costs, down payment and loan assumptions.'};
  const target = low?.price ?? null;
  return {status:'provisional',lower:low?.price ?? null,target,upper:high.price,
    targetPayment:low?.monthlyHousing ?? null,upperPayment:high.monthlyHousing,capped:high.capped,
    selectedPrice:original.homePrice,selectedPosition:original.homePrice>high.price?'above':low&&original.homePrice<low.price?'below':'within',
    reason:low?'Budget-based estimate. Closing costs and cash needed at other prices still require review.':'Only an upper budget limit is available. No price fits your additional comfort cushion under these assumptions.',
    assumptions:'Uses your entered fixed interest rate, loan term and cash down payment. Taxes and insurance scale with price; HOA and other ownership costs stay fixed. The preferred target preserves your additional comfort cushion. When provided, after-closing cash must cover three months of tested housing, living expenses and debt; that cash balance is held fixed across prices. Closing-cost differences are not estimated. No live market rate or lender approval is implied.'};
}

export function calculateFinancialPlanning(analysis, input) {
  const stress = stressInputs(input.stressTest,analysis.summary);
  const base = analysis.summary, s = {...base}, budget = analysis.budget;
  const deltaExpenses = stress ? cents(stress.expensesMonthly-base.nonHousingExpenses) : 0;
  const deltaHousing = stress ? cents(stress.housingMonthly-base.housingMonthly) : 0;
  if (stress) {
    s.housingMonthly=stress.housingMonthly; s.nonHousingExpenses=stress.expensesMonthly;
    s.cashFlow=base.cashFlow===null?null:cents(base.cashFlow-deltaHousing-deltaExpenses);
    s.beforeDeductionsRemaining=base.beforeDeductionsRemaining===null?null:cents(base.beforeDeductionsRemaining-deltaHousing-deltaExpenses);
    s.housingRatioNet=ratio(s.housingMonthly,analysis.income.netMonthly);
    s.housingRatioGross=ratio(s.housingMonthly,analysis.income.grossMonthly);
    s.combinedDebtHousingRatio=ratio(cents(s.housingMonthly+budget.affordability.continuingDebt),analysis.income.grossMonthly);
    const costs=cents(s.housingMonthly+s.nonHousingExpenses+s.monthlyDebt);
    s.reserveMonths=s.reservesAfterClosing!==null&&costs>0?s.reservesAfterClosing/costs:null;
  }
  const limits=budget?.affordability.limits;
  const ready=!!budget?.affordability.monthlyRange&&analysis.income.netMonthly>0;
  const reserveLimit=s.reservesAfterClosing!==null&&s.nonHousingExpenses!==null?cents(s.reservesAfterClosing/3-s.nonHousingExpenses-s.monthlyDebt):null;
  const upper=ready?Math.max(0,cents(Math.min(limits.housing28,limits.totalDebt36,limits.cashFlow-deltaExpenses,reserveLimit??Infinity))):null;
  const comfortable=upper===null?null:Math.max(0,cents(upper-budget.affordability.extraBufferMonthly));
  // Term is transported in the validated source context; the canonical result's inputs omit it.
  const range=homeRange(analysis,upper,comfortable,input.mortgage?.termYears);
  const currentRemaining=analysis.income.netMonthly===null?base.beforeDeductionsRemaining:base.cashFlow;
  const testedRemaining=analysis.income.netMonthly===null?s.beforeDeductionsRemaining:s.cashFlow;
  return {version:PLANNING_VERSION,summary:s,health:health(analysis,s,upper),homeRange:range,
    monthlyLimit:upper,comfortablePayment:comfortable,bufferMonthly:budget?.affordability.bufferMonthly??null,
    limits:limits?{housingIncome:limits.housing28,housingAndDebtIncome:limits.totalDebt36,cashCushion:limits.cashFlow===null?null:cents(limits.cashFlow-deltaExpenses),reserveCushion:reserveLimit}:null,
    stressTest:{available:base.housingMonthly!==null&&base.nonHousingExpenses!==null,active:!!stress&&(deltaHousing!==0||deltaExpenses!==0),
      baseline:{housingMonthly:base.housingMonthly,expensesMonthly:base.nonHousingExpenses,remaining:currentRemaining},
      tested:{housingMonthly:s.housingMonthly,expensesMonthly:s.nonHousingExpenses,remaining:testedRemaining},
      remainingChange:currentRemaining===null||testedRemaining===null?null:cents(testedRemaining-currentRemaining),
      basis:analysis.income.netMonthly===null?'before-payroll-deductions':'take-home',
      note:'What-if amounts only. Income, required debt payments, savings and cash reserves stay fixed. The Section 02 loan and its breakdown do not change.'}};
}

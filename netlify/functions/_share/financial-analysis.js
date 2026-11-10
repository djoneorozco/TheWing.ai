// Compose the existing budget and mortgage engines. No demo values or new lending rules.
import { calculateFinanceBudget } from './finance-budget.js';
import { calculateMilitaryMortgage } from './military-mortgage.js';
import { calculateFinancialPlanning } from './financial-planning.js';

export const VERSION = 'financial-analysis-v1';
const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
const ratio = (n, d) => n !== null && d > 0 ? n / d * 100 : null;
const object = x => x && typeof x === 'object' && !Array.isArray(x);
function amount(value, name, max = 1000000) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max || Math.abs(value - money(value)) > 1e-7) throw new Error(`Check ${name}. Use a nonnegative amount with at most two decimal places.`);
  return value;
}

export function calculateFinancialAnalysis(input) {
  if (!object(input) || input.version !== 1) throw new Error('Provide a version-1 financial context.');
  if (input.analysisInputs != null) throw new Error('Refresh Financial Analysis to use your original Financial Guidance entries.');
  const income = input.income?.complete === true ? input.income : null;
  const gross = amount(income?.grossMonthlyIncome, 'monthly income');
  const sourceNet = amount(income?.netMonthlyIncome, 'take-home income');
  const deductions = amount(income?.monthlyDeductions, 'monthly payroll deductions');
  const derivedNet = gross !== null && deductions !== null ? money(gross-deductions) : null;
  if (derivedNet !== null && (derivedNet < 0 || (sourceNet !== null && Math.abs(sourceNet-derivedNet)>.005))) throw new Error('Income and payroll deductions do not match. Review the original income calculator.');
  const net = sourceNet ?? derivedNet;
  const monthlyContributions = amount(income?.monthlySavingsContributions,'monthly savings contributions');
  const reportedAssets = amount(income?.capitalReservesTotal,'savings, investments and reserves',10000000);
  const sources = income?.sources ?? [];
  if (!Array.isArray(sources) || sources.length>50 || sources.some(source=>!object(source))) throw new Error('Provide the current income-source breakdown.');
  const incomeSources = sources.map(source=>({label:typeof source.label==='string'?source.label.slice(0,160):'Income source',amount:amount(source.amount,'income source'),basis:typeof source.basis==='string'?source.basis.slice(0,80):null}));
  const missing = [], notes = [];
  if (gross === null) missing.push('monthly income');
  if (net === null) missing.push('take-home income');
  if (gross === 0 || net === 0) missing.push('positive income for housing guidance');

  let mortgage = null;
  if (input.mortgage?.ready === true && input.mortgage.status === 'ready') mortgage = calculateMilitaryMortgage(input.mortgage);
  const example = !!mortgage && input.mortgage.hasUserInteracted !== true;
  if (!mortgage) missing.push('mortgage estimate');
  if (example) notes.push('Section 02 is still showing an example mortgage. Review its price, rate and costs.');
  if (mortgage) notes.push(mortgage.upfront.excludes);

  const state = input.budget?.state;
  let budget = null, housing = null, nonHousing = null, manuallyAdjusted = false, items = [];
  if (input.budget?.status === 'ready' && object(state)) {
    if (state.grossMonthly !== gross || state.netMonthly !== sourceNet) throw new Error('Income changed. Wait for the expense calculator to update, then try again.');
    if (!Array.isArray(state.items) || state.items.length > 120) throw new Error('Provide up to 120 current expense rows.');
    items = state.items.map(row => ({id:row.id,label:typeof row.label === 'string' ? row.label.slice(0,160) : '',category:row.category,value:row.value,minimumPayment:row.minimumPayment,essential:row.essential,housing:row.housing,continues:row.continues}));
    const row = items.find(x => x.id === 'projected-mortgage');
    if (!row || row.category !== 'monthly-expenses' || row.housing !== true || row.continues !== false) throw new Error('Reconnect the projected Mortgage row in Section 03.');
    housing = amount(row.value, 'projected mortgage');
    if (housing === null) throw new Error('Enter your projected mortgage payment.');
    manuallyAdjusted = input.budget.mortgageLinked === false;
    if (!manuallyAdjusted && (!mortgage || Math.abs(housing - mortgage.monthly.totalHousing) > .005)) throw new Error('The mortgage changed. Wait for the expense calculator to update, then try again.');
    // The Mortgage row is already in items. Never subtract the mortgage a second time.
    // Omit the old Finance-UX home-price scenario: it is not Section 02's scenario.
    budget = calculateFinanceBudget({grossMonthly:gross,netMonthly:net,items,savingsMonthly:state.savingsMonthly,emergencyFund:state.emergencyFund,bufferMonthly:state.bufferMonthly,extraBufferMonthly:state.extraBufferMonthly,reviewed:state.reviewed});
    nonHousing = money(budget.metrics.totalExpenses - housing);
  } else missing.push('current expense totals');
  if (budget && !budget.reviewed) missing.push('budget review');
  if (manuallyAdjusted) notes.push('Cash flow uses your adjusted Section 03 mortgage payment. The Section 02 loan breakdown is shown separately.');

  // Section 02 explicitly labels this input AFTER closing. Its illustrative default
  // must not become a user's reserve, and closing costs must not be subtracted again.
  const reserve = mortgage?.upfront.cashPlanStarted ? mortgage.upfront.reservesAfterPurchase : input.mortgage?.emergencyFundBasis === 'after-closing' && input.mortgage.emergencyFundUserEntered === true
    ? amount(input.mortgage.emergencyFund, 'reserves after closing') : null;
  const metrics = budget?.metrics;
  const reserveBasis = metrics ? money(metrics.totalExpenses + metrics.totalDebt) : null;
  const upper = budget?.affordability.monthlyRange?.upper ?? null;
  let status = 'incomplete', title = 'Complete your financial picture';
  let detail = missing.length ? 'Add or review: ' + missing.join(', ') + '.' : '';
  if (example) { status = 'example'; title = 'Review your mortgage example'; detail = 'Your income and expenses are connected. Confirm the Section 02 assumptions before using this as your housing plan.'; }
  else if (mortgage && budget && upper !== null) {
    status = housing <= upper ? 'within-guideline' : 'above-guideline';
    title = housing <= upper ? 'Within the budget planning guideline' : 'Above the budget planning guideline';
    detail = 'Compares your entered housing cost with the existing income, debt and cash-cushion guideline. This is not a loan approval.';
  }
  const components = mortgage ? Object.entries({principalInterest:mortgage.monthly.principalInterest,propertyTaxes:mortgage.monthly.propertyTax,homeInsurance:mortgage.monthly.insurance,hoaFees:mortgage.monthly.hoa,pmi:mortgage.monthly.mortgageInsurance,otherOwnership:mortgage.monthly.otherOwnership}).map(([key,value])=>({key,amount:value,share:ratio(value,mortgage.monthly.totalHousing)})) : [];
  const cashAvailable=mortgage?.upfront.cashAvailable??null;
  const knownUpfrontShortfall= mortgage && (cashAvailable??reportedAssets)!==null
    ? Math.max(0,money((mortgage.upfront.totalCashNeeded??mortgage.upfront.purchaseCash??mortgage.upfront.knownSubtotal)-(cashAvailable??reportedAssets))) : null;
  const result = {ok:true,version:VERSION,status,missing,notes,income:{grossMonthly:gross,netMonthly:net,payrollDeductions:deductions,monthlySavingsContributions:monthlyContributions,availableAfterIncomeSavings:net!==null&&monthlyContributions!==null?money(net-monthlyContributions):null,sources:incomeSources,containsEstimates:income?.containsEstimates===true},
    financialProfile:{reportedSavingsInvestmentsReserves:reportedAssets,cashAvailableForPurchase:cashAvailable,knownUpfrontShortfall,reserveBasis:'current combined balance; liquidity and after-closing balance are not established',incomeSource:income?.status??null},mortgage,budget,components,
    summary:{housingMonthly:housing,nonHousingExpenses:nonHousing,monthlyDebt:metrics?.totalDebt??null,monthlySavings:metrics?.totalSavings??null,
      cashFlow:metrics?.cashFlow??null,beforeDeductionsRemaining:metrics?.beforeDeductionsRemaining??null,
      housingRatioNet:ratio(housing,net),housingRatioGross:ratio(housing,gross),debtRatio:metrics?.debtIncomeRatio??null,
      combinedDebtHousingRatio:budget ? ratio(money(housing+budget.affordability.continuingDebt),gross) : null,
      downPaymentPercent:mortgage ? ratio(mortgage.upfront.downPayment,mortgage.inputs.homePrice) : null,
      reservesAfterClosing:reserve,reservesBasis:mortgage?.upfront.cashPlanStarted?'calculated-purchase-budget':'user-entered-after-closing',reserveMonths:reserve!==null&&reserveBasis>0?reserve/reserveBasis:null,
      manuallyAdjusted,example,reviewed:budget?.reviewed===true},guidance:{title,detail},items};
  result.planning = calculateFinancialPlanning(result,input);
  return result;
}

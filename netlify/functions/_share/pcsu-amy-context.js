// PCSU Financial Guidance adapter. The existing engines own every calculation.
import { calculateFinancialAnalysis } from './financial-analysis.js';
import { calculateMilitaryMortgage } from './military-mortgage.js';

export const VERSION = 'PCSU-Ask-Amy/1.0.0';
export const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export const pick = (value, keys) => Object.fromEntries(keys.filter(k => value?.[k] !== undefined).map(k => [k, value[k]]));
export const mortgageKeys = ['homePrice','downPayment','interestRate','termYears','creditScore','propertyTaxAnnual','insuranceAnnual','hoaMonthly','otherOwnershipMonthly','pmiMonthly','loanType','vaFeeStatus','feePayment','closingCosts','prepaidsEscrow','cashAvailable','moveInCosts'];
export const SOURCES = [
  {id:'consumer-mortgage',title:'CFPB · Explore loan choices',url:'https://www.consumerfinance.gov/owning-a-home/explore/loan-choices/'},
  {id:'va-loans',title:'VA · Home loan benefits',url:'https://www.va.gov/housing-assistance/home-loans/'},
  {id:'va-fees',title:'VA · Funding fees and closing costs',url:'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/'},
  {id:'budget',title:'CFPB · Budgeting and financial tools',url:'https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/toolkit/'},
  {id:'military-pay',title:'DFAS · Military pay tables',url:'https://www.dfas.mil/MilitaryMembers/payentitlements/Pay-Tables/'}
];

export function readRequest(body) {
  if (!object(body) || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 3000) throw Error('Enter a question of up to 3,000 characters.');
  const thread = [];
  let size = 0;
  for (const item of (Array.isArray(body.history) ? body.history : []).slice(-12).reverse()) {
    if (!object(item) || !['user','assistant'].includes(item.role) || typeof item.content !== 'string') continue;
    const content = item.content.slice(0,3000);
    if (size + content.length > 18000) break;
    thread.unshift({role:item.role,content}); size += content.length;
  }
  return {message:body.message.trim(),history:thread,context:sanitizeContext(body.context),section:['income','mortgage','budget','analysis'].includes(body.section)?body.section:null};
}

export function sanitizeContext(raw) {
  if (raw == null) return {version:1};
  if (!object(raw) || raw.version !== 1) throw Error('Refresh Financial Guidance to reconnect the calculators.');
  const context = {version:1};
  if (object(raw.income)) {
    context.income = pick(raw.income,['complete','status','grossMonthlyIncome','netMonthlyIncome','monthlyDeductions','monthlySavingsContributions','capitalReservesTotal','containsEstimates']);
    if (raw.income.sources !== undefined) {
      if (!Array.isArray(raw.income.sources) || raw.income.sources.length > 50) throw Error('Invalid income breakdown.');
      context.income.sources = raw.income.sources.map(s => pick(s,['label','amount','basis']));
    }
  }
  if (object(raw.mortgage)) context.mortgage = pick(raw.mortgage,[...mortgageKeys,'ready','status','hasUserInteracted','emergencyFund','emergencyFundBasis','emergencyFundUserEntered']);
  if (object(raw.budget)) {
    const s = raw.budget.state;
    context.budget = pick(raw.budget,['status','mortgageLinked']);
    if (object(s)) {
      context.budget.state = pick(s,['grossMonthly','netMonthly','savingsMonthly','emergencyFund','bufferMonthly','extraBufferMonthly','reviewed']);
      if (!Array.isArray(s.items) || s.items.length > 120) throw Error('Invalid budget rows.');
      context.budget.state.items = s.items.map(row => pick(row,['id','label','category','value','minimumPayment','essential','housing','continues']));
    }
  }
  return context;
}

function add(facts,id,label,value,unit='USD/month',basis='calculated') {
  if (typeof value === 'number' && Number.isFinite(value)) facts[id] = {id,label,value,unit,basis};
}
export function loanFacts(result,prefix='current',label='Current mortgage') {
  const facts = {};
  add(facts,prefix+'.price',label+' · home price',result.inputs.homePrice,'USD','scenario input');
  add(facts,prefix+'.rate',label+' · entered note rate',result.inputs.interestRate,'%','scenario input');
  add(facts,prefix+'.term',label+' · loan term',result.inputs.termYears,'years','scenario input');
  for (const [key,title] of Object.entries({principalInterest:'principal and interest',propertyTax:'property tax',insurance:'home insurance',hoa:'HOA',mortgageInsurance:'mortgage insurance',otherOwnership:'other ownership costs',totalHousing:'total housing cost'})) add(facts,prefix+'.'+key,label+' · '+title,result.monthly[key]);
  add(facts,prefix+'.purchaseCash',label+' · purchase cash including entered closing costs',result.upfront.purchaseCash,'USD');
  add(facts,prefix+'.reserves',label+' · remaining cash after purchase and moving',result.upfront.reservesAfterPurchase,'USD');
  return facts;
}
export function buildPacket(context) {
  // This engine rejects stale linked income/mortgage generations and recalculates
  // from source inputs. Client-supplied results, truth packets and scores are dropped.
  const a = calculateFinancialAnalysis(context), facts = {};
  add(facts,'income.gross','Total income before payroll deductions',a.income.grossMonthly,'USD/month','Section 01 reported income');
  add(facts,'income.net','Take-home income',a.income.netMonthly,'USD/month','Section 01 reported income and deductions');
  add(facts,'income.deductions','Payroll deductions',a.income.payrollDeductions,'USD/month','Section 01 entry');
  if (a.mortgage) Object.assign(facts,loanFacts(a.mortgage,'mortgage',a.summary.example?'Example mortgage':'Current mortgage'));
  for (const [key,label] of Object.entries({housingMonthly:'Budget housing cost',nonHousingExpenses:'Other living expenses',monthlyDebt:'Debt payments',monthlySavings:'Planned savings',cashFlow:'Money left after expenses, debt and savings',beforeDeductionsRemaining:'Before-deductions remainder (not spendable cash)'})) add(facts,'budget.'+key,label,a.summary[key]);
  add(facts,'budget.reserves','Reserves after closing',a.summary.reservesAfterClosing,'USD');
  // A gross-only preview or an unreviewed budget is never exposed as affordability.
  if (a.summary.reviewed && !a.summary.example && a.income.netMonthly !== null) {
    add(facts,'budget.paymentLimit','Budget planning payment limit',a.planning.monthlyLimit);
    add(facts,'budget.priceLimit','Provisional budget-based home price ceiling',a.planning.homeRange.upper,'USD');
  }
  return {version:VERSION,facts,missing:a.missing,warnings:a.notes,
    state:{incomeEstimates:a.income.containsEstimates,exampleMortgage:a.summary.example,reviewedBudget:a.summary.reviewed,manuallyAdjustedHousing:a.summary.manuallyAdjusted},
    guidance:{budget:'Cash flow already subtracts planned savings and the budget mortgage once. Gross income is not spendable cash. All outputs depend on entered assumptions; not lending approval.',range:a.planning.homeRange.assumptions??null},
    source_catalog:SOURCES,analysis:a};
}

// Tool edits must cite numbers or choices in the current user question. This
// prevents a model from silently filling in a rate, costs, or a credit score.
function supportedValue(edit, question) {
  if (typeof edit.evidence !== 'string' || !edit.evidence.trim() || !question.toLowerCase().includes(edit.evidence.toLowerCase())) return false;
  if (typeof edit.value === 'number') {
    const values = [...edit.evidence.replace(/,/g,'').matchAll(/(?<![\w.])-?\d+(?:\.\d+)?\s*([kKmM])?(?![\w.])/g)]
      .map(m => Number(m[0].replace(/[kKmM\s]/g,'')) * (m[1]?.toLowerCase()==='k'?1000:m[1]?.toLowerCase()==='m'?1000000:1));
    return values.includes(edit.value);
  }
  return typeof edit.value === 'string' && edit.evidence.toLowerCase().includes(edit.value.toLowerCase());
}
export function runScenario(name,args,request,packet,index) {
  if (!object(args) || !Array.isArray(args.changes) || args.changes.length < 1 || args.changes.length > 16) throw Error('Provide the scenario changes.');
  const allowed = name === 'calculate_mortgage' ? mortgageKeys : name === 'test_budget' ? ['housingMonthly','expensesMonthly'] : [];
  const edits = {};
  for (const edit of args.changes) {
    if (!object(edit) || !allowed.includes(edit.field) || Object.hasOwn(edits,edit.field) || !supportedValue(edit,request.message)) throw Error('State each new amount or loan choice in your question, including its units.');
    edits[edit.field] = edit.value;
  }
  const id='scenario'+index, facts={}, assumptions=[];
  let inputs;
  if (name === 'calculate_mortgage') {
    inputs={...pick(request.context.mortgage,mortgageKeys),...edits};
    const result=calculateMilitaryMortgage(inputs);
    Object.assign(facts,loanFacts(result,id,'What-if mortgage'));
    assumptions.push('A separate estimate; page entries are unchanged. Unchanged inputs carry over from the current mortgage, including any example values. Taxes and insurance stay at the entered dollar amounts.',...result.notes,result.assumptions.excludedCosts);
  } else if (name === 'test_budget') {
    inputs={housingMonthly:packet.analysis.summary.housingMonthly,expensesMonthly:packet.analysis.summary.nonHousingExpenses,...edits};
    const result=calculateFinancialAnalysis({...request.context,stressTest:inputs}).planning;
    add(facts,id+'.housing','What-if · monthly housing cost',result.summary.housingMonthly);
    add(facts,id+'.expenses','What-if · other living expenses',result.summary.nonHousingExpenses);
    add(facts,id+'.cashFlow','What-if · money left after expenses, debt and savings',result.summary.cashFlow);
    add(facts,id+'.beforeDeductions','What-if · before-deductions remainder (not spendable cash)',result.summary.beforeDeductionsRemaining);
    add(facts,id+'.change','What-if · change in monthly remainder',result.stressTest.remainingChange);
    assumptions.push(result.stressTest.note);
  } else throw Error('Unsupported calculator.');
  Object.assign(packet.facts,facts);
  return {id,tool:name,inputs,changes:edits,facts:Object.values(facts),assumptions,pageChanged:false};
}

export function formatFacts(facts) {
  return facts.map(f=>`${f.label}: ${f.unit.startsWith('USD')?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(f.value):new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(f.value)}${f.unit==='USD/month'?' / month':f.unit==='%'?'%':f.unit==='years'?' years':''}`).join('\n');
}

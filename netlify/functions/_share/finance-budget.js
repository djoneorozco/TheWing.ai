import { calculateMortgageScenario } from './mortgage-scenario.js';

export const VERSION = 'finance-budget-v1';
const categories = ['monthly-expenses','debt','lifestyle','other'];
const cents = n => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = rows => cents(rows.reduce((n, row) => n + row.value, 0));
function number(value, name, nullable = false, max = 1000000) {
  if (value === null || value === undefined || value === '') {
    if (nullable) return null;
    throw new Error(`${name} is required.`);
  }
  if (!['string','number'].includes(typeof value) || (typeof value === 'string' && !value.trim())) throw new Error(`${name} must be a number.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`${name} is outside the supported range.`);
  return cents(n);
}

// Each trial runs the same complete calculation used by /api/mortgage.
// Fixed cash down payment; price-dependent tax/insurance are recomputed per trial.
function priceForPayment(target, scenario) {
  if (!(target > 0)) return null;
  const down = number(scenario.downPayment ?? 0, 'Down payment');
  const quote = price => calculateMortgageScenario({...scenario,price,downPayment:Math.min(down,price)});
  const floor = Math.max(100,down), ceiling = 5000000;
  if (floor > ceiling || quote(floor).monthly.allIn > target) return null;
  let low = floor, high = ceiling;
  for (let i=0;i<26;i++) {
    const middle = (low+high)/2;
    if (quote(middle).monthly.allIn <= target) low=middle; else high=middle;
  }
  const price = Math.floor(low/100)*100, result=quote(price);
  return {price,monthlyHousing:result.monthly.allIn,rate:result.mortgage.apr,capped:low>=ceiling-1};
}

export function calculateFinanceBudget(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('A budget object is required.');
  if (!Array.isArray(body.items) || body.items.length > 120) throw new Error('Provide no more than 120 budget items.');
  const ids=new Set();
  const items=body.items.map(row=>{
    if (!row || typeof row.id !== 'string' || !row.id || row.id.length>100 || ids.has(row.id) || !categories.includes(row.category)) throw new Error('Invalid or duplicate budget item.');
    ids.add(row.id);
    for (const key of ['essential','housing','continues']) if (typeof row[key] !== 'boolean') throw new Error(`Budget item ${key} must be true or false.`);
    return {...row,value:number(row.value,'Monthly amount'),minimumPayment:number(row.minimumPayment??row.value,'Minimum payment')};
  });
  const gross=number(body.grossMonthly,'Gross monthly income',true);
  const net=number(body.netMonthly,'Take-home monthly income',true);
  const savings=number(body.savingsMonthly,'Monthly savings');
  const reserve=number(body.emergencyFund,'Emergency fund',true);
  const buffer=number(body.bufferMonthly,'Monthly cash cushion');
  const extra=number(body.extraBufferMonthly,'Additional comfort cushion');
  const expenses=sum(items.filter(x=>x.category!=='debt'));
  const debt=sum(items.filter(x=>x.category==='debt'));
  const obligations=items.filter(x=>x.category==='debt'||x.id==='support-payments');
  const qualifyingCurrent=cents(obligations.reduce((n,x)=>n+x.minimumPayment,0));
  const retained=items.filter(x=>!x.housing||x.continues);
  const continuingDebt=cents(obligations.filter(x=>!x.housing||x.continues).reduce((n,x)=>n+x.minimumPayment,0));
  const essential=sum(items.filter(x=>x.essential||x.housing||x.category==='debt'||x.id==='support-payments'));
  const currentCash=net===null?null:cents(net-expenses-debt-savings);
  const projectedBeforeHousing=net===null?null:cents(net-sum(retained)-savings);
  const rule28=gross>0?cents(gross*.28):null;
  const rule36=gross>0?cents(gross*.36-continuingDebt):null;
  const cashLimit=projectedBeforeHousing===null?null:cents(projectedBeforeHousing-buffer);
  const ready=body.reviewed===true&&gross>0&&net!==null;
  const upper=ready?Math.max(0,Math.floor(Math.min(rule28,rule36,cashLimit)*100)/100):null;
  const lower=upper===null?null:Math.max(0,cents(upper-extra));
  const monthlyRange=upper===null?null:{comfortable:lower,upper};
  let homeRange=null, scenario=null, scenarioError=null;
  if (monthlyRange && upper>0 && body.scenario) {
    try {
      const allowed=['loanType','termYears','creditScore','interestRate','downPayment','propertyTaxPercent','insurancePercent','insuranceMonthly','hoaMonthly','pmiMonthly','fundingFeeExempt','priorUse','financeFundingFee'];
      scenario=Object.fromEntries(allowed.filter(k=>body.scenario[k]!==undefined).map(k=>[k,body.scenario[k]]));
      if (!['va','conventional'].includes(scenario.loanType) || !Number.isFinite(Number(scenario.termYears))) throw new Error('Choose loan assumptions.');
      const high=priceForPayment(upper,scenario), low=priceForPayment(lower,scenario);
      if(high)homeRange={comfortable:low?.price??null,upper:high.price,comfortablePayment:low?.monthlyHousing??null,upperPayment:high.monthlyHousing,rate:high.rate,capped:high.capped};
      else scenarioError='The payment budget does not cover the selected housing assumptions.';
    } catch (_) {scenarioError='Home-price estimate unavailable. Review the mortgage assumptions.';}
  }
  return {ok:true,version:VERSION,reviewed:body.reviewed===true,
    metrics:{monthlyIncome:net,grossMonthly: gross,totalExpenses:expenses,totalDebt:debt,totalSavings:savings,cashFlow:currentCash,cashFlowPercentage:net>0?currentCash/net*100:null,expensesIncomeRatio:net>0?expenses/net*100:null,debtIncomeRatio:gross>0?qualifyingCurrent/gross*100:null,emergencyFund:reserve,essentialMonthlyExpenses:essential,emergencyFundMonths:reserve!==null&&essential>0?reserve/essential:null},
    affordability:{monthlyRange,homeRange,scenario,scenarioError,limits:{housing28:rule28,totalDebt36:rule36,cashFlow:cashLimit},continuingDebt,bufferMonthly:buffer,extraBufferMonthly:extra,projectedBeforeHousing,remainingAtUpper:upper===null?null:cents(projectedBeforeHousing-upper),remainingAtComfortable:lower===null?null:cents(projectedBeforeHousing-lower),missing:[...(gross>0?[]:['gross income']),...(net===null?['take-home income']:[]),...(body.reviewed===true?[]:['budget review'])],guidance:'28/36 is a planning guideline, not loan approval or a VA qualification test. Utilities and maintenance remain in the budget. Cash to close and reserves require separate review.'}};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFinancialAnalysis} from '../netlify/functions/_share/financial-analysis.js';
import {calculateMilitaryMortgage} from '../netlify/functions/_share/military-mortgage.js';
import {handler} from '../netlify/functions/financial-analysis.js';

const loan={ready:true,status:'ready',hasUserInteracted:true,loanType:'VA',homePrice:240000,downPayment:0,interestRate:0,termYears:20,creditScore:720,propertyTaxAnnual:0,insuranceAnnual:0,hoaMonthly:0,otherOwnershipMonthly:0,pmiMonthly:null,vaFeeStatus:'exempt',feePayment:'finance',emergencyFund:8500,emergencyFundBasis:'after-closing',emergencyFundUserEntered:false};
const row=(id,category,value,extra={})=>({id,label:id,category,value,minimumPayment:value,essential:true,housing:false,continues:false,...extra});
function fixture(){return {version:1,income:{complete:true,grossMonthlyIncome:8000,netMonthlyIncome:6000},mortgage:{...loan},budget:{status:'ready',mortgageLinked:true,state:{grossMonthly:8000,netMonthly:6000,savingsMonthly:500,emergencyFund:null,bufferMonthly:500,extraBufferMonthly:500,reviewed:true,items:[row('projected-mortgage','monthly-expenses',1000,{housing:true}),row('utilities','monthly-expenses',300.25),row('food','other',400),row('car','debt',200,{minimumPayment:150})]}}};}

test('selected mortgage is subtracted once, exact cents and existing 28/36 budget logic are preserved',()=>{
 const r=calculateFinancialAnalysis(fixture());
 assert.equal(r.summary.housingMonthly,1000);assert.equal(r.summary.nonHousingExpenses,700.25);
 assert.equal(r.summary.monthlyDebt,200);assert.equal(r.summary.cashFlow,3599.75);
 assert.equal(r.budget.metrics.totalExpenses,1700.25);assert.equal(r.status,'within-guideline');
 assert.equal(r.summary.combinedDebtHousingRatio,1150/8000*100);
 assert.equal(r.summary.reservesAfterClosing,null);assert.equal(r.mortgage.upfront.knownSubtotal,0);
});
test('direct gross income never becomes take-home pay',()=>{
 const data=fixture();data.income.netMonthlyIncome=null;data.budget.state.netMonthly=null;
 const r=calculateFinancialAnalysis(data);assert.equal(r.summary.cashFlow,null);assert.equal(r.summary.beforeDeductionsRemaining,5599.75);
 assert.equal(r.status,'incomplete');assert(r.missing.includes('take-home income'));assert.equal(r.budget.affordability.monthlyRange,null);
});
test('a manually adjusted Section 03 payment is used instead of adding Section 02 again',()=>{
 const data=fixture();data.budget.mortgageLinked=false;data.budget.state.items[0].value=1200.12;
 const r=calculateFinancialAnalysis(data);assert.equal(r.mortgage.monthly.totalHousing,1000);assert.equal(r.summary.housingMonthly,1200.12);assert.equal(r.summary.cashFlow,3399.63);assert.equal(r.summary.manuallyAdjusted,true);
});
test('unknown data remains unknown and old sample reserves are not used',()=>{
 const r=calculateFinancialAnalysis({version:1});assert.equal(r.income.grossMonthly,null);assert.equal(r.mortgage,null);assert.equal(r.budget,null);assert.equal(r.summary.cashFlow,null);assert.equal(r.summary.reservesAfterClosing,null);assert.equal(r.status,'incomplete');
 const data=fixture();data.mortgage.emergencyFundUserEntered=true;data.mortgage.emergencyFund=0;
 assert.equal(calculateFinancialAnalysis(data).summary.reservesAfterClosing,0);
 data.mortgage.emergencyFund=5000;data.mortgage.downPayment=12000;data.budget.state.items[0].value=calculateMilitaryMortgage(data.mortgage).monthly.totalHousing;
 const connected=calculateFinancialAnalysis(data);assert.equal(connected.summary.reservesAfterClosing,5000);assert.equal(connected.summary.reserveMonths,5000/(connected.budget.metrics.totalExpenses+200));
});
test('unreviewed budgets, missing snapshots and example mortgages do not get an affordability conclusion',()=>{
 const data=fixture();data.budget.state.reviewed=false;assert.equal(calculateFinancialAnalysis(data).status,'incomplete');
 data.budget.state.reviewed=true;data.mortgage.hasUserInteracted=false;assert.equal(calculateFinancialAnalysis(data).status,'example');
 data.budget.status='pending';const r=calculateFinancialAnalysis(data);assert.equal(r.budget,null);assert.equal(r.summary.cashFlow,null);
});
test('stale income or linked mortgage is rejected instead of mixing generations',()=>{
 const data=fixture();data.income.grossMonthlyIncome=9000;assert.throws(()=>calculateFinancialAnalysis(data),/Income changed/);
 data.income.grossMonthlyIncome=8000;data.mortgage.interestRate=6;assert.throws(()=>calculateFinancialAnalysis(data),/mortgage changed/);
});
test('zero income, zero payments, negative cash flow, and large direct values are handled explicitly',()=>{
 const data=fixture();data.income.grossMonthlyIncome=0;data.income.netMonthlyIncome=0;data.budget.state.grossMonthly=0;data.budget.state.netMonthly=0;
 const r=calculateFinancialAnalysis(data);assert.equal(r.summary.cashFlow,-2400.25);assert.equal(r.summary.housingRatioNet,null);assert.equal(r.status,'incomplete');assert(r.missing.includes('positive income for housing guidance'));
 data.income.grossMonthlyIncome=1000001;assert.throws(()=>calculateFinancialAnalysis(data),/monthly income/);
});
test('unsupported, duplicate, malformed and out-of-range entries fail validation',()=>{
 for(const change of [d=>{d.budget.state.items.push({...d.budget.state.items[0]})},d=>{d.budget.state.items[1].value=-1},d=>{d.mortgage.downPayment=500000},d=>{d.income.netMonthlyIncome='6000'},d=>{d.budget.state.items[0].housing=false}]){
  const data=fixture();change(data);assert.throws(()=>calculateFinancialAnalysis(data));
 }
});
test('missing closing costs are not estimated and financed fees are not counted as cash due',()=>{
 const data=fixture();data.mortgage.vaFeeStatus='first';data.budget.state.items[0].value=calculateMilitaryMortgage(data.mortgage).monthly.totalHousing;
 let r=calculateFinancialAnalysis(data);assert(r.mortgage.loan.financedFee>0);assert.equal(r.mortgage.upfront.knownSubtotal,0);assert.equal(r.summary.reservesAfterClosing,null);assert(r.notes.some(n=>/not included/.test(n)));
 data.mortgage.feePayment='cash';data.budget.state.items[0].value=calculateMilitaryMortgage(data.mortgage).monthly.totalHousing;r=calculateFinancialAnalysis(data);assert.equal(r.mortgage.upfront.knownSubtotal,r.mortgage.loan.fee);
});
test('endpoint handles malformed requests and never caches financial responses',async()=>{
 assert.equal((await handler({httpMethod:'GET'})).statusCode,405);
 assert.equal((await handler({httpMethod:'OPTIONS'})).statusCode,204);
 for(const body of ['{','[]','x'.repeat(100001)])assert.equal((await handler({httpMethod:'POST',body})).statusCode,400);
 const response=await handler({httpMethod:'POST',body:JSON.stringify(fixture())});assert.equal(response.statusCode,200);assert.equal(response.headers['Cache-Control'],'no-store');assert.equal(JSON.parse(response.body).summary.cashFlow,3599.75);
});

test('health ring uses take-home residual, with explicit reserve and budget-rule explanations',()=>{
 const data=fixture();data.mortgage.emergencyFundUserEntered=true;data.mortgage.emergencyFund=20000;
 const r=calculateFinancialAnalysis(data),h=r.planning.health;
 assert.equal(h.residualPercent,3599.75/6000*100);assert.equal(h.label,'Review closing costs');assert.equal(h.factors.creditScore,720);
 assert.equal(h.factors.estimatedLtv,100);assert.match(h.scope,/not assessed/);assert.match(h.rules,/not loan approval/);
 data.mortgage.emergencyFundUserEntered=false;assert.equal(calculateFinancialAnalysis(data).planning.health.status,'provisional');
 data.mortgage.emergencyFundUserEntered=true;data.mortgage.emergencyFund=0;assert.equal(calculateFinancialAnalysis(data).planning.health.status,'at-risk');
});
test('budget-test costs change cash flow and residual once, holding debt, savings and source data fixed',()=>{
 const data=fixture(),original=structuredClone(data);data.stressTest={housingMonthly:1350.5,expensesMonthly:850.75};
 const r=calculateFinancialAnalysis(data),p=r.planning;
 assert.equal(r.summary.cashFlow,3599.75);assert.equal(p.summary.cashFlow,3098.75);
 assert.equal(p.summary.monthlyDebt,200);assert.equal(p.summary.monthlySavings,500);
 assert.equal(p.summary.combinedDebtHousingRatio,(1350.5+150)/8000*100);
 assert.equal(p.stressTest.remainingChange,-501);assert.equal(p.stressTest.active,true);
 assert.equal(r.mortgage.monthly.totalHousing,1000);delete data.stressTest;assert.deepEqual(data,original);
 assert.equal(calculateFinancialAnalysis(data).planning.summary.cashFlow,3599.75);
});
test('gross-only previews provide explicitly provisional results without inventing take-home cash',()=>{
 const data=fixture();data.income.netMonthlyIncome=null;data.budget.state.netMonthly=null;data.stressTest={housingMonthly:1500,expensesMonthly:900};
 const p=calculateFinancialAnalysis(data).planning;
 assert.equal(p.summary.cashFlow,null);assert.equal(p.summary.beforeDeductionsRemaining,4900);
 assert.equal(p.health.residualPercent,null);assert.equal(p.health.status,'provisional');assert(p.homeRange.upper>0);assert.equal(p.health.beforeDeductionsPercent,4900/8000*100);assert.equal(p.homeRange.basis,'before-payroll-deductions');assert.match(p.homeRange.reason,/before-tax/);
 assert.equal(p.stressTest.basis,'before-payroll-deductions');
});
test('mortgage-only stress leaves the price budget unchanged; higher living costs can constrain it',()=>{
 const data=fixture(),base=calculateFinancialAnalysis(data).planning;
 data.stressTest={housingMonthly:4000,expensesMonthly:700.25};
 let p=calculateFinancialAnalysis(data).planning;
 assert.equal(p.homeRange.upper,base.homeRange.upper);assert.equal(p.health.status,'stretched');
 data.stressTest.expensesMonthly=5000;p=calculateFinancialAnalysis(data).planning;
 assert.equal(p.health.status,'at-risk');assert(p.homeRange.upper===null||p.homeRange.upper<base.homeRange.upper);
 assert(p.health.residualPercent<0);
});
test('price range solves canonical loans, including zero interest, FHA limits and taxes at candidate prices',()=>{
 for(const loanType of ['VA','CONVENTIONAL','FHA'])for(const rate of [0,6.25]){
  const data=fixture();Object.assign(data.mortgage,{loanType,interestRate:rate,homePrice:300000,downPayment:30000,propertyTaxAnnual:3000,insuranceAnnual:1800,hoaMonthly:100,otherOwnershipMonthly:50,feePayment:'finance'});
  data.budget.state.items[0].value=calculateMilitaryMortgage(data.mortgage).monthly.totalHousing;
  const p=calculateFinancialAnalysis(data).planning,r=p.homeRange;assert(r.upper>0);assert(r.target>0);assert(r.lower<=r.target&&r.target<=r.upper);
  const quote=price=>calculateMilitaryMortgage({...data.mortgage,homePrice:price,propertyTaxAnnual:Math.round(3000*price/300000*100)/100,insuranceAnnual:Math.round(1800*price/300000*100)/100}).monthly.totalHousing;
  assert.equal(quote(r.upper),r.upperPayment);assert(r.upperPayment<=p.monthlyLimit+.005);
  if(!r.capped)assert(quote(r.upper+100)>p.monthlyLimit);
  assert(r.targetPayment<=p.comfortablePayment+.005);
 }
});
test('zero housing budget and examples have no invented price; unreviewed budgets are provisional',()=>{
 const data=fixture();data.stressTest={housingMonthly:0,expensesMonthly:9000};
 assert.equal(calculateFinancialAnalysis(data).planning.homeRange.status,'unavailable');
 delete data.stressTest;data.mortgage.hasUserInteracted=false;assert.equal(calculateFinancialAnalysis(data).planning.homeRange.status,'incomplete');
 data.mortgage.hasUserInteracted=true;data.budget.state.reviewed=false;const unreviewed=calculateFinancialAnalysis(data).planning;assert(unreviewed.homeRange.upper>0);assert.equal(unreviewed.health.status,'provisional');assert.match(unreviewed.homeRange.reason,/not been marked reviewed/);
});
test('preview restores baseline at equal amounts and preserves explicitly entered zero expenses',()=>{
 const data=fixture();data.stressTest={housingMonthly:1000,expensesMonthly:700.25};
 assert.equal(calculateFinancialAnalysis(data).planning.stressTest.active,false);
 data.stressTest={housingMonthly:0,expensesMonthly:0};const p=calculateFinancialAnalysis(data).planning;
 assert.equal(p.summary.cashFlow,5300);assert.equal(p.summary.monthlyDebt,200);assert.equal(p.summary.monthlySavings,500);
});
test('stress input validation rejects unsafe shapes, missing totals, negative and nonfinite values',async()=>{
 for(const stressTest of [[],{},'100',{housingMonthly:-1,expensesMonthly:0},{housingMonthly:1e6+1,expensesMonthly:0},{housingMonthly:1.234,expensesMonthly:0},{housingMonthly:null,expensesMonthly:0},{housingMonthly:'1000',expensesMonthly:0},{housingMonthly:1000,expensesMonthly:NaN},{housingMonthly:1000,expensesMonthly:0,extra:true}]){
  const data={...fixture(),stressTest};assert.throws(()=>calculateFinancialAnalysis(data));
  const r=await handler({httpMethod:'POST',body:JSON.stringify(data)});assert.equal(r.statusCode,400);
 }
 assert.throws(()=>calculateFinancialAnalysis({version:1,stressTest:{housingMonthly:1000,expensesMonthly:500}}),/Connect/);
});
test('cash reserves cap the recommended payment and cannot be hidden by ample income',()=>{
 const data=fixture();data.mortgage.emergencyFundUserEntered=true;data.mortgage.emergencyFund=5000;
 const p=calculateFinancialAnalysis(data).planning;
 assert.equal(p.limits.reserveCushion,766.42);assert.equal(p.monthlyLimit,766.42);
 assert(p.homeRange.upper<240000);assert.equal(p.health.status,'stretched');
 data.mortgage.emergencyFund=3000;const limited=calculateFinancialAnalysis(data).planning;
 assert.equal(limited.homeRange.target,null);assert.match(limited.homeRange.reason,/No price fits/);
 data.mortgage.emergencyFund=0;assert.equal(calculateFinancialAnalysis(data).planning.homeRange.upper,null);
});
test('missing gross income blocks the health verdict even when take-home income is supplied',()=>{
 const data=fixture();data.income.grossMonthlyIncome=null;data.budget.state.grossMonthly=null;
 const p=calculateFinancialAnalysis(data).planning;assert.equal(p.health.status,'incomplete');assert.equal(p.homeRange.upper,null);assert(p.health.missing.includes('positive gross income'));
});

test('original income breakdown, deductions and reported assets flow through without duplicate entry',()=>{
 const data=fixture();Object.assign(data.income,{monthlyDeductions:2000,monthlySavingsContributions:500,capitalReservesTotal:9100,containsEstimates:true,sources:[{label:'Base pay',amount:4000,basis:'rate-estimate'},{label:'BAH',amount:2000,basis:'rate-estimate'},{label:'Additional income',amount:2000,basis:'user-entered'}]});
 const original=structuredClone(data),r=calculateFinancialAnalysis(data);
 assert.equal(r.income.payrollDeductions,2000);assert.equal(r.income.netMonthly,6000);assert.equal(r.income.availableAfterIncomeSavings,5500);assert.equal(r.income.sources[1].label,'BAH');assert.equal(r.income.sources[1].amount,2000);assert.equal(r.income.containsEstimates,true);
 assert.equal(r.financialProfile.reportedSavingsInvestmentsReserves,9100);assert.equal(r.summary.reservesAfterClosing,null);assert.equal(r.summary.reserveMonths,null);
 assert.equal(r.summary.cashFlow,3599.75);assert.deepEqual(data,original);
 data.mortgage.emergencyFundUserEntered=true;data.mortgage.emergencyFund=4000;const supplied=calculateFinancialAnalysis(data);
 assert.equal(supplied.summary.reservesAfterClosing,4000);assert.equal(supplied.financialProfile.reportedSavingsInvestmentsReserves,9100);
 data.mortgage.downPayment=12000;data.budget.state.items[0].value=calculateMilitaryMortgage(data.mortgage).monthly.totalHousing;
 const funds=calculateFinancialAnalysis(data);assert.equal(funds.financialProfile.knownUpfrontShortfall,2900);assert.match(funds.planning.health.reason,/below the known upfront costs/);
});
test('source deductions can derive take-home income; unknown deductions never become zero',()=>{
 const data=fixture();data.income.netMonthlyIncome=null;data.budget.state.netMonthly=null;data.budget.state.reviewed=false;
 let r=calculateFinancialAnalysis(data);assert.equal(r.income.netMonthly,null);assert.equal(r.planning.health.basis,'before-payroll-deductions');assert.equal(r.planning.health.status,'provisional');assert(r.planning.homeRange.upper>0);assert.equal(r.summary.reviewed,false);
 data.income.monthlyDeductions=2000;r=calculateFinancialAnalysis(data);assert.equal(r.income.netMonthly,6000);assert.equal(r.summary.cashFlow,3599.75);assert.equal(r.planning.homeRange.basis,'take-home');assert.equal(r.planning.health.status,'provisional');
 data.income.monthlyDeductions=0;r=calculateFinancialAnalysis(data);assert.equal(r.income.netMonthly,8000);assert.equal(r.income.payrollDeductions,0);
 data.income.capitalReservesTotal=0;assert.equal(calculateFinancialAnalysis(data).financialProfile.reportedSavingsInvestmentsReserves,0);
});
test('provisional gross-income stress tests constrain prices and preserve before-tax labels',()=>{
 const data=fixture();data.income.netMonthlyIncome=null;data.budget.state.netMonthly=null;data.budget.state.reviewed=false;
 const before=calculateFinancialAnalysis(data);data.stressTest={housingMonthly:1500,expensesMonthly:6100};const r=calculateFinancialAnalysis(data);
 assert.equal(r.planning.summary.beforeDeductionsRemaining,-300);assert.equal(r.planning.summary.cashFlow,null);assert.equal(r.planning.health.residualPercent,null);assert(r.planning.health.beforeDeductionsPercent<0);assert.equal(r.planning.health.label,'Before-tax shortfall');assert.equal(r.planning.monthlyLimit,700);assert(r.planning.homeRange.upper<before.planning.homeRange.upper);assert.match(r.planning.homeRange.reason,/before-tax/);
});
test('invalid source financial details and obsolete analysis overrides fail validation',async()=>{
 for(const change of [d=>{d.income.capitalReservesTotal=-1},d=>{d.income.sources=[{amount:'4000'}]},d=>{d.income.sources=[null]},d=>{d.income.sources=Array(51).fill({amount:0})},d=>{d.income.monthlyDeductions=3000},d=>{d.income.monthlyDeductions=9000},d=>{d.analysisInputs={netMonthlyIncome:9000,reviewed:true}}]){
  const data=fixture();change(data);assert.throws(()=>calculateFinancialAnalysis(data));assert.equal((await handler({httpMethod:'POST',body:JSON.stringify(data)})).statusCode,400);
 }
});

test('purchase cash is recalculated from original entries, reserves are subtracted once and a shortfall is explicit',()=>{
 const d=fixture();Object.assign(d.mortgage,{closingCosts:4000,prepaidsEscrow:2000,cashAvailable:30000,moveInCosts:1000,emergencyFundUserEntered:true,emergencyFund:999999,upfront:{reservesAfterPurchase:999999}});
 let r=calculateFinancialAnalysis(d);assert.equal(r.summary.reservesAfterClosing,23000);assert.equal(r.summary.cashFlow,3599.75);assert.equal(r.planning.health.label,'Stable');assert.match(r.planning.conclusion,/fits the monthly budget/);assert.match(r.planning.conclusion,/23,000/);
 d.mortgage.cashAvailable=5000;r=calculateFinancialAnalysis(d);assert.equal(r.summary.reservesAfterClosing,-2000);assert.equal(r.planning.health.status,'at-risk');assert.match(r.planning.conclusion,/2,000.00 short/);
 d.mortgage.prepaidsEscrow=null;r=calculateFinancialAnalysis(d);assert.equal(r.summary.reservesAfterClosing,null);assert.match(r.planning.conclusion,/still need review/);
});
test('final conclusion distinguishes gross-only, unreviewed, missing costs and monthly deficit',()=>{
 const d=fixture();let r=calculateFinancialAnalysis(d);assert.match(r.planning.conclusion,/Closing costs and prepaids still need review/);
 d.budget.state.reviewed=false;assert.match(calculateFinancialAnalysis(d).planning.conclusion,/Confirm your expense review/);
 d.income.netMonthlyIncome=null;d.budget.state.netMonthly=null;assert.match(calculateFinancialAnalysis(d).planning.conclusion,/Add payroll deductions/);
 d.income.netMonthlyIncome=1000;d.budget.state.netMonthly=1000;assert.match(calculateFinancialAnalysis(d).planning.conclusion,/monthly shortfall/);
});

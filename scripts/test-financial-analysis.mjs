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
 assert.equal(h.residualPercent,3599.75/6000*100);assert.equal(h.label,'Stable');assert.equal(h.factors.creditScore,720);
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
test('gross-only previews never produce a take-home residual, health verdict or recommended price',()=>{
 const data=fixture();data.income.netMonthlyIncome=null;data.budget.state.netMonthly=null;data.stressTest={housingMonthly:1500,expensesMonthly:900};
 const p=calculateFinancialAnalysis(data).planning;
 assert.equal(p.summary.cashFlow,null);assert.equal(p.summary.beforeDeductionsRemaining,4900);
 assert.equal(p.health.residualPercent,null);assert.equal(p.health.status,'incomplete');assert.equal(p.homeRange.upper,null);
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
test('zero housing budget has no invented price; examples and unreviewed budgets stay incomplete',()=>{
 const data=fixture();data.stressTest={housingMonthly:0,expensesMonthly:9000};
 assert.equal(calculateFinancialAnalysis(data).planning.homeRange.status,'unavailable');
 delete data.stressTest;data.mortgage.hasUserInteracted=false;assert.equal(calculateFinancialAnalysis(data).planning.homeRange.status,'incomplete');
 data.mortgage.hasUserInteracted=true;data.budget.state.reviewed=false;assert.equal(calculateFinancialAnalysis(data).planning.homeRange.upper,null);
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

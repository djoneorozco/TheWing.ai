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

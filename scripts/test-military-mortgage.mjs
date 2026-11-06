import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMilitaryMortgage as calc, fhaPremiumTerms, fhaFirstYearMonthlyMip } from '../netlify/functions/_share/military-mortgage.js';
import { handler } from '../netlify/functions/mortgage.js';
const fixture = (changes = {}) => ({contract:'military-mortgage-v1',loanType:'VA',homePrice:250000,downPayment:0,interestRate:6.25,termYears:30,creditScore:720,propertyTaxAnnual:3125,insuranceAnnual:1125,hoaMonthly:0,otherOwnershipMonthly:0,pmiMonthly:null,vaFeeStatus:'first',feePayment:'finance',...changes});
const expectedPI = (loan, rate, years) => Math.round((rate === 0 ? loan / (years * 12) : loan * (rate / 1200) / (1 - Math.pow(1 + rate / 1200, -years * 12))) * 100) / 100;
test('known amortization: $300,000 at 6% / 30 years', () => {
  assert.equal(calc(fixture({homePrice:300000,interestRate:6,vaFeeStatus:'exempt'})).monthly.principalInterest,1798.65);
});
test('VA fee table: first/subsequent/exempt and 5%/10% boundaries', () => {
  for (const [status, down, fee] of [['first',0,5375],['subsequent',0,8250],['first',12500,3562.5],['subsequent',12500,3562.5],['first',25000,2812.5],['subsequent',25000,2812.5],['exempt',0,0]]) {
    const r=calc(fixture({vaFeeStatus:status,downPayment:down}));
    assert.equal(r.loan.fee,fee); assert.equal(r.loan.loanAmount,250000-down+fee);
    assert.equal(r.monthly.principalInterest,expectedPI(r.loan.loanAmount,6.25,30));
    assert.equal(r.monthly.mortgageInsurance,0);
  }
  assert.equal(calc(fixture({downPayment:12499.99})).loan.feeRate,.0215);
  assert.equal(calc(fixture({downPayment:24999.99})).loan.feeRate,.015);
});
test('cash fee is counted upfront, not in principal; reserves never enter mortgage arithmetic', () => {
  const r=calc(fixture({feePayment:'cash',emergencyFund:8000}));
  assert.equal(r.loan.loanAmount,250000); assert.equal(r.upfront.knownSubtotal,5375);
  assert.equal(r.monthly.totalHousing,1893.46);
});
test('explicit zero rate and zero taxes/insurance remain zero', () => {
  const r=calc(fixture({interestRate:0,vaFeeStatus:'exempt',propertyTaxAnnual:0,insuranceAnnual:0}));
  assert.equal(r.monthly.totalHousing,694.44);
});
test('100% down keeps ongoing ownership costs for all three programs', () => {
  for (const loanType of ['VA','CONVENTIONAL','FHA']) {
    const r=calc(fixture({loanType,downPayment:250000,hoaMonthly:100,otherOwnershipMonthly:200}));
    assert.equal(r.monthly.totalHousing,654.17); assert.equal(r.loan.fee,0); assert.equal(r.monthly.principalInterest,0);
  }
});
test('conventional PMI boundary does not round 19.999% up to 20%', () => {
  const almost=calc(fixture({loanType:'CONVENTIONAL',downPayment:49999.99}));
  assert.ok(almost.monthly.mortgageInsurance>0);
  assert.equal(calc(fixture({loanType:'CONVENTIONAL',downPayment:50000})).monthly.mortgageInsurance,0);
});
test('conventional PMI quote including explicit zero wins', () => {
  for(const quote of [0,43.27]) assert.equal(calc(fixture({loanType:'CONVENTIONAL',pmiMonthly:quote})).monthly.mortgageInsurance,quote);
});
test('credit does not invent or replace an entered interest rate', () => {
  for(const score of [580,640,720,850]) assert.equal(calc(fixture({creditScore:score})).monthly.principalInterest,1572.39);
});
test('FHA financed upfront MIP and first-year periodic premium', () => {
  const r=calc(fixture({loanType:'FHA',downPayment:8750}));
  assert.equal(r.loan.baseLoan,241250); assert.equal(r.loan.fee,4221.88); assert.equal(r.loan.loanAmount,245471.88);
  assert.equal(r.monthly.principalInterest,1511.41); assert.equal(r.monthly.mortgageInsurance,109.99);
  assert.equal(r.monthly.totalHousing,1975.57); assert.equal(r.mortgageInsurance.durationYears,30);
});
test('FHA cash upfront MIP changes principal, not the base-loan MIP tier', () => {
  const r=calc(fixture({loanType:'FHA',downPayment:8750,feePayment:'cash'}));
  assert.equal(r.loan.loanAmount,241250); assert.equal(r.upfront.knownSubtotal,12971.88);
  assert.equal(r.monthly.principalInterest,expectedPI(241250,6.25,30));
});
test('FHA table boundaries and durations including high-balance / 15-year cases', () => {
  for (const [base,price,term,rate,duration] of [
    [726200,800000,30,.005,30],[726200.01,800000,30,.007,30],
    [95000,100000,30,.005,30],[95000.01,100000,30,.0055,30],
    [90000,100000,30,.005,11],[90000.01,100000,30,.005,30],
    [90000,100000,15,.0015,11],[90000.01,100000,15,.004,15],
    [780000,1000000,15,.0015,11],[780000.01,1000000,15,.004,11],
    [900000,1000000,15,.004,11],[900000.01,1000000,15,.0065,15],
    [50000,100000,10,.0015,10]]) {
    assert.deepEqual(fhaPremiumTerms(base,price,term),{annualRate:rate,durationYears:duration});
  }
});
test('HUD premium schedule is annual average balance, not original balance times rate', () => {
  // Zero-rate loan: 12 opening balances 120000,119000,...109000 average114500.
  assert.equal(fhaFirstYearMonthlyMip(120000,0,1000,.005,false),47.71);
});
test('invalid input never fabricates a payment; missing differs from zero', () => {
  for(const key of ['homePrice','downPayment','creditScore','interestRate','termYears','propertyTaxAnnual','insuranceAnnual','hoaMonthly','otherOwnershipMonthly']) {
    for(const value of [null,undefined,'',false,NaN,Infinity,-1,'42abc']) assert.throws(()=>calc(fixture({[key]:value})),{code:'INVALID_INPUT'});
  }
  for(const changes of [{downPayment:250001},{homePrice:250000.001},{insuranceAnnual:1125.001},{loanType:'USDA'},{vaFeeStatus:null},{feePayment:null},{termYears:30.5},{creditScore:720.5},{interestRate:31},{loanType:'FHA',downPayment:8749.99}]) assert.throws(()=>calc(fixture(changes)),{code:'INVALID_INPUT'});
});
test('component sum, loan balances and amortization across 90 combinations', () => {
  for(const loanType of ['VA','CONVENTIONAL','FHA']) for(const interestRate of [0,.0001,3,6.375,30]) for(const termYears of [10,15,30]) for(const downPayment of [12500,50000]) {
    const r=calc(fixture({loanType,interestRate,termYears,downPayment,hoaMonthly:42.99,otherOwnershipMonthly:185.37}));
    const m=r.monthly;
    assert.equal(m.totalHousing,Math.round((m.principalInterest+m.propertyTax+m.insurance+m.hoa+m.mortgageInsurance+m.otherOwnership)*100)/100);
    assert.ok(Math.abs(m.principalInterest-expectedPI(r.loan.loanAmount,interestRate,termYears))<=.01);
    assert.equal(r.loan.baseLoan+r.loan.financedFee,r.loan.loanAmount);
  }
});
test('endpoint compatibility, methods, error path, and contract', async () => {
  assert.equal((await handler({httpMethod:'OPTIONS'})).statusCode,204);
  assert.equal((await handler({httpMethod:'DELETE'})).statusCode,405);
  assert.equal((await handler({httpMethod:'POST',body:'{'})).statusCode,400);
  for(const loanType of ['VA','CONVENTIONAL','FHA']) {
    const r=await handler({httpMethod:'POST',body:JSON.stringify(fixture({loanType,downPayment:12500}))});
    assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).contract,'military-mortgage-v1');
    assert.equal(r.headers['Access-Control-Allow-Origin'],'*');
  }
  const invalid=await handler({httpMethod:'POST',body:JSON.stringify(fixture({interestRate:null}))});
  assert.equal(invalid.statusCode,400);assert.equal(JSON.parse(invalid.body).field,'interestRate');
  const legacy=await handler({httpMethod:'POST',body:JSON.stringify({price:250000,loanType:'va',interestRate:6.65,propertyTaxPercent:1.25,insurancePercent:.45})});
  assert.equal(legacy.statusCode,200);assert.equal(JSON.parse(legacy.body).monthly.allIn,1993.59);
});
test('visualization amortization uses final financed principal and known analytical total', () => {
  const r=calc(fixture({homePrice:300000,interestRate:6,vaFeeStatus:'exempt'}));
  assert.equal(r.amortization.principal,300000);
  assert.equal(r.amortization.totalInterest,347514.57);
  assert.equal(r.amortization.totalPaymentsPI,647514.57);
  assert.equal(r.amortization.months,360);
  const financed=calc(fixture());
  assert.equal(financed.amortization.principal,255375);
  assert.ok(Math.abs(financed.amortization.totalPaymentsPI - financed.amortization.totalInterest - financed.loan.loanAmount) < .011);
});
test('visualization amortization handles zero interest, cash purchase and fee paid upfront', () => {
  assert.equal(calc(fixture({interestRate:0})).amortization.totalInterest,0);
  assert.equal(calc(fixture({interestRate:0})).amortization.totalPaymentsPI,255375);
  const cash=calc(fixture({downPayment:250000}));
  assert.equal(cash.amortization.principal,0);assert.equal(cash.amortization.totalPaymentsPI,0);
  assert.equal(calc(fixture({feePayment:'cash'})).amortization.principal,250000);
});
test('nonloan costs never inflate principal-and-interest lifetime totals', () => {
  const a=calc(fixture()),b=calc(fixture({propertyTaxAnnual:15000,insuranceAnnual:5000,hoaMonthly:500,otherOwnershipMonthly:700}));
  assert.deepEqual(a.amortization,b.amortization);
  assert.notEqual(a.monthly.totalHousing,b.monthly.totalHousing);
  assert.equal(a.contract,'military-mortgage-v1');
});

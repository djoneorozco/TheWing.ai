// TOR's civilian policy composes the same audited engines and tool contracts as PCSU.
import {readRequest as readFinancialRequest,buildPacket as buildFinancialPacket,runScenario as runFinancialScenario,mortgageKeys,object} from './pcsu-amy-context.js';
import {calculateFinancialAnalysis} from './financial-analysis.js';
export const VERSION='TOR-Ask-Elena/1.0.0';
export const CIVILIAN_MORTGAGE_KEYS=mortgageKeys.filter(k=>k!=='vaFeeStatus');
export const SOURCES=[
 {id:'consumer-mortgage',title:'CFPB · Explore loan choices',url:'https://www.consumerfinance.gov/owning-a-home/explore/'},
 {id:'budget',title:'CFPB · Budgeting and financial tools',url:'https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/toolkit/'},
 {id:'fha',title:'HUD · FHA home loans',url:'https://www.hud.gov/helping-americans/loans'},
 {id:'texas-taxes',title:'Texas Comptroller · Property tax basics',url:'https://comptroller.texas.gov/taxes/property-tax/basics.php'}
];
export function civilianLoan(mortgage){
 if(mortgage?.loanType!=null&&!['CONVENTIONAL','FHA'].includes(mortgage.loanType))throw Error('Choose Conventional or FHA for this civilian homebuying estimate.');
}
export function readRequest(body){const r=readFinancialRequest(body);civilianLoan(r.context.mortgage);return r;}
export function buildPacket(context){civilianLoan(context.mortgage);return {...buildFinancialPacket(context),version:VERSION,source_catalog:SOURCES};}
export function runScenario(name,args,request,packet,index){
 if(name==='calculate_mortgage'){
  if(args?.changes?.some(x=>!CIVILIAN_MORTGAGE_KEYS.includes(x.field)))throw Error('Use civilian mortgage inputs.');
  civilianLoan({...request.context.mortgage,...Object.fromEntries((args?.changes||[]).map(x=>[x.field,x.value]))});
 }
 return runFinancialScenario(name,args,request,packet,index);
}
export function calculateIncome(raw){
 if(!object(raw))throw Error('Enter your monthly household income.');
 const keys=['grossMonthlyIncome','monthlyDeductions','monthlySavingsContributions','capitalReservesTotal'];
 const input=Object.fromEntries(keys.map(k=>[k,raw[k]??null]));
 // Reuse the canonical income normalization and cent rounding, not a browser formula.
 const checked=calculateFinancialAnalysis({version:1,income:{...input,complete:true,status:'household',containsEstimates:false}});
 const complete=checked.income.grossMonthly!==null;
 return {ok:true,version:'tor-income-v1',snapshot:{...input,complete,status:complete?'household':'incomplete',containsEstimates:false,netMonthlyIncome:checked.income.netMonthly,sources:complete?[{label:'Household income',amount:checked.income.grossMonthly,basis:'Your entry'}]:[]},summary:checked.income};
}

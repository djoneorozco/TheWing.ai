// Non-authoritative PCS starter plan. Official allowance math stays in the
// existing dated modules; route and spending assumptions are returned explicitly.
import { PCS_BASE_COORDINATES } from './pcs-base-coordinates.js';
import { calculatePcsTravelDays } from './official-pcs-travel-days.js';
import { calculateRelocationBrief, RelocationInputError } from './pcs-relocation-brief.js';
import { getDlaAmount } from './official-dla.js';

export const STARTER_SCHEMA = 'pcs-starter-plan.v1';
export const PLANNING_DEFAULTS = Object.freeze({mpg:25, fuelPrice:4.5, hotelRate:150, foodPerPerson:45, cushionPercent:15});
const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
const fail = message => {throw new RelocationInputError(message);};
function number(value, name, min, max, integer=false) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))fail(`Check ${name}: enter ${min}–${max}.`);
  return value;
}
function optional(value, fallback, name, min, max, integer=false) {
  return value===undefined||value===null ? fallback : number(value,name,min,max,integer);
}
const normalizedName = value => String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');
function base(value) {
  if(typeof value!=='string')fail('Choose a current base and destination.');
  const name=Object.keys(PCS_BASE_COORDINATES).find(key=>normalizedName(key)===normalizedName(value));
  if(!name)fail('This base is not in the supported Snapshot list.');
  return {name,...PCS_BASE_COORDINATES[name]};
}
function roughMiles(from,to) {
  const rad=n=>n*Math.PI/180;
  const a=Math.sin(rad(to.latitude-from.latitude)/2)**2+Math.cos(rad(from.latitude))*Math.cos(rad(to.latitude))*Math.sin(rad(to.longitude-from.longitude)/2)**2;
  // Existing PCS-Calculator heuristic, explicitly not a road-network lookup.
  return Math.max(1,Math.round(2*3958.8*Math.asin(Math.sqrt(Math.min(1,a)))*1.18));
}

export function calculateStarterPlan(raw) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Provide your trip details.');
  const from=base(raw.currentBase),to=base(raw.destinationBase);
  if(from.name===to.name)fail('Choose a different current base. A same-base move needs a local-move estimate.');
  if([from,to].some(b=>b.region==='AK'||b.region==='HI'))fail('Alaska, Hawaii and overseas moves need a separate route estimate. This starter plan covers driving within the contiguous U.S.');
  const household=number(raw.familySize,'Snapshot family size',1,21,true);
  const travelers=optional(raw.travelers,household,'people traveling (including the member)',1,21,true);
  const povs=optional(raw.povs,1,'vehicles',1,2,true);
  const under12=raw.dependentsUnder12==null?null:number(raw.dependentsUnder12,'dependents under 12',0,travelers-1,true);
  const mileageMode=raw.mileageMode??'auto';
  if(!['auto','estimated_driving','entered_authorized'].includes(mileageMode))fail('Choose a mileage source.');
  const automaticMiles=roughMiles(from,to);
  const miles=mileageMode==='auto'?automaticMiles:number(raw.distanceMiles,'mileage',1,20000,true);
  const maximumDays=calculatePcsTravelDays(miles).days;
  const days=optional(raw.plannedDrivingDays,maximumDays,'planned travel days',1,60,true);
  const assumptions={};
  for(const [key,min,max] of [['mpg',1,100],['fuelPrice',0.01,20],['hotelRate',0,2000],['foodPerPerson',0,500],['cushionPercent',0,100]]) {
    assumptions[key]=optional(raw[key],PLANNING_DEFAULTS[key],key,min,max);
  }
  assumptions.rooms=optional(raw.rooms,Math.ceil(travelers/4),'hotel rooms',1,10,true);
  assumptions.extraCosts=optional(raw.extraCosts,0,'other costs',0,100000);
  const nights=Math.max(0,days-1);
  const fuel=money(miles/assumptions.mpg*assumptions.fuelPrice*povs);
  const lodging=money(nights*assumptions.rooms*assumptions.hotelRate);
  const meals=money(days*travelers*assumptions.foodPerPerson);
  const subtotal=money(fuel+lodging+meals+assumptions.extraCosts);
  const cushion=money(subtotal*assumptions.cushionPercent/100);
  const calculatedTotal=money(subtotal+cushion);
  const manualExpenses=raw.estimatedExpenses==null?null:number(raw.estimatedExpenses,'your own expense total',0,1000000);
  const budget={fuel,lodging,meals,extraCosts:assumptions.extraCosts,subtotal,cushion,calculatedTotal,total:manualExpenses===null?calculatedTotal:money(manualExpenses),source:manualExpenses===null?'calculated_planning':'user_entered',nights,assumptions};
  const eligibility=raw.dlaEligibility??'unknown';
  if(!['unknown','confirmed','excluded'].includes(eligibility))fail('Choose a DLA status.');
  if(raw.travelersTogether!==undefined&&typeof raw.travelersTogether!=='boolean')fail('Choose whether the family is traveling together.');
  const together=raw.travelersTogether!==false;
  if(raw.includePerDiem!==undefined&&typeof raw.includePerDiem!=='boolean')fail('Choose whether to include per diem.');
  const input={...raw,currentBase:from.name,destinationBase:to.name,familySize:household,travelers,povs,dependentsUnder12:under12,mileageMode,plannedDrivingDays:raw.plannedDrivingDays??null,dlaEligibility:eligibility,travelersTogether:together};
  const result={schema:STARTER_SCHEMA,input,route:{from:from.name,to:to.name,miles,automaticMiles,source:mileageMode,method:mileageMode==='auto'?'Base-center straight-line miles × 1.18; rough planning only, not a mapped driving route.':mileageMode==='entered_authorized'?'Mileage entered from orders / transportation office; not independently verified.':'Driving distance entered by you.',estimatedTravelDays:days,mileageBasedMaximumDays:maximumDays,allowanceDays:Math.min(days,maximumDays)},travelers:{count:travelers,under12,ageMixKnown:under12!==null||travelers===1,together},budget,allowances:null,allowanceIssue:null,dla:{eligibility,included:false,possibleAmount:null},net:null,exclusions:['Moving truck or container','Household-goods shipment','Pet fees','Tolls and parking','Temporary lodging after arrival','Deposits and housing setup'],assumptions:['Your Snapshot household travels together with one service member unless adjusted.','Default spending values are editable planning assumptions, not official reimbursement rates or live price quotes.','Hotel budget starts with one room per four travelers; check hotel occupancy rules.','The cushion is an optional budget allowance, not a statistical confidence interval.']};
  if(!together){result.allowanceIssue='Separate traveler itineraries need a separate allowance estimate. Your driving budget is still shown.';return result;}
  const common={estimateMode:'relocation-brief',accuracyVersion:2,rank:raw.rank,hasDependents:travelers>1,includeDla:eligibility==='confirmed',includePerDiem:raw.includePerDiem!==false,travelMode:'conus-pov',travelersTogether:true,travelDate:raw.travelDate,distanceMiles:miles,distanceSource:mileageMode==='entered_authorized'?'entered_authorized':'estimated_driving',povs,estimatedExpenses:budget.total,plannedDrivingDays:days,dlaEligibility:eligibility,dlaEffectiveDate:raw.dlaEffectiveDate??null,dlaRank:raw.dlaRank??null,dlaHasDependents:raw.dlaHasDependents??null};
  try {
    const lowChildren=under12??travelers-1,highChildren=under12??0;
    const low=calculateRelocationBrief({...common,dependentsUnder12:lowChildren,dependents12Plus:travelers-1-lowChildren});
    const high=calculateRelocationBrief({...common,dependentsUnder12:highChildren,dependents12Plus:travelers-1-highChildren});
    result.allowances={low:low.allowances.total,high:high.allowances.total,malt:low.allowances.malt,dla:low.allowances.dla,perDiemLow:low.allowances.perDiem,perDiemHigh:high.allowances.perDiem,perDiemIncluded:common.includePerDiem,usedTravelDays:low.usedTravelDays,maltRate:low.malt.ratePerMile,perDiemFiscalYear:low.perDiem?.fiscalYear??null,sources:low.sources};
    result.net={low:money(result.allowances.low-budget.total),high:money(result.allowances.high-budget.total)};
    result.dla={...low.dla,possibleAmount:null};
    // A possible primary-DLA amount is separate from totals and never an award.
    if(eligibility==='unknown') {
      const possible=getDlaAmount({rank:raw.rank,hasDependents:household>1,year:Number(raw.travelDate.slice(0,4))});
      if(possible.available)result.dla.possibleAmount=possible.amount;
    }
  }catch(error){
    if(!(error instanceof RelocationInputError))throw error;
    // Keep a useful route/budget when rates or confirmed-DLA details are missing.
    result.allowanceIssue=error.message;
  }
  return result;
}

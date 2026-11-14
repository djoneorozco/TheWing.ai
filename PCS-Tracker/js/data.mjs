export const CATEGORIES = ['Orders', 'Shipment', 'Travel', 'Arrival'];
export const MILESTONES = [
  { key: 'pickup', label: 'Shipment pickup' },
  { key: 'departure', label: 'Planned departure' },
  { key: 'arrival', label: 'Planned arrival' },
  { key: 'report', label: 'Report date' },
];
const planning = 'https://www.militaryonesource.mil/resources/millife-guides/planning-pcs-move/';
const transport = 'https://www.militaryonesource.mil/moving-pcs/moving-personal-property/';
const offices = 'https://installations.militaryonesource.mil/';
export const TASKS = [
  ['orders', 'Review orders with your unit', 'Orders', 'Confirm your reporting instructions, required appointments, and open questions with your unit. Enter dates from your own instructions; this planner does not generate military deadlines.', planning],
  ['sponsor', 'Connect with your sponsor', 'Orders', 'Ask your sponsor or relocation office about arrival arrangements and the local contacts who can help your household.', offices],
  ['records', 'Organize your move records', 'Orders', 'Keep orders, amendments, and personal records in your own secure files. Use this planner for brief tasks and questions, not document uploads.', planning],
  ['options', 'Review shipment options with TMO', 'Shipment', 'Ask your Traffic Management Office which shipment arrangements fit your orders. Discuss government-arranged shipment, PPM, storage, and special items before committing.', transport],
  ['shipment', 'Confirm shipment dates with TMO', 'Shipment', 'Requested pickup and delivery dates may still need confirmation. Record the status of your arrangements and the contact who can confirm them.', transport],
  ['essentials', 'Plan what travels with you', 'Shipment', 'Your belongings may arrive separately from your family. Make a short list of documents, medications, and everyday items you will need in transit.', transport],
  ['travelers', 'Review travelers, route, and dates', 'Travel', 'Ask passenger travel and finance to confirm the authorized travelers and arrangements. Personal planning dates do not establish authorized travel days.', offices],
  ['lodging', 'Plan temporary lodging', 'Travel', 'Confirm reservations and ask finance which lodging guidance applies to your circumstances. Keep travel and temporary-lodging records separate to avoid counting a cost twice.', offices],
  ['costs', 'Review costs and payment timing', 'Travel', 'Use the Allowances & Costs section to compare your expected expenses and move allowances, then check which bills need cash before the next payment.', planning],
  ['reporting', 'Confirm arrival and reporting instructions', 'Arrival', 'Use your gaining unit’s instructions to confirm where and when to report. A checked task here does not certify official in-processing completion.', offices],
  ['delivery', 'Coordinate housing access and delivery', 'Arrival', 'Check who will be available for keys, inspections, and delivery appointments. Keep requested dates distinct from confirmed arrangements.', transport],
  ['claim', 'Prepare questions for your travel claim', 'Arrival', 'Ask your servicing finance office which records, submission method, and deadlines apply. Track advances and payments in your own records.', offices],
].map(([id, title, category, why, source]) => ({ id, title, category, why, source }));

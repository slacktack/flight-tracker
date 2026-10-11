// Official sites for check-in, baggage rules and flight status, by IATA code.
const SITES: Record<string, string> = {
  '6E': 'https://www.goindigo.in', AI: 'https://www.airindia.com', IX: 'https://www.airindiaexpress.com', SG: 'https://www.spicejet.com',
  QP: 'https://www.akasaair.com', '9I': 'https://www.allianceair.in', EK: 'https://www.emirates.com', EY: 'https://www.etihad.com',
  QR: 'https://www.qatarairways.com', FZ: 'https://www.flydubai.com', G9: 'https://www.airarabia.com', WY: 'https://www.omanair.com',
  GF: 'https://www.gulfair.com', SV: 'https://www.saudia.com', SQ: 'https://www.singaporeair.com', TR: 'https://www.flyscoot.com',
  TG: 'https://www.thaiairways.com', MH: 'https://www.malaysiaairlines.com', AK: 'https://www.airasia.com', D7: 'https://www.airasia.com',
  FD: 'https://www.airasia.com', CX: 'https://www.cathaypacific.com', UL: 'https://www.srilankan.com', BG: 'https://www.biman-airlines.com',
  BA: 'https://www.britishairways.com', VS: 'https://www.virginatlantic.com', LH: 'https://www.lufthansa.com', AF: 'https://www.airfrance.com',
  KL: 'https://www.klm.com', LX: 'https://www.swiss.com', TK: 'https://www.turkishairlines.com', UA: 'https://www.united.com',
  AA: 'https://www.aa.com', DL: 'https://www.delta.com', AC: 'https://www.aircanada.com', ET: 'https://www.ethiopianairlines.com',
  VN: 'https://www.vietnamairlines.com', VJ: 'https://www.vietjetair.com',
};

export const airlineSite = (iata: string) => SITES[iata] ?? null;

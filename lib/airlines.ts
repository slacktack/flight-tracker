// ICAO -> name and IATA, for the carriers seen most over South Asia and the Gulf.
const AIRLINES: Record<string, [string, string]> = {
  AIC: ['Air India', 'AI'], IGO: ['IndiGo', '6E'], SEJ: ['SpiceJet', 'SG'], AXB: ['Air India Express', 'IX'],
  AKJ: ['Akasa Air', 'QP'], VTI: ['Vistara', 'UK'], LLR: ['Alliance Air', '9I'], FLG: ['Fly91', 'IC'], SDG: ['Star Air', 'S5'],
  UAE: ['Emirates', 'EK'], ETD: ['Etihad', 'EY'], QTR: ['Qatar Airways', 'QR'], FDB: ['flydubai', 'FZ'], ABY: ['Air Arabia', 'G9'],
  OMA: ['Oman Air', 'WY'], GFA: ['Gulf Air', 'GF'], SVA: ['Saudia', 'SV'], KAC: ['Kuwait Airways', 'KU'], JZR: ['Jazeera Airways', 'J9'],
  FAD: ['flyadeal', 'F3'], KNE: ['flynas', 'XY'], SIA: ['Singapore Airlines', 'SQ'], TGW: ['Scoot', 'TR'], THA: ['Thai Airways', 'TG'],
  TAX: ['Thai AirAsia X', 'XJ'], AIQ: ['Thai AirAsia', 'FD'], MAS: ['Malaysia Airlines', 'MH'], AXM: ['AirAsia', 'AK'], XAX: ['AirAsia X', 'D7'],
  CPA: ['Cathay Pacific', 'CX'], ALK: ['SriLankan', 'UL'], BBC: ['Biman', 'BG'], RNA: ['Nepal Airlines', 'RA'], DRK: ['Druk Air', 'KB'],
  PIA: ['PIA', 'PK'], BAW: ['British Airways', 'BA'], VIR: ['Virgin Atlantic', 'VS'], DLH: ['Lufthansa', 'LH'], AFR: ['Air France', 'AF'],
  KLM: ['KLM', 'KL'], SWR: ['Swiss', 'LX'], AUA: ['Austrian', 'OS'], THY: ['Turkish Airlines', 'TK'], UAL: ['United', 'UA'],
  AAL: ['American', 'AA'], DAL: ['Delta', 'DL'], ACA: ['Air Canada', 'AC'], QFA: ['Qantas', 'QF'], ANA: ['ANA', 'NH'],
  JAL: ['Japan Airlines', 'JL'], KAL: ['Korean Air', 'KE'], CCA: ['Air China', 'CA'], CES: ['China Eastern', 'MU'], CSN: ['China Southern', 'CZ'],
  ETH: ['Ethiopian', 'ET'], KQA: ['Kenya Airways', 'KQ'], MSR: ['EgyptAir', 'MS'], RJA: ['Royal Jordanian', 'RJ'], UZB: ['Uzbekistan Airways', 'HY'],
  AFL: ['Aeroflot', 'SU'], VJC: ['VietJet', 'VJ'], HVN: ['Vietnam Airlines', 'VN'], GIA: ['Garuda', 'GA'], PAL: ['Philippine Airlines', 'PR'],
  FDX: ['FedEx', 'FX'], UPS: ['UPS', '5X'], GTI: ['Atlas Air', '5Y'], CLX: ['Cargolux', 'CV'], BCS: ['DHL (EAT)', 'QY'], BDA: ['Blue Dart', 'BZ'],
  IAF: ['Indian Air Force', ''], AMB: ['Air ambulance', ''],
};

export function airlineName(icao: string): string {
  return AIRLINES[icao]?.[0] ?? '';
}

export function airlineIata(icao: string): string {
  return AIRLINES[icao]?.[1] ?? '';
}

/** Short codes (IOC style) used on narrow screens. Fallback: first 3 letters. */
const CODES: Record<string, string> = {
  USA: 'USA', 'United States': 'USA', Canada: 'CAN', Mexico: 'MEX', 'Puerto Rico': 'PUR',
  'Dominican Republic': 'DOM', Bahamas: 'BAH', 'The Bahamas': 'BAH', Jamaica: 'JAM',
  Haiti: 'HAI', Cuba: 'CUB', Panama: 'PAN', 'Saint Lucia': 'LCA', 'St. Lucia': 'LCA',
  'Trinidad and Tobago': 'TTO', 'U.S. Virgin Islands': 'ISV', 'US Virgin Islands': 'ISV',
  Brazil: 'BRA', Argentina: 'ARG', Venezuela: 'VEN', Uruguay: 'URU', Colombia: 'COL',
  France: 'FRA', Serbia: 'SRB', Slovenia: 'SLO', Greece: 'GRE', Germany: 'GER', Spain: 'ESP',
  Italy: 'ITA', Croatia: 'CRO', Lithuania: 'LTU', Latvia: 'LAT', Estonia: 'EST',
  Montenegro: 'MNE', 'Bosnia and Herzegovina': 'BIH', Bosnia: 'BIH', 'North Macedonia': 'MKD',
  Turkey: 'TUR', Turkiye: 'TUR', Türkiye: 'TUR', Finland: 'FIN', Sweden: 'SWE', Norway: 'NOR',
  Denmark: 'DEN', Iceland: 'ISL', Austria: 'AUT', Switzerland: 'SUI', 'Czech Republic': 'CZE',
  Czechia: 'CZE', Slovakia: 'SVK', Poland: 'POL', Hungary: 'HUN', Romania: 'ROU',
  Bulgaria: 'BUL', Ukraine: 'UKR', Russia: 'RUS', Belarus: 'BLR', Georgia: 'GEO',
  Netherlands: 'NED', Belgium: 'BEL', Portugal: 'POR', 'United Kingdom': 'GBR',
  'Great Britain': 'GBR', England: 'ENG', Ireland: 'IRL', Israel: 'ISR',
  Cameroon: 'CMR', Nigeria: 'NGR', Senegal: 'SEN', 'South Sudan': 'SSD', Sudan: 'SUD',
  DRC: 'COD', 'Democratic Republic of the Congo': 'COD', Congo: 'CGO', Mali: 'MLI',
  Guinea: 'GUI', Angola: 'ANG', Egypt: 'EGY', Gabon: 'GAB', 'Cape Verde': 'CPV',
  Ghana: 'GHA', Tanzania: 'TAN', Uganda: 'UGA', Kenya: 'KEN', Morocco: 'MAR',
  'South Africa': 'RSA', 'Central African Republic': 'CAF', 'Ivory Coast': 'CIV',
  Japan: 'JPN', China: 'CHN', Philippines: 'PHI', 'South Korea': 'KOR', Lebanon: 'LBN',
  Iran: 'IRI', Australia: 'AUS', 'New Zealand': 'NZL',
}; // prettier-ignore

export function countryCode(country: string): string {
  return (
    CODES[country] ??
    country
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase()
  );
}

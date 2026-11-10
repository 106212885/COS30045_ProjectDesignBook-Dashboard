
const CFG = {
  DATA_URL: 'data/traffic_injuries.csv',
  YEARS: d3.range(2011, 2022),
  AGES: ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'],
  SEXES: ['Female', 'Male'],
  USERS: ['Car occupant', 'Motorcyclist', 'Pedal cyclist', 'Pedestrian', 'Heavy transport & bus', 'Other / van'],
  USER_SHORT: { 'Car occupant': 'Car', 'Motorcyclist': 'Motorcycle', 'Pedal cyclist': 'Cyclist', 'Pedestrian': 'Pedestrian', 'Heavy transport & bus': 'Heavy/bus', 'Other / van': 'Other' },
  // Okabe-Ito
  USER_COL: { 'Car occupant': '#0072B2', 'Motorcyclist': '#D55E00', 'Pedal cyclist': '#009E73', 'Pedestrian': '#E69F00', 'Heavy transport & bus': '#CC79A7', 'Other / van': '#56B4E9' },
  CPS: ['Car / ute / van', 'Fixed object', 'Heavy vehicle / bus', 'Non-collision', 'Other road user / animal / train', 'Other / unspecified'],
  // Paul Tol "muted"
  CP_COL: { 'Car / ute / van': '#332288', 'Fixed object': '#88CCEE', 'Heavy vehicle / bus': '#44AA99', 'Non-collision': '#DDCC77', 'Other road user / animal / train': '#CC6677', 'Other / unspecified': '#882255' },
  REMOTE: ['Major Cities', 'Regional', 'Remote', 'Unknown'],
  REMOTE_COL: '#6B7C93',
  MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  BREAKS: [2012, 2017]   // series breaks (Vic 2012, NSW 2017) - see data dictionary
};
CFG.LIGHT_FILLS = new Set(['#E69F00', '#56B4E9', '#88CCEE', '#DDCC77']);  // need dark text

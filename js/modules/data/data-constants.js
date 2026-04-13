/**
 * Constants
 */


/* Data scales */
export const SCALE_LIN = 'lin';
export const SCALE_LOG = 'log';


/* Data supported by the project */
export const DATA_NONE = 'none';

export const SERIES_LABELS = {
  'min': 'MIN / TX',
  'max': 'MAX / TX',
  'avg': 'AVG / TX',
  'mdn': 'MDN / TX',

  'lin': 'LINEAR SCALE',
  'log': 'LOGARITHMIC SCALE',
  
  'none'          : '──────────────────────────',
  'index'         : 'BLOCK HEIGHT',
  'time'          : 'BLOCK TIMESTAMP',
  'nb_tx'         : 'TRANSACTIONS',
  'mined_btc'     : 'BITCOINS MINED',
  'vlm_out'       : 'VOLUME',
  'blocksize'     : 'BLOCK SIZE',
  'size'          : 'SIZE OF TXS',
  'vsize'         : 'VIRTUAL SIZE OF TXS',
  'fee'           : 'FEES',
  'fee_kb'        : 'FEES / KB',
  'fee_vkb'       : 'FEES / VKB',
  'fee_reward'    : 'FEES / REWARD',
  'bdd'           : 'BITCOIN.DAYS DESTROYED',
  'addr'          : 'ADDRESSES',
  'new_addr'      : 'NEW ADDRESSES',      
  'addr_in'       : 'ADDRESSES (INPUTS)',
  'addr_out'      : 'ADDRESSES (OUTPUTS)',
  'addr_re'       : 'ADDRESS REUSE',
  'txo_in'        : 'UTXOS SPENT',
  'txo_in_mult'   : 'UTXOS SPENT (MULTISIG)',
  'txo_in_ns'     : 'UTXOS SPENT (NON STANDARD)',
  'txo_in_pk'     : 'UTXOS SPENT (P2PK(H))',
  'txo_in_sh'     : 'UTXOS SPENT (P2SH)',
  'txo_in_wkh'    : 'UTXOS SPENT (P2WPKH)',
  'txo_in_wsh'    : 'UTXOS SPENT (P2WSH)',
  'p2sh_mult'     : 'UTXOS SPENT (P2SH (MULTISIG))',
  'p2sh_ns'       : 'UTXOS SPENT (P2SH (NON STANDARD))',
  'p2sh_or'       : 'UTXOS SPENT (P2SH (OP_RETURN))',
  'p2sh_pk'       : 'UTXOS SPENT (P2SH (P2PK(H)))',
  'p2sh_sh'       : 'UTXOS SPENT (P2SH (P2SH))',
  'p2sh_wkh'      : 'UTXOS SPENT (P2SH (P2WPKH))',
  //'p2sh_wsh'      : 'UTXOS SPENT WITH P2SH (P2WSH) SCRIPT',
  'p2wsh_mult'    : 'UTXOS SPENT (P2WSH (MULTISIG))',
  'p2wsh_ns'      : 'UTXOS SPENT (P2WSH (NON STANDARD))',
  'p2wsh_or'      : 'UTXOS SPENT (P2WSH (OP_RETURN))',
  'p2wsh_pk'      : 'UTXOS SPENT (P2WSH (P2PK(H)))',
  'txo_out'       : 'UTXOS CREATED',
  'txo_out_mult'  : 'UTXOS CREATED (MULTISIG)',
  'txo_out_ns'    : 'UTXOS CREATED (NON STANDARD)',
  'txo_out_or'    : 'UTXOS CREATED (OP_RETURN)',
  'txo_out_pk'    : 'UTXOS CREATED (P2PK/P2PKH)',
  'txo_out_sh'    : 'UTXOS CREATED (P2SH)',
  'txo_out_wkh'   : 'UTXOS CREATED (P2WPKH)',
  'txo_out_wsh'   : 'UTXOS CREATED (P2WSH)',
  'nb_total_addr' : 'TOTAL NUMBER OF ADDRESSES',
  'nb_utxo'       : 'TOTAL NUMBER OF UTXOS',
  'extranonce'    : 'EXTRANONCE',
  'nonce'         : 'NONCE',
  'nonce_0'       : 'NONCE BYTE 0',
  'nonce_1'       : 'NONCE BYTE 1',
  'nonce_2'       : 'NONCE BYTE 2',
  'nonce_3'       : 'NONCE BYTE 3',
  'difficulty'    : 'DIFFICULTY',
  'chainwork'     : 'CHAINWORK',
  'time_delta'    : 'BLOCK TIME'
};

export const SERIES = [
  { 'series': 'none'},
  { 'series': 'index', 'ismultiseries': false, 'format': 'ord'},
  { 'series': 'time', 'ismultiseries': false, 'format': 'datehour'},
  { 'series': 'none'},
  { 'series': 'nonce', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'nonce_0', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'nonce_1', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'nonce_2', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'nonce_3', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'extranonce', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'none'},
  { 'series': 'time_delta', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'difficulty', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'chainwork', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'none'},
  { 'series': 'nb_tx', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'mined_btc', 'ismultiseries': false, 'format': 'amount'},
  { 'series': 'blocksize', 'ismultiseries': false, 'format': 'size'},
  { 'series': 'none'},
  { 'series': 'size', 'ismultiseries': true, 'format': 'size'},
  { 'series': 'none'},
  { 'series': 'vsize', 'ismultiseries': true, 'format': 'vsize'},
  { 'series': 'none'},
  { 'series': 'vlm_out', 'ismultiseries': true, 'format': 'amount'},
  { 'series': 'none'},
  { 'series': 'fee', 'ismultiseries': true, 'format': 'amount'},
  { 'series': 'none'},
  { 'series': 'fee_vkb', 'ismultiseries': true, 'format': 'feeratevsize'},
  { 'series': 'none'},
  { 'series': 'fee_kb', 'ismultiseries': true, 'format': 'feeratesize'},
  { 'series': 'none'},
  { 'series': 'fee_reward', 'ismultiseries': false, 'format': 'percentage'},
  { 'series': 'none'},
  { 'series': 'bdd', 'ismultiseries': true, 'format': 'bdd'},
  { 'series': 'none'},
  { 'series': 'addr', 'ismultiseries': true, 'format': 'card'},
  { 'series': 'none'},
  { 'series': 'addr_in', 'ismultiseries': true, 'format': 'card'},
  { 'series': 'none'},
  { 'series': 'addr_out', 'ismultiseries': true, 'format': 'card'},
  { 'series': 'none'},
  { 'series': 'new_addr', 'ismultiseries': true, 'format': 'card'},      
  { 'series': 'none'},
  { 'series': 'addr_re', 'ismultiseries': true, 'format': 'percentage'},
  { 'series': 'none'},
  { 'series': 'txo_in', 'ismultiseries': true, 'format': 'card'},
  { 'series': 'none'},
  { 'series': 'txo_in_mult', 'ismultiseries': false, 'format': 'card'}, 
  { 'series': 'txo_in_ns', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'txo_in_pk', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'txo_in_wkh', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'txo_in_sh', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'p2sh_mult', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'p2sh_ns', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'p2sh_or', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'p2sh_pk', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'p2sh_sh', 'ismultiseries': false, 'format': 'card'},
  //{ 'series': 'p2sh_wsh', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'p2wsh_mult', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'p2wsh_ns', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'p2wsh_or', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'p2wsh_pk', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'none'},
  { 'series': 'txo_out', 'ismultiseries': true, 'format': 'card'},
  { 'series': 'none'},
  { 'series': 'txo_out_mult', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'txo_out_ns', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'txo_out_or', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'txo_out_pk', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'txo_out_wkh', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'txo_out_sh', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'txo_out_wsh', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'none'},
  { 'series': 'nb_total_addr', 'ismultiseries': false, 'format': 'card'},
  { 'series': 'nb_utxo', 'ismultiseries': false, 'format': 'card'},
];


export function initializeSeriesList() {
  let series = {};
  const prefixes = ['min', 'max', 'avg', 'mdn'];
  for (let i in SERIES) {
    const seriesName = SERIES[i]['series'],
          isMultiseries = SERIES[i]['ismultiseries'];
    series[seriesName] =  {
      'label': SERIES_LABELS[seriesName],
      'format': SERIES[i]['format']
    };
    if (isMultiseries) {
      for (let p of prefixes) {
        const label = SERIES_LABELS[seriesName] + ' (' + SERIES_LABELS[p] + ')';
        const value = p + '_' + seriesName;
        series[value] = {
          'label': label,
          'format': SERIES[i]['format']
        };
      }
    }
  }
  return series;
};


export function initializeSeriesOptions() {
  const series = [];
  const prefixes = ['min', 'max', 'avg', 'mdn'];
  for (let i in SERIES) {
    const seriesName = SERIES[i]['series'],
          isMultiseries = SERIES[i]['ismultiseries'];
    series.push({
      'value': seriesName,
      'text': SERIES_LABELS[seriesName]
    });
    if (isMultiseries) {
      for (let p of prefixes) {
        series.push({
          'value': `${p}_${seriesName}`,
          'text': `${SERIES_LABELS[seriesName]} (${SERIES_LABELS[p]})`
        });
      }
    }
  }
  return series;
};
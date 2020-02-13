import PropTypes from 'prop-types';

export const funcMap = {
  all: {
    label: '连续发生',
    meaning: '持续 n 秒每个值都 v',
    params: [],
    defaultValue: [],
  },
  happen: {
    label: '发生次数',
    meaning: '持续 n 秒内 m 次值 v',
    params: ['m'],
    defaultValue: [1],
  },
  nodata: {
    label: '数据上报中断',
    meaning: '持续 n 秒无数据上报',
    params: [],
    defaultValue: [],
  },
  max: {
    label: '最大值',
    meaning: '持续 n 秒最大值 v',
    params: [],
    defaultValue: [],
  },
  min: {
    label: '最小值',
    meaning: '持续 n 秒最小值 v',
    params: [],
    defaultValue: [],
  },
  avg: {
    label: '均值',
    meaning: '持续 n 秒均值 v',
    params: [],
    defaultValue: [],
  },
  sum: {
    label: '求和',
    meaning: '持续 n 秒求和值 v',
    params: [],
    defaultValue: [],
  },
};

export const defaultExpressionValue = {
  metric: '',
  func: 'all',
  eopt: '=',
  threshold: 0,
  params: [], // 必须和当前 func 的初始值对应 !!!
};

export const commonPropTypes = {
  value: PropTypes.array,
  onChange: PropTypes.func,
  alertDuration: PropTypes.number,
  readOnly: PropTypes.bool,
  metrics: PropTypes.array,
  renderHeader: PropTypes.func,
  renderFooter: PropTypes.func,
};

export const commonPropDefaultValue = {
  readOnly: false,
  metrics: [],
  renderHeader: () => {},
  renderFooter: () => {},
};

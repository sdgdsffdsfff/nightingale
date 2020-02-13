/* eslint-disable no-plusplus */
import _ from 'lodash';
import request from '@path/common/request';
import commonApi from '@path/common/api';
import hasDtag from './util/hasDtag';
import getDTagV, { dFilter } from './util/getDTagV';
import processResData from './util/processResData';

function getApi(key) {
  const api = {
    metrics: `${commonApi.graphIndex}/metrics`,
    tagkv: `${commonApi.graphIndex}/tagkv`,
    counter: `${commonApi.graphIndex}/counter/fullmatch`,
    history: `${commonApi.graphTransfer}/data/ui`,
  };
  return api[key];
}

// eslint-disable-next-line consistent-return
function getDTagvKeyword(firstTagv) {
  if (firstTagv === '=all') {
    return '=all';
  }
  if (firstTagv.indexOf('=+') === 0) {
    return '=+';
  }
  if (firstTagv.indexOf('=-') === 0) {
    return '=-';
  }
}

export function fetchEndPoints(nid) {
  return request({
    url: `${commonApi.endpoint}s/bynodeids`,
    data: { ids: nid },
  }, false).then((data) => {
    return _.map(data, 'ident');
  });
}

export function fetchMetrics(selectedEndpoint, endpoints) {
  if (hasDtag(selectedEndpoint)) {
    const dTagvKeyword = getDTagvKeyword(selectedEndpoint[0]);
    selectedEndpoint = dFilter(dTagvKeyword, selectedEndpoint[0], endpoints);
  }
  return request({
    url: getApi('metrics'),
    type: 'POST',
    data: JSON.stringify({
      endpoints: selectedEndpoint,
    }),
  }, false).then((data) => {
    return _.chain(data.metrics).flattenDeep().union().sortBy((o) => {
      return _.lowerCase(o);
    }).value();
  });
}

export function fetchTagkv(selectedEndpoint, selectedMetric, endpoints) {
  if (hasDtag(selectedEndpoint)) {
    const dTagvKeyword = getDTagvKeyword(selectedEndpoint[0]);
    selectedEndpoint = dFilter(dTagvKeyword, selectedEndpoint[0], endpoints);
  }
  return request({
    url: getApi('tagkv'),
    type: 'POST',
    data: JSON.stringify({
      endpoints: _.isArray(selectedEndpoint) ? selectedEndpoint : [selectedEndpoint],
      metrics: _.isArray(selectedMetric) ? selectedMetric : [selectedMetric],
    }),
  }, false).then((data) => {
    let allTagkv = [];
    _.each(data, (item) => {
      const { tagkv } = item;
      allTagkv = [
        {
          tagk: 'endpoint',
          tagv: endpoints,
        },
        ...tagkv || [],
      ];
    });
    return allTagkv;
  });
}

export function fetchCounter(queryBody) {
  return request({
    url: getApi('counter'),
    type: 'POST',
    data: JSON.stringify(queryBody),
  }, false);
}

/**
 * 标准化 metrics 数据
 * 主要是补全 tagkv 和 设置默认 selectedTagkv
 */
export async function normalizeMetrics(metrics, graphConfigInnerVisible) {
  const metricsClone = _.cloneDeep(metrics);
  let canUpdate = false;

  for (let m = 0; m < metricsClone.length; m++) {
    const { selectedEndpoint, selectedMetric, selectedTagkv, tagkv, endpoints } = metricsClone[m];
    // 加载 tagkv 规则，满足
    // 开启行级配置 或者 包含动态tag 或者 没有选择tag
    if (
      _.isEmpty(tagkv) &&
      (!!graphConfigInnerVisible || hasDtag(selectedTagkv) || _.isEmpty(selectedTagkv))
    ) {
      canUpdate = true;
      // eslint-disable-next-line no-await-in-loop
      const newTagkv = await fetchTagkv(selectedEndpoint, selectedMetric, endpoints);
      metricsClone[m].tagkv = newTagkv;
      if (_.isEmpty(selectedTagkv)) {
        metricsClone[m].selectedTagkv = newTagkv;
      }
    }
  }
  return {
    metrics: metricsClone,
    canUpdate,
  };
}

export async function fetchCounterList(metrics) {
  const queryBody = [];

  for (let m = 0; m < metrics.length; m++) {
    const { selectedMetric, selectedTagkv, tagkv, endpoints } = metrics[m];
    let { selectedEndpoint } = metrics[m];

    if (hasDtag(selectedEndpoint)) {
      const dTagvKeyword = getDTagvKeyword(selectedEndpoint[0]);
      selectedEndpoint = dFilter(dTagvKeyword, selectedEndpoint[0], endpoints);
    }

    let newSelectedTagkv = selectedTagkv;

    // 动态tag场景
    if (hasDtag(selectedTagkv)) {
      newSelectedTagkv = _.map(newSelectedTagkv, (item) => {
        return {
          tagk: item.tagk,
          tagv: getDTagV(tagkv, item),
        };
      });
    }

    const excludeEndPoints = _.filter(newSelectedTagkv, (item) => {
      return item.tagk !== 'endpoint';
    });

    queryBody.push({
      endpoints: selectedEndpoint,
      metric: selectedMetric,
      tagkv: excludeEndPoints,
    });
  }

  // eslint-disable-next-line no-return-await
  return await fetchCounter(queryBody);
}

export function fetchHistory(endpointCounters) {
  return request({
    url: getApi('history'),
    type: 'POST',
    data: JSON.stringify(endpointCounters),
  }, false).then((data) => {
    return processResData(data);
  });
}

export async function getHistory(endpointCounters) {
  let sourceData = [];
  let i = 0;
  for (i; i < endpointCounters.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    const data = await fetchHistory(endpointCounters[i]);
    if (data) {
      sourceData = _.concat(sourceData, data);
    }
  }
  return sourceData;
}

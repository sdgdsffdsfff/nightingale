import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Card, Input, Tabs, Tooltip, Spin } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { services } from '@path/components/Graph';
import { prefixCls, metricMap, metricsMeta } from './config';
import { filterMetrics, matchMetrics } from './utils';

const { TabPane } = Tabs;
function getCurrentMetricMeta(metric) {
  if (metricsMeta[metric]) {
    return metricsMeta[metric];
  }
  let currentMetricMeta;
  _.each(metricsMeta, (val, key) => {
    if (key.indexOf('$Name') > -1) {
      const keySplit = key.split('$Name');
      if (metric.indexOf(keySplit[0]) === 0 && metric.indexOf(keySplit[1]) > 0) {
        currentMetricMeta = val;
      }
    }
  });
  return currentMetricMeta;
}
function getSelectedMetricsLen(metric, metricTabKey, graphs) {
  const filtered = _.filter(graphs, (o) => {
    return _.find(o.metrics, { selectedMetric: metric });
  });
  if (filtered.length) {
    return <span style={{ color: '#999' }}> +{filtered.length}</span>;
  }
  return null;
}

export default class MetricSelect extends Component {
  static propTypes = {
    nid: PropTypes.number,
    hosts: PropTypes.array,
    selectedHosts: PropTypes.arrayOf(PropTypes.string),
    metrics: PropTypes.array,
    loading: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    graphs: PropTypes.array,
    // eslint-disable-next-line react/forbid-prop-types
    onSelect: PropTypes.func, // 指标点击回调
  };

  static defaultProps = {
    nid: undefined,
    hosts: [],
    selectedHosts: [],
    metrics: [],
    graphs: [],
    onSelect: () => {},
  };

  constructor(props) {
    super(props);
    this.state = {
      searchValue: '',
      activeKey: 'ALL',
      metricTipVisible: {},
    };
  }

  // eslint-disable-next-line react/sort-comp
  normalizMetrics(key) {
    const { metrics } = this.props;
    let newMetrics = _.cloneDeep(metrics);
    if (key !== 'ALL') {
      const { filter, data } = metricMap[key];
      if (filter && filter.type && filter.value) {
        return filterMetrics(filter.type, filter.value, metrics);
      }
      if (data && data.length !== 0) {
        newMetrics = matchMetrics(data, metrics);
        return _.concat([], newMetrics);
      }
      return [];
    }
    return newMetrics;
  }

  dynamicMetricMaps() {
    const { metrics } = this.props;
    return _.filter(metricMap, (val) => {
      const { dynamic, filter } = val;
      if (!dynamic) return true;
      if (filter && filter.type && filter.value) {
        const newMetrics = filterMetrics(filter.type, filter.value, metrics);
        if (newMetrics && newMetrics.length !== 0) {
          return true;
        }
        return false;
      }
      return false;
    });
  }

  handleMetricsSearch = (e) => {
    const { value } = e.target;
    this.setState({ searchValue: value });
  }

  handleMetricTabsChange = (key) => {
    this.setState({ activeKey: key });
  }

  handleMetricClick = async (metric) => {
    const { nid, onSelect, hosts, selectedHosts } = this.props;
    const now = moment();
    const tagkv = await services.fetchTagkv(selectedHosts, metric, hosts);
    const selectedTagkv = _.cloneDeep(tagkv);
    const endpointTagkv = _.find(selectedTagkv, { tagk: 'endpoint' });
    endpointTagkv.tagv = selectedHosts;
    const newGraphConfig = {
      now: now.clone().format('x'),
      start: now.clone().subtract(3600000, 'ms').format('x'),
      end: now.clone().format('x'),
      metrics: [{
        selectedNid: nid,
        selectedEndpoint: selectedHosts,
        endpoints: hosts,
        selectedMetric: metric,
        selectedTagkv,
        tagkv,
        aggrFunc: undefined,
        consolFuc: 'AVERAGE',
        counterList: [],
      }],
    };
    onSelect({
      ...newGraphConfig,
    });
  }

  renderMetricList(metrics = [], metricTabKey) {
    const { graphs } = this.props;
    return (
      <div className="tabPane">
        {
          metrics.length ?
            <ul className="ant-menu ant-menu-vertical ant-menu-root" style={{ border: 'none' }}>
              {
                _.map(metrics, (metric, i) => {
                  return (
                    <li className="ant-menu-item" key={i} onClick={() => { this.handleMetricClick(metric, metricTabKey); }}>
                      <Tooltip
                        key={`${metricTabKey}_${metric}`}
                        placement="right"
                        visible={this.state.metricTipVisible[`${metricTabKey}_${metric}`]}
                        title={() => {
                          const currentMetricMeta = getCurrentMetricMeta(metric);
                          if (currentMetricMeta) {
                            return (
                              <div>
                                <p>含义：{currentMetricMeta.meaning}</p>
                                <p>单位：{currentMetricMeta.unit}</p>
                              </div>
                            );
                          }
                          return '';
                        }}
                        onVisibleChange={(visible) => {
                          const key = `${metricTabKey}_${metric}`;
                          const currentMetricMeta = getCurrentMetricMeta(metric);
                          const { metricTipVisible } = this.state;
                          if (visible && currentMetricMeta) {
                            metricTipVisible[key] = true;
                          } else {
                            metricTipVisible[key] = false;
                          }
                          this.setState({
                            metricTipVisible,
                          });
                        }}
                      >
                        <span>{metric}</span>
                      </Tooltip>
                      {getSelectedMetricsLen(metric, metricTabKey, graphs)}
                    </li>
                  );
                })
              }
            </ul> :
            <div style={{ textAlign: 'center' }}>暂无数据</div>
        }
      </div>
    );
  }

  renderMetricTabs() {
    const { searchValue, activeKey } = this.state;
    const metrics = this.normalizMetrics(activeKey);
    let newMetrics = metrics;
    if (searchValue) {
      try {
        const reg = new RegExp(searchValue, 'i');
        newMetrics = _.filter(metrics, (item) => {
          return reg.test(item);
        });
      } catch (e) {
        newMetrics = [];
      }
    }

    const newMetricMap = this.dynamicMetricMaps();
    const tabPanes = _.map(newMetricMap, (val) => {
      return (
        <TabPane tab={val.alias} key={val.key}>
          { this.renderMetricList(newMetrics, val.key) }
        </TabPane>
      );
    });
    tabPanes.unshift(
      <TabPane tab="全部" key="ALL">
        { this.renderMetricList(newMetrics, 'ALL') }
      </TabPane>,
    );

    return (
      <Tabs
        type="card"
        activeKey={activeKey}
        onChange={this.handleMetricTabsChange}
      >
        {tabPanes}
      </Tabs>
    );
  }

  render() {
    return (
      <Spin spinning={this.props.loading}>
        <Card
          className={`${prefixCls}-card`}
          title={
            <span className={`${prefixCls}-metrics-title`}>
              <span>指标列表</span>
              <Input
                size="small"
                placeholder="搜索指标"
                onChange={this.handleMetricsSearch}
              />
            </span>
          }
        >
          {this.renderMetricTabs()}
        </Card>
      </Spin>
    );
  }
}

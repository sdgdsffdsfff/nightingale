import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Spin, Icon } from 'antd';
import moment from 'moment';
import _ from 'lodash';
import D3Graph from '@d3-charts/ts-graph';
import { sortableHandle } from 'react-sortable-hoc';
import '@d3-charts/ts-graph/dist/index.css';
import * as config from '../config';
import * as util from '../util';
import * as services from '../services';
import Legend, { getSerieVisible, getSerieColor, getSerieIndex } from './Legend';
import Title from './Title';
import Extra from './Extra';
import GraphConfigInner from '../GraphConfig/GraphConfigInner';

const DragHandle = sortableHandle(() => <Icon type="drag" style={{ cursor: 'move', color: '#999' }} />);

export default class Graph extends Component {
  static propTypes = {
    data: PropTypes.shape({ // 图表数据配置
      ...config.graphPropTypes,
      id: PropTypes.number.isRequired,
    }).isRequired,
    height: PropTypes.number, // 图表高度
    graphConfigInnerVisible: PropTypes.bool, // 内置图表配置栏是否显示
    extraRender: PropTypes.func, // 图表右侧工具栏扩展
    extraMoreList: PropTypes.node, // 图表右侧工具栏更多选项扩展
    metricMap: PropTypes.object, // 指标信息表，用于设置图表名称
    onChange: PropTypes.func, // 图表配置修改回调
    onWillInit: PropTypes.func,
    onDidInit: PropTypes.func,
    onWillUpdate: PropTypes.func,
    onDidUpdate: PropTypes.func,
    onOpenGraphConfig: PropTypes.func,
  };

  static defaultProps = {
    height: 350,
    graphConfigInnerVisible: true,
    extraRender: undefined,
    extraMoreList: undefined,
    metricMap: undefined,
    onChange: _.noop,
    onWillInit: _.noop,
    onDidInit: _.noop,
    onWillUpdate: _.noop,
    onDidUpdate: _.noop,
    onOpenGraphConfig: _.noop,
  };

  constructor(props) {
    super(props);
    this.xhrs = []; // 保存 xhr 实例，用于组件销毁的时候中断进行中的请求
    this.chartOptions = config.chart;
    this.headerHeight = 35;
    this.state = {
      spinning: false,
      errorText: '', // 异常场景下的文案
    };
    this.counterList = [];
    this.series = [];
  }

  componentDidMount() {
    this.fetchData(this.props.data, true, (series) => {
      this.initHighcharts(this.props, series);
    });
  }

  componentWillReceiveProps(nextProps) {
    const nextData = nextProps.data;
    const thisData = this.props.data;
    const selectedNsChanged = !util.isEqualBy(nextData.metrics, thisData.metrics, 'selectedNs');
    const selectedMetricChanged = !util.isEqualBy(nextData.metrics, thisData.metrics, 'selectedMetric');
    const selectedTagkvChanged = !util.isEqualBy(nextData.metrics, thisData.metrics, 'selectedTagkv');
    const aggrFuncChanged = !util.isEqualBy(nextData.metrics, thisData.metrics, 'aggrFunc');
    const consolFuncChanged = !util.isEqualBy(nextData.metrics, thisData.metrics, 'consolFunc');
    const aggrGroupChanged = !util.isEqualBy(nextData.metrics, thisData.metrics, 'aggrGroup');
    const timeChanged = nextData.start !== thisData.start || nextData.end !== thisData.end;

    // 重新加载数据并更新 series
    // 时间范围值、环比值、selectedTagkv值改变的时候需要重新加载数据
    if (
      timeChanged
      || selectedNsChanged
      || selectedMetricChanged
      || selectedTagkvChanged
      || aggrFuncChanged
      || aggrGroupChanged
      || consolFuncChanged
    ) {
      const isFetchCounter = selectedNsChanged || selectedMetricChanged || selectedTagkvChanged;
      this.fetchData(nextProps.data, isFetchCounter, (series) => {
        this.updateHighcharts(nextData, series);
      });
    } else if (
      // 只更新 chartOptions
      nextData.threshold !== thisData.threshold
      || nextData.unit !== thisData.unit
      || nextData.yAxisMax !== thisData.yAxisMax
      || nextData.yAxisMin !== thisData.yAxisMin
      || nextData.timezoneOffset !== thisData.timezoneOffset
      || nextData.shared !== thisData.shared) {
      this.updateHighcharts(nextData);
    }
  }

  componentWillUnmount() {
    this.abortFetchData();
    if (this.chart) this.chart.destroy();
  }

  static setOptions = (options) => {
    window.OdinGraphOptions = options;
  };

  // eslint-disable-next-line class-methods-use-this
  getGraphConfig(graphConfig) {
    return {
      ...config.graphDefaultConfig,
      ...graphConfig,
      // eslint-disable-next-line no-nested-ternary
      now: graphConfig.now ? graphConfig.now : graphConfig.end ? graphConfig.end : config.graphDefaultConfig.now,
    };
  }

  getZoomedSeries() {
    return this.series;
  }

  refresh = () => {
    const { data, onChange } = this.props;
    const now = moment();
    // eslint-disable-next-line prefer-template
    const start = (now.format('x') - Number(data.end)) + Number(data.start) + '';
    const end = now.format('x');

    onChange('update', data.id, {
      start, end, now: end,
    });
  }

  resize = () => {
    if (this.chart && this.chart.resizeHandle) {
      this.chart.resizeHandle();
    }
  }

  // eslint-disable-next-line react/sort-comp
  async fetchData(graphConfig, isFetchCounter, cbk) {
    graphConfig = this.getGraphConfig(graphConfig);

    this.abortFetchData();

    this.setState({ spinning: true });
    let { metrics } = graphConfig;

    try {
      const metricsResult = await services.normalizeMetrics(metrics, this.props.graphConfigInnerVisible, this.xhrs);
      // eslint-disable-next-line prefer-destructuring
      metrics = metricsResult.metrics;

      if (metricsResult.canUpdate) {
        this.props.onChange('update', graphConfig.id, {
          metrics,
        });
        // 临时图场景，只是更新 tagkv, 这块需要再优化下
        // return;
      }
      if (isFetchCounter) {
        this.counterList = await services.fetchCounterList(metrics, this.xhrs);
      }

      const endpointCounters = util.normalizeEndpointCounters(graphConfig, this.counterList);
      const errorText = this.checkEndpointCounters(endpointCounters, config.countersMaxLength);

      if (!errorText) {
        // get series
        const sourceData = await services.getHistory(endpointCounters, this.xhrs);
        this.series = util.normalizeSeries(sourceData, graphConfig, this.series);
      }

      if (cbk) cbk(this.series);
      this.setState({ errorText, spinning: false });
    } catch (e) {
      console.log(e);
      if (e.statusText === 'abort') return;

      let errorText = e.err;

      if (e.statusText === 'error') {
        errorText = '网络已断开，请检查网络';
      } else if (e.statusText === 'Not Found') {
        errorText = '404 Not Found，请联系管理员';
      } else if (e.responseJSON) {
        errorText = _.get(e.responseJSON, 'msg', e.responseText);

        if (!errorText || e.status === 500) {
          errorText = '数据加载异常，请刷新重新加载';
        }

        // request entity too large
        if (e.status === 413) {
          errorText = '请求条件过大，请减少条件';
        }
      }

      this.setState({ errorText, spinning: false });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  checkEndpointCounters(endpointCounters, countersMaxLength) {
    let errorText = '';
    if (!_.get(endpointCounters, 'length', 0)) {
      errorText = '暂无数据';
    }

    if (endpointCounters.length > countersMaxLength) {
      errorText = (
        <span className="counters-maxLength">
          曲线过多，当前
          {endpointCounters.length}
          上限
          {countersMaxLength}
          ，请减少曲线
        </span>
      );
    }

    return errorText;
  }

  abortFetchData() {
    _.each(this.xhrs, (xhr) => {
      if (_.isFunction(_.get(xhr, 'abort'))) xhr.abort();
    });
    this.xhrs = [];
  }

  initHighcharts(props, series) {
    const graphConfig = this.getGraphConfig(props.data);
    const chartOptions = {
      timestamp: 'x',
      chart: {
        height: props.height,
        renderTo: this.graphWrapEle,
      },
      xAxis: graphConfig.xAxis,
      yAxis: util.getYAxis({}, graphConfig),
      tooltip: {
        shared: graphConfig.shared,
        formatter: (points) => {
          return util.getTooltipsContent({
            points,
            chartWidth: this.graphWrapEle.offsetWidth - 40,
          });
        },
      },
      series,
      legend: {
        enabled: false,
      },
      onZoom: (getZoomedSeries) => {
        this.getZoomedSeries = getZoomedSeries;
        this.forceUpdate();
      },
    };

    if (!this.chart) {
      this.props.onWillInit(chartOptions);
      this.chart = new D3Graph(chartOptions);
      this.props.onDidInit(this.chart, chartOptions);
    }
  }

  updateHighcharts(graphConfig = this.props.data, series = this.series) {
    if (!this.chart) {
      this.initHighcharts(this.props);
      return;
    }
    graphConfig = this.getGraphConfig(graphConfig);

    const updateChartOptions = {
      yAxis: util.getYAxis(this.chart.options.yAxis, graphConfig),
      tooltip: {
        xAxis: graphConfig.xAxis,
        shared: graphConfig.shared,
        formatter: (points) => {
          return util.getTooltipsContent({
            points,
            chartWidth: this.graphWrapEle.offsetWidth - 40,
          });
        },
      },
      series,
    };

    this.props.onWillUpdate(this.chart, updateChartOptions);
    this.chart.update(updateChartOptions);
    this.props.onDidUpdate(this.chart, updateChartOptions);
  }

  handleLegendRowSelectedChange = (selectedKeys, highlightedKeys) => {
    const { series } = this.state;

    const newSeries = _.map(series, (serie, i) => {
      const oldColor = _.get(serie, 'oldColor', serie.color);
      return {
        ...serie,
        visible: getSerieVisible(serie, selectedKeys),
        zIndex: getSerieIndex(serie, highlightedKeys, series.length, i),
        color: getSerieColor(serie, highlightedKeys, oldColor),
        oldColor,
      };
    });

    this.setState({ series: newSeries }, () => {
      this.updateHighcharts();
    });
  }

  render() {
    const { spinning, errorText, isOrigin } = this.state;
    const { height, onChange, extraRender, data } = this.props;
    const graphConfig = this.getGraphConfig(data);

    return (
      <div className={graphConfig.legend ? 'graph-container graph-container-hasLegend' : 'graph-container'}>
        <div
          className="graph-header"
          style={{
            height: this.headerHeight,
            lineHeight: `${this.headerHeight}px`,
          }}
        >
          <div className="graph-extra">
            <div style={{ display: 'inline-block' }}>
              {
                this.props.useDragHandle ? <DragHandle /> : null
              }
              {
                _.isFunction(extraRender)
                  ? extraRender(this) :
                  <Extra
                    graphConfig={graphConfig}
                    counterList={this.counterList}
                    onOpenGraphConfig={this.props.onOpenGraphConfig}
                    moreList={this.props.extraMoreList}
                  />
              }
            </div>
          </div>
          <Title
            title={data.title}
            selectedNs={_.reduce(graphConfig.metrics, (result, metricObj) => _.concat(result, metricObj.selectedNs), [])}
            selectedMetric={_.reduce(graphConfig.metrics, (result, metricObj) => _.concat(result, metricObj.selectedMetric), [])}
            metricMap={this.props.metricMap}
          />
        </div>
        {
          this.props.graphConfigInnerVisible
            ? <GraphConfigInner
              isOrigin={isOrigin}
              data={graphConfig}
              onChange={onChange}
            /> : null
        }
        <Spin spinning={spinning}>
          <div style={{ height, display: !errorText ? 'none' : 'block' }}>
            {
              errorText ?
                <div className="graph-errorText">
                  {errorText}
                </div> : null
            }
          </div>
          <div
            className="graph-content"
            ref={(ref) => { this.graphWrapEle = ref; }}
            style={{
              height,
              backgroundColor: '#fff',
              display: errorText ? 'none' : 'block',
            }}
          />
        </Spin>
        <Legend
          style={{ display: graphConfig.legend ? 'block' : 'none' }}
          series={this.getZoomedSeries()}
          onSelectedChange={this.handleLegendRowSelectedChange}
        />
      </div>
    );
  }
}

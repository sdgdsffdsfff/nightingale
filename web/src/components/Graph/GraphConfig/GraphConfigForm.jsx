/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable consistent-return */
/* eslint-disable class-methods-use-this */
import React from 'react';
import PropTypes from 'prop-types';
import update from 'react-addons-update';
import { Row, Col, Spin, Table, Form, Select, Input, InputNumber, Icon, TreeSelect, DatePicker } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import BaseComponent from '@path/BaseComponent';
import { normalizeTreeData, renderTreeNodes } from '@path/Layout/utils';
import Tagkv from './Tagkv';
import * as config from '../config';
import { getTimeLabelVal } from '../util';
import hasDtag from '../util/hasDtag';
import * as services from '../services';

const FormItem = Form.Item;
const { Option } = Select;
function normalizeMetrics(metrics) {
  if (_.isEmpty(metrics)) {
    return [{
      key: _.uniqueId('METRIC_'),
      selectedNid: undefined,
      selectedMetric: '',
    }];
  }
  return _.map(metrics, metric => ({
    ...metric,
    key: metric.selectedMetric || _.uniqueId('METRIC_'),
  }));
}

function intersectionTagkv(selectedTagkv, tagkv) {
  return _.intersectionBy(selectedTagkv, tagkv, 'tagk');
}

/**
 * graph 配置面板 - 表单组件
 * 多 ns、metric 场景，已选取交集，待选取并集
 */

export default class GraphConfigForm extends BaseComponent {
  static propTypes = {
    data: PropTypes.shape({
      ...config.graphPropTypes,
      tag_id: PropTypes.number,
      alias: PropTypes.string,
    }),
    isScreen: PropTypes.bool,
    subclassOptions: PropTypes.array,
    btnDisable: PropTypes.func.isRequired, // ? 是否可以优化
  };

  static contextTypes = {
    getSelectedNode: PropTypes.func,
    habitsId: PropTypes.string,
  };

  static defaultProps = {
    data: {},
    isScreen: false,
    subclassOptions: [],
  };

  constructor(props) {
    super(props);
    const { data } = props;
    const metrics = normalizeMetrics(data.metrics);
    this.xhrs = [];
    this.state = {
      // graph config
      graphConfig: {
        ...config.graphDefaultConfig,
        ...props.data,
        metrics,
      },
      loading: false,
      tableEmptyText: '暂无数据',
      nsSearchVal: '', // 节点搜索值
      counterListVisible: false,
      advancedVisible: false,
    };
  }

  componentDidMount() {
    this.fetchTreeData(() => {
      this.fetchAllByMetric();
    });
  }

  setLoading(loading) {
    this.setState({ loading });
    this.props.btnDisable(loading);
  }

  getColumns() {
    return [
      {
        title: '曲线',
        dataIndex: 'counter',
      }, {
        title: '周期',
        dataIndex: 'step',
        width: 45,
        render(text) {
          return <span>{text}{'s'}</span>;
        },
      },
    ];
  }

  fetchTreeData(cbk) {
    this.request({
      url: this.api.tree,
    }).then((res) => {
      const treeData = normalizeTreeData(res);
      this.setState({ treeData, originTreeData: res }, () => {
        if (cbk) cbk();
      });
    });
  }

  async fetchAllByMetric() {
    const { metrics } = this.state.graphConfig;
    const currentMetricObj = _.cloneDeep(metrics[0]);
    const currentMetricObjIndex = 0;

    if (currentMetricObj) {
      try {
        this.setLoading(true);
        if (currentMetricObj.selectedNid !== undefined) {
          await this.fetchEndpoints(currentMetricObj);
          if (!_.isEmpty(currentMetricObj.selectedEndpoint)) {
            await this.fetchMetrics(currentMetricObj);
            if (currentMetricObj.selectedMetric) {
              await this.fetchTagkv(currentMetricObj);
              if (currentMetricObj.selectedTagkv) {
                await this.fetchCounterList(currentMetricObj);
              }
            }
          }
        }
        this.setState(update(this.state, {
          graphConfig: {
            metrics: {
              $splice: [
                [currentMetricObjIndex, 1, currentMetricObj],
              ],
            },
          },
        }));
        this.setLoading(false);
      } catch (e) {
        this.setLoading(false);
      }
    }
  }

  async fetchEndpoints(metricObj) {
    try {
      const endpoints = await services.fetchEndPoints(metricObj.selectedNid, this.context.habitsId);
      let selectedEndpoint = metricObj.selectedEndpoint || ['=all'];
      if (!hasDtag(selectedEndpoint)) {
        selectedEndpoint = _.intersection(endpoints, metricObj.selectedEndpoint);
      }
      metricObj.endpoints = endpoints;
      metricObj.selectedEndpoint = selectedEndpoint;
      return metricObj;
    } catch (e) {
      return e;
    }
  }

  async fetchMetrics(metricObj) {
    try {
      const metricList = await services.fetchMetrics(metricObj.selectedEndpoint, metricObj.endpoints);
      const selectedMetric = _.indexOf(metricList, metricObj.selectedMetric) > -1 ? metricObj.selectedMetric : '';
      metricObj.metrics = metricList;
      metricObj.selectedMetric = selectedMetric;
      return metricObj;
    } catch (e) {
      return e;
    }
  }

  async fetchTagkv(metricObj) {
    try {
      const tagkv = await services.fetchTagkv(metricObj.selectedEndpoint, metricObj.selectedMetric, metricObj.endpoints);
      let selectedTagkv = metricObj.selectedTagkv || _.chain(tagkv).map(item => ({ tagk: item.tagk, tagv: ['=all'] })).value();
      if (!hasDtag(selectedTagkv)) {
        selectedTagkv = intersectionTagkv(metricObj.selectedTagkv, tagkv);
      }

      metricObj.tagkv = tagkv;
      metricObj.selectedTagkv = selectedTagkv;
    } catch (e) {
      return e;
    }
  }

  async fetchCounterList(metricObj) {
    try {
      const counterList = await services.fetchCounterList([{
        selectedEndpoint: metricObj.selectedEndpoint,
        selectedMetric: metricObj.selectedMetric,
        selectedTagkv: metricObj.selectedTagkv,
        tagkv: metricObj.tagkv,
      }]);
      metricObj.counterList = counterList;
    } catch (e) {
      return e;
    }
  }

  handleNsChange = async (selectedNid, currentMetricObj) => {
    try {
      this.setLoading(true);
      currentMetricObj.selectedNid = selectedNid;
      if (selectedNid !== undefined) {
        await this.fetchEndpoints(currentMetricObj);
        if (!_.isEmpty(currentMetricObj.selectedEndpoint)) {
          await this.fetchMetrics(currentMetricObj);
          if (currentMetricObj.selectedMetric) {
            await this.fetchTagkv(currentMetricObj);
            if (currentMetricObj.selectedTagkv) {
              await this.fetchCounterList(currentMetricObj);
            }
          }
        }
      } else {
        // delete ns
        currentMetricObj.endpoints = [];
        currentMetricObj.selectedEndpoint = [];
        currentMetricObj.metrics = [];
        currentMetricObj.selectedMetric = '';
        currentMetricObj.tagkv = [];
        currentMetricObj.selectedTagkv = [];
        currentMetricObj.counterList = [];
      }

      this.setState(update(this.state, {
        graphConfig: {
          metrics: {
            $splice: [
              [0, 1, currentMetricObj],
            ],
          },
        },
      }));
      this.setLoading(false);
    } catch (e) {
      console.error(e);
      this.setLoading(false);
    }
  }

  handleEndpointChange = async (selectedEndpoint) => {
    const { metrics } = this.state.graphConfig;
    const currentMetricObj = _.cloneDeep(metrics[0]);
    const currentMetricObjIndex = 0;

    if (currentMetricObj) {
      try {
        this.setLoading(true);
        currentMetricObj.selectedEndpoint = selectedEndpoint;
        const endpointTagkv = _.find(currentMetricObj.selectedTagkv, { tagk: 'endpoint' });
        if (endpointTagkv) {
          endpointTagkv.tagv = selectedEndpoint;
        } else {
          currentMetricObj.selectedTagkv = [
            ...currentMetricObj.selectedTagkv || [],
            {
              tagk: 'endpoint',
              tagv: selectedEndpoint,
            },
          ];
        }
        if (!_.isEmpty(currentMetricObj.selectedEndpoint)) {
          await this.fetchMetrics(currentMetricObj);
          if (currentMetricObj.selectedMetric) {
            await this.fetchTagkv(currentMetricObj);
            if (currentMetricObj.selectedTagkv) {
              await this.fetchCounterList(currentMetricObj);
            }
          }
        } else {
          currentMetricObj.metrics = [];
          currentMetricObj.selectedMetric = '';
          currentMetricObj.tagkv = [];
          currentMetricObj.selectedTagkv = [];
          currentMetricObj.counterList = [];
        }

        this.setState(update(this.state, {
          graphConfig: {
            metrics: {
              $splice: [
                [currentMetricObjIndex, 1, currentMetricObj],
              ],
            },
          },
        }));
        this.setLoading(false);
      } catch (e) {
        console.error(e);
        this.setLoading(false);
      }
    }
  }

  handleMetricChange = async (selectedMetric, currentMetric) => {
    const { metrics } = this.state.graphConfig;
    const currentMetricObj = _.cloneDeep(_.find(metrics, { selectedMetric: currentMetric }));
    const currentMetricObjIndex = _.findIndex(metrics, { selectedMetric: currentMetric });

    if (currentMetricObj) {
      try {
        this.setLoading(true);
        currentMetricObj.selectedMetric = selectedMetric;
        if (selectedMetric) {
          await this.fetchTagkv(currentMetricObj);
          if (currentMetricObj.selectedTagkv) {
            await this.fetchCounterList(currentMetricObj);
          }
        } else {
          currentMetricObj.tagkv = [];
          currentMetricObj.selectedTagkv = [];
          currentMetricObj.counterList = [];
        }

        this.setState(update(this.state, {
          graphConfig: {
            metrics: {
              $splice: [
                [currentMetricObjIndex, 1, currentMetricObj],
              ],
            },
          },
        }));
        this.setLoading(false);
      } catch (e) {
        console.error(e);
        this.setLoading(false);
      }
    }
  }

  handleTagkvChange = async (currentMetric, tagk, tagv) => {
    const { metrics } = this.state.graphConfig;
    const currentMetricObj = _.cloneDeep(_.find(metrics, { selectedMetric: currentMetric }));
    const currentMetricObjIndex = _.findIndex(metrics, { selectedMetric: currentMetric });
    const currentTagIndex = _.findIndex(currentMetricObj.selectedTagkv, { tagk });

    if (currentTagIndex > -1) {
      if (!tagv.length) { // 删除
        currentMetricObj.selectedTagkv = update(currentMetricObj.selectedTagkv, {
          $splice: [
            [currentTagIndex, 1],
          ],
        });
      } else { // 修改
        currentMetricObj.selectedTagkv = update(currentMetricObj.selectedTagkv, {
          $splice: [
            [currentTagIndex, 1, {
              tagk, tagv,
            }],
          ],
        });
      }
    } else if (tagv.length) { // 添加
      currentMetricObj.selectedTagkv = update(currentMetricObj.selectedTagkv, {
        $push: [{
          tagk, tagv,
        }],
      });
    }
    this.setState(update(this.state, {
      graphConfig: {
        metrics: {
          $splice: [
            [currentMetricObjIndex, 1, currentMetricObj],
          ],
        },
      },
    }));
    try {
      this.setLoading(true);
      await this.fetchCounterList(currentMetricObj);
      this.setLoading(false);
    } catch (e) {
      console.error(e);
      this.setLoading(false);
    }
  }

  handleAggregateChange = (currentMetric, value) => {
    const { metrics } = this.state.graphConfig;
    const currentMetricObj = _.cloneDeep(_.find(metrics, { selectedMetric: currentMetric }));
    const currentMetricObjIndex = _.findIndex(metrics, { selectedMetric: currentMetric });

    currentMetricObj.aggrFunc = value;
    this.setState(update(this.state, {
      graphConfig: {
        metrics: {
          $splice: [
            [currentMetricObjIndex, 1, currentMetricObj],
          ],
        },
      },
    }));
  }

  handleConsolFucChange = (currentMetric, value) => {
    const { metrics } = this.state.graphConfig;
    const currentMetricObj = _.cloneDeep(_.find(metrics, { selectedMetric: currentMetric }));
    const currentMetricObjIndex = _.findIndex(metrics, { selectedMetric: currentMetric });

    currentMetricObj.consolFuc = value;
    this.setState(update(this.state, {
      graphConfig: {
        metrics: {
          $splice: [
            [currentMetricObjIndex, 1, currentMetricObj],
          ],
        },
      },
    }));
  }

  handleAggregateDimensionChange = (currentMetric, value) => {
    const { metrics } = this.state.graphConfig;
    const currentMetricObj = _.cloneDeep(_.find(metrics, { selectedMetric: currentMetric }));
    const currentMetricObjIndex = _.findIndex(metrics, { selectedMetric: currentMetric });

    currentMetricObj.aggrGroup = value;
    this.setState(update(this.state, {
      graphConfig: {
        metrics: {
          $splice: [
            [currentMetricObjIndex, 1, currentMetricObj],
          ],
        },
      },
    }));
  }

  handleSubclassChange = (val) => {
    this.setState(update(this.state, {
      graphConfig: {
        subclassId: {
          $set: val,
        },
      },
    }));
  }

  handleTitleChange = (e) => {
    this.setState(update(this.state, {
      graphConfig: {
        title: {
          $set: e.target.value,
        },
      },
    }));
  }

  handleTimeOptionChange = (val) => {
    const now = moment();
    let { start, end } = this.state.graphConfig;

    if (val !== 'custom') {
      start = now.clone().subtract(Number(val), 'ms').format('x');
      end = now.format('x');
    } else {
      start = moment(Number(start)).format('x');
      end = moment().format('x');
    }
    this.setState(update(this.state, {
      graphConfig: {
        start: {
          $set: start,
        },
        end: {
          $set: end,
        },
        now: {
          $set: end,
        },
      },
    }));
  }

  handleDateChange = (key, d) => {
    const val = moment.isMoment(d) ? d.format('x') : null;
    this.setState(update(this.state, {
      graphConfig: {
        [key]: {
          $set: val,
        },
      },
    }));
  }

  handleThresholdChange = (val) => {
    this.setState(update(this.state, {
      graphConfig: {
        threshold: {
          $set: val,
        },
      },
    }));
  }

  renderMetrics() {
    const { getSelectedNode } = this.context;
    const selectedNode = getSelectedNode();
    const { metrics } = this.state.graphConfig;
    const metricObj = metrics[0]; // 当前只支持一个指标
    const currentMetric = metricObj.selectedMetric;
    const withoutEndpointTagkv = _.filter(metricObj.tagkv, item => item.tagk !== 'endpoint');
    const treeDefaultExpandedKeys = !_.isEmpty(metricObj.selectedNid) ? metricObj.selectedNid : [selectedNode.id];
    const aggrGroupOptions = _.map(_.get(metrics, '[0].tagkv'), item => ({ label: item.tagk, value: item.tagk }));
    return (
      <div>
        <FormItem
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 21 }}
          label="节点"
          style={{ marginBottom: 5 }}
          required
        >
          <TreeSelect
            showSearch
            allowClear
            treeDefaultExpandedKeys={_.map(treeDefaultExpandedKeys, _.toString)}
            treeNodeFilterProp="title"
            treeNodeLabelProp="path"
            dropdownStyle={{ maxHeight: 200, overflow: 'auto' }}
            value={metricObj.selectedNid}
            onChange={value => this.handleNsChange(value, metricObj)}
          >
            {renderTreeNodes(this.state.treeData)}
          </TreeSelect>
        </FormItem>
        <Tagkv
          type="modal"
          data={[{
            tagk: 'endpoint',
            tagv: metricObj.endpoints,
          }]}
          selectedTagkv={[{
            tagk: 'endpoint',
            tagv: metricObj.selectedEndpoint,
          }]}
          onChange={(tagk, tagv) => { this.handleEndpointChange(tagv); }}
          renderItem={(tagk, tagv, selectedTagv, show) => {
            return (
              <Input
                readOnly
                value={_.join(_.slice(selectedTagv, 0, 40), ', ')}
                size="default"
                placeholder="若无此tag，请留空"
                onClick={() => {
                  show(tagk);
                }}
              />
            );
          }}
          wrapInner={(content, tagk) => {
            return (
              <FormItem
                key={tagk}
                labelCol={{ span: 3 }}
                wrapperCol={{ span: 21 }}
                label={tagk}
                style={{ marginBottom: 5 }}
                className="graph-tags"
                required
              >
                {content}
              </FormItem>
            );
          }}
        />
        <FormItem
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 21 }}
          label="指标"
          style={{ marginBottom: 5 }}
          required
        >
          <Select
            showSearch
            size="default"
            style={{ width: '100%' }}
            placeholder="监控项指标名, 如cpu.idle"
            notFoundContent="请输入关键词过滤"
            className="select-metric"
            value={metricObj.selectedMetric}
            onChange={value => this.handleMetricChange(value, currentMetric)}
          >
            {
              _.map(metricObj.metrics, o => <Option key={o}>{o}</Option>)
            }
          </Select>
        </FormItem>
        <Row style={{ marginBottom: 5 }}>
          <Col span={12}>
            <FormItem
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 18 }}
              label="聚合"
              style={{ marginBottom: 0 }}
            >
              <Select
                allowClear
                size="default"
                style={{ width: '100%' }}
                placeholder="无"
                value={metricObj.aggrFunc}
                onChange={val => this.handleAggregateChange(currentMetric, val)}
              >
                <Option value="sum">求和</Option>
                <Option value="avg">均值</Option>
                <Option value="max">最大值</Option>
                <Option value="min">最小值</Option>
              </Select>
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
              label="聚合维度"
              style={{ marginBottom: 0 }}
            >
              <Select
                mode="multiple"
                size="default"
                style={{ width: '100%' }}
                disabled={!metricObj.aggrFunc}
                placeholder="无"
                value={metricObj.aggrGroup || []}
                onChange={val => this.handleAggregateDimensionChange(currentMetric, val)}
              >
                {
                  _.map(aggrGroupOptions, o => <Option key={o.value} value={o.value}>{o.label}</Option>)
                }
              </Select>
            </FormItem>
          </Col>
        </Row>
        <FormItem
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 21 }}
          label="采样函数"
          style={{ marginBottom: 0 }}
        >
          <Select
            allowClear
            size="default"
            style={{ width: '100%' }}
            placeholder="无"
            value={metricObj.consolFuc}
            onChange={val => this.handleConsolFucChange(currentMetric, val)}
          >
            <Option value="AVERAGE">均值</Option>
            <Option value="MAX">最大值</Option>
            <Option value="MIN">最小值</Option>
          </Select>
        </FormItem>
        <Tagkv
          type="modal"
          data={withoutEndpointTagkv}
          selectedTagkv={metricObj.selectedTagkv}
          onChange={(tagk, tagv) => { this.handleTagkvChange(currentMetric, tagk, tagv); }}
          renderItem={(tagk, tagv, selectedTagv, show) => {
            return (
              <Input
                readOnly
                value={_.join(_.slice(selectedTagv, 0, 40), ', ')}
                size="default"
                placeholder="若无此tag，请留空"
                onClick={() => {
                  show(tagk);
                }}
              />
            );
          }}
          wrapInner={(content, tagk) => {
            return (
              <FormItem
                key={tagk}
                labelCol={{ span: 3 }}
                wrapperCol={{ span: 21 }}
                label={tagk}
                style={{ marginBottom: 5 }}
                className="graph-tags"
                required
              >
                {content}
              </FormItem>
            );
          }}
        />
        <FormItem
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 21 }}
          label="曲线"
          style={{ marginBottom: 5 }}
        >
          <span style={{ color: '#ff7f00', paddingRight: 5 }}>
            {_.get(metricObj.counterList, 'length')}
            条
          </span>
          <a onClick={() => {
            this.setState({ counterListVisible: !this.state.counterListVisible });
          }}>
            <Icon type={
              this.state.counterListVisible ? 'circle-o-up' : 'circle-o-down'
            } />
          </a>
          {
            this.state.counterListVisible &&
            <Table
              bordered={false}
              size="middle"
              columns={this.getColumns(metricObj)}
              dataSource={metricObj.counterList}
              locale={{
                emptyText: metricObj.tableEmptyText,
              }}
            />
          }
        </FormItem>
      </div>
    );
  }

  render() {
    const { loading, graphConfig } = this.state;
    const { now, start, end } = graphConfig;
    const timeVal = now === end ? getTimeLabelVal(start, end, 'value') : 'custom';
    const datePickerStartVal = moment(Number(start)).format(config.timeFormatMap.moment);
    const datePickerEndVal = moment(Number(end)).format(config.timeFormatMap.moment);

    return (
      <Spin spinning={loading}>
        <Form>
          {
            this.props.isScreen ?
              <FormItem
                labelCol={{ span: 3 }}
                wrapperCol={{ span: 21 }}
                label="分类"
                style={{ marginBottom: 5 }}
                required
              >
                <Select
                  style={{ width: '100%' }}
                  value={graphConfig.subclassId}
                  onChange={this.handleSubclassChange}
                >
                  {
                    _.map(this.props.subclassOptions, (option) => {
                      return <Option key={option.id} value={option.id}>{option.name}</Option>;
                    })
                  }
                </Select>
              </FormItem> : null
          }
          <FormItem
            labelCol={{ span: 3 }}
            wrapperCol={{ span: 21 }}
            label="标题"
            style={{ marginBottom: 5 }}
          >
            <Input
              style={{ width: '100%' }}
              value={graphConfig.title}
              onChange={this.handleTitleChange}
              placeholder="如果留空将会用指标名称做为标题"
            />
          </FormItem>
          <FormItem
            labelCol={{ span: 3 }}
            wrapperCol={{ span: 21 }}
            label="时间"
            style={{ marginTop: 5, marginBottom: 0 }}
            required
            >
            <Select placeholder="时间选择" size="default" style={
              timeVal === 'custom' ?
                {
                  width: 198,
                  marginRight: 10,
                } : {
                  width: '100%',
                }
            }
              value={timeVal}
              onChange={this.handleTimeOptionChange}
            >
              {
                _.map(config.time, o => <Option key={o.value} value={o.value}>{o.label}</Option>)
              }
            </Select>
            {
              timeVal === 'custom' ?
                [
                  <DatePicker
                    key="datePickerStart"
                    format={config.timeFormatMap.moment}
                    style={{
                      position: 'relative',
                      width: 193,
                      minWidth: 193,
                    }}
                    defaultValue={moment(datePickerStartVal)}
                    onOk={d => this.handleDateChange('start', d)}
                  />,
                  <span key="datePickerDivider" style={{ paddingLeft: 10, paddingRight: 10 }}>-</span>,
                  <DatePicker
                    key="datePickerEnd"
                    format={config.timeFormatMap.moment}
                    style={{
                      position: 'relative',
                      width: 194,
                      minWidth: 194,
                    }}
                    defaultValue={moment(datePickerEndVal)}
                    onOk={d => this.handleDateChange('end', d)}
                  />,
                ] : false
            }
          </FormItem>
          {this.renderMetrics()}
          <FormItem
            labelCol={{ span: 3 }}
            wrapperCol={{ span: 21 }}
            label="阈值"
            style={{ marginBottom: 5 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              value={graphConfig.threshold}
              onChange={this.handleThresholdChange}
            />
          </FormItem>
        </Form>
      </Spin>
    );
  }
}

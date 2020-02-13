import React from 'react';
import PropTypes from 'prop-types';
import update from 'react-addons-update';
import { Layout, Row, Col, Button } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import queryString from 'query-string';
import BaseComponent from '@path/BaseComponent';
import { config as graphConfig, GlobalOperationbar, services } from '@path/components/Graph';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import MetricSelect from './MetricSelect';
import Graphs from './Graphs';
import { prefixCls, baseMetrics } from './config';
import HostSelect from './HostSelect';
import SubscribeModal from './SubscribeModal';
import { normalizeGraphData } from './utils';
import './style.less';

const { Content } = Layout;

class MonitorDashboard extends BaseComponent {
  static propTypes = {
  };

  static contextTypes = {
    nsTreeVisibleChange: PropTypes.func,
    getSelectedNode: PropTypes.func,
    getNodes: PropTypes.func,
    habitsId: PropTypes.string,
  };

  static defaultProps = {
  };

  constructor(props) {
    super(props);
    const now = moment();
    this.allHostsMode = false;
    this.onceLoad = false;
    this.state = {
      graphs: [], // 所有图表配置
      selectedTreeNode: undefined, // 已选择的完整的节点信息
      metricsLoading: false,
      metrics: [],
      hostsLoading: false,
      hosts: [],
      selectedHosts: [],
      globalOptions: {
        now: now.clone().format('x'),
        start: now.clone().subtract(3600000, 'ms').format('x'),
        end: now.clone().format('x'),
        comparison: [],
      },
    };
    this.sidebarWidth = 200;
  }

  componentWillReceiveProps = async (nextProps) => {
    const { getSelectedNode, nsTreeVisibleChange } = this.context;
    const nextQuery = queryString.parse(_.get(nextProps, 'location.search'));

    if (nextQuery.mode === 'allHosts') {
      const selectedHosts = nextQuery.selectedHosts ? _.split(nextQuery.selectedHosts, ',') : [];
      if (!this.allHostsMode) {
        this.allHostsMode = true;
        nsTreeVisibleChange(false);
        const hosts = await this.fetchHosts();
        const metrics = await this.fetchMetrics(selectedHosts);
        this.setState({
          selectedHosts,
          selectedTreeNode: undefined,
          hosts,
          metrics,
        }, () => {
          if (this.metricSelect && !this.onceLoad) {
            _.each(_.reverse(baseMetrics), async (metric) => {
              this.metricSelect.handleMetricClick(metric);
            });
            this.onceLoad = true;
          }
        });
      }
    } else {
      const selectedTreeNode = getSelectedNode();
      if (this.allHostsMode) {
        nsTreeVisibleChange(true);
        this.allHostsMode = false;
      }
      if (!_.isEqual(selectedTreeNode, this.state.selectedTreeNode)) {
        this.setState({ selectedTreeNode, graphs: [] });
        const hosts = await this.fetchHosts(_.get(selectedTreeNode, 'id'));
        this.setState({ hosts, selectedHosts: hosts });
        const metrics = await this.fetchMetrics(hosts);
        this.setState({ metrics });
      }
    }
  }

  async fetchHosts(nid) {
    let hosts = [];
    try {
      this.setState({ hostsLoading: true });
      if (nid === undefined) {
        const res = await this.request({
          url: this.api.endpoint,
          data: {
            limit: 1000,
          },
        });
        hosts = res.list;
      } else {
        hosts = await services.fetchEndPoints(nid, this.context.habitsId);
      }
      this.setState({ hostsLoading: false });
    } catch (e) {
      console.log(e);
    }
    return hosts;
  }

  async fetchMetrics(selectedHosts) {
    let metrics = [];
    if (!_.isEmpty(selectedHosts)) {
      try {
        this.setState({ metricsLoading: true });
        metrics = await services.fetchMetrics(selectedHosts);
      } catch (e) {
        console.log(e);
      }
      this.setState({ metricsLoading: false });
    }
    return metrics;
  }

  handleGraphConfigSubmit = (type, data, id) => {
    const { graphs } = this.state;
    const graphsClone = _.cloneDeep(graphs);
    const ldata = _.cloneDeep(data) || {};

    if (type === 'push') {
      // eslint-disable-next-line react/no-access-state-in-setstate
      this.setState(update(this.state, {
        graphs: {
          $push: [{
            ...graphConfig.graphDefaultConfig,
            id: Number(_.uniqueId()),
            ...ldata,
          }],
        },
      }));
    } else if (type === 'unshift') {
      this.setState({
        graphs: update(graphsClone, {
          $unshift: [{
            ...graphConfig.graphDefaultConfig,
            id: Number(_.uniqueId()),
            ...ldata,
          }],
        }),
      });
    } else if (type === 'update') {
      this.handleUpdateGraph('update', id, {
        ...ldata,
      });
    }
  }

  handleUpdateGraph = (type, id, updateConf, cbk) => {
    const { graphs } = this.state;
    const index = _.findIndex(graphs, { id });
    if (type === 'allUpdate') {
      this.setState({
        graphs: updateConf,
      });
    } else if (type === 'update') {
      const currentConf = _.find(graphs, { id });
      // eslint-disable-next-line react/no-access-state-in-setstate
      this.setState(update(this.state, {
        graphs: {
          $splice: [
            [index, 1, {
              ...currentConf,
              ...updateConf,
            }],
          ],
        },
      }), () => {
        if (cbk) cbk();
      });
    } else if (type === 'delete') {
      // eslint-disable-next-line react/no-access-state-in-setstate
      this.setState(update(this.state, {
        graphs: {
          $splice: [
            [index, 1],
          ],
        },
      }));
    }
  }

  handleBatchUpdateGraphs = (updateConf) => {
    const { graphs } = this.state;
    const newPureGraphConfigs = _.map(graphs, (item) => {
      return {
        ...item,
        ...updateConf,
      };
    });

    this.setState({
      graphs: [...newPureGraphConfigs],
    });
  }

  handleSubscribeGraphs = () => {
    const configsList = _.map(this.state.graphs, (item) => {
      const data = normalizeGraphData(item);
      return JSON.stringify(data);
    });
    SubscribeModal({
      configsList,
    });
  }

  handleShareGraphs = () => {
    const configsList = _.map(this.state.graphs, (item) => {
      const data = normalizeGraphData(item);
      return {
        configs: JSON.stringify(data),
      };
    });
    this.request({
      url: this.api.tmpchart,
      type: 'POST',
      data: JSON.stringify(configsList),
    }).then((res) => {
      window.open(`/#/monitor/tmpchart?ids=${_.join(res, ',')}`, '_blank');
    });
  }

  handleRemoveGraphs = () => {
    this.setState({ graphs: [] });
  }

  render() {
    const {
      selectedTreeNode,
      hostsLoading,
      hosts,
      selectedHosts,
      metricsLoading,
      metrics,
      graphs,
      globalOptions,
    } = this.state;
    if (!this.allHostsMode && !selectedTreeNode) {
      return (
        <div>
          请选择节点
        </div>
      );
    }
    return (
      <div className={prefixCls}>
        <Layout style={{ height: '100%', position: 'relative' }}>
          <Content>
            <Row gutter={10}>
              <Col span={12}>
                <HostSelect
                  graphConfigs={graphs}
                  loading={hostsLoading}
                  hosts={hosts}
                  selectedHosts={selectedHosts}
                  onSelectedHostsChange={async (newHosts, newSelectedHosts) => {
                    const newMetrics = await this.fetchMetrics(newSelectedHosts);
                    this.setState({ hosts: newHosts, selectedHosts: newSelectedHosts, metrics: newMetrics });
                  }}
                  updateGraph={(newGraphs) => {
                    this.setState({ graphs: newGraphs });
                  }}
                />
              </Col>
              <Col span={12}>
                <MetricSelect
                  ref={(ref) => { this.metricSelect = ref; }}
                  nid={_.get(selectedTreeNode, 'id')}
                  loading={metricsLoading}
                  hosts={hosts}
                  selectedHosts={selectedHosts}
                  metrics={metrics}
                  graphs={graphs}
                  globalOptions={globalOptions}
                  onSelect={(data) => {
                    this.handleGraphConfigSubmit('unshift', data);
                  }}
                />
              </Col>
            </Row>
            <Row style={{ padding: '10px 0' }}>
              <Col span={16}>
                <GlobalOperationbar
                  {...globalOptions}
                  onChange={(obj) => {
                    this.setState({
                      globalOptions: {
                        // eslint-disable-next-line react/no-access-state-in-setstate
                        ...this.state.globalOptions,
                        ...obj,
                      },
                    }, () => {
                      this.handleBatchUpdateGraphs(obj);
                    });
                  }}
                />
              </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
                <Button
                  onClick={this.handleSubscribeGraphs}
                  disabled={!graphs.length}
                  style={{ background: '#fff', marginRight: 8 }}
                >
                  订阅图表
                </Button>
                <Button
                  onClick={this.handleShareGraphs}
                  disabled={!graphs.length}
                  style={{ background: '#fff', marginRight: 8 }}
                >
                  分享图表
                </Button>
                <Button
                  onClick={this.handleRemoveGraphs}
                  disabled={!graphs.length}
                  style={{ background: '#fff' }}
                >
                  清空图表
                </Button>
              </Col>
            </Row>
            <Graphs
              value={graphs}
              onChange={this.handleUpdateGraph}
              onGraphConfigSubmit={this.handleGraphConfigSubmit}
              onUpdateGraph={this.handleUpdateGraph}
            />
          </Content>
        </Layout>
      </div>
    );
  }
}

export default CreateIncludeNsTree(MonitorDashboard, { visible: true });

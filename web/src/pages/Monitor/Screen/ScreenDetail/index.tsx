import React, { Component } from 'react';
import { Button, Card, Divider, Popconfirm, message, Row, Col, Select, Checkbox } from 'antd';
import { FormProps } from 'antd/lib/form';
import moment from 'moment';
import PubSub from 'pubsub-js';
import _ from 'lodash';
import update from 'immutability-helper';
import CreateIncludeNsTree from '@cpts/Layout/CreateIncludeNsTree';
import { GraphConfig } from '@cpts/Graph';
import request from '@common/request';
import api from '@common/api';
import AddModal from './AddModal';
import ModifyModal from './ModifyModal';
import GraphsContainer from './GraphsContainer';
import BatchMoveSubclass from './BatchMoveSubclass';


const { Option } = Select;

function updateTime(nowMoment: moment.Moment, graphConfig: any) {
  let start;
  let end;
  let now;

  if (graphConfig) {
    const timeDiff = Number(graphConfig.end) - Number(graphConfig.start);
    now = nowMoment.format('x');
    end = nowMoment.format('x');
    start = _.toString(Number(end) - timeDiff);
  }

  return {
    now, start, end,
  };
}

const COUNTDOWN = 9; // 0 ~ 9

class ScreenDetail extends Component<FormProps> {
  timer: NodeJS.Timeout | undefined = undefined;
  state = {
    subclassLoading: false,
    subclassData: [],
    chartData: [],
    colNum: 3,
    autoRefresh: false,
    countdown: COUNTDOWN,
    originTreeData: [],
  };
  currentSubclassId: any;
  graphConfigForm: any;
  graphs = {} as any;
  now = moment();

  componentDidMount = () => {
    this.fetchTreeData(() => {
      this.fetchSubclass(this.props);
    });
    PubSub.subscribe('sider-collapse', () => {
      this.resizeGraphs();
    });
  }

  fetchTreeData(cbk?: () => void) {
    request(api.tree).then((res) => {
      this.setState({ originTreeData: res }, () => {
        if (cbk) cbk();
      });
    });
  }

  async fetchSubclass(props: FormProps) {
    const screenId = _.get(props, 'match.params.screenId');
    if (screenId) {
      this.setState({ subclassLoading: true });

      try {
        const subclassData = await request(`${api.screen}/${screenId}/subclass`);
        this.setState({ subclassData: subclassData || [] });
        let chartData: any[] = [];
        await Promise.all(
          _.map(subclassData, async (item) => {
            const chartDataItem = await request(`${api.subclass}/${item.id}/chart`);
            if (chartDataItem) {
              chartData = _.concat(chartData, chartDataItem);
            }
          }),
        );
        _.each(chartData, (item) => {
          try {
            const graphConfig = JSON.parse(item.configs);
            item.configs = {
              ...graphConfig,
              ...updateTime(this.now, graphConfig),
            };
          } catch (e) {
            console.log(e);
          }
        });
        this.setState({
          chartData: _.groupBy(chartData, 'subclass_id'),
        });
      } catch (e) {
        console.log(e);
      }
      this.setState({ subclassLoading: false });
    }
  }

  resizeGraphs = () => {
    _.each(this.graphs, (graph) => {
      if (graph) {
        graph.resize();
      }
    });
  }

  refreshGraphs = () => {
    const makeCountdown = () => {
      this.timer = setTimeout(() => {
        const { countdown } = this.state;
        if (countdown > 0) {
          this.setState({ countdown: countdown - 1 });
        } else {
          const { chartData } = this.state;
          const chartDataClone = _.cloneDeep(chartData);
          const nowMoment = moment();

          _.each(chartDataClone, (graphs) => {
            _.each(graphs, (item: any) => {
              const graphConfig = item.configs;
              item.configs = {
                ...item.configs,
                ...updateTime(nowMoment, graphConfig),
              };
            });
          });

          this.setState({ chartData: chartDataClone, countdown: COUNTDOWN });
        }
        makeCountdown();
      }, 1000);
    };
    makeCountdown();
  }

  handleAddSubclass = () => {
    const { subclassData } = this.state;
    const screenId = _.get(this.props, 'match.params.screenId');
    AddModal({
      title: '新增分类',
      onOk: (values: any) => {
        request(`${api.screen}/${screenId}/subclass`, {
          method: 'POST',
          body: JSON.stringify({
            ...values,
            weight: subclassData.length,
          }),
        }).then(() => {
          message.success('新增分类成功！');
          this.fetchSubclass(this.props);
        });
      },
    });
  }

  handleBatchMoveSubclass = () => {
    BatchMoveSubclass({
      data: this.state.subclassData,
      treeData: _.cloneDeep(this.state.originTreeData),
      onOk: (values: any) => {
        const reqBody = _.map(values.subclasses, (item) => {
          return {
            id: item,
            screen_id: values.screenId,
          };
        });
        request(`${api.subclass}es/loc`, {
          method: 'PUT',
          body: JSON.stringify(reqBody),
        }).then(() => {
          message.success('批量移动分类成功！');
          this.fetchSubclass(this.props);
        });
      },
    });
  }

  handleModSubclass = (subclassObj: any) => {
    ModifyModal({
      title: '修改分类',
      name: subclassObj.name,
      onOk: (values: any) => {
        request(`${api.subclass}`, {
          method: 'PUT',
          body: JSON.stringify([{
            ...values,
            id: subclassObj.id,
          }]),
        }).then(() => {
          message.success('修改分类成功！');
          this.fetchSubclass(this.props);
        });
      },
    });
  }

  handleDelSubclass = (id: number) => {
    request(`${api.subclass}/${id}`, {
      method: 'DELETE',
    }).then(() => {
      message.success('删除分类成功！');
      this.fetchSubclass(this.props);
    });
  }

  handleMoveSubclass = (type: string, idx: number) => {
    const { subclassData } = this.state;
    const newSubclassData = _.map(subclassData, (item: any) => {
      let { weight } = item;
      if (type === 'up') {
        if (item.weight === idx) {
          weight = idx - 1;
        }
        if (item.weight === idx - 1) {
          weight = idx;
        }
      } else if (type === 'down') {
        if (item.weight === idx) {
          weight = idx + 1;
        }
        if (item.weight === idx + 1) {
          weight = idx;
        }
      }
      return {
        ...item,
        weight,
      };
    });
    request(`${api.subclass}`, {
      method: 'PUT',
      body: JSON.stringify(newSubclassData),
    }).then(() => {
      message.success('分类移动成功！');
      this.setState({ subclassData: _.sortBy(newSubclassData, 'weight') });
    });
  }

  handleAddChart = (configs: any) => {
    const { chartData } = this.state;
    const chartDataClone = _.cloneDeep(chartData) as any;
    const subclassChartData = chartDataClone[this.currentSubclassId] || [];
    request(`${api.subclass}/${this.currentSubclassId}/chart`, {
      method: 'POST',
      body: JSON.stringify({
        configs: JSON.stringify({
          ...configs,
        }),
        weight: subclassChartData.length,
      }),
    }).then((res) => {
      chartDataClone[this.currentSubclassId] = _.concat(subclassChartData, [{
        configs,
        id: res,
        subclass_id: this.currentSubclassId,
        weight: subclassChartData.length,
      }]);
      this.setState({ chartData: chartDataClone });
    });
  }

  handleModChart = (subclassId: number, id: number, reqData: any) => {
    request(`${api.chart}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        subclass_id: reqData.subclassId,
        configs: JSON.stringify(reqData.configs),
      }),
    }).then(() => {
      const { chartData } = this.state;
      const chartDataClone = _.cloneDeep(chartData);
      const currentChart = _.find(chartDataClone[subclassId], { id }) as any;
      if (currentChart) {
        currentChart.subclass_id = reqData.subclassId;
        currentChart.configs = reqData.configs;
      }
      this.setState({ chartData: chartDataClone });
    });
  }

  handleDelChart = (subclassId: number, chartId: number) => {
    const { chartData } = this.state;
    const chartDataClone = _.cloneDeep(chartData) as any;
    const idx = _.findIndex(chartDataClone[subclassId], { id: chartId });
    chartDataClone[subclassId].splice(idx, 1);
    _.each(chartDataClone[subclassId], (item, i) => {
      item.weight = i;
    });
    this.setState({ chartData: chartDataClone });
    request(`${api.chart}/${chartId}`, {
      method: 'DELETE',
    }).then(() => {
      message.success('删除图表成功！');
    });
    const reqBody = _.map(chartDataClone[subclassId], (item) => {
      return {
        id: item.id,
        weight: item.weight,
      };
    });
    request(`${api.chart}s/weights`, {
      method: 'PUT',
      body: JSON.stringify(reqBody),
    });
  }

  handleGraphConfigChange = (type: string, data: any) => {
    const { subclassId } = data;
    delete data.subclassId;
    _.each(data.metrics, (item) => {
      delete item.key;
      delete item.metrics;
      delete item.tagkv;
      delete item.counterList;
    });

    if (type === 'push') {
      this.handleAddChart(data);
    } else if (type === 'update') {
      this.handleModChart(subclassId, data.id, {
        subclassId,
        configs: data,
      });
    }
  }

  renderSubclass = (subclassObj: any, idx: number) => {
    const { chartData, subclassData } = this.state;
    const subclassChartData = chartData[subclassObj.id];
    return (
      <Card
        key={subclassObj.id}
        type="inner"
        className="ant-card-compact mb10"
        bodyStyle={{ padding: 10 }}
        title={subclassObj.name}
        extra={
          <span>
            <a onClick={() => {
              if (this.graphConfigForm) {
                this.currentSubclassId = subclassObj.id;
                this.graphConfigForm.showModal('push', '新增');
              }
            }}>
              新增图表
            </a>
            <Divider type="vertical" />
            <a onClick={() => this.handleModSubclass(subclassObj)}>修改</a>
            <Divider type="vertical" />
            <Popconfirm title="确认要删除这个分类吗?" onConfirm={() => this.handleDelSubclass(subclassObj.id)}>
              <a>删除</a>
            </Popconfirm>
            <Divider type="vertical" />
            <a
              disabled={idx === 0}
              onClick={() => this.handleMoveSubclass('up', idx)}
            >
              上移
            </a>
            <Divider type="vertical" />
            <a
              disabled={idx === subclassData.length - 1}
              onClick={() => this.handleMoveSubclass('down', idx)}
            >
              下移
            </a>
          </span>
        }
      >
        <GraphsContainer
          axis="xy"
          useDragHandle
          data={subclassChartData}
          colNum={this.state.colNum}
          graphsInstance={this.graphs}
          graphConfigForm={this.graphConfigForm}
          subclassData={this.state.subclassData}
          originTreeData={this.state.originTreeData}
          onDelChart={(id: number) => this.handleDelChart(subclassObj.id, id)}
          onSortEnd={({ oldIndex, newIndex }: any) => {
            const newSubclassChartData = _.sortBy(_.map(subclassChartData, (item: any, i) => {
              let { weight } = item;
              if (i === oldIndex) {
                // eslint-disable-next-line prefer-destructuring
                weight = subclassChartData[newIndex].weight;
              }
              if (oldIndex < newIndex) {
                if (i > oldIndex && i <= newIndex) {
                  weight = item.weight - 1;
                }
              }
              if (oldIndex > newIndex) {
                if (i >= newIndex && i < oldIndex) {
                  weight = item.weight + 1;
                }
              }
              return {
                ...item,
                weight,
              };
            }), 'weight');
            // eslint-disable-next-line react/no-access-state-in-setstate
            this.setState(update(this.state, {
              chartData: {
                [subclassObj.id]: {
                  $set: newSubclassChartData,
                },
              },
            }));
            const reqBody = _.map(newSubclassChartData, (item) => {
              return {
                id: item.id,
                weight: item.weight,
              };
            });
            request(`${api.chart}s/weights`, {
              method: 'PUT',
              body: JSON.stringify(reqBody),
            }).then(() => {
              message.success('图表排序成功！');
            });
          }}
        />
      </Card>
    );
  }

  render() {
    const { subclassData } = this.state;
    return (
      <div>
        <Row className="mb10">
          <Col span={12}>
            <Button onClick={this.handleAddSubclass} style={{ marginRight: 8 }}>新增分类</Button>
            <Button onClick={this.handleBatchMoveSubclass}>批量移动分类</Button>
          </Col>
          <Col span={12} className="textAlignRight">
            <Checkbox
              style={{ marginRight: 8 }}
              checked={this.state.autoRefresh}
              onChange={(e) => {
                this.setState({
                  autoRefresh: e.target.checked,
                }, () => {
                  if (e.target.checked) {
                    this.refreshGraphs();
                  } else if (!e.target.checked && this.timer) {
                    this.setState({ countdown: COUNTDOWN });
                    clearTimeout(this.timer);
                  }
                });
              }}
            >
              自动刷新 { this.state.autoRefresh ? `(${this.state.countdown})` : '' }
            </Checkbox>
            <Select
              style={{ width: 70 }}
              value={this.state.colNum}
              onChange={(value: number) => {
                this.setState({ colNum: value }, () => {
                  this.resizeGraphs();
                });
              }}
            >
              <Option key="1" value={1}>1列</Option>
              <Option key="2" value={2}>2列</Option>
              <Option key="3" value={3}>3列</Option>
              <Option key="4" value={4}>4列</Option>
            </Select>
          </Col>
        </Row>
        <div>
          {
            _.map(subclassData, (item, idx) => {
              return this.renderSubclass(item, idx);
            })
          }
        </div>
        <GraphConfig
          ref={(ref) => { this.graphConfigForm = ref; }}
          onChange={this.handleGraphConfigChange}
        />
      </div>
    );
  }
}

export default CreateIncludeNsTree(ScreenDetail);

import React from 'react';
import PropTypes from 'prop-types';
import { Switch, Popover, Input, Button, Card, Spin } from 'antd';
import _ from 'lodash';
import Multipicker from '@path/components/Multipicker';
import { util as graphUtil } from '@path/components/Graph';
import BaseComponent from '@path/BaseComponent';
import { prefixCls } from './config';

export default class HostSelect extends BaseComponent {
  static propTypes = {
    loading: PropTypes.bool.isRequired,
    hosts: PropTypes.array,
    selectedHosts: PropTypes.array,
    // eslint-disable-next-line react/forbid-prop-types
    graphConfigs: PropTypes.array,
    updateGraph: PropTypes.func,
    // eslint-disable-next-line react/forbid-prop-types
    onSelectedHostsChange: PropTypes.func,
  };

  static defaultProps = {
    hosts: [],
    selectedHosts: [],
    graphConfigs: [],
    updateGraph: () => {},
    onSelectedHostsChange: () => {},
  };

  constructor(props) {
    super(props);
    this.state = {
      dynamicSwitch: false,
    };
  }

  handleSelectChange = (selected) => {
    if (graphUtil.hasDtag(selected)) {
      selected.splice(0, 1);
    }
    this.props.onSelectedHostsChange(this.props.hosts, selected);
    this.setState({ reloadBtnVisible: true });
  }

  handleDynamicSelect = (type, val) => {
    const { graphConfigs } = this.props;
    let selected;
    if (type === '=all') {
      selected = ['=all'];
    } else if (type === '=+') {
      selected = [`=+${val}`];
    } else if (type === '=-') {
      selected = [`=-${val}`];
    }
    this.props.onSelectedHostsChange(this.props.hosts, selected);
    if (graphConfigs.length && selected.length) {
      this.setState({ reloadBtnVisible: true });
    }
  }

  handleDynamicSwitchChange = (val) => {
    this.setState({ dynamicSwitch: val });
  }

  handleReloadBtnClick = () => {
    this.setState({
      reloadBtnVisible: false,
    });
    const { graphConfigs, updateGraph, selectedHosts } = this.props;
    const graphConfigsClone = _.cloneDeep(graphConfigs);
    _.each(graphConfigsClone, (item) => {
      _.each(item.metrics, (metricObj) => {
        const { selectedTagkv } = metricObj;
        const newSelectedTagkv = _.map(selectedTagkv, (tagItem) => {
          if (tagItem.tagk === 'endpoint') {
            return {
              tagk: tagItem.tagk,
              tagv: selectedHosts,
            };
          }
          return tagItem;
        });
        // eslint-disable-next-line no-param-reassign
        metricObj.selectedEndpoint = selectedHosts;
        metricObj.selectedTagkv = newSelectedTagkv;
      });
    });
    updateGraph(graphConfigsClone);
  }

  render() {
    const { selectedHosts, hosts, loading } = this.props;
    const { dynamicSwitch, reloadBtnVisible } = this.state;
    return (
      <Spin spinning={loading}>
        <Card title="机器列表" className={`${prefixCls}-card`}>
          <Multipicker
            width="100%"
            manualEntry
            data={hosts}
            selected={selectedHosts}
            onChange={this.handleSelectChange}
          />
          <div style={{ position: 'absolute', top: 12, right: 18 }}>
            {
              dynamicSwitch ?
                <span>
                  <a onClick={() => { this.handleDynamicSelect('=all'); }}>全选</a>
                  <span className="ant-divider" />
                  <Popover
                    trigger="click"
                    content={
                      <div style={{ width: 200 }}>
                        <Input
                          placeholder="请输入关键词，Enter键提交"
                          onKeyDown={(e) => {
                            if (e.keyCode === 13) {
                              this.handleDynamicSelect('=+', e.target.value);
                            }
                          }}
                        />
                      </div>
                    }
                    title="包含"
                  >
                    <a>包含</a>
                  </Popover>
                  <span className="ant-divider" />
                  <Popover
                    trigger="click"
                    content={
                      <div style={{ width: 200 }}>
                        <Input
                          placeholder="请输入关键词，Enter键提交"
                          onKeyDown={(e) => {
                            if (e.keyCode === 13) {
                              this.handleDynamicSelect('=-', e.target.value);
                            }
                          }}
                        />
                      </div>
                    }
                    title="排除"
                  >
                    <a>排除</a>
                  </Popover>
                </span> :
                <div>
                  动态值 <Switch onChange={this.handleDynamicSwitchChange} size="small" />
                </div>
            }
          </div>
          {
            reloadBtnVisible ?
              <div style={{ position: 'absolute', bottom: 3, right: 5 }}>
                <Button type="primary" onClick={this.handleReloadBtnClick}>更新图表</Button>
              </div> : null
          }
        </Card>
      </Spin>
    );
  }
}

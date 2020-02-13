import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Icon, Dropdown, Menu } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import Graph, { GraphConfig, Info } from '@path/components/Graph';
import { prefixCls } from './config';
import SubscribeModal from './SubscribeModal';
import { normalizeGraphData } from './utils';

Graph.setOptions({
  apiPrefix: '',
});

export default class Graphs extends BaseComponent {
  static propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    value: PropTypes.array,
    onChange: PropTypes.func,
    onGraphConfigSubmit: PropTypes.func,
    onUpdateGraph: PropTypes.func,
  };

  static defaultProps = {
    value: [],
    onChange: () => {},
    onGraphConfigSubmit: () => {},
    onUpdateGraph: () => {},
  };

  handleSubscribeGraph = (graphData) => {
    const data = normalizeGraphData(graphData);
    const configs = JSON.stringify(data);
    SubscribeModal({
      configsList: [configs],
    });
  }

  handleShareGraph = (graphData) => {
    const data = normalizeGraphData(graphData);
    const configsList = [{
      configs: JSON.stringify(data),
    }];
    this.request({
      url: this.api.tmpchart,
      type: 'POST',
      data: JSON.stringify(configsList),
    }).then((res) => {
      window.open(`/#/monitor/tmpchart?ids=${_.join(res, ',')}`, '_blank');
    });
  }

  render() {
    const { value, onChange } = this.props;
    return (
      <div>
        <Row gutter={10} className={`${prefixCls}-graphs`}>
          {
            _.map(value, (o) => {
              return (
                <Col span={24} key={o.id}>
                  <div className={`${prefixCls}-graph`}>
                    <Graph
                      data={o}
                      onChange={onChange}
                      extraRender={(graph) => {
                        return [
                          <span className="graph-operationbar-item" key="info" title="详情">
                            <Info
                              graphConfig={graph.getGraphConfig(graph.props.data)}
                              counterList={graph.counterList}
                            >
                              <Icon type="info-circle-o" />
                            </Info>
                          </span>,
                          <span className="graph-operationbar-item" key="setting" title="编辑">
                            <Icon type="setting" onClick={() => {
                              this.graphConfigForm.showModal('update', '保存', o);
                            }} />
                          </span>,
                          <span className="graph-operationbar-item" key="close" title="关闭">
                            <Icon type="close-circle-o" onClick={() => {
                              this.props.onUpdateGraph('delete', o.id);
                            }} />
                          </span>,
                          <span className="graph-extra-item" key="more" title="更多">
                            <Dropdown trigger={['click']} overlay={
                              <Menu>
                                <Menu.Item>
                                  <a onClick={() => { this.handleSubscribeGraph(o); }}>订阅图表</a>
                                </Menu.Item>
                                <Menu.Item>
                                  <a onClick={() => { this.handleShareGraph(o); }}>分享图表</a>
                                </Menu.Item>
                              </Menu>
                            }>
                              <span>
                                <Icon type="bars" />
                              </span>
                            </Dropdown>
                          </span>,
                        ];
                      }}
                    />
                  </div>
                </Col>
              );
            })
          }
          <Col span={24}>
            <div
              className={`${prefixCls}-graph ${prefixCls}-graph-add`}
              onClick={() => {
                this.graphConfigForm.showModal('push', '看图');
              }}
              style={{ height: 350, cursor: 'pointer' }}
            >
              <div style={{ textAlign: 'center', width: '100%' }}>
                <Icon type="plus" /> 查看
              </div>
            </div>
          </Col>
        </Row>
        <GraphConfig
          ref={(ref) => { this.graphConfigForm = ref; }}
          onChange={this.props.onGraphConfigSubmit}
        />
      </div>
    );
  }
}

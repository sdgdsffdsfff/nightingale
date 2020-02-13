import React from 'react';
import { Popconfirm, Menu, Col } from 'antd';
import { SortableElement } from 'react-sortable-hoc';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import Graph from '@path/components/Graph';
import { normalizeGraphData } from '../../Dashboard/utils';

class RenderGraph extends BaseComponent {
  shouldComponentUpdate = (nextProps) => {
    return !_.isEqual(nextProps.data, this.props.data) ||
    !_.isEqual(nextProps.subclassData, this.props.subclassData) ||
    nextProps.index !== this.props.index ||
    nextProps.colNum !== this.props.colNum;
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
    const { data, originTreeData, subclassData, colNum } = this.props;

    return (
      <Col span={24 / colNum}>
        <Graph
          useDragHandle
          ref={(ref) => { this.props.graphsInstance[data.id] = ref; }}
          height={180}
          graphConfigInnerVisible={false}
          treeData={originTreeData}
          data={{
            ...data.configs,
            id: data.id,
          }}
          onOpenGraphConfig={(graphOptions) => {
            this.props.graphConfigForm.showModal('update', '保存', {
              ...graphOptions,
              subclassId: data.subclass_id,
              isScreen: true,
              subclassOptions: subclassData,
            });
          }}
          extraMoreList={[
            <Menu.Item key="share">
              <a onClick={() => { this.handleShareGraph(data.configs); }}>分享图表</a>
            </Menu.Item>,
            <Menu.Item key="del">
              <Popconfirm title="确定要删除这个图表吗？" onConfirm={() => { this.props.onDelChart(data.id); }}>
                <a>删除图表</a>
              </Popconfirm>
            </Menu.Item>,
          ]}
        />
      </Col>
    );
  }
}

export default SortableElement(RenderGraph);

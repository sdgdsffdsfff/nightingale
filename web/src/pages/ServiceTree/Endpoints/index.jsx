import React from 'react';
import PropTypes from 'prop-types';
import { Menu } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import exportXlsx from '@path/common/exportXlsx';
import EndpointList from '@path/components/EndpointList';
import EditEndpoint from '@path/components/EndpointList/Edit';
import BatchBind from './BatchBind';
import BatchUnbind from './BatchUnbind';

class index extends BaseComponent {
  static contextTypes = {
    getSelectedNode: PropTypes.func,
  };

  componentWillMount = () => {
    const { getSelectedNode } = this.context;
    this.selectedNodeId = getSelectedNode('id');
  }

  componentWillReceiveProps = () => {
    const { getSelectedNode } = this.context;
    const selectedNodeId = getSelectedNode('id');

    if (this.selectedNodeId !== selectedNodeId) {
      this.selectedNodeId = selectedNodeId;
      if (this.endpointList) {
        this.endpointList.reload();
        this.endpointList.setState({
          selectedRowKeys: [],
          selectedIps: [],
          selectedHosts: [],
        });
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async exportEndpoints(endpoints) {
    const data = _.map(endpoints, (item) => {
      return {
        ...item,
        nodes: _.join(item.nodes),
      };
    });
    exportXlsx(data);
  }

  handleHostBindBtnClick = () => {
    const { getSelectedNode } = this.context;
    const selectedNode = getSelectedNode();
    BatchBind({
      selectedNode,
      onOk: () => {
        this.endpointList.reload();
      },
    });
  }

  handleHostUnbindBtnClick = (selectedIdents) => {
    const { getSelectedNode } = this.context;
    const selectedNode = getSelectedNode();
    BatchUnbind({
      selectedNode,
      selectedIdents,
      onOk: () => {
        this.endpointList.reload();
      },
    });
  }

  handleModifyAliasBtnClick = (record) => {
    EditEndpoint({
      title: '修改别名',
      data: record,
      onOk: () => {
        this.endpointList.reload();
      },
    });
  }

  render() {
    if (!this.selectedNodeId) {
      return (
        <div>
          请先选择左侧服务节点
        </div>
      );
    }
    return (
      <div>
        <EndpointList
          ref={(ref) => { this.endpointList = ref; }}
          otherParamsKey={['field', 'batch']}
          columnKeys={['ident', 'alias', 'nodes']}
          getFetchDataUrl={() => {
            if (this.selectedNodeId) {
              return `${this.api.node}/${this.selectedNodeId}/endpoint`;
            }
            return undefined;
          }}
          exportEndpoints={this.exportEndpoints}
          renderOper={(record) => {
            return (
              <span>
                <a onClick={() => { this.handleModifyAliasBtnClick(record); }}>改别名</a>
              </span>
            );
          }}
          renderBatchOper={(selectedIdents) => {
            return [
              <Menu.Item key="batch-bind">
                <a onClick={() => { this.handleHostBindBtnClick(); }}>挂载 endpoint</a>
              </Menu.Item>,
              <Menu.Item key="batch-unbind">
                <a onClick={() => { this.handleHostUnbindBtnClick(selectedIdents); }}>解挂 endpoint</a>
              </Menu.Item>,
            ];
          }}
        />
      </div>
    );
  }
}

export default CreateIncludeNsTree(index, { visible: true });

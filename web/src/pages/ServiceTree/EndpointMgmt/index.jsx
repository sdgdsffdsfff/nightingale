import React from 'react';
import { Menu, Divider, Popconfirm, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import exportXlsx from '@path/common/exportXlsx';
import EndpointList from '@path/components/EndpointList';
import EditEndpoint from '@path/components/EndpointList/Edit';
import BatchDel from './BatchDel';
import BatchImport from './BatchImport';

class Endpoint extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
    };
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

  handleModifyBtnClick(record) {
    EditEndpoint({
      title: '修改信息',
      type: 'admin',
      data: record,
      onOk: () => {
        this.endpointList.reload();
      },
    });
  }

  handleDeleteBtnClick(ident) {
    this.request({
      url: this.api.endpoint,
      type: 'DELETE',
      data: JSON.stringify({
        idents: [ident],
      }),
    }).then(() => {
      this.endpointList.reload();
      message.success('删除成功！');
    });
  }

  handleBatchImport() {
    BatchImport({
      onOk: () => {
        this.endpointList.reload();
      },
    });
  }

  handleBatchDel(selectedIdents) {
    BatchDel({
      selectedIdents,
      onOk: () => {
        this.endpointList.reload();
      },
    });
  }

  handlePaginationChange = () => {
    this.setState({ selectedRowKeys: [], selectedIps: [], selectedHosts: [] });
  }

  render() {
    return (
      <div>
        <EndpointList
          ref={(ref) => { this.endpointList = ref; }}
          type="mgmt"
          otherParamsKey={['field', 'batch']}
          columnKeys={['ident', 'alias', 'nodes']}
          getFetchDataUrl={() => {
            return this.api.endpoint;
          }}
          exportEndpoints={this.exportEndpoints}
          renderOper={(record) => {
            return (
              <span>
                <a onClick={() => { this.handleModifyBtnClick(record); }}>修改</a>
                <Divider type="vertical" />
                <Popconfirm title="确认要删除吗？" onConfirm={() => { this.handleDeleteBtnClick(record.ident); }}>
                  <a>删除</a>
                </Popconfirm>
              </span>
            );
          }}
          renderBatchOper={(selectedIdents) => {
            return [
              <Menu.Item key="batch-import">
                <a onClick={() => { this.handleBatchImport(); }}>导入 endpoints</a>
              </Menu.Item>,
              <Menu.Item key="batch-delete">
                <a onClick={() => { this.handleBatchDel(selectedIdents); }}>删除 endpoints</a>
              </Menu.Item>,
            ];
          }}
        />
      </div>
    );
  }
}
export default CreateIncludeNsTree(Endpoint);

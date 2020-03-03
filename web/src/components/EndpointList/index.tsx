import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Input, Button, Dropdown, Menu, Checkbox } from 'antd';
import { ColumnProps } from 'antd/lib/table';
import _ from 'lodash';
import FetchTable from '@cpts/FetchTable';
import request from '@common/request';
import api from '@common/api';
import { Endpoint } from '@interface';
import CopyTitle from './CopyTitle';
import BatchSearch from './BatchSearch';

interface Props {
  type?: 'mgmt';
  backendPagingEnabled?: boolean;
  columnKeys: string[];
  fetchUrl: string;
  exportEndpoints: (endpoints: Endpoint[]) => void;
  renderOper: (record: Endpoint) => React.ReactNode;
  renderBatchOper: (selectedIdents: string[]) => React.ReactNode;
  renderFilter: () => void;
}

interface State {
  searchValue: string;
  selectedRowKeys: number[] | string[];
  selectedRows: Endpoint[];
  selectedIdents: string[];
  field: string;
  batch: string;
  displayBindNode: boolean;
}

class index extends Component<Props, State> {
  static contextTypes = {
    habitsId: PropTypes.string,
  };

  static defaultProps = {
    renderFilter: () => {},
  };

  fetchtable: any;

  state = {
    ...this.state,
    selectedRowKeys: [],
    selectedRows: [],
    selectedIdents: [],
    field: 'ident',
    batch: '',
    displayBindNode: false,
  } as State;

  handelBatchSearchBtnClick = () => {
    BatchSearch({
      title: '批量过滤',
      field: this.state.field,
      batch: this.state.batch,
      onOk: (field: string, batch: string) => {
        this.setState({
          field,
          batch,
        }, () => {
          this.fetchtable.reload();
        });
      },
    });
  }

  handlePaginationChange = () => {
    this.setState({ selectedRowKeys: [], selectedIdents: [], selectedRows: [] });
  }

  processData = async (endpoints: Endpoint[]) => {
    if (this.state.displayBindNode) {
      const idents = _.map(endpoints, item => item.ident);
      const endpointNodes = await request(`${api.endpoint}s/bindings?idents=${_.join(idents, ',')}`);
      const newEndpoints = _.map(endpoints, (item) => {
        const current = _.find(endpointNodes, { ident: item.ident });
        const nodes = _.get(current, 'nodes', []);
        const nodesPath = _.map(nodes, 'path');
        return {
          ...item,
          nodes: nodesPath,
        };
      });
      return newEndpoints;
    }
    return endpoints;
  }

  reload = () => {
    this.fetchtable.reload();
  }

  getQuery = () => {
    const { batch, field, searchValue } = this.state;
    const query: { [index: string]: string | number | undefined } = {};

    if (batch) {
      query.batch = _.replace(batch, /\n/g, ',');
    }
    if (field) {
      query.field = field;
    }
    if (searchValue) {
      query.query = searchValue;
    }

    return query;
  }

  getColumns = () => {
    const { columnKeys } = this.props;
    const { displayBindNode } = this.state;
    const fullColumns: ColumnProps<Endpoint>[] = [
      {
        title: (
          <CopyTitle
            type={this.props.type}
            dataIndex="ident"
            data={_.get(this.fetchtable, 'state.data')}
            selected={this.state.selectedRows}
          >
            标识
          </CopyTitle>
        ),
        dataIndex: 'ident',
        width: 200,
      }, {
        title: '别名',
        dataIndex: 'alias',
      }, {
        title: '操作',
        width: 100,
        render: (_text, record) => {
          return this.props.renderOper(record);
        },
      },
    ];
    if (displayBindNode) {
      fullColumns.splice(2, 0, {
        title: '挂载节点',
        dataIndex: 'nodes',
        render(text) {
          return (
            _.map(text, (item) => {
              return <div key={item}>{item}</div>;
            })
          );
        },
      });
    }
    const columns = _.filter(fullColumns, (item) => {
      if (item.dataIndex) {
        return _.includes(columnKeys, item.dataIndex);
      }
      return true;
    });
    return columns;
  }

  render() {
    const { batch, displayBindNode } = this.state;
    const query = this.getQuery();
    return (
      <div>
        <Row>
          <Col span={16} className="mb10">
            <Input.Search
              style={{ width: 200 }}
              onSearch={(value) => {
                this.setState({
                  searchValue: value,
                });
              }}
              placeholder="快速过滤"
            />
            <Button
              className="ml10"
              type={batch ? 'primary' : 'default'}
              icon={batch ? 'check-circle' : ''}
              onClick={this.handelBatchSearchBtnClick}
            >
              批量过滤
            </Button>
            <Checkbox
              className="ml10"
              checked={displayBindNode}
              onChange={(e) => {
                const displayBindNode = e.target.checked;
                this.setState({ displayBindNode }, async () => {
                  this.fetchtable.reload();
                });
              }}
            >
              显示挂载节点
            </Checkbox>
          </Col>
          <Col span={8} className="textAlignRight">
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item>
                    <a onClick={() => { this.props.exportEndpoints(_.get(this.fetchtable, 'state.data')); }}>导出 Excel</a>
                  </Menu.Item>
                  {this.props.renderBatchOper(this.state.selectedIdents)}
                </Menu>
              }
            >
              <Button icon="down">批量操作</Button>
            </Dropdown>
          </Col>
        </Row>
        <FetchTable
          ref={(ref) => { this.fetchtable = ref; }}
          backendPagingEnabled={this.props.backendPagingEnabled}
          url={this.props.fetchUrl}
          query={query}
          processData={this.processData}
          tableProps={{
            rowSelection: {
              selectedRowKeys: this.state.selectedRowKeys,
              onChange: (selectedRowKeys, selectedRows) => {
                this.setState({
                  selectedRowKeys,
                  selectedRows,
                  selectedIdents: _.map(selectedRows, n => n.ident),
                });
              },
            },
            columns: this.getColumns(),
          }}
        />
      </div>
    );
  }
}

export default index;

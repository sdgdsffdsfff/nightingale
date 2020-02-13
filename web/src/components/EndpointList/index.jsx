import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Input, Button, Dropdown, Menu, Checkbox } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import CopyTitle from './CopyTitle';
import BatchSearch from './BatchSearch';

class index extends BaseComponent {
  static propTypes = {
    otherParamsKey: PropTypes.array.isRequired,
    columnKeys: PropTypes.array.isRequired,
    getFetchDataUrl: PropTypes.func.isRequired,
    exportEndpoints: PropTypes.func.isRequired,
    renderOper: PropTypes.func.isRequired,
    renderBatchOper: PropTypes.func.isRequired,
    renderFilter: PropTypes.func,
  };

  static contextTypes = {
    habitsId: PropTypes.string,
  };

  static defaultProps = {
    renderFilter: () => {},
  };

  constructor(props) {
    super(props);
    this.otherParamsKey = props.otherParamsKey;
    this.state = {
      ...this.state,
      selectedRowKeys: [],
      selectedRows: [],
      selectedIdents: [],
      field: 'ident',
      batch: '',
      displayBindNode: false,
    };
  }

  componentDidMount = () => {
    this.setData();
  }

  async setData() {
    const endpoints = await this.realFetchData();
    this.setState({ data: endpoints });
  }

  async realFetchData() {
    let endpoints = [];
    try {
      endpoints = await this.fetchData();
      if (!_.isEmpty(endpoints)) {
        const idents = _.map(endpoints, item => item.ident);
        if (this.state.displayBindNode) {
          const endpointNodes = await this.request({
            url: `${this.api.endpoint}s/bindings`,
            data: { idents: _.join(idents, ',') },
          });
          endpoints = _.map(endpoints, (item) => {
            const current = _.find(endpointNodes, { ident: item.ident });
            const nodes = _.get(current, 'nodes', []);
            const nodesPath = _.map(nodes, 'path');
            return {
              ...item,
              nodes: nodesPath,
            };
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
    return endpoints;
  }

  reload = () => {
    this.setData();
  }

  getFetchDataUrl() {
    return this.props.getFetchDataUrl();
  }

  handelBatchSearchBtnClick = () => {
    BatchSearch({
      title: '批量过滤',
      field: this.state.field,
      batch: this.state.batch,
      onOk: (field, batch) => {
        this.setState({
          field,
          batch,
        }, () => {
          this.reload();
        });
      },
    });
  }

  handlePaginationChange = () => {
    this.setState({ selectedRowKeys: [], selectedIdents: [], selectedRows: [] });
  }

  getColumns = () => {
    const { columnKeys } = this.props;
    const { displayBindNode } = this.state;
    const fullColumns = [
      {
        title: (
          <CopyTitle
            type={this.props.type}
            dataIndex="ident"
            data={this.state.data}
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
        visible: true,
      }, {
        title: '操作',
        width: 100,
        render: (text, record) => {
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
    return _.filter(fullColumns, (item) => {
      if (item.dataIndex) {
        if (item.visible) {
          return true;
        }
        return _.includes(columnKeys, item.dataIndex);
      }
      return true;
    });
  }

  render() {
    const { batch, displayBindNode } = this.state;
    return (
      <div>
        <Row>
          <Col span={16} className="mb10">
            <Input.Search
              style={{ width: 200 }}
              onSearch={this.handleSearchChange}
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
                this.setState({ displayBindNode: e.target.checked }, () => {
                  this.setData();
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
                    <a onClick={() => { this.props.exportEndpoints(this.state.data); }}>导出 Excel</a>
                  </Menu.Item>
                  {this.props.renderBatchOper(this.state.selectedIdents)}
                </Menu>
              }
            >
              <Button icon="down">批量操作</Button>
            </Dropdown>
          </Col>
        </Row>
        {
          this.renderTable({
            locale: {
              emptyText: '系统中暂无 endpoint，请安装agent或去超管页面导入',
            },
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
          })
        }
      </div>
    );
  }
}

export default index;

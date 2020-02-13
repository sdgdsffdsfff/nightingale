import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button, Input, Divider, Popconfirm, message } from 'antd';
import { DragDropContext, DragSource, DropTarget } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import update from 'immutability-helper';
import AddModal from './AddModal';
import ModifyModal from './ModifyModal';
import './style.less';

let dragingIndex = -1;

class BodyRow extends React.Component {
  render() {
    const {
      isOver,
      connectDragSource,
      connectDropTarget,
      moveRow,
      ...restProps
    } = this.props;
    const style = { ...restProps.style, cursor: 'move' };

    let { className } = restProps;
    if (isOver) {
      if (restProps.index > dragingIndex) {
        className += ' drop-over-downward';
      }
      if (restProps.index < dragingIndex) {
        className += ' drop-over-upward';
      }
    }

    return connectDragSource(
      connectDropTarget(
        <tr
          {...restProps}
          className={className}
          style={style}
        />,
      ),
    );
  }
}

const rowSource = {
  beginDrag(props) {
    dragingIndex = props.index;
    return {
      index: props.index,
    };
  },
};

const rowTarget = {
  drop(props, monitor) {
    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;

    // Don't replace items with themselves
    if (dragIndex === hoverIndex) {
      return;
    }

    // Time to actually perform the action
    props.moveRow(dragIndex, hoverIndex);

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    monitor.getItem().index = hoverIndex;
  },
};

const DragableBodyRow = DropTarget(
  'row',
  rowTarget,
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
  }),
)(
  DragSource(
    'row',
    rowSource,
    connect => ({
      connectDragSource: connect.dragSource(),
    }),
  )(BodyRow),
);

class Screen extends BaseComponent {
  static contextTypes = {
    getSelectedNode: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      data: [],
      search: '',
    };
  }

  componentDidMount = () => {
    this.fetchData();
  }

  componentWillMount = () => {
    const { getSelectedNode } = this.context;
    this.selectedNodeId = getSelectedNode('id');
  }

  componentWillReceiveProps = () => {
    const { getSelectedNode } = this.context;
    const selectedNode = getSelectedNode();

    if (!_.isEqual(selectedNode, this.state.selectedNode)) {
      this.setState({
        selectedNode,
      }, () => {
        this.selectedNodeId = getSelectedNode('id');
        this.fetchData();
      });
    }
  }

  fetchData() {
    if (this.selectedNodeId) {
      this.setState({ loading: true });
      this.request({
        url: `${this.api.node}/${this.selectedNodeId}/screen`,
      }).then((res) => {
        this.setState({ data: _.sortBy(res, 'weight') });
      }).finally(() => {
        this.setState({ loading: false });
      });
    }
  }

  handleAdd = () => {
    AddModal({
      title: '新增大盘',
      onOk: (values) => {
        this.request({
          url: `${this.api.node}/${this.selectedNodeId}/screen`,
          type: 'POST',
          data: JSON.stringify({
            ...values,
            weight: this.state.data.length,
          }),
        }).then(() => {
          message.success('新增大盘成功！');
          this.fetchData();
        });
      },
    });
  }

  handleModify = (record) => {
    ModifyModal({
      name: record.name,
      title: '修改大盘',
      onOk: (values) => {
        this.request({
          url: `${this.api.screen}/${record.id}`,
          type: 'PUT',
          data: JSON.stringify({
            ...values,
            node_id: record.node_id,
          }),
        }).then(() => {
          message.success('修改大盘成功！');
          this.fetchData();
        });
      },
    });
  }

  handleDel = (id) => {
    this.request({
      url: `${this.api.screen}/${id}`,
      type: 'DELETE',
    }).then(() => {
      message.success('删除大盘成功！');
      this.fetchData();
    });
  }

  moveRow = (dragIndex, hoverIndex) => {
    const { data } = this.state;
    const dragRow = data[dragIndex];

    this.setState(
      // eslint-disable-next-line react/no-access-state-in-setstate
      update(this.state, {
        data: {
          $splice: [[dragIndex, 1], [hoverIndex, 0, dragRow]],
        },
      }),
      () => {
        const reqBody = _.map(this.state.data, (item, i) => {
          return {
            id: item.id,
            weight: i,
          };
        });
        this.request({
          url: `${this.api.chart}s/weights`,
          type: 'PUT',
          data: JSON.stringify(reqBody),
        }).then(() => {
          message.success('大盘排序成功！');
        });
      },
    );
  }

  filterData() {
    const { data, search } = this.state;
    if (search) {
      return _.filter(data, (item) => {
        return item.name.indexOf(search) > -1;
      });
    }
    return data;
  }

  render() {
    const { search } = this.state;
    const prefixCls = `${this.prefixCls}-monitor-screen`;
    const tableData = this.filterData();
    return (
      <div className={prefixCls}>
        <div className="mb10">
          <Button className="mr10" onClick={this.handleAdd}>新增大盘</Button>
          <Input
            style={{ width: 200 }}
            placeholder="搜索"
            value={search}
            onChange={(e) => {
              this.setState({ search: e.target.value });
            }}
          />
        </div>
        {
          this.renderTable({
            dataSource: tableData,
            pagination: false,
            components: {
              body: {
                row: DragableBodyRow,
              },
            },
            onRow: (record, index) => ({
              index,
              moveRow: this.moveRow,
            }),
            columns: [
              {
                title: '名称',
                dataIndex: 'name',
                render: (text, record) => {
                  return <Link to={{ pathname: `/monitor/screen/${record.id}` }}>{text}</Link>;
                },
              }, {
                title: '创建人',
                width: 200,
                dataIndex: 'last_updator',
              }, {
                title: '操作',
                width: 200,
                render: (text, record) => {
                  return (
                    <span>
                      <a onClick={() => this.handleModify(record)}>修改</a>
                      <Divider type="vertical" />
                      <Popconfirm title="确定要删除这个大盘吗?" onConfirm={() => this.handleDel(record.id)}>
                        <a>删除</a>
                      </Popconfirm>
                    </span>
                  );
                },
              },
            ],
          })
        }
      </div>
    );
  }
}

export default CreateIncludeNsTree(DragDropContext(HTML5Backend)(Screen), { visible: true });

import React, { Component } from 'react';
import { Tree, Spin, Input } from 'antd';
import PropTypes from 'prop-types';
import _ from 'lodash';
import * as config from '@path/common/config';
import { renderTreeNodes } from './utils';

export default class NsTree extends Component {
  static propTypes = {
    treeData: PropTypes.array,
    originTreeData: PropTypes.array,
    loading: PropTypes.bool.isRequired,
    expandedKeys: PropTypes.array.isRequired,
    onSearchValue: PropTypes.func.isRequired,
    onExpandedKeys: PropTypes.func.isRequired,
  };

  static defaultProps = {
    treeData: [],
    originTreeData: [],
  };

  static contextTypes = {
    selecteNode: PropTypes.func,
    getSelectedNode: PropTypes.func,
  };

  handleNodeSelect = (selectedKeys) => {
    const { originTreeData } = this.props;
    const { selecteNode } = this.context;
    const currentNode = _.find(originTreeData, { id: _.toNumber(selectedKeys[0]) });
    selecteNode(currentNode);
  }

  render() {
    const prefixCls = `${config.appname}-layout`;
    const { treeData, loading, expandedKeys } = this.props;
    const { getSelectedNode } = this.context;
    const selectedNode = getSelectedNode();

    return (
      <div className={`${prefixCls}-nsTree`}>
        <div className={`${prefixCls}-nsTree-header`}>
          <Input.Search onSearch={this.props.onSearchValue} placeholder="搜节点(空格分割)" />
        </div>
        <Spin spinning={loading}>
          <div>
            {
              _.isEmpty(treeData) ?
                <div className="ant-empty ant-empty-small" style={{ marginTop: 50 }}>
                  <div className="ant-empty-image">
                    <img
                      alt="No Data"
                      src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxKSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgIDxlbGxpcHNlIGZpbGw9IiNGNUY1RjUiIGN4PSIzMiIgY3k9IjMzIiByeD0iMzIiIHJ5PSI3Ii8+CiAgICA8ZyBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI0Q5RDlEOSI+CiAgICAgIDxwYXRoIGQ9Ik01NSAxMi43Nkw0NC44NTQgMS4yNThDNDQuMzY3LjQ3NCA0My42NTYgMCA0Mi45MDcgMEgyMS4wOTNjLS43NDkgMC0xLjQ2LjQ3NC0xLjk0NyAxLjI1N0w5IDEyLjc2MVYyMmg0NnYtOS4yNHoiLz4KICAgICAgPHBhdGggZD0iTTQxLjYxMyAxNS45MzFjMC0xLjYwNS45OTQtMi45MyAyLjIyNy0yLjkzMUg1NXYxOC4xMzdDNTUgMzMuMjYgNTMuNjggMzUgNTIuMDUgMzVoLTQwLjFDMTAuMzIgMzUgOSAzMy4yNTkgOSAzMS4xMzdWMTNoMTEuMTZjMS4yMzMgMCAyLjIyNyAxLjMyMyAyLjIyNyAyLjkyOHYuMDIyYzAgMS42MDUgMS4wMDUgMi45MDEgMi4yMzcgMi45MDFoMTQuNzUyYzEuMjMyIDAgMi4yMzctMS4zMDggMi4yMzctMi45MTN2LS4wMDd6IiBmaWxsPSIjRkFGQUZBIi8+CiAgICA8L2c+CiAgPC9nPgo8L3N2Zz4K"
                    />
                  </div>
                  <p className="ant-empty-description">No Data</p>
                </div> :
                <div className={`${prefixCls}-nsTree-content`}>
                  <Tree
                    showLine
                    selectedKeys={selectedNode ? [_.toString(selectedNode.id)] : undefined}
                    expandedKeys={expandedKeys}
                    onSelect={this.handleNodeSelect}
                    onExpand={(newExpandedKeys) => {
                      this.props.onExpandedKeys(newExpandedKeys);
                    }}
                  >
                    {renderTreeNodes(treeData)}
                  </Tree>
                </div>
            }
          </div>
        </Spin>
      </div>
    );
  }
}

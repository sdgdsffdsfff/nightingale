/* eslint-disable react/prop-types */
import React from 'react';
import { withRouter } from 'react-router-dom';
import { Spin, message } from 'antd';
import PropTypes from 'prop-types';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import { normalizeTreeData } from '@path/Layout/utils';
import CollectForm from './CollectForm';

class CollectFormMain extends BaseComponent {
  static contextTypes = {
    getSelectedNode: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      data: {},
      selectedTreeNode: {},
      treeData: [],
    };
  }

  componentWillMount = () => {
    const { getSelectedNode } = this.context;
    this.selectedNodeId = getSelectedNode('id');
  }

  componentDidMount() {
    this.fetchTreeData();
    this.fetchData();
  }

  fetchTreeData() {
    this.request({
      url: this.api.tree,
    }).then((res) => {
      const treeData = normalizeTreeData(res);
      this.setState({ treeData });
    });
  }

  fetchData = () => {
    const params = _.get(this.props, 'match.params');
    if (params.action !== 'add') {
      this.setState({ loading: true });
      this.request({
        url: this.api.collect,
        data: {
          id: params.id,
          type: params.type,
        },
      }).then((res) => {
        this.setState({
          data: res || {},
        });
      }).finally(() => {
        this.setState({ loading: false });
      });
    }
  }

  handleSubmit = (values) => {
    const { action, type } = this.props.match.params;
    let reqBody;

    if (action === 'add' || action === 'clone') {
      reqBody = [{
        type,
        data: values,
      }];
    } else if (action === 'modify') {
      reqBody = {
        type,
        data: {
          ...values,
          id: this.state.data.id,
        },
      };
    }

    return this.request({
      url: this.api.collect,
      type: action === 'modify' ? 'PUT' : 'POST',
      data: JSON.stringify(reqBody),
    }).then(() => {
      message.success('提交成功!');
      this.props.history.push({
        pathname: '/monitor/collect',
      });
    });
  }

  render() {
    const { action, type } = this.props.match.params;
    const { treeData, data, loading } = this.state;
    // const titleMap = {
    //   add: '新增',
    //   modify: '修改',
    //   clone: '克隆',
    // };
    // const title = `${titleMap[action]} ${typeMap[type]}配置`;
    const ActiveForm = CollectForm[type];
    if (action === 'add') {
      data.nid = this.selectedNodeId;
    }

    return (
      <Spin spinning={loading}>
        <ActiveForm
          params={this.props.match.params}
          treeData={treeData}
          initialValues={data}
          onSubmit={this.handleSubmit}
        />
      </Spin>
    );
  }
}

export default CreateIncludeNsTree(withRouter(CollectFormMain));

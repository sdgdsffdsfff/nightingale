import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tabs } from 'antd';
import _ from 'lodash';
import CreateIncludeNsTree from '@cpts/Layout/CreateIncludeNsTree';
import List from './List';

const { TabPane } = Tabs;

class index extends Component {
  static contextTypes = {
    getSelectedNode: PropTypes.func,
  };

  state = {
    nodepath: undefined,
    nid: undefined,
  };

  componentWillReceiveProps = () => {
    const { getSelectedNode } = this.context;
    const nodepath = getSelectedNode('path');
    const nid = getSelectedNode('id');

    if (!_.isEqual(nodepath, this.state.nodepath)) {
      this.setState({ nodepath, nid });
    }
  }

  render() {
    return (
      <Tabs defaultActiveKey="alert">
        <TabPane tab="未恢复报警" key="alert">
          <List nodepath={this.state.nodepath} nid={this.state.nid} type="alert" />
        </TabPane>
        <TabPane tab="所有历史报警" key="all">
          <List nodepath={this.state.nodepath} nid={this.state.nid} type="all" />
        </TabPane>
      </Tabs>
    );
  }
}

export default CreateIncludeNsTree(index, { visible: true });

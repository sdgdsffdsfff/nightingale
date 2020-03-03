import React from 'react';
import PropTypes from 'prop-types';
import { Link, withRouter } from 'react-router-dom';
import { Layout, Dropdown, Menu, Icon } from 'antd';
import classNames from 'classnames';
import PubSub from 'pubsub-js';
import _ from 'lodash';
import queryString from 'query-string';
import BaseComponent from '@path/BaseComponent';
import { auth } from '@path/Auth';
import LayoutMenu from './LayoutMenu';
import NsTree from './NsTree';
import { normalizeTreeData } from './utils';
import './style.less';

const { Header, Content, Sider } = Layout;

class NILayout extends BaseComponent {
  static propTypes = {
    habitsId: PropTypes.string.isRequired,
    appName: PropTypes.string.isRequired,
    menuConf: PropTypes.array.isRequired,
    children: PropTypes.element.isRequired,
  };

  static childContextTypes = {
    nsTreeVisibleChange: PropTypes.func.isRequired,
    getNodes: PropTypes.func.isRequired,
    selecteNode: PropTypes.func.isRequired,
    getSelectedNode: PropTypes.func.isRequired,
    updateSelectedNode: PropTypes.func.isRequired,
    deleteSelectedNode: PropTypes.func.isRequired,
    reloadNsTree: PropTypes.func.isRequired,
    habitsId: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    let selectedNode;
    try {
      selectedNode = window.localStorage.getItem('selectedNode');
      selectedNode = JSON.parse(selectedNode);
    } catch (e) {
      console.log(e);
    }
    this.state = {
      checkAuthenticateLoading: true,
      nsTreeVisible: false,
      selectedNode,
      treeData: [],
      originTreeData: [],
      treeLoading: false,
      treeSearchValue: '',
      expandedKeys: [],
      collapsed: false,
    };
  }

  componentDidMount = () => {
    this.checkAuthenticate();
    this.fetchTreeData((treeData) => {
      this.getDefaultKeys(treeData);
    });
  }

  checkAuthenticate() {
    auth.checkAuthenticate().then(() => {
      this.setState({ checkAuthenticateLoading: false });
    });
  }

  fetchTreeData(cbk) {
    const { treeSearchValue } = this.state;
    const url = treeSearchValue ? this.api.treeSearch : this.api.tree;
    const searchQuery = treeSearchValue ? { query: treeSearchValue } : undefined;
    this.setState({ treeLoading: true });
    this.request(`${url}?${queryString.stringify(searchQuery)}`).then((res) => {
      const treeData = normalizeTreeData(_.cloneDeep(res));
      this.setState({ treeData, originTreeData: res });
      if (treeSearchValue) {
        this.setState({ expandedKeys: _.map(res, n => _.toString(n.id)) });
      }
      if (cbk) cbk(res);
    }).finally(() => {
      this.setState({ treeLoading: false });
    });
  }

  getDefaultKeys(treeData) {
    const { selectedNode } = this.state;
    const selectedNodeId = _.get(selectedNode, 'id');
    const defaultExpandedKeys = [];

    function realFind(nid) {
      const node = _.find(treeData, { id: nid });
      if (node) {
        defaultExpandedKeys.push(_.toString(node.pid));
        if (node.pid !== 0) {
          realFind(node.pid);
        }
      }
    }

    realFind(selectedNodeId);
    this.setState({ expandedKeys: defaultExpandedKeys });
  }

  getChildContext() {
    return {
      nsTreeVisibleChange: (visible) => {
        this.setState({
          nsTreeVisible: visible,
        });
      },
      getNodes: () => {
        return _.cloneDeep(this.state.originTreeData);
      },
      selecteNode: (node) => {
        if (node) {
          try {
            window.localStorage.setItem('selectedNode', JSON.stringify(node));
          } catch (e) {
            console.log(e);
          }
          this.setState({ selectedNode: node });
        }
      },
      getSelectedNode: (key) => {
        const { originTreeData, selectedNode } = this.state;

        if (_.isPlainObject(selectedNode)) {
          if (_.find(originTreeData, { id: selectedNode.id })) {
            if (!key) {
              return { ...selectedNode };
            }
            return _.get(selectedNode, key);
          }
          return undefined;
        }
        return undefined;
      },
      updateSelectedNode: (node) => {
        try {
          window.localStorage.setItem('selectedNode', JSON.stringify(node));
        } catch (e) {
          console.log(e);
        }
        this.setState({ selectedNode: node });
      },
      deleteSelectedNode: () => {
        try {
          window.localStorage.removeItem('selectedNode');
        } catch (e) {
          console.log(e);
        }
        this.setState({ selectedNode: undefined });
      },
      reloadNsTree: () => {
        this.fetchTreeData();
      },
      habitsId: this.props.habitsId,
    };
  }

  handleLogoutLinkClick = () => {
    auth.signout(() => {
      this.props.history.push({
        pathname: '/',
      });
    });
  }

  handleNsTreeVisibleChange = (visible) => {
    this.setState({ nsTreeVisible: visible });
  }

  renderContent() {
    const prefixCls = `${this.prefixCls}-layout`;
    const { nsTreeVisible } = this.state;
    const layoutCls = classNames({
      [`${prefixCls}-container`]: true,
      [`${prefixCls}-has-sider`]: nsTreeVisible,
    });

    return (
      <Layout className={layoutCls} style={{ height: '100%' }}>
        <Sider
          className={`${prefixCls}-sider-nstree`}
          width={nsTreeVisible ? 200 : 0}
        >
          <NsTree
            loading={this.state.treeLoading}
            treeData={this.state.treeData}
            originTreeData={this.state.originTreeData}
            searchValue={this.state.treeSearchValue}
            expandedKeys={this.state.expandedKeys}
            onSearchValue={(val) => {
              this.setState({
                treeSearchValue: val,
              }, () => {
                this.fetchTreeData();
              });
            }}
            onExpandedKeys={(val) => {
              this.setState({ expandedKeys: val });
            }}
          />
        </Sider>
        <Content className={`${prefixCls}-content`}>
          <div className={`${prefixCls}-main`}>
            {this.props.children}
          </div>
        </Content>
      </Layout>
    );
  }

  render() {
    const { menuConf } = this.props;
    const { checkAuthenticateLoading, collapsed, selectedNode, nsTreeVisible } = this.state;
    const prefixCls = `${this.prefixCls}-layout`;
    const { dispname, isroot } = auth.getSelftProfile();
    const logoSrc = collapsed ? require('../../assets/logo-s.png') : require('../../assets/logo-l.png');
    const userIconSrc = require('../../assets/favicon.ico');

    if (checkAuthenticateLoading) {
      return <div>Loading</div>;
    }

    return (
      <Layout className={prefixCls}>
        <Sider
          width={180}
          collapsedWidth={50}
          className={`${prefixCls}-sider-nav`}
          collapsible
          collapsed={collapsed}
          onCollapse={(newCollapsed) => {
            this.setState({ collapsed: newCollapsed }, () => {
              PubSub.publish('sider-collapse');
            });
          }}
        >
          <div
            className={`${prefixCls}-sider-logo`}
            style={{
              backgroundColor: '#353C46',
              height: 50,
              lineHeight: '50px',
              textAlign: 'center',
            }}
          >
            <img
              src={logoSrc}
              alt="logo"
              style={{
                height: 32,
              }}
            />
          </div>
          <LayoutMenu
            isroot={isroot}
            collapsed={collapsed}
            menuConf={menuConf}
            className={`${prefixCls}-menu`}
          />
        </Sider>
        <Layout>
          <Header className={`${prefixCls}-header`}>
            <div
              title={_.get(selectedNode, 'path')}
              style={{
                float: 'left',
                width: 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nsTreeVisible ? _.get(selectedNode, 'path') : null}
            </div>
            <div className={`${prefixCls}-headRight`}>
              <Dropdown placement="bottomRight" overlay={
                <Menu style={{ width: 110 }}>
                  <Menu.Item>
                    <Link to={{ pathname: '/profile' }}>
                      <Icon type="setting" className="mr10" />
                      个人设置
                    </Link>
                  </Menu.Item>
                  <Menu.Item>
                    <a onClick={this.handleLogoutLinkClick}><Icon type="logout" className="mr10" />退出登录</a>
                  </Menu.Item>
                </Menu>
              }>
                <span className={`${prefixCls}-username`}>
                  <span>Hi, {dispname}</span>
                  <img src={userIconSrc} alt="" />
                  <Icon type="down" />
                </span>
              </Dropdown>
            </div>
          </Header>
          <Content
            // style={{ height: '100%' }}
          >
            {this.renderContent()}
          </Content>
        </Layout>
      </Layout>
    );
  }
}

export default withRouter(NILayout);

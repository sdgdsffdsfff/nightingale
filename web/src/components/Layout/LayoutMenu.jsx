import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link, matchPath, withRouter } from 'react-router-dom';
import queryString from 'query-string';
import { Menu, Icon } from 'antd';
import _ from 'lodash';
import * as utils from './utils';

const { Item: MenuItem, Divider: MenuDivider, SubMenu } = Menu;
const menuItemConf = {
  name: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  icon: PropTypes.string,
  target: PropTypes.string,
};
const menuConfPropTypes = PropTypes.oneOfType([
  PropTypes.arrayOf(PropTypes.shape({
    ...menuItemConf,
    children: PropTypes.arrayOf(PropTypes.shape({
      ...menuItemConf,
      getQuery: PropTypes.func,
    })),
  })),
  PropTypes.func,
]);

class LayoutMenu extends Component {
  static propTypes = {
    isroot: PropTypes.bool.isRequired,
    menuMode: PropTypes.string,
    menuTheme: PropTypes.string,
    menuStyle: PropTypes.object,
    menuConf: menuConfPropTypes.isRequired,
  };

  static defaultProps = {
    menuMode: 'inline',
    menuTheme: 'dark',
    menuStyle: undefined,
  };

  constructor(props) {
    super(props);
    this.defaultOpenKeys = [];
    this.selectedKeys = [];
  }

  componentWillReceiveProps() {
    this.selectedKeys = [];
  }

  getNavMenuItems(navs) {
    const { location = {}, menuMode, defaultOpenAllNavs } = this.props;

    return _.map(_.filter(navs, (nav) => {
      if (!this.props.isroot && nav.rootVisible) {
        return false;
      }
      return true;
    }), (nav, index) => {
      if (nav.divider) {
        return <MenuDivider key={index} />;
      }

      const icon = nav.icon ? <Icon className={`Linear ${nav.icon}`} type={nav.icon} /> : null;
      const linkProps = {};
      let link;

      if (_.isArray(nav.children) && utils.hasRealChildren(nav.children)) {
        const menuKey = nav.key || nav.to;

        if (defaultOpenAllNavs) {
          this.defaultOpenKeys.push(menuKey);
        } else if (this.isActive(nav.to) && menuMode === 'inline') {
          this.defaultOpenKeys = _.union(this.defaultOpenKeys, [nav.to]);
        }

        return (
          <SubMenu
            key={menuKey}
            title={
              <span>
                {icon}
                <span>{nav.name}</span>
              </span>
            }
          >
            {this.getNavMenuItems(nav.children, nav)}
          </SubMenu>
        );
      }

      if (nav.target) {
        linkProps.target = nav.target;
      }

      if (utils.isAbsolutePath(nav.to)) {
        linkProps.href = nav.to;
        link = (
          <a {...linkProps}>
            {icon}
            <span>{nav.name}</span>
          </a>
        );
      } else {
        if (this.isActive(nav.to)) this.selectedKeys = [nav.to];

        linkProps.to = {
          pathname: nav.to,
        };

        if (_.isFunction(nav.getQuery)) {
          const query = nav.getQuery(queryString.parse(location.search));
          linkProps.to.search = queryString.stringify(query);
        }

        link = (
          <Link to={linkProps.to}>
            {icon}
            <span>{nav.name}</span>
          </Link>
        );
      }

      return (
        <MenuItem
          key={nav.to}
        >
          {link}
        </MenuItem>
      );
    });
  }

  isActive(path) {
    const { location = {} } = this.props;
    return !!matchPath(location.pathname, { path });
  }

  render() {
    const {
      menuMode,
      menuTheme,
      menuStyle,
      location,
    } = this.props;
    const { menuConf, className } = this.props;
    const realMenuConf = _.isFunction(menuConf) ? menuConf(location) : menuConf;
    const normalizedMenuConf = utils.normalizeMenuConf(realMenuConf);
    const menus = this.getNavMenuItems(normalizedMenuConf);

    return (
      <Menu
        defaultOpenKeys={this.defaultOpenKeys}
        selectedKeys={this.selectedKeys}
        theme={menuTheme}
        mode={menuMode}
        style={menuStyle}
        className={className}
      >
        {menus}
      </Menu>
    );
  }
}

export default withRouter(LayoutMenu);

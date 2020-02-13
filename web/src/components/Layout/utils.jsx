import React from 'react';
import _ from 'lodash';
import { Tree } from 'antd';

const { TreeNode } = Tree;

export function isAbsolutePath(url) {
  return /^https?:\/\//.test(url);
}

/**
 * hasRealChildren
 * @param  {Array}   children [description]
 * @return {Boolean}          [description]
 */
export function hasRealChildren(children) {
  if (_.isArray(children)) {
    return !_.every(children, item => item.visible === false);
  }
  return false;
}

/**
 * getNsTreeVisible
 * @param  {Array}   activeRoutes 当前路由的路径数组
 * @return {Boolean}              [description]
 */
export function getNsTreeVisible(activeRoutes) {
  return _.every(activeRoutes, route => route.nsTreeVisible === undefined ||
    route.nsTreeVisible === true);
}

/**
 * normalizeMenuConf
 * @param  {Array}  children   [description]
 * @param  {String} parentNav  [description]
 * @return {Array}             [description]
 */
export function normalizeMenuConf(children, parentNav) {
  const navs = [];

  _.each(children, (nav) => {
    if (nav.visible === undefined || nav.visible === true) {
      const navCopy = _.cloneDeep(nav);

      if (isAbsolutePath(nav.path) || _.indexOf(nav.path, '/') === 0) {
        navCopy.to = nav.path;
      } else if (parentNav) {
        if (parentNav.path) {
          const parentPath = parentNav.to ? parentNav.to : `/${parentNav.path}`;
          if (nav.path) {
            navCopy.to = `${parentPath}/${nav.path}`;
          } else {
            navCopy.to = parentPath;
          }
        } else if (nav.path) {
          navCopy.to = `/${nav.path}`;
        }
      } else if (nav.path) {
        navCopy.to = `/${nav.path}`;
      }

      if (_.isArray(nav.children) && nav.children.length && hasRealChildren(nav.children)) {
        navCopy.children = normalizeMenuConf(nav.children, navCopy);
      } else {
        delete navCopy.children;
      }

      navs.push(navCopy);
    }
  });
  return navs;
}

export function findNode(treeData, node) {
  let findedNode;
  // eslint-disable-next-line no-shadow
  function findNodeReal(treeData, node) {
    // eslint-disable-next-line consistent-return
    _.each(treeData, (item) => {
      if (item.id === node.pid) {
        findedNode = item;
        return false;
      // eslint-disable-next-line no-else-return
      } else if (_.isArray(item.children)) {
        findNodeReal(item.children, node);
      }
    });
  }
  findNodeReal(treeData, node);
  return findedNode;
}

export function normalizeTreeData(data) {
  const treeData = [];
  _.each(data, (node) => {
    node = _.cloneDeep(node);
    if (node.pid === 0) {
      treeData.splice(_.sortedIndexBy(treeData, node, 'name'), 0, node);
    } else {
      const findedNode = findNode(treeData, node);
      if (!findedNode) return;
      if (_.isArray(findedNode.children)) {
        findedNode.children.splice(_.sortedIndexBy(findedNode.children, node, 'name'), 0, node);
      } else {
        findedNode.children = [node];
      }
    }
  });
  return treeData;
}

export function renderTreeNodes(nodes) {
  return _.map(nodes, (node) => {
    if (_.isArray(node.children)) {
      return (
        <TreeNode
          title={node.name}
          key={node.id}
          value={node.id}
          path={node.path}
        >
          {renderTreeNodes(node.children)}
        </TreeNode>
      );
    }
    return (
      <TreeNode
        title={node.name}
        key={node.id}
        value={node.id}
        path={node.path}
        isLeaf={node.leaf === 1}
      />
    );
  });
}

export function filterTreeNodes(nodes, id) {
  let newNodes = [];
  function makeFilter(sNodes) {
    _.each(sNodes, (node) => {
      if (node.children) {
        if (node.id === id) {
          newNodes = node.children;
        } else {
          makeFilter(node.children, id);
        }
      }
    });
  }
  makeFilter(nodes, id);
  return newNodes;
}

export function getLeafNodes(nodes, nids) {
  let leafNodes = [];
  function make(cnids) {
    const n = [];
    _.each(nodes, (node) => {
      if (_.includes(cnids, node.pid)) {
        if (node.leaf === 1) {
          leafNodes = _.concat(leafNodes, node.id);
        } else {
          n.push(node.id);
        }
      }
    });
    if (n.length) {
      make(n);
    }
  }
  make(nids);

  if (leafNodes.length) {
    return _.uniq(leafNodes);
  }
  return nids;
}

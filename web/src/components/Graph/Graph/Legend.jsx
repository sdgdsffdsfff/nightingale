/* eslint-disable no-plusplus */
/* eslint-disable no-use-before-define */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, Input, Button, Modal } from 'antd';
import Color from 'color';
import _ from 'lodash';
import clipboard from '@path/common/clipboard';
import ContextMenu from '@path/components/ContextMenu';

export default class Legend extends Component {
  static propTypes = {
    style: PropTypes.object,
    series: PropTypes.array,
    onSelectedChange: PropTypes.func,
  };

  static defaultProps = {
    style: {},
    series: [],
    onSelectedChange: _.noop,
  };

  constructor(props) {
    super(props);
    this.state = {
      searchText: '',
      filterVal: '',
      filterDropdownVisible: false,
      contextMenuVisiable: false,
      contextMenuTop: 0,
      contextMenuLeft: 0,
      selectedKeys: 'normal', // 默认全选, 已选的 keys
      highlightedKeys: [], // 高亮的 keys
    };
  }

  componentWillReceiveProps(nextProps) {
    const isEqualSeriesResult = isEqualSeries(this.props.series, nextProps.series);
    if (!isEqualSeriesResult) {
      this.setState({
        selectedKeys: 'normal',
        highlightedKeys: [],
      });
    }
  }

  handleInputChange = (e) => {
    this.setState({ searchText: e.target.value });
  }

  handleSearch = () => {
    const { searchText } = this.state;
    this.setState({
      filterDropdownVisible: false,
      filterVal: searchText,
    });
  }

  handleContextMenu = (e, counter) => {
    e.preventDefault();
    this.setState({
      currentCounter: counter,
      contextMenuVisiable: true,
      contextMenuLeft: e.clientX,
      contextMenuTop: e.clientY,
    });
  }

  handleCopyCounter = () => {
    const { currentCounter } = this.state;
    const copySucceeded = clipboard(currentCounter);
    if (!copySucceeded) {
      Modal.info({
        title: '复制失败，请手动选择复制',
        content: (
          <p>{currentCounter}</p>
        ),
      });
    }
  }

  handleClickCounter = (record) => {
    const { selectedKeys, highlightedKeys } = this.state;
    const highlightedKeysClone = _.clone(highlightedKeys);

    if (_.includes(highlightedKeysClone, record.id)) {
      _.remove(highlightedKeysClone, o => o === record.id);
    } else {
      highlightedKeysClone.push(record.id);
    }

    this.setState({ highlightedKeys: highlightedKeysClone }, () => {
      this.props.onSelectedChange(selectedKeys, highlightedKeysClone);
    });
  }

  filterData() {
    const { series } = this.props;
    const { filterVal } = this.state;
    const reg = new RegExp(filterVal, 'gi');
    const legendData = normalizeLegendData(series);
    return _.filter(legendData, (record) => {
      return record.tags.match(reg);
    });
  }

  render() {
    const { onSelectedChange } = this.props;
    const { searchText, selectedKeys, highlightedKeys } = this.state;
    const counterSelectedKeys = highlightedKeys;
    const data = this.filterData();
    const firstData = data[0];
    const columns = [
      {
        title: <span> 曲线({data.length}) </span>,
        dataIndex: 'tags',
        filterDropdown: (
          <div className="custom-filter-dropdown">
            <Input
              placeholder="请输入曲线名称"
              value={searchText}
              onChange={this.handleInputChange}
              onPressEnter={this.handleSearch}
            />
            <Button type="primary" onClick={this.handleSearch}>搜索</Button>
          </div>
        ),
        filterDropdownVisible: this.state.filterDropdownVisible,
        onFilterDropdownVisibleChange: visible => this.setState({ filterDropdownVisible: visible }),
        render: (text, record) => {
          const legendName = getLengendName(record);
          return (
            <span
              title={text}
              onClick={() => this.handleClickCounter(record)}
              onContextMenu={e => this.handleContextMenu(e, text)}
              style={{
                cursor: 'pointer',
                // eslint-disable-next-line no-nested-ternary
                opacity: counterSelectedKeys.length ? _.includes(counterSelectedKeys, record.id) ? 1 : 0.5 : 1,
              }}
            >
              <span style={{ color: record.color }}>● </span>
              {legendName}
            </span>
          );
        },
      }, {
        title: 'Max',
        dataIndex: 'max',
        className: 'alignRight',
        width: 100,
        render(text) {
          return <span style={{ paddingRight: 10 }}>{text}</span>;
        },
        sorter: (a, b) => a.max - b.max,
      }, {
        title: 'Min',
        dataIndex: 'min',
        className: 'alignRight',
        width: 100,
        render(text) {
          return <span style={{ paddingRight: 10 }}>{text}</span>;
        },
        sorter: (a, b) => a.min - b.min,
      }, {
        title: 'Avg',
        dataIndex: 'avg',
        className: 'alignRight',
        width: 100,
        render(text) {
          return <span style={{ paddingRight: 10 }}>{text !== null ? text : 'null'}</span>;
        },
        sorter: (a, b) => a.avg - b.avg,
      }, {
        title: 'Sum',
        dataIndex: 'sum',
        className: 'alignRight',
        width: 100,
        render(text) {
          return <span style={{ paddingRight: 10 }}>{text !== null ? text : 'null'}</span>;
        },
        sorter: (a, b) => a.sum - b.sum,
      }, {
        title: 'Last',
        dataIndex: 'last',
        className: 'alignRight',
        width: 100,
        render(text) {
          return <span style={{ paddingRight: 10 }}>{text !== null ? text : 'null'}</span>;
        },
        sorter: (a, b) => a.last - b.last,
      },
    ];
    const newRowSelection = {
      selectedRowKeys: selectedKeys === 'normal' ? _.map(data, o => o.id) : selectedKeys,
      onChange: (selectedRowKeys) => {
        this.setState({ selectedKeys: selectedRowKeys }, () => {
          onSelectedChange(selectedRowKeys, highlightedKeys);
        });
      },
    };

    if (_.get(firstData, 'isSameMetric') === false) {
      columns.unshift({
        title: '指标',
        dataIndex: 'metric',
        width: 60,
      });
    }

    return (
      <div className="graph-legend" style={{
        ...this.props.style,
        margin: '0 5px 5px 5px',
      }}>
        <Table
          rowKey={record => record.id}
          size="middle"
          rowSelection={newRowSelection}
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ y: 220 }}
        />
        <ContextMenu visible={this.state.contextMenuVisiable} left={this.state.contextMenuLeft} top={this.state.contextMenuTop}>
          <ul className="ant-dropdown-menu ant-dropdown-menu-vertical ant-dropdown-menu-light ant-dropdown-menu-root">
            <li className="ant-dropdown-menu-item">
              <a onClick={this.handleCopyCounter}>复制 counter</a>
            </li>
          </ul>
        </ContextMenu>
      </div>
    );
  }
}

export function normalizeLegendData(series = []) {
  const tableData = _.map(series, (serie) => {
    const { id, metric, tags, data } = serie;
    const { last, avg, max, min, sum } = getLegendNums(data);
    return {
      id,
      metric,
      tags,
      last: _.isNumber(last) ? last.toFixed(3) : null,
      avg: _.isNumber(avg) ? avg.toFixed(3) : null,
      max: _.isNumber(max) ? max.toFixed(3) : null,
      min: _.isNumber(min) ? min.toFixed(3) : null,
      sum: _.isNumber(sum) ? sum.toFixed(3) : null,
      color: serie.color,
    };
  });
  return _.orderBy(tableData, 'counter');
}

export function getSerieVisible(serie, selectedKeys) {
  return selectedKeys === 'normal' ? true : _.includes(selectedKeys, _.get(serie, 'id'));
}

export function getSerieColor(serie, highlightedKeys, oldColor) {
  if (highlightedKeys.length && !_.includes(highlightedKeys, _.get(serie, 'id'))) {
    return Color(oldColor).lighten(0.5).desaturate(0.7).hex();
  }
  return oldColor;
}

export function getSerieIndex(serie, highlightedKeys, seriesLength, serieIndex) {
  return _.includes(highlightedKeys, _.get(serie, 'id')) ? seriesLength + serieIndex : serieIndex;
}

/**
 * 获取 legend 的 max min avg sum last
 * @param  {Array}  points 所有点列表
 * @param  {Number} smin   缩放后的最小值
 * @param  {Number} smax   缩放后的最大值
 * @return {Object}        {max,min,avg,sum,last}
 */
function getLegendNums(points) {
  let last = null;
  let avg = null;
  let max = null;
  let min = null;
  let sum = null;
  let len = 0;

  if (!_.isArray(points)) {
    return { last, avg, max, min, sum };
  }

  _.each(points, (point) => {
    const x = _.get(point, '[0]');
    const y = _.get(point, '[1]');
    if (_.isNumber(x) && _.isNumber(y)) {
      if (sum === null) sum = 0;
      sum += y;

      if (max === null || max < y) {
        max = y;
      }

      if (min === null || min > y) {
        min = y;
      }

      last = y;
      len++;
    }
  });

  if (_.isNumber(sum)) {
    avg = sum / len;
  }

  return { last, avg, max, min, sum };
}


/**
 * getLengendName
 * @param  {Object}  serie             [description]
 * @return {String}                   [description]
 */
function getLengendName(serie) {
  const { tags } = serie;
  let lname = tags;
  // shorten name
  if (lname.length > 80) {
    const leftStr = lname.substr(0, 40);
    const rightStr = lname.substr(-40);
    lname = `${leftStr}......${rightStr}`;
  }
  return lname;
}

function isEqualSeries(series, nextSeries) {
  const pureSeries = _.map(series, (serie) => {
    return serie.id;
  });
  const pureNextSeries = _.map(nextSeries, (serie) => {
    return serie.id;
  });
  return _.isEqual(pureSeries, pureNextSeries);
}

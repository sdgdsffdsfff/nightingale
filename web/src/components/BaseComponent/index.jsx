import React, { Component } from 'react';
import { Table } from 'antd';
import _ from 'lodash';
import api from '@path/common/api';
import * as config from '@path/common/config';
import request, { transferXhrToPromise } from '@path/common/request';
import './style.less';

export default class BaseComponent extends Component {
  constructor(props) {
    super(props);
    this.api = api;
    this.config = config;
    this.prefixCls = config.prefixCls;
    this.request = request;
    this.transferXhrToPromise = transferXhrToPromise;
    this.otherParamsKey = [];
    this.state = {
      loading: false, // eslint-disable-line react/no-unused-state
      pagination: {
        current: 1,
        pageSize: 10,
        showSizeChanger: true,
      },
      data: [], // eslint-disable-line react/no-unused-state
      searchValue: '',
    };
  }

  // eslint-disable-next-line react/sort-comp
  fetchData(newParams = {}, backFirstPage = false) {
    const url = this.getFetchDataUrl();

    if (!url) return;
    const othenParams = _.pick(this.state, this.otherParamsKey);
    const { pagination, searchValue } = this.state;
    const params = {
      limit: pagination.pageSize,
      p: backFirstPage ? 1 : pagination.current,
      query: searchValue,
      ...othenParams,
      ...newParams,
    };

    this.setState({ loading: true }); // eslint-disable-line react/no-unused-state
    // eslint-disable-next-line consistent-return
    return this.request({
      url,
      data: {
        ...params,
      },
    }).then((res) => {
      const newPagination = {
        ...pagination,
        current: backFirstPage ? 1 : pagination.current,
        total: res.total,
      };
      let data = [];
      if (_.isArray(res.list)) {
        data = res.list;
      } else if (_.isArray(res)) {
        data = res;
      }
      this.setState({
        data,
        pagination: newPagination,
      });
      return data;
    }).finally(() => {
      this.setState({ loading: false }); // eslint-disable-line react/no-unused-state
    });
  }

  reload(params) {
    this.fetchData(params);
  }

  handleSearchChange = (value) => {
    this.setState({ searchValue: value }, () => {
      this.reload({
        query: value,
      }, true);
    });
  }

  handleTableChange = (pagination) => {
    const pager = {
      // eslint-disable-next-line react/no-access-state-in-setstate
      ...this.state.pagination,
      current: pagination.current,
      pageSize: pagination.pageSize,
    };
    this.setState({ pagination: pager }, () => {
      this.reload({
        limit: pagination.pageSize,
        page: pagination.current,
      });
    });
  }

  renderTable(params) {
    return (
      <Table
        rowKey="id"
        size="small"
        loading={this.state.loading}
        pagination={{
          ...this.state.pagination,
          showTotal: (total) => {
            return `共 ${total} 条数据`;
          },
          pageSizeOptions: ['10', '30', '50', '100', '300', '500', '1000'],
          onChange: () => {
            if (this.handlePaginationChange) this.handlePaginationChange();
          },
        }}
        rowClassName={(record, index) => {
          if (index % 2 === 1) {
            return 'table-row-bg';
          }
          return '';
        }}
        dataSource={this.state.data}
        onChange={this.handleTableChange}
        {...params}
      />
    );
  }
}

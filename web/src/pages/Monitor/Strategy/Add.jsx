import React from 'react';
import { message } from 'antd';
import queryString from 'query-string';
import _ from 'lodash';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import BaseComponent from '@path/BaseComponent';
import SettingFields from './SettingFields';
import './style.less';

class Add extends BaseComponent {
  handleSubmit = (values) => {
    const { history } = this.props;
    this.request({
      url: this.api.stra,
      type: 'POST',
      data: JSON.stringify(values),
    }).then(() => {
      message.success('添加报警策略成功!');
      history.push({
        pathname: '/monitor/strategy',
      });
    });
  }

  render() {
    const search = _.get(this.props, 'location.search');
    const query = queryString.parse(search);
    const nid = _.toNumber(query.nid);
    return (
      <div>
        <SettingFields
          onSubmit={this.handleSubmit}
          initialValues={{
            nid,
          }}
        />
      </div>
    );
  }
}

export default CreateIncludeNsTree(Add);

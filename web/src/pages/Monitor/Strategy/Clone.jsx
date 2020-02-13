import React from 'react';
import { message } from 'antd';
import _ from 'lodash';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import BaseComponent from '@path/BaseComponent';
import SettingFields from './SettingFields';
import { normalizeFormData } from './utils';
import './style.less';

class Add extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      values: undefined,
    };
  }

  componentDidMount = () => {
    this.getStrategy(this.props);
  }

  getStrategy(props) {
    const strategyId = _.get(props, 'match.params.strategyId');
    if (strategyId) {
      this.request({
        url: `${this.api.stra}/${strategyId}`,
      }).then((values) => {
        this.setState({
          values: normalizeFormData(values),
        });
      });
    }
  }

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
    const { values } = this.state;

    if (values) {
      return (
        <div>
          <SettingFields
            initialValues={values}
            onSubmit={this.handleSubmit}
          />
        </div>
      );
    }
    return null;
  }
}

export default CreateIncludeNsTree(Add);

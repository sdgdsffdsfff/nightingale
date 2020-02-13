import React from 'react';
import { message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import SettingFields from './SettingFields';
import { normalizeFormData } from './utils';
import './style.less';

class Modify extends BaseComponent {
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

  handleSubmit = (newValues) => {
    const { history } = this.props;
    const { values } = this.state;
    this.request({
      url: this.api.stra,
      type: 'PUT',
      data: JSON.stringify({
        ...newValues,
        id: values.id,
      }),
    }).then(() => {
      message.success('修改报警策略成功!');
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

export default CreateIncludeNsTree(Modify);

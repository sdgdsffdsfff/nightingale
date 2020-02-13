import React from 'react';
import PropTypes from 'prop-types';
import { Form, Input, Radio, Select, Spin } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';

const FormItem = Form.Item;
const RadioGroup = Radio.Group;
const { Option } = Select;

class TeamForm extends BaseComponent {
  static propTypes = {
    initialValue: PropTypes.object,
  };

  static defaultProps = {
    initialValue: {},
  };

  constructor(props) {
    super(props);
    this.lastFetchId = 0;
    this.fetchUser = _.debounce(this.fetchUser, 500);
  }

  state = {
    users: [],
    value: '',
    fetching: false,
  };

  componentDidMount() {
    this.fetchUser();
  }

  fetchUser = (value) => {
    this.lastFetchId += 1;
    const fetchId = this.lastFetchId;
    this.setState({ users: [], fetching: true });
    this.request({
      url: this.api.user,
      data: {
        query: value,
        limit: 1000,
      },
    }).then((res) => {
      if (fetchId !== this.lastFetchId) {
        // for fetch callback order
        return;
      }
      this.setState({ users: res.list, fetching: false });
    });
  };

  validateFields() {
    return this.props.form.validateFields;
  }

  renderUserSelect() {
    const { users, fetching } = this.state;

    return (
      <Select
        mode="multiple"
        showSearch
        filterOption={false}
        notFoundContent={fetching ? <Spin size="small" /> : null}
        onSearch={this.fetchUser}
        onDropdownVisibleChange={(open) => {
          if (!open) {
            this.fetchUser();
          }
        }}
      >
        {
          _.map(users, (item) => {
            return <Option key={item.id} value={item.id}>{item.username}</Option>;
          })
        }
      </Select>
    );
  }

  render() {
    const { initialValue } = this.props;
    const { getFieldDecorator, getFieldValue } = this.props.form;
    return (
      <Form layout="vertical">
        <FormItem label="英文标识" required>
          {getFieldDecorator('ident', {
            initialValue: initialValue.ident,
            rules: [{ required: true, message: '请填写英文标识!' }],
          })(
            <Input />,
          )}
        </FormItem>
        <FormItem label="中文名称" required>
          {getFieldDecorator('name', {
            initialValue: initialValue.name,
            rules: [{ required: true, message: '请填写中文名称!' }],
          })(
            <Input />,
          )}
        </FormItem>
        <FormItem label="管理方式" required>
          {getFieldDecorator('mgmt', {
            initialValue: initialValue.mgmt || 0,
            rules: [{ required: true, message: '请选择管理方式!' }],
          })(
            <RadioGroup>
              <Radio value={0}>成员管理制</Radio>
              <Radio value={1}>管理员管理制</Radio>
            </RadioGroup>,
          )}
        </FormItem>
        {
          getFieldValue('mgmt') === 1 ?
            <FormItem label="管理员">
              {getFieldDecorator('admins', {
                initialValue: initialValue.admins,
                rules: [{
                  required: getFieldValue('mgmt') === 1,
                  message: '管理员管理制必须选择管理员!',
                }],
              })(
                this.renderUserSelect(),
              )}
            </FormItem> : null
        }
        <FormItem label="普通组员">
          {getFieldDecorator('members', {
            initialValue: initialValue.members,
          })(
            this.renderUserSelect(),
          )}
        </FormItem>
      </Form>
    );
  }
}

export default Form.create()(TeamForm);

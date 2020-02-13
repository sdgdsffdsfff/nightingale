import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, Icon, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';

const FormItem = Form.Item;

class PutPassword extends BaseComponent {
  static propTypes = {
    id: PropTypes.number.isRequired,
    title: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    title: '修改密码',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  handleOk = () => {
    this.props.form.validateFields((err, values) => {
      if (!err) {
        this.request({
          url: `${this.api.user}/${this.props.id}/password`,
          type: 'PUT',
          data: JSON.stringify(values),
        }).then(() => {
          message.success('密码修改成功！');
          this.props.onOk();
          this.props.destroy();
        });
      }
    });
  }

  handleCancel = () => {
    this.props.destroy();
  }

  render() {
    const { title, visible } = this.props;
    const { getFieldDecorator } = this.props.form;

    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
        // okText="确认"
        // cancelText="取消"
      >
        <Form layout="vertical">
          <FormItem label="新密码" required>
            {getFieldDecorator('password', {
              rules: [{ required: true, message: '请输入新密码!' }],
            })(
              <Input
                prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />}
                type="password"
              />,
            )}
          </FormItem>
        </Form>
      </Modal>
    );
  }
}

export default ModalControl(Form.create()(PutPassword));

import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';

const FormItem = Form.Item;

class SingleEdit extends BaseComponent {
  static propTypes = {
    data: PropTypes.object.isRequired,
    titile: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    title: '',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  handleOk = () => {
    const { title } = this.props;
    this.props.form.validateFields((err, values) => {
      if (!err) {
        this.request({
          url: `${this.api.endpoint}/${values.id}`,
          type: 'PUT',
          data: JSON.stringify({
            alias: values.alias,
          }),
        }).then(() => {
          message.success(`${title}成功`);
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
    const { title, visible, data } = this.props;
    const { getFieldDecorator } = this.props.form;

    getFieldDecorator('id', {
      initialValue: data.id,
    });
    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
      >
        <Form layout="vertical" onSubmit={(e) => {
          e.preventDefault();
          this.handleOk();
        }}>
          <FormItem label="标识">
            <span className="ant-form-text">{data.ident}</span>
          </FormItem>
          <FormItem label="别名">
            {getFieldDecorator('alias', {
              initialValue: data.alias,
            })(
              <Input />,
            )}
          </FormItem>
        </Form>
      </Modal>
    );
  }
}

export default ModalControl(Form.create()(SingleEdit));

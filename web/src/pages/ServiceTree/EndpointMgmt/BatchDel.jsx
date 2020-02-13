import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';

const FormItem = Form.Item;

class BatchDel extends BaseComponent {
  static propTypes = {
    selectedIdents: PropTypes.array,
    title: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    selectedIps: [],
    title: '批量删除',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  handleOk = () => {
    const { title } = this.props;
    this.props.form.validateFields((err, values) => {
      if (!err) {
        const idents = _.split(values.idents, '\n');
        const reqBody = {
          idents,
        };
        this.request({
          url: this.api.endpoint,
          type: 'DELETE',
          data: JSON.stringify(reqBody),
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
    const { title, visible, selectedIdents } = this.props;
    const { getFieldDecorator } = this.props.form;

    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
      >
        <Form layout="vertical">
          <FormItem label="已选 endpoints">
            {getFieldDecorator('idents', {
              initialValue: _.join(selectedIdents, '\n'),
              rules: [{ required: true, message: '请填写批量操作的 endpoints!' }],
            })(
              <Input.TextArea
                autosize={{ minRows: 2, maxRows: 10 }}
              />,
            )}
          </FormItem>
        </Form>
      </Modal>
    );
  }
}

export default ModalControl(Form.create()(BatchDel));

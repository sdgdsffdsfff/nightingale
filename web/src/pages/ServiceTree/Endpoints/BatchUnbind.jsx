import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';

const FormItem = Form.Item;

class BatchHostUnbind extends BaseComponent {
  static propTypes = {
    selectedNode: PropTypes.object.isRequired,
    selectedIdents: PropTypes.array.isRequired,
    titile: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    title: '解挂 endpoints',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  handleOk = () => {
    const { selectedNode } = this.props;
    this.props.form.validateFields((err, values) => {
      if (!err) {
        const reqBody = {
          idents: _.split(values.idents, '\n'),
        };
        this.request({
          url: `${this.api.node}/${selectedNode.id}/endpoint-unbind`,
          type: 'POST',
          data: JSON.stringify(reqBody),
        }).then(() => {
          message.success('解除挂载成功！');
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
    const { title, visible, selectedNode, selectedIdents } = this.props;
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
          <FormItem label="解除挂载的节点">
            <span className="ant-form-text" style={{ wordBreak: 'break-word' }}>{_.get(selectedNode, 'path')}</span>
          </FormItem>
          <FormItem label="待解除挂载的 endpoints">
            {getFieldDecorator('idents', {
              initialValue: _.join(selectedIdents, '\n'),
              rules: [{ required: true, message: '请填写需要解除挂载的机器列表!' }],
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

export default ModalControl(Form.create()(BatchHostUnbind));

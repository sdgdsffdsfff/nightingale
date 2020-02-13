import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, Checkbox, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';

const FormItem = Form.Item;

class BatchBind extends BaseComponent {
  static propTypes = {
    selectedNode: PropTypes.object.isRequired,
    title: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    title: '挂载 endpoints',
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
          del_old: values.del_old ? 1 : 0,
        };
        this.request({
          url: `${this.api.node}/${selectedNode.id}/endpoint-bind`,
          type: 'POST',
          data: JSON.stringify(reqBody),
        }).then(() => {
          message.success('挂载成功！');
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
    const { title, visible, selectedNode } = this.props;
    const { getFieldDecorator } = this.props.form;

    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
      >
        <Form layout="vertical">
          <FormItem label="挂载的节点">
            <span className="ant-form-text" style={{ wordBreak: 'break-word' }}>{_.get(selectedNode, 'path')}</span>
          </FormItem>
          <FormItem label="待挂载的 endpoint">
            {getFieldDecorator('idents', {
              rules: [{ required: true, message: '请填写需要挂载的 endpoints!' }],
            })(
              <Input.TextArea
                autosize={{ minRows: 2, maxRows: 10 }}
              />,
            )}
          </FormItem>
          {getFieldDecorator('del_old', {
          })(
            <Checkbox className="mt10">是否删除旧的挂载关系</Checkbox>,
          )}
        </Form>
      </Modal>
    );
  }
}

export default ModalControl(Form.create()(BatchBind));

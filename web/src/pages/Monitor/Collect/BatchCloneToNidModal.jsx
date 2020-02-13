import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, TreeSelect } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';
import { normalizeTreeData, renderTreeNodes } from '@path/Layout/utils';

const FormItem = Form.Item;

class BatchCloneToNidModal extends BaseComponent {
  static propTypes = {
    treeNodes: PropTypes.array,
    title: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    treeNodes: [],
    title: '',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  componentDidMount = () => {
    const treeData = normalizeTreeData(_.cloneDeep(this.props.treeNodes));
    this.setState({ treeData });
  }

  handleOk = () => {
    this.props.form.validateFields(async (err, values) => {
      if (!err) {
        this.props.onOk(values.nid);
        this.props.destroy();
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
        confirmLoading={this.state.loading}
      >
        <Form layout="vertical">
          <FormItem
            label="生效节点"
          >
            {
              getFieldDecorator('nid', {
              })(
                <TreeSelect
                  showSearch
                  allowClear
                  treeDefaultExpandAll
                  treeNodeFilterProp="title"
                  treeNodeLabelProp="path"
                  dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                >
                  {renderTreeNodes(this.state.treeData)}
                </TreeSelect>,
              )
            }
          </FormItem>
        </Form>
      </Modal>
    );
  }
}

export default ModalControl(Form.create()(BatchCloneToNidModal));

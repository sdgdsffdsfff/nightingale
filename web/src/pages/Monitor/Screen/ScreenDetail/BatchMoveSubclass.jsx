import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, TreeSelect, Select } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';
import { normalizeTreeData, renderTreeNodes } from '@path/Layout/utils';

const FormItem = Form.Item;
const { Option } = Select;

class BatchMoveSubclass extends BaseComponent {
  static propTypes = {
    title: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    title: '批量移动分类',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  constructor(props) {
    super(props);
    this.state = {
      screenData: [],
    };
  }

  handleOk = () => {
    this.props.form.validateFields((err, values) => {
      if (!err) {
        this.props.onOk(values);
        this.props.destroy();
      }
    });
  }

  handleCancel = () => {
    this.props.destroy();
  }

  handleSelectedTreeNodeIdChange = (nid) => {
    this.request({
      url: `${this.api.node}/${nid}/screen`,
    }).then((res) => {
      this.setState({ screenData: res || [] });
    });
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
      >
        <Form layout="vertical" onSubmit={(e) => {
          e.preventDefault();
          this.handleOk();
        }}>
          <FormItem label="需要移动的分类">
            {getFieldDecorator('subclasses', {
              rules: [{ required: true, message: '请选择分类!' }],
            })(
              <Select mode="multiple">
                {
                  _.map(this.props.data, (item) => {
                    return <Option key={item.id} value={item.id}>{item.name}</Option>;
                  })
                }
              </Select>,
            )}
          </FormItem>
          <FormItem label="将要移动到的节点">
            {getFieldDecorator('nid', {
              rules: [{ required: true, message: '请选择节点!' }],
              onChange: this.handleSelectedTreeNodeIdChange,
            })(
              <TreeSelect
                showSearch
                allowClear
                treeNodeFilterProp="title"
                treeNodeLabelProp="path"
                dropdownStyle={{ maxHeight: 200, overflow: 'auto' }}
              >
                {renderTreeNodes(normalizeTreeData(this.props.treeData))}
              </TreeSelect>,
            )}
          </FormItem>
          <FormItem label="将要移动到的大盘">
            {getFieldDecorator('screenId', {
              rules: [{ required: true, message: '请选择大盘!' }],
            })(
              <Select>
                {
                  _.map(this.state.screenData, (item) => {
                    return <Option key={item.id} value={item.id}>{item.name}</Option>;
                  })
                }
              </Select>,
            )}
          </FormItem>
        </Form>
      </Modal>
    );
  }
}

export default ModalControl(Form.create()(BatchMoveSubclass));

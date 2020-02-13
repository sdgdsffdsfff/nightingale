import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Select, TreeSelect, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';
import { normalizeTreeData, renderTreeNodes, filterTreeNodes } from '@path/Layout/utils';

const FormItem = Form.Item;
const { Option } = Select;

class BatchModModal extends BaseComponent {
  static propTypes = {
    data: PropTypes.array.isRequired, // 批量操作的数据
    type: PropTypes.string.isRequired, // exclNid 排除节点，notify 报警接收人
    selectedNid: PropTypes.number,
    treeNodes: PropTypes.array,
    title: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    selectedNid: undefined,
    treeNodes: [],
    title: '',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      excludeTreeData: [],
      notifyGroupData: [],
      notifyUserData: [],
    };
  }

  componentDidMount = () => {
    if (this.props.type === 'exclNid' || this.props.type === 'clone') {
      const treeData = normalizeTreeData(_.cloneDeep(this.props.treeNodes));
      const excludeTreeData = filterTreeNodes(treeData, this.props.selectedNid);
      this.setState({ treeData, excludeTreeData });
    }
    if (this.props.type === 'notify') {
      this.fetchNotifyData();
    }
  }

  async fetchNotifyData() {
    try {
      const teamData = await this.request({
        url: this.api.team,
      });
      const userData = await this.request({
        url: this.api.user,
        data: {
          limit: 1000,
        },
      });
      this.setState({
        notifyGroupData: teamData.list,
        notifyUserData: userData.list,
      });
    } catch (e) {
      console.log(e);
    }
  }

  handleOk = () => {
    this.props.form.validateFields(async (err, values) => {
      if (!err) {
        this.setState({ loading: true });
        try {
          const requests = _.map(this.props.data, (item) => {
            if (this.props.type === 'clone') {
              delete item.id;
              delete item.excl_nid;
            }
            this.request({
              url: this.api.stra,
              type: this.props.type === 'clone' ? 'POST' : 'PUT',
              data: JSON.stringify({
                ...item,
                ...values,
              }),
            });
          });
          await Promise.all(requests).then(() => {
            message.success('批量操作成功！');
          }).catch(() => {
            message.error('批量操作失败！');
          });
        } catch (e) {
          console.log(e);
        }
        this.setState({ loading: false });
        this.props.onOk();
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
          {
            this.props.type === 'exclNid' ?
              <FormItem
                label="排除节点"
              >
                {
                  getFieldDecorator('excl_nid', {
                    // initialValue: this.props.initialValues.excl_nid,
                  })(
                    <TreeSelect
                      multiple
                      showSearch
                      allowClear
                      treeDefaultExpandAll
                      treeNodeFilterProp="title"
                      treeNodeLabelProp="path"
                      dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                    >
                      {renderTreeNodes(this.state.excludeTreeData)}
                    </TreeSelect>,
                  )
                }
              </FormItem> : null
          }
          {
            this.props.type === 'notify' ?
              [
                <FormItem
                  key="group"
                  label="报警接收团队"
                >
                  {
                    getFieldDecorator('notify_group', {
                      initialValue: [],
                    })(
                      <Select
                        mode="multiple"
                        size="default"
                        defaultActiveFirstOption={false}
                        filterOption={false}
                        placeholder="报警接收团队"
                      >
                        {
                          _.map(this.state.notifyGroupData, (item, i) => {
                            return (
                              <Option key={i} value={item.id}>{item.name}</Option>
                            );
                          })
                        }
                      </Select>,
                    )
                  }
                </FormItem>,
                <FormItem
                  key="user"
                  label="报警接收人"
                >
                  {
                    getFieldDecorator('notify_user', {
                      initialValue: [],
                    })(
                      <Select
                        mode="multiple"
                        size="default"
                        defaultActiveFirstOption={false}
                        filterOption={false}
                        placeholder="报警接收人"
                      >
                        {
                          _.map(this.state.notifyUserData, (item, i) => {
                            return (
                              <Option key={i} value={item.id}>{item.username} {item.dispname} {item.phone} {item.email}</Option>
                            );
                          })
                        }
                      </Select>,
                    )
                  }
                </FormItem>,
              ] : null
          }
          {
            this.props.type === 'clone' ?
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
              </FormItem> : null
          }
        </Form>
      </Modal>
    );
  }
}

export default ModalControl(Form.create()(BatchModModal));

import React from 'react';
import PropTypes from 'prop-types';
import { Modal, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';
import TeamForm from './TeamForm';

class PutTeam extends BaseComponent {
  static propTypes = {
    data: PropTypes.object.isRequired,
    title: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    title: '编辑团队',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  handleOk = () => {
    const { data } = this.props;
    this.teamFormRef.validateFields((err, values) => {
      if (!err) {
        this.request({
          url: `${this.api.team}/${data.id}`,
          type: 'PUT',
          data: JSON.stringify({
            ...values,
          }),
        }).then(() => {
          message.success('团队信息修改成功！');
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

    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
      >
        <TeamForm
          initialValue={data}
          ref={(ref) => { this.teamFormRef = ref; }}
        />
      </Modal>
    );
  }
}

export default ModalControl(PutTeam);

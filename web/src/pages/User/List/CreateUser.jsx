import React from 'react';
import PropTypes from 'prop-types';
import { Modal, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';
import ProfileForm from '@path/components/ProfileForm';
import { auth } from '@path/Auth';

class CreateUser extends BaseComponent {
  static propTypes = {
    title: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    title: '新建用户',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  handleOk = () => {
    this.profileFormRef.validateFields((err, values) => {
      if (!err) {
        this.request({
          url: this.api.user,
          type: 'POST',
          data: JSON.stringify({
            ...values,
            is_root: values.is_root ? 1 : 0,
          }),
        }).then(() => {
          message.success('新建用户成功！');
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
    const { isroot } = auth.getSelftProfile();

    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
      >
        <ProfileForm
          isrootVsible={isroot}
          ref={(ref) => { this.profileFormRef = ref; }} />
      </Modal>
    );
  }
}

export default ModalControl(CreateUser);

import React from 'react';
import PropTypes from 'prop-types';
import { Modal, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import ModalControl from '@path/ModalControl';
import ProfileForm from '@path/components/ProfileForm';
import { auth } from '@path/Auth';

class PutProfile extends BaseComponent {
  static propTypes = {
    data: PropTypes.object.isRequired,
    title: PropTypes.string,
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
    this.profileForm.validateFields((err, values) => {
      if (!err) {
        this.request({
          url: `${this.api.user}/${this.props.data.id}/profile`,
          type: 'PUT',
          data: JSON.stringify({
            ...values,
            is_root: values.is_root ? 1 : 0,
          }),
        }).then(() => {
          message.success('用户信息修改成功！');
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
    const { isroot } = auth.getSelftProfile();

    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
      >
        <ProfileForm
          type="put"
          isrootVsible={isroot}
          initialValue={data}
          ref={(ref) => { this.profileForm = ref; }}
        />
      </Modal>
    );
  }
}

export default ModalControl(PutProfile);

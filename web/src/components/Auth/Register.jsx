import React from 'react';
import { Card, Button, message } from 'antd';
import queryString from 'query-string';
import BaseComponent from '@path/BaseComponent';
import ProfileForm from '@path/components/ProfileForm';
import './style.less';

class Register extends BaseComponent {
  handleSubmit = (e) => {
    e.preventDefault();
    const { location, history } = this.props;
    const query = queryString.parse(location.search);
    this.profileForm.validateFields((err, values) => {
      if (!err) {
        this.request({
          url: `${this.api.users}/invite`,
          type: 'POST',
          data: JSON.stringify({
            ...values,
            token: query.token,
          }),
        }).then(() => {
          message.success('注册成功！');
          history.push({
            pathname: '/',
          });
        });
      }
    });
  }

  render() {
    const prefixCls = `${this.prefixCls}-register`;

    return (
      <div className={prefixCls}>
        <div className={`${prefixCls}-main`}>
          <Card>
            <div className={`${prefixCls}-title`}>账户注册</div>
            <ProfileForm type="register" ref={(ref) => { this.profileForm = ref; }} />
            <Button
              type="primary"
              className={`${prefixCls}-submitBtn`}
              onClick={this.handleSubmit}
            >
              注 册
            </Button>
          </Card>
        </div>
      </div>
    );
  }
}

export default Register;

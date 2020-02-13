import React from 'react';
import { Tabs, Button, message } from 'antd';
import auth from '@path/Auth/auth';
import BaseComponent from '@path/BaseComponent';
import ProfileForm from '@path/components/ProfileForm';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import PutPasswordForm from './PutPasswordForm';

const { TabPane } = Tabs;

class index extends BaseComponent {
  handlePutProfileSubmit = () => {
    this.profileFormRef.validateFields((err, values) => {
      if (!err) {
        this.request({
          url: this.api.selftProfile,
          type: 'PUT',
          data: JSON.stringify(values),
        }).then(() => {
          message.success('信息修改成功！');
        });
      }
    });
  }

  handlePutPasswordSubmit = () => {
    this.putPasswordFormRef.validateFields((err, values) => {
      if (!err) {
        this.request({
          url: this.api.selftPassword,
          type: 'PUT',
          data: JSON.stringify(values),
        }).then(() => {
          message.success('密码修改成功！');
        });
      }
    });
  }

  render() {
    const prefixCls = `${this.prefixCls}-profile`;
    const profile = auth.getSelftProfile();
    return (
      <div className={prefixCls}>
        <Tabs tabPosition="left">
          <TabPane tab="基础设置" key="baseSetting">
            <div style={{ width: 500 }}>
              <ProfileForm type="put" initialValue={profile} ref={(ref) => { this.profileFormRef = ref; }} />
              <Button type="primary" onClick={this.handlePutProfileSubmit}>提交</Button>
            </div>
          </TabPane>
          <TabPane tab="修改密码" key="resetPassword">
            <div style={{ width: 500 }}>
              <PutPasswordForm ref={(ref) => { this.putPasswordFormRef = ref; }} />
              <Button type="primary" onClick={this.handlePutPasswordSubmit}>提交</Button>
            </div>
          </TabPane>
        </Tabs>
      </div>
    );
  }
}
export default CreateIncludeNsTree(index);

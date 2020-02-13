import React from 'react';
import { Button } from 'antd';
import BaseComponent from '@path/BaseComponent';

export default class Page404 extends BaseComponent {
  render() {
    const { history } = this.props;
    const prefixCls = `${this.prefixCls}-exception`;
    return (
      <div className={prefixCls}>
        <div className={`${prefixCls}-main`}>
          <div className={`${prefixCls}-title`}>404</div>
          <div className={`${prefixCls}-content mb10`}>抱歉，你访问的页面不存在</div>
          <Button
            icon="arrow-left"
            type="primary"
            onClick={() => {
              history.push({
                pathname: '/',
              });
            }}
          >
            返回首页
          </Button>
        </div>
      </div>
    );
  }
}

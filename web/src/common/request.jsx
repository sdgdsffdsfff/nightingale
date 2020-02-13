import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Icon, Progress } from 'antd';
import Notification from 'rc-notification';
import $ from 'jquery';
import _ from 'lodash';
import 'rc-notification/assets/index.css';
import { prefixCls } from './config';

let notification = null;
Notification.newInstance({
  style: {
    top: 24,
    right: 0,
    zIndex: 1001,
  },
}, (n) => { notification = n; });

/**
 * 后端接口非 5xx 都会返回 2xx
 * 异常都是通过 res.err 来判断，res.err 有值则请求失败。res.err 是具体的错误信息
*/

class ErrNotifyContent extends Component {
  static propTypes = {
    duration: PropTypes.number.isRequired,
    msg: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      percent: 0,
    };
  }

  componentDidMount = () => {
    this.setUpTimer();
  }

  componentWillUnmount() {
    if (this.timerId) {
      window.clearInterval(this.timerId);
    }
  }

  setUpTimer() {
    const { duration, onClose } = this.props;
    let { percent } = this.state;
    this.timerId = window.setInterval(() => {
      if (percent < 100) {
        percent += 10 / duration;
        this.setState({ percent });
      } else {
        window.clearInterval(this.timerId);
        onClose();
      }
    }, 100);
  }

  render() {
    return (
      <div
        style={{
          width: 350,
          padding: '16px 24px',
        }}
        onMouseOver={() => {
          if (this.timerId) {
            window.clearInterval(this.timerId);
            this.setState({ percent: 0 });
          }
        }}
        onMouseOut={() => {
          this.setUpTimer();
        }}
        onFocus={() => {}}
        onBlur={() => {}}
      >
        <Progress
          className={`${prefixCls}-errNotify-progress`}
          percent={this.state.percent}
          showInfo={false}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            opacity: 0.2,
          }}
        />
        <Icon
          type="close-circle"
          style={{
            color: '#f5222d',
            fontSize: 24,
          }}
        />
        <div
          style={{
            display: 'inline-block',
            fontSize: 16,
            lineHeight: '24px',
            verticalAlign: 'top',
            marginLeft: 10,
          }}
        >
          请求错误
        </div>
        <div
          style={{
            marginLeft: 35,
          }}
        >
          {this.props.msg}
        </div>
      </div>
    );
  }
}

function errNotify(errMsg) {
  const notifyId = _.uniqueId('notifyId_');

  notification.notice({
    key: notifyId,
    duration: 0,
    closable: true,
    style: {
      right: '20px',
    },
    content: (
      <ErrNotifyContent
        msg={errMsg}
        duration={5}
        onClose={() => {
          notification.removeNotice(notifyId);
        }}
      />
    ),
  });
}

export function transferXhrToPromise(xhr, isUseDefaultErrNotify) {
  return new Promise((resolve, reject) => {
    xhr.done((res) => {
      if (_.isPlainObject(res) && res.err === '') {
        resolve(res.dat);
      } else {
        const err = _.get(res, 'err', '接口异常，请联系管理员');
        if (err === 'unauthorized') {
          window.location.href = '/#/login';
        } else {
          if (isUseDefaultErrNotify) errNotify(err);
          reject(res);
        }
      }
    }).fail((res) => {
      errNotify(res.responseText);
      reject(res.responseText);
    });
  });
}

export default function request(options, p2, p3) {
  const xhr = $.ajax({
    contentType: 'application/json',
    ...options,
  });
  if (p2 !== undefined) {
    if (_.isBoolean(p2)) {
      if (_.isArray(p3)) p3.push(xhr);
      return transferXhrToPromise(xhr, p2);
    }
    if (_.isArray(p2)) {
      p2.push(xhr);
      return transferXhrToPromise(xhr, p3 !== undefined ? !!p3 : true);
    }
  }
  return transferXhrToPromise(xhr, true);
}

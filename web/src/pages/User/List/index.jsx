import React from 'react';
import { Row, Col, Input, Button, Divider, Popover, Popconfirm, message, Tooltip, Alert } from 'antd';
import BaseComponent from '@path/BaseComponent';
import clipboard from '@common/clipboard';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import { auth } from '@path/Auth';
import CreateUser from './CreateUser';
import PutPassword from './PutPassword';
import PutProfile from './PutProfile';

const ButtonGroup = Button.Group;

class User extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      inviteTooltipVisible: false,
      invitePopoverVisible: false,
      inviteLink: '',
      copySucceeded: false,
    };
  }

  componentDidMount() {
    this.fetchData();
  }

  getFetchDataUrl() {
    return this.api.user;
  }

  handleInviteBtnClick = () => {
    this.request({
      url: `${this.api.users}/invite`,
      async: false,
    }).then((res) => {
      const { origin, pathname } = window.location;
      const inviteLink = `${origin}${pathname}#/register?token=${res}`;
      const copySucceeded = clipboard(inviteLink);

      this.setState({
        copySucceeded,
        inviteLink,
        inviteTooltipVisible: false,
        invitePopoverVisible: true,
      });
    });
  }

  handleAddBtnClick = () => {
    CreateUser({
      onOk: () => {
        this.fetchData();
      },
    });
  }

  handlePutBtnClick = (record) => {
    PutProfile({
      data: record,
      onOk: () => {
        this.fetchData();
      },
    });
  }

  handlePutPassBtnClick = (id) => {
    PutPassword({
      id,
      onOk: () => {
        this.fetchData();
      },
    });
  }

  handleDelBtnClick(id) {
    this.request({
      url: `${this.api.user}/${id}`,
      type: 'DELETE',
    }).then(() => {
      this.fetchData();
      message.success('用户删除成功！');
    });
  }

  render() {
    const {
      invitePopoverVisible,
      inviteTooltipVisible,
      copySucceeded,
      inviteLink,
    } = this.state;
    const { isroot } = auth.getSelftProfile();
    const columns = [
      {
        title: '登录名',
        dataIndex: 'username',
      }, {
        title: '显示名',
        dataIndex: 'dispname',
      }, {
        title: '邮箱',
        dataIndex: 'email',
      }, {
        title: '手机',
        dataIndex: 'phone',
      }, {
        title: 'im',
        dataIndex: 'im',
      }, {
        title: '是否超管',
        dataIndex: 'is_root',
        width: 70,
        className: 'textAlignCenter',
        render: (text) => {
          return text === 1 ? '是' : '否';
        },
      },
    ];
    if (isroot) {
      columns.push({
        title: '操作',
        className: 'textAlignCenter',
        width: 200,
        render: (text, record) => {
          return (
            <span>
              <a onClick={() => { this.handlePutPassBtnClick(record.id); }}>重置密码</a>
              <Divider type="vertical" />
              <a onClick={() => { this.handlePutBtnClick(record); }}>修改信息</a>
              <Divider type="vertical" />
              <Popconfirm title="确认要删除这个用户吗？" onConfirm={() => { this.handleDelBtnClick(record.id); }}>
                <a>删除</a>
              </Popconfirm>
            </span>
          );
        },
      });
    }
    return (
      <div>
        <Row>
          <Col span={8} className="mb10">
            <Input.Search
              style={{ width: 200 }}
              onSearch={this.handleSearchChange}
            />
          </Col>
          <Col span={16} className="textAlignRight">
            <ButtonGroup>
              {
                isroot ? <Button onClick={this.handleAddBtnClick}>新建用户</Button> : null
              }
              <Popover
                trigger="click"
                placement="topRight"
                visible={invitePopoverVisible}
                onVisibleChange={(visible) => {
                  if (!visible) {
                    this.setState({ invitePopoverVisible: visible });
                  }
                }}
                content={
                  copySucceeded ?
                    <Alert message="邀请用户的链接复制成功" type="success" /> :
                    <Alert message={
                      <div>
                        <p>复制失败，请手动复制</p>
                        <span>{inviteLink}</span>
                      </div>
                    } type="warning" />
                }
              >
                <Tooltip
                  placement="topRight"
                  visible={inviteTooltipVisible}
                  onVisibleChange={(visible) => { this.setState({ inviteTooltipVisible: visible }); }}
                  title="点击生成一个邀请用户的链接"
                >
                  <Button className="ml10" onClick={this.handleInviteBtnClick}>邀请用户</Button>
                </Tooltip>
              </Popover>
            </ButtonGroup>
          </Col>
        </Row>
        {
          this.renderTable({
            columns,
          })
        }
      </div>
    );
  }
}
export default CreateIncludeNsTree(User);

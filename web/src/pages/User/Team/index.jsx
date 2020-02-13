/* eslint-disable react/no-access-state-in-setstate */
import React from 'react';
import { Row, Col, Input, Divider, Popconfirm, Button, message } from 'antd';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import PutTeam from './PutTeam';
import AddTeam from './AddTeam';

class UserTeam extends BaseComponent {
  componentDidMount() {
    this.fetchData();
  }

  getFetchDataUrl() {
    return this.api.team;
  }

  handleAddBtnClick = () => {
    AddTeam({
      onOk: () => {
        this.fetchData();
      },
    });
  }

  handlePutBtnClick = (record) => {
    PutTeam({
      data: {
        ...record,
        admins: _.map(record.admin_objs, n => n.id),
        members: _.map(record.member_objs, n => n.id),
      },
      onOk: () => {
        this.fetchData();
      },
    });
  }

  handleDelBtnClick = (id) => {
    this.request({
      url: `${this.api.team}/${id}`,
      type: 'DELETE',
    }).then(() => {
      this.fetchData();
      message.success('团队删除成功！');
    });
  }

  render() {
    return (
      <div>
        <Row className="mb10">
          <Col span={8}>
            <Input.Search
              style={{ width: 200 }}
              onSearch={this.handleSearchChange}
            />
          </Col>
          <Col span={16} className="textAlignRight">
            <Button onClick={this.handleAddBtnClick} icon="plus">新建团队</Button>
          </Col>
        </Row>
        {
          this.renderTable({
            columns: [
              {
                title: '英文标识',
                dataIndex: 'ident',
                width: 130,
              }, {
                title: '中文名称',
                dataIndex: 'name',
                width: 130,
              }, {
                title: '管理员',
                dataIndex: 'admin_objs',
                render(text) {
                  const users = _.map(text, item => item.username);
                  return _.join(users, ', ');
                },
              }, {
                title: '普通成员',
                dataIndex: 'member_objs',
                render(text) {
                  const users = _.map(text, item => item.username);
                  return _.join(users, ', ');
                },
              }, {
                title: '操作',
                width: 100,
                render: (text, record) => {
                  return (
                    <span>
                      <a onClick={() => { this.handlePutBtnClick(record); }}>编辑</a>
                      <Divider type="vertical" />
                      <Popconfirm title="确认要删除这个团队吗？" onConfirm={() => { this.handleDelBtnClick(record.id); }}>
                        <a>删除</a>
                      </Popconfirm>
                    </span>
                  );
                },
              },
            ],
          })
        }
      </div>
    );
  }
}
export default CreateIncludeNsTree(UserTeam);

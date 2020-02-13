import React from 'react';
import { Button, Row, Col, message } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import queryString from 'query-string';
import BaseComponent from '@path/BaseComponent';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import CustomForm from './CustomForm';
import { normalizReqData } from './utils';

class Add extends BaseComponent {
  static propTypes = {
  };

  static defaultProps = {
  };

  constructor(props) {
    super(props);
    this.state = {
      nid: undefined,
      initialValues: {},
      submitLoading: false,
    };
  }

  componentDidMount = () => {
    const search = _.get(this.props, 'location.search');
    const query = queryString.parse(search);

    if (query && (query.cur || query.his)) {
      const type = query.cur ? 'cur' : 'his';
      const id = query.cur || query.his;
      this.fetchHistoryData(type, id);
    }
    if (query && query.nid) {
      this.setState({ nid: _.toNumber(query.nid) });
    }
  }

  fetchHistoryData(type, id) {
    this.request({
      url: `${this.api.event}/${type}/${id}`,
    }).then((res) => {
      this.setState({
        initialValues: {
          metric: _.get(res, 'detail[0].metric'),
          endpoints: _.get(res, 'endpoint'),
          tags: res.tags,
        },
      });
    });
  }

  handleSubmit = () => {
    const { history } = this.props;
    this.customForm.validateFields((errors, data) => {
      if (!errors) {
        const reqData = normalizReqData(data);
        reqData.nid = this.state.nid;

        this.setState({ submitLoading: true });
        this.request({
          url: this.api.maskconf,
          type: 'POST',
          data: JSON.stringify(reqData),
        }).then(() => {
          message.success('新增屏蔽成功!');
          history.push({
            pathname: '/monitor/silence',
          });
        }).fail(() => {
          message.error('新增屏蔽失败！');
        }).always(() => {
          this.setState({ submitLoading: false });
        });
      }
    });
  }

  render() {
    const { submitLoading, initialValues } = this.state;
    const now = moment();

    return (
      <div>
        <CustomForm
          ref={(ref) => { this.customForm = ref; }}
          initialValues={{
            btime: now.clone().unix(),
            etime: now.clone().add(1, 'hours').unix(),
            cause: '快速屏蔽',
            ...initialValues,
          }}
        />
        <Row>
          <Col offset={6}>
            <Button onClick={this.handleSubmit} loading={submitLoading} type="primary">保存</Button>
          </Col>
        </Row>
      </div>
    );
  }
}

export default CreateIncludeNsTree(Add);

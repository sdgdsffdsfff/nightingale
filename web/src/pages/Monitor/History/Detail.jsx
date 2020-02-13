import React from 'react';
import { Card, Table, Divider, Popconfirm, message } from 'antd';
import { Link } from 'react-router-dom';
import moment from 'moment';
import _ from 'lodash';
import BaseComponent from '@path/BaseComponent';
import Graph from '@path/components/Graph';
import CreateIncludeNsTree from '@path/Layout/CreateIncludeNsTree';
import { prefixCls, priorityOptions, eventTypeOptions } from '../config';
import './style.less';

const nPrefixCls = `${prefixCls}-history`;
// eslint-disable-next-line react/prefer-stateless-function
class Detail extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      data: undefined,
    };
  }

  componentDidMount() {
    this.fetchData(this.props);
  }

  componentWillReceiveProps = (nextProps) => {
    const historyType = _.get(this.props, 'match.params.historyType');
    const nextHistoryType = _.get(nextProps, 'match.params.historyType');
    const historyId = _.get(this.props, 'match.params.historyId');
    const nextHistoryId = _.get(nextProps, 'match.params.historyId');

    if (historyType !== nextHistoryType || historyId !== nextHistoryId) {
      this.fetchData(nextProps);
    }
  }

  fetchData(props) {
    const historyType = _.get(props, 'match.params.historyType');
    const historyId = _.get(props, 'match.params.historyId');

    if (historyType && historyId) {
      this.setState({ loading: true });
      this.request({
        url: `${this.api.event}/${historyType}/${historyId}`,
      }).then((res) => {
        this.setState({ data: res });
      }).finally(() => {
        this.setState({ loading: false });
      });
    }
  }

  handleClaim = (id) => {
    this.request({
      url: `${this.api.event}/curs/claim`,
      type: 'POST',
      data: JSON.stringify({ id: _.toNumber(id) }),
    }).then(() => {
      message.success('认领报警成功！');
      this.fetchData();
    });
  }

  render() {
    const { data } = this.state;
    const detail = _.get(data, 'detail[0]');

    if (!data || !detail) return null;
    const now = (new Date()).getTime();
    let etime = data.etime * 1000;
    let stime = etime - 7200000;

    if (now - etime > 3600000) {
      stime = etime - 3600000;
      etime += 3600000;
    }

    const xAxisPlotLines = _.map(detail.points, (point) => {
      return {
        value: point.timestamp * 1000,
        color: 'red',
      };
    });

    let selectedTagkv = [{
      tagk: 'endpoint',
      tagv: [data.endpoint],
    }];

    if (data.tags) {
      selectedTagkv = _.concat(selectedTagkv, _.map(detail.tags, (value, key) => {
        return {
          tagk: key,
          tagv: [value],
        };
      }));
    }

    const historyType = _.get(this.props, 'match.params.historyType');
    const historyId = _.get(this.props, 'match.params.historyId');
    const { nid } = data;

    return (
      <div className={nPrefixCls}>
        <div style={{ border: '1px solid #e8e8e8' }}>
          <Graph
            height={250}
            graphConfigInnerVisible={false}
            data={{
              id: (new Date()).getTime(),
              start: stime,
              end: etime,
              xAxis: {
                plotLines: xAxisPlotLines,
              },
              metrics: [{
                selectedNid: data.nid,
                selectedEndpoint: [data.endpoint],
                selectedMetric: detail.metric,
                selectedTagkv,
              }],
            }}
            extraRender={() => {
              return null;
            }}
          />
        </div>
        <div className={`${nPrefixCls}-detail mt10`}>
          <Card
            title="报警事件详情"
            bodyStyle={{
              padding: '10px 16px',
            }}
            extra={
              <span>
                <Link to={{
                  pathname: '/monitor/silence/add',
                  search: `${historyType}=${historyId}&nid=${nid}`,
                }}>
                  屏蔽
                </Link>
                {
                  historyType === 'cur' ?
                    <span>
                      <Divider type="vertical" />
                      <Popconfirm title="确定要认领这条报警吗?" onConfirm={() => this.handleClaim(historyId)}>
                        <a>认领</a>
                      </Popconfirm>
                    </span> : null
                }
              </span>
            }
          >
            <div className={`${nPrefixCls}-detail-list`}>
              <div>
                <span className="label">策略名称：</span>
                <Link target="_blank" to={{ pathname: `/monitor/strategy/${data.sid}` }}>{data.sname}</Link>
              </div>
              <div>
                <span className="label">报警状态：</span>
                {_.get(_.find(priorityOptions, { value: data.priority }), 'label')}
                <span style={{ paddingLeft: 8 }}>{_.get(_.find(eventTypeOptions, { value: data.event_type }), 'label')}</span>
              </div>
              <div>
                <span className="label">通知结果：</span>
                {_.join(data.status, ', ')}
              </div>
              <div>
                <span className="label">发生时间：</span>
                {moment.unix(data.etime).format('YYYY-MM-DD HH:mm:ss')}
              </div>
              <div>
                <span className="label">节点：</span>
                {data.node_path}
              </div>
              <div>
                <span className="label">endpoint：</span>
                {data.endpoint}
              </div>
              <div>
                <span className="label">指标：</span>
                {_.get(data.detail, '[0].metric')}
              </div>
              <div>
                <span className="label">tags：</span>
                {data.tags}
              </div>
              <div>
                <span className="label">表达式：</span>
                {data.info}
              </div>
              <div>
                <span className="label">现场值：</span>
                <Table
                  rowKey="timestamp"
                  size="small"
                  dataSource={_.get(data.detail, '[0].points', [])}
                  columns={[
                    {
                      title: '时间',
                      dataIndex: 'timestamp',
                      render(text) {
                        return <span>{moment.unix(text).format('YYYY-MM-DD HH:mm:ss')}</span>;
                      },
                    }, {
                      title: '数值',
                      dataIndex: 'value',
                    },
                  ]}
                  pagination={false}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }
}

export default CreateIncludeNsTree(Detail);

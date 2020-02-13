import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Input, DatePicker } from 'antd';
import moment from 'moment';
import _ from 'lodash';

const ButtonGroup = Button.Group;
const FormItem = Form.Item;
const { TextArea } = Input;
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 },
};
const timeFormatMap = {
  antd: 'YYYY-MM-DD HH:mm:ss',
  moment: 'YYYY-MM-DD HH:mm:ss',
};
const shortcutBar = [
  { label: '1小时', value: 3600 },
  { label: '2小时', value: 7200 },
  { label: '6小时', value: 21600 },
  { label: '12小时', value: 43200 },
  { label: '1天', value: 86400 },
  { label: '2天', value: 172800 },
  { label: '7天', value: 604800 },
];

class CustomForm extends Component {
  static propTypes = {
    readOnly: PropTypes.bool,
    initialValues: PropTypes.object,
  };

  static defaultProps = {
    readOnly: false,
    initialValues: {},
  };

  constructor(props) {
    super(props);
    this.state = {
    };
  }

  componentDidMount = () => {
  }

  // eslint-disable-next-line class-methods-use-this
  checkTags(rule, value, callback) {
    if (value) {
      const currentTag = _.get(value, '[0]', {});
      if (!currentTag.tkey || _.isEmpty(currentTag.tval)) {
        callback('tag名称和取值不能为空');
      } else {
        callback();
      }
    } else {
      callback();
    }
  }

  updateSilenceTime(val) {
    // eslint-disable-next-line react/prop-types
    const { setFieldsValue } = this.props.form;
    const now = moment();
    const beginTs = now.clone();
    const endTs = now.clone().add(val, 'seconds');

    setFieldsValue({ btime: beginTs });
    setFieldsValue({ etime: endTs });
  }

  renderTimeOptions() {
    const { readOnly } = this.props;
    // eslint-disable-next-line react/prop-types
    const { getFieldValue } = this.props.form;
    const beginTs = getFieldValue('btime');
    const endTs = getFieldValue('etime');
    let timeSpan;

    if (beginTs && endTs) {
      timeSpan = endTs.unix() - beginTs.unix();
    }

    if (readOnly) {
      return null;
    }
    return (
      <ButtonGroup
        size="default"
      >
        {
          _.map(shortcutBar, o => (
            <Button
              onClick={() => { this.updateSilenceTime(o.value); }}
              key={o.value}
              type={o.value === timeSpan ? 'primary' : undefined}
            >
              {o.label}
            </Button>
          ))
        }
      </ButtonGroup>
    );
  }

  render() {
    const { readOnly, initialValues } = this.props;
    // eslint-disable-next-line react/prop-types
    const { getFieldDecorator } = this.props.form;

    return (
      <div className="alarm-shielding-form">
        <Form className={readOnly ? 'readOnly' : ''}>
          <FormItem
            {...formItemLayout}
            label="屏蔽指标"
          >
            {getFieldDecorator('metric', {
              initialValue: initialValues.metric,
              rules: [
                { required: true, message: '不能为空' },
              ],
            })(
              <Input />,
            )}
          </FormItem>
          <FormItem
            {...formItemLayout}
            label="屏蔽 endpoints"
          >
            {getFieldDecorator('endpoints', {
              initialValue: _.isArray(initialValues.endpoints) ? _.join(initialValues.endpoints, '\n') : initialValues.endpoints,
              rules: [
                { required: true, message: '不能为空' },
              ],
            })(
              <TextArea
                autosize={{ minRows: 2, maxRows: 6 }}
                disabled={readOnly}
              />,
            )}
          </FormItem>
          <FormItem
            {...formItemLayout}
            label="屏蔽 tags"
            help="示例：key1=value1,key2=value2"
          >
            {getFieldDecorator('tags', {
              initialValue: initialValues.tags,
              rules: [
                // { required: true, message: '不能为空' },
              ],
            })(
              <TextArea
                autosize={{ minRows: 2, maxRows: 6 }}
                disabled={readOnly}
              />,
            )}
          </FormItem>
          <FormItem
            wrapperCol={{ span: 14, offset: 6 }}
          >
            {this.renderTimeOptions()}
          </FormItem>
          <FormItem
            {...formItemLayout}
            label="开始时间"
          >
            {getFieldDecorator('btime', {
              initialValue: moment.unix(initialValues.btime),
              rules: [
                { required: true, message: '不能为空' },
              ],
            })(
              <DatePicker
                showTime
                format={timeFormatMap.antd}
                disabled={readOnly}
              />,
            )}
          </FormItem>
          <FormItem
            {...formItemLayout}
            label="结束时间"
          >
            {getFieldDecorator('etime', {
              initialValue: moment.unix(initialValues.etime),
              rules: [
                { required: true, message: '不能为空' },
              ],
            })(
              <DatePicker
                showTime
                format={timeFormatMap.antd}
                disabled={readOnly}
              />,
            )}
          </FormItem>
          <FormItem
            {...formItemLayout}
            label="屏蔽原因"
          >
            {getFieldDecorator('cause', {
              initialValue: initialValues.cause,
              rules: [
                { required: true, message: '不能为空' },
              ],
            })(
              <TextArea
                autosize={{ minRows: 2, maxRows: 6 }}
                disabled={readOnly}
              />,
            )}
          </FormItem>
        </Form>
      </div>
    );
  }
}

export default Form.create()(CustomForm);

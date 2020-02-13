import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Modal } from 'antd';
import _ from 'lodash';
import CustomForm from './CustomForm';

class DetailModal extends Component {
  static propTypes = {
    data: PropTypes.object.isRequired,
    title: PropTypes.string,
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    destroy: PropTypes.func,
  };

  static defaultProps = {
    title: '屏蔽详情',
    visible: true,
    onOk: _.noop,
    onCancel: _.noop,
    destroy: _.noop,
  };

  constructor(props) {
    super(props);
    this.state = {
      submitLoading: false,
    };
  }

  handleOk = () => {
    this.props.onOk();
    this.props.destroy();
  }

  handleCancel = () => {
    this.props.onCancel();
    this.props.destroy();
  }

  render() {
    const {
      title, visible, category, data,
    } = this.props;
    const { submitLoading } = this.state;

    return (
      <div>
        <Modal
          width={900}
          title={title}
          visible={visible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          confirmLoading={submitLoading}
        >
          <CustomForm
            ref={(ref) => { this.customForm = ref; }}
            category={category}
            initialValues={data}
            readOnly
          />
        </Modal>
      </div>
    );
  }
}

export default function detailModal(config) {
  const div = document.createElement('div');
  document.body.appendChild(div);

  function destroy() {
    const unmountResult = ReactDOM.unmountComponentAtNode(div);
    if (unmountResult && div.parentNode) {
      div.parentNode.removeChild(div);
    }
  }

  function render(props) {
    ReactDOM.render(<DetailModal {...props} />, div);
  }

  render({ ...config, visible: true, destroy });

  return {
    destroy,
  };
}

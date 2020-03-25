/*
 * HomePage
 */
import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import {bindActionCreators, compose} from 'redux';
import {Header} from '@buffetjs/custom';
import {Wrapper} from './components';
import {ContainerFluid, GlobalContext} from 'strapi-helper-plugin';
import PluginInputFile from '../../components/PluginInputFile';
import getTrad from '../../utils/getTrad';
import {Button} from '@buffetjs/core';
import pluginId from '../../pluginId';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {setLoading, submit, submitSucceeded, unsetLoading} from './actions';
import reducer from './reducer';
import saga from './saga';
import selectHomePage from './selectors';

export class HomePage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {date: new Date(), xmlFile: undefined};
  }

  static contextType = GlobalContext;

  async onDrop(val) {
    await this.setState({xmlFile: val.dataTransfer.files.item(0)});
  }

  async onImportSubmit() {
    const formData = new FormData();
    formData.append('files', this.state.xmlFile);
    return formData;
  }

  render() {
    const {formatMessage} = this.context;
    return (
      <ContainerFluid className="container-fluid">
        <Wrapper>
          <Header
            title={{label: formatMessage({id: getTrad('HomePage.title')})}}
            content={formatMessage({id: getTrad('HomePage.description')})}
          />
        </Wrapper>
        <PluginInputFile
          name="files"
          onDrop={this.onDrop.bind(this)}
          showLoader={this.props.uploadFilesLoading}
        />
        <div className="col-md-12">
          <Button onClick={() => this.props.submit(this.onImportSubmit())} disabled={this.props.uploadFilesLoading}>
            <FontAwesomeIcon icon="file-import"/>
            Import
          </Button>
        </div>
      </ContainerFluid>
    );
  }
}

HomePage.defaultProps = {
  appEnvironments: [],
  formErrors: [],
  settings: {
    providers: [],
  },
};

HomePage.propTypes = {
  appEnvironments: PropTypes.array,
  // didCheckErrors: PropTypes.bool.isRequired,
  formErrors: PropTypes.array,
  // getSettings: PropTypes.func.isRequired,
  // history: PropTypes.object.isRequired,
  // match: PropTypes.object.isRequired,
  // modifiedData: PropTypes.object.isRequired,
  // onCancel: PropTypes.func.isRequired,
  // onChange: PropTypes.func.isRequired,
  // setErrors: PropTypes.func.isRequired,
  settings: PropTypes.object,
  submit: PropTypes.func.isRequired,
  submitSucceeded: PropTypes.bool.isRequired,
  uploadFilesLoading: PropTypes.bool.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      // getSettings,
      // onCancel,
      // onChange,
      // setErrors,
      setLoading,
      unsetLoading,
      submitSucceeded,
      submit,
    },
    dispatch
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);

const withReducer = strapi.injectReducer({
  key: 'homePage',
  reducer,
  pluginId,
});
const withSaga = strapi.injectSaga({key: 'homePage', saga, pluginId});

export default compose(
  withReducer,
  withSaga,
  withConnect
)(injectIntl(HomePage));
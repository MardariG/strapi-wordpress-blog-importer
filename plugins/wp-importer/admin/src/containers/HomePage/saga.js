// import { LOCATION_CHANGE } from 'react-router-redux';
import {call, fork, put, takeLatest} from 'redux-saga/effects';
import {request} from 'strapi-helper-plugin';
import {SUBMIT} from './constants';
import {setLoading, unsetLoading} from './actions';
import {get, isObject} from 'lodash';


export function* submit(action) {
  try {
    yield put(setLoading());
    const headers = {};
    const response = yield call(
      request,
      '/wp-importer/import',
      {method: 'POST', headers, body: yield action.formData},
      false,
      false
    );
    if (response.length > 1) {
      strapi.notification.success({
        id: 'upload.notification.dropFiles.success', // TODO translate
        values: {number: response.length},
      });
    } else {
      strapi.notification.success({
        id: 'upload.notification.dropFile.success', // TODO translate
      });
    }
  } catch (error) {
    let message = get(error, [
      'response',
      'payload',
      'message',
      '0',
      'messages',
      '0',
    ]);
    if (isObject(message))
      message = {...message, id: `${pluginId}.${message.id}`};

    strapi.notification.error(message || 'notification.error');
  } finally {
    yield put(unsetLoading());
  }
}

function* defaultSaga() {
  yield fork(takeLatest, SUBMIT, submit);
}

export default defaultSaga;

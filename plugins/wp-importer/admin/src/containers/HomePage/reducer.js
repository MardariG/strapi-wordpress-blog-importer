/**
 *
 * ConfigPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';

import {
  ON_CANCEL,
  ON_CHANGE,
  SET_ERRORS, SET_LOADING,
  SUBMIT_ERROR,
  SUBMIT_SUCCEEDED, UNSET_LOADING,
} from './constants';

const initialState = fromJS({
  appEnvironments: List([]),
  didCheckErrors: false,
  env: '',
  formErrors: List([]),
  initialData: Map({}),
  modifiedData: Map({}),
  settings: {},
  submitSuccess: false,
});

function configPageReducer(state = initialState, action) {
  switch (action.type) {
    case ON_CANCEL:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List([]))
        .update('modifiedData', () => state.get('initialData'));
    case ON_CHANGE:
      return state
        .updateIn(action.keys, () => action.value);
    case SET_ERRORS:
    case SUBMIT_ERROR:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List(action.errors));
    case SUBMIT_SUCCEEDED:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List([]))
        .update('initialData', () => Map(action.data))
        .update('modifiedData', () => Map(action.data))
        .update('submitSuccess', (v) => v = !v)
        .update('isLoading', (v) => v = !v);
    case SET_LOADING:
      return state.update('uploadFilesLoading', () => true);
    case UNSET_LOADING:
      return state.update('uploadFilesLoading', () => false);
    default:
      return state;
  }
}

export default configPageReducer;

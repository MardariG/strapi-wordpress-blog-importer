/**
 *
 *
 * ConfigPage actions
 *
 */

import {
  ON_CANCEL,
  ON_CHANGE,
  SET_ERRORS,
  SET_LOADING,
  SUBMIT,
  SUBMIT_ERROR,
  SUBMIT_SUCCEEDED,
  UNSET_LOADING,
} from './constants';

export function setLoading() {
  return {
    type: SET_LOADING,
  };
}

export function unsetLoading() {
  return {
    type: UNSET_LOADING,
  };
}


export function onCancel() {
  return {
    type: ON_CANCEL,
  };
}

export function onChange({target}) {
  const keys = ['modifiedData'].concat(target.name.split('.'));
  const value = target.value;

  return {
    type: ON_CHANGE,
    keys,
    value,
  };
}

export function setErrors(errors) {
  return {
    type: SET_ERRORS,
    errors,
  };
}

export function submit(formData) {
  return {
    type: SUBMIT,
    formData,
  };
}

export function submitError(errors) {
  return {
    type: SUBMIT_ERROR,
    errors,
  };
}

export function submitSucceeded(data) {
  return {
    type: SUBMIT_SUCCEEDED,
    data,
  };
}

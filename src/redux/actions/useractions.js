// src/redux/actions/userActions.js

export const setUserData = (userData) => {
    return {
      type: 'SET_USER_DATA',
      payload: userData,
    };
  };
  
  export const updateUserData = (updatedFields) => {
    return {
      type: 'UPDATE_USER_DATA',
      payload: updatedFields,
    };
  };
  
  export const resetUserData = () => {
    return {
      type: 'RESET_USER_DATA',
    };
  };
  
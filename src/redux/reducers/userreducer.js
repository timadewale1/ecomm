// src/redux/reducers/userReducer.js

const initialState = {
    userData: null,
  };
  
  const userReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'SET_USER_DATA':
        return {
          ...state,
          userData: action.payload,
        };
      case 'UPDATE_USER_DATA':
        return {
          ...state,
          userData: {
            ...state.userData,
            ...action.payload,
          },
        };
      case 'RESET_USER_DATA':
        return initialState;
      default:
        return state;
    }
  };
  
  export default userReducer;
  
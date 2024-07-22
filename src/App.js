import React from 'react';
import useAuth from './custom-hooks/useAuth';
import Layout from './components/layout/Layout';
import "./App.css";

function App() {
  useAuth(); // Initialize the auth state

  return <Layout />;
}

export default App;

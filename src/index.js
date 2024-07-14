import React from "react";
import ReactDOM from "react-dom/client";
import "remixicon/fonts/remixicon.css";
import "bootstrap/dist/css/bootstrap.css";

import App from "./App";
import { BrowserRouter } from "react-router-dom";
import store from "./redux/store";
import { Provider } from "react-redux";
import { Slide, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FavoritesProvider } from "./components/Context/FavoritesContext";
import { NavigationProvider } from "./components/Context/Bottombarcontext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <NavigationProvider>
          <FavoritesProvider>
          <ToastContainer
            theme="light"
            position="top-right"
            autoClose={2000}
            limit={4}
            transition={Slide}
            draggable={true}
            pauseOnHover={false}
          />
          <App />
          </FavoritesProvider>
        </NavigationProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);

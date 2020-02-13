import React from 'react';
import PropTypes from 'prop-types';
import { Route, Redirect } from 'react-router-dom';
import auth from './auth';

export default function PrivateRoute({ component: Component, rootVisible, ...rest }) {
  const { isroot } = auth.getSelftProfile();
  const isAuthenticated = auth.getIsAuthenticated();
  return (
    <Route
      {...rest}
      render={(props) => {
        if (isAuthenticated) {
          if (rootVisible && !isroot) {
            return (
              <Redirect
                to={{
                  pathname: '/403',
                }}
              />
            );
          }
          return <Component {...props} />;
        }
        return (
          <Redirect
            to={{
              pathname: '/login',
              state: { from: props.location }, // eslint-disable-line react/prop-types
            }}
          />
        );
      }}
    />
  );
}

PrivateRoute.propTypes = {
  rootVisible: PropTypes.bool,
  component: PropTypes.func.isRequired,
};

PrivateRoute.defaultProps = {
  rootVisible: false,
};

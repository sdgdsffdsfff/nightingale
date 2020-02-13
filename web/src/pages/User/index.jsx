import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import BaseComponent from '@path/BaseComponent';
import PrivateRoute from '@path/Auth/PrivateRoute';
import List from './List';
import Team from './Team';

export default class Routes extends BaseComponent {
  render() {
    const prePath = '/user';
    return (
      <Switch>
        <Route exact path={prePath} render={() => <Redirect to={`${prePath}/list`} />} />
        <PrivateRoute path={`${prePath}/list`} component={List} />
        <PrivateRoute path={`${prePath}/team`} component={Team} />
        <Route render={() => <Redirect to="/404" />} />
      </Switch>
    );
  }
}

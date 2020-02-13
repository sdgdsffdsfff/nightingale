import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import BaseComponent from '@path/BaseComponent';
import PrivateRoute from '@path/Auth/PrivateRoute';
import Endpoints from './Endpoints';
import EndpointMgmt from './EndpointMgmt';
import Node from './Node';

export default class Routes extends BaseComponent {
  render() {
    const prePath = '/sTree';
    return (
      <Switch>
        <Route exact path={prePath} render={() => <Redirect to={`${prePath}/node`} />} />
        <PrivateRoute path={`${prePath}/endpoints`} component={Endpoints} />
        <PrivateRoute path={`${prePath}/endpointMgmt`} component={EndpointMgmt} />
        <PrivateRoute path={`${prePath}/node`} component={Node} />
        <Route render={() => <Redirect to="/404" />} />
      </Switch>
    );
  }
}

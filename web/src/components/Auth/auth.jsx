import _ from 'lodash';
import api from '@path/common/api';
import request from '@path/common/request';

export default (function auth() {
  let isAuthenticated = false;
  let selftProfile = {};
  return {
    getIsAuthenticated() {
      return isAuthenticated;
    },
    getSelftProfile() {
      return selftProfile;
    },
    checkAuthenticate() {
      return request({
        url: api.selftProfile,
      }).then((res) => {
        isAuthenticated = true;
        selftProfile = {
          ...res,
          isroot: res.is_root === 1,
        };
      });
    },
    authenticate: async (reqBody, cbk) => {
      try {
        await request({
          url: api.login,
          type: 'POST',
          data: JSON.stringify(reqBody),
        });
        isAuthenticated = true;
        selftProfile = await request({
          url: api.selftProfile,
        });
        if (_.isFunction(cbk)) cbk(selftProfile);
      } catch (e) {
        console.log(e);
      }
    },
    signout(cbk) {
      request({
        url: api.logout,
      }).then((res) => {
        isAuthenticated = false;
        if (_.isFunction(cbk)) cbk(res);
      });
    },
  };
}());

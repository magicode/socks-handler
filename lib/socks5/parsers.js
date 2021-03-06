var ADDRTYPE, AUTH_METHOD, AUTH_STATUS, COMMAND, REQUEST_STATUS, RSV, VERSION, ip, _ref;

ip = require('ip');

_ref = require('./const'), VERSION = _ref.VERSION, AUTH_METHOD = _ref.AUTH_METHOD, COMMAND = _ref.COMMAND, AUTH_STATUS = _ref.AUTH_STATUS, ADDRTYPE = _ref.ADDRTYPE, REQUEST_STATUS = _ref.REQUEST_STATUS, RSV = _ref.RSV;

exports.handshake = function(data) {
  var method, methods, nmethods, version, _i, _len;
  if (data.length < 3) {
    throw new Error('Invalid handshake data');
  }
  version = data[0];
  if (version !== VERSION) {
    throw new Error("Wrong SOCKS version: " + version + ", expected " + VERSION);
  }
  nmethods = data[1];
  if (data.length !== (2 + nmethods) || nmethods === 0) {
    throw new Error('Invalid handshake data');
  }
  methods = Array.prototype.slice.call(data.slice(2, 2 + nmethods));
  for (_i = 0, _len = methods.length; _i < _len; _i++) {
    method = methods[_i];
    if (method !== AUTH_METHOD.NOAUTH && method !== AUTH_METHOD.USERNAME_PASSWORD) {
      throw new Error("Unsupported authentication method: " + method);
    }
  }
  return {
    version: version,
    methods: methods
  };
};

exports.auth = function(data, method) {
  var password, plength, ulength, username, version;
  switch (method) {
    case AUTH_METHOD.USERNAME_PASSWORD:
      if (data.length < 5) {
        throw new Error('Invalid auth data');
      }
      version = data[0];
      if (version !== VERSION) {
        throw new Error("Wrong SOCKS version: " + version + ", expected " + VERSION);
      }
      ulength = data[1];
      if (data.length < 4 + ulength || ulength === 0) {
        throw new Error('Invalid auth data');
      }
      username = data.slice(2, 2 + ulength).toString();
      plength = data[2 + ulength];
      if (data.length < 3 + ulength + plength || plength === 0) {
        throw new Error('Invalid auth data');
      }
      password = data.slice(3 + ulength, 3 + ulength + plength).toString();
      return {
        username: username,
        password: password
      };
    default:
      throw new Error("Unsupported authentication method: " + method);
  }
};

exports.request = function(data) {
  var addrType, command, host, hostBuffer, length, port, portBuffer, rsv, version;
  if (data.length < 10) {
    throw new Error('Invalid request data');
  }
  version = data[0];
  if (version !== VERSION) {
    throw new Error("Wrong SOCKS version: " + version + ", expected " + VERSION);
  }
  command = data[1];
  rsv = data[2];
  addrType = data[3];
  if (addrType !== ADDRTYPE.IPV4 && addrType !== ADDRTYPE.IPV6 && addrType !== ADDRTYPE.DOMAIN) {
    throw new Error("Invalid address type: " + addrType);
  }
  switch (addrType) {
    case ADDRTYPE.IPV4:
      if (data.length !== 10) {
        throw new Error('Invalid request data');
      }
      hostBuffer = data.slice(4, 8);
      host = ip.toString(hostBuffer);
      portBuffer = data.slice(8, 10);
      port = portBuffer.readUInt16BE(0);
      break;
    case ADDRTYPE.IPV6:
      if (data.length !== 22) {
        throw new Error('Invalid request data');
      }
      hostBuffer = data.slice(4, 20);
      host = ip.toString(hostBuffer);
      portBuffer = data.slice(20, 22);
      port = portBuffer.readUInt16BE(0);
      break;
    case ADDRTYPE.DOMAIN:
      length = data[4];
      if (data.length !== 7 + length) {
        throw new Error('Invalid request data');
      }
      hostBuffer = data.slice(5, 5 + length);
      host = hostBuffer.toString('ascii');
      portBuffer = data.slice(5 + length, 7 + length);
      port = portBuffer.readUInt16BE(0);
  }
  return {
    version: version,
    command: command,
    addrType: addrType,
    hostBuffer: hostBuffer,
    portBuffer: portBuffer,
    host: host,
    port: port
  };
};

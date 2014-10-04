var ADDRTYPE, AUTH_METHOD, AUTH_STATUS, COMMAND, REQUEST_STATUS, RSV, VERSION, events, ip, name, net, parsers, through, value, _ref, _ref1,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __slice = [].slice;

net = require('net');

ip = require('ip');

parsers = require('./parsers');



_ref = require('./const'), VERSION = _ref.VERSION, AUTH_METHOD = _ref.AUTH_METHOD, COMMAND = _ref.COMMAND, AUTH_STATUS = _ref.AUTH_STATUS, ADDRTYPE = _ref.ADDRTYPE, REQUEST_STATUS = _ref.REQUEST_STATUS, RSV = _ref.RSV;

var util = require("util");

events = {
	handshake: function(_arg, callback) {
		var methods, _ref1;
		methods = _arg.methods;
		if (_ref1 = AUTH_METHOD.NOAUTH, __indexOf.call(methods, _ref1) >= 0) {
			return callback(AUTH_METHOD.NOAUTH);
		} else {
			return callback(AUTH_METHOD.NO_ACCEPTABLE_METHOD);
		}
	},
	auth: function(infos, callback) {
		return callback(AUTH_STATUS.FAILURE);
	},
	request: function(infos, callback) {
		return callback(REQUEST_STATUS.SERVER_FAILURE);
	}
};


function Handler(stream , chunk){
	this.stream = stream;
	this.step = 'handshake';
	this.authMethod = -1;
	this.version = VERSION;
	
	var _this =  this;
	
	stream.on('readable',function  onReadable(chunk){
		var chunk = stream.read();
		
		if(chunk == null){
			return ;
		}
		switch (_this.step) {
			case 'handshake':
				return _this.handshake(chunk);
			case 'authentication':
				return _this.authentication(chunk);
			case 'request':
				stream.removeListener('readable',onReadable);
				return _this.request(chunk);
		}
	});
}

util.inherits(Handler, require("events").EventEmitter);

Handler.prototype.runOrEmit = function(func ,name) {
	var args = Array.prototype.slice.call(arguments);
	args.shift();
	if(this.listeners(name).length){
		this.emit.apply(this,args);
	}else{
		args.shift();
		func.apply(this,args);
	}
	return this;
};

Handler.prototype.handshake = function(data) {
	var e, _this = this;
	try {
		handshake = parsers.handshake(data);
	} catch (_error) {
		e = _error;
		this.emit('error', e);
		return;
	}
	
	return this.runOrEmit(events.handshake,'handshake', handshake, function(method) {
	_this.stream.write(new Buffer([VERSION, method]));
		if (method === AUTH_METHOD.NO_ACCEPTABLE_METHOD) {
			return _this.stream.end();
		} else if (method === AUTH_METHOD.NOAUTH) {
			return _this.step = 'request';
		} else {
			_this.authMethod = method;
			return _this.step = 'authentication';
		}
	});
};


Handler.prototype.authentication = function(data) {
	var auth, e, _this = this;
	try {
		auth = parsers.auth(data, _this.authMethod);
	} catch (_error) {
		e = _error;
		this.emit('error', e);
		return;
	}
	return this.runOrEmit(events.auth,'auth', auth, function(status) {
		_this.stream.write(new Buffer([VERSION, status]));
		if (status !== AUTH_STATUS.SUCCESS) {
			return _this.stream.end();
		} else {
			return _this.step = 'request';
		}
	});
};

Handler.prototype.request = function(data) {
	var e, _this = this;
    try {
      request = parsers.request(data);
    } catch (_error) {
      e = _error;
      this.emit('error', e);
      return;
    }
    return this.runOrEmit(events.request,'request', request, function(status, localPort, localAddress) {
      var addrType, hostBuffer, portBuffer;
      if (localPort) {
        portBuffer = new Buffer(2);
        portBuffer.writeUInt16BE(localPort, 0);
      } else {
        portBuffer = new Buffer([0, 0]);
      }
      if (localAddress) {
        if (net.isIPv4(localAddress)) {
          addrType = ADDRTYPE.IPV4;
          hostBuffer = ip.toBuffer(localAddress);
        } else if (net.isIPv6(localAddress)) {
          addrType = ADDRTYPE.IPV6;
          hostBuffer = ip.toBuffer(localAddress);
        }
      } else {
        addrType = ADDRTYPE.IPV4;
        hostBuffer = new Buffer([0, 0, 0, 0]);
      }
      _this.stream.write(new Buffer([VERSION, status, RSV, addrType].concat(__slice.call(hostBuffer), __slice.call(portBuffer))));
      if (status !== REQUEST_STATUS.SUCCESS) {
        return _this.stream.end();
      } else {
        step = 'ignore';
        return _this.emit('success');
      }
    });
};


exports.createHandler = function(stream) {
	return new Handler(stream);
};

_ref1 = require('./const');
for (name in _ref1) {
  value = _ref1[name];
  exports[name] = value;
}

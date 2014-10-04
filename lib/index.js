var socks4, socks5;

socks4 = require('./socks4');

socks5 = require('./socks5');

exports.handle = function(stream, callback) {
	stream.once('readable',function onReadable(){
		var chunk = stream.read();
		
		if(chunk == null) return;
		
		var handler, version;
		switch (version = chunk[0]) {
			// case socks4.VERSION:
			//   handler = socks4.createHandler();
			//   break;
			case socks5.VERSION:
				handler = socks5.createHandler(stream);
					break;
			default:
				if (typeof callback === "function") {
					callback(new Error("Unsupported SOCKS version: " + version));
				}
			return;
		}
		
		callback(null, handler);
		stream.unshift(chunk);
	});
};

exports[4] = socks4;

exports[5] = socks5;

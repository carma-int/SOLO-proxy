#!/usr/bin/env node

process.title = 'proxy';

// Module dependencies.
const args = require('args');
const pkg = require('../package');
const http = require('http');
const setup = require('../');
const debug = require('debug')('proxy');
const spawn = require('child_process').spawn;
const basicAuthParser = require('basic-auth-parser');

// Argument parsing.
args
  .option('port', 'Port number to the proxy server should bind to', 3128, parseInt)
  .option('authenticate', '"authenticate" command to run when the "Proxy-Authorization" header is sent', '', String)
  .option('local-address', 'IP address of the network interface to send the outgoing requests through', '', String);

const flags = args.parse(process.argv, { name: pkg.name });
const { port, authenticate } = flags;

debug('Starting proxy server...');

// Setup the HTTP "proxy server" instance.
const proxy = http.createServer();
setup(proxy);

// Outbound proxy requests will use `agent: false`.
debug("Setting outbound proxy request's `agent` to `false`");
proxy.agent = false;

// Proxy outgoing request localAddress parameter.
if (flags.localAddress) {
  debug('Using local address: %s', flags.localAddress);
  proxy.localAddress = flags.localAddress;
}

// Proxy authenticate function.
if (authenticate) {
  debug('Setting `authenticate()` function for: "%s"', authenticate);
  proxy.authenticate = function (req, fn) {
    debug('Authenticating: "%s"', authenticate);

    // Parse the "Proxy-Authorization" header.
    const auth = req.headers['proxy-authorization'];
    if (!auth) {
      debug('No "Proxy-Authorization" header provided');
      return fn(null, false);
    }
    const parsed = basicAuthParser(auth);
    debug('Parsed "Proxy-Authorization": %j', parsed);

    // Spawn a child process with the user-specified "authenticate" command.
    const env = { ...process.env };
    for (const key in parsed) {
      env['PROXY_AUTH_' + key.toUpperCase()] = parsed[key];
    }

    const opts = { stdio: ['ignore', 1, 2], env };
    const args = ['-c', authenticate];
    const child = spawn('/bin/sh', args, opts);

    child.once('error', (err) => {
      debug('Authentication child process encountered an error: %s', err.message);
      child.removeListener('exit', onexit);
      fn(err);
    });
    child.once('exit', (code, signal) => {
      debug('Authentication child process "exit" event: code=%s, signal=%s', code, signal);
      child.removeListener('error', onerror);
      fn(null, 0 === code);
    });
  };
}

// Log incoming connections and their end.
proxy.on('connection', (socket) => {
  const clientIP = socket.remoteAddress;
  const clientPort = socket.remotePort;
  debug('New connection from %s:%s', clientIP, clientPort);

  socket.on('close', () => {
    debug('Connection closed from %s:%s', clientIP, clientPort);
  });
});

// Bind to port.
proxy.listen(port, function () {
  debug('Proxy server is listening on port %d', this.address().port);
  console.log('HTTP(s) proxy server listening on port %d', this.address().port);
});

import http from 'node:http';
const port = Number(process.env.CARE_STAFF_PORT || 3002);
const target = Number(process.env.CARE_DONOR_PORT || 3001);
if (!Number.isInteger(port) || !Number.isInteger(target) || port === target)
  throw new Error('Choose distinct donor and staff ports.');
// Both local origins use one Worker and therefore the same D1 ledger and R2 files.
const proxy = http.createServer((req, res) => {
  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: target,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${port}` },
    },
    (r) => {
      res.writeHead(r.statusCode || 502, r.headers);
      r.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Start the donor development server first.');
  });
  req.pipe(upstream);
});
proxy.on('upgrade', (req, socket, head) => {
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: target,
    path: req.url,
    headers: { ...req.headers, host: `127.0.0.1:${port}` },
  });
  upstream.on('upgrade', (res, peer, buffer) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        Object.entries(res.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n',
    );
    if (buffer.length) socket.write(buffer);
    if (head.length) peer.write(head);
    peer.pipe(socket);
    socket.pipe(peer);
  });
  upstream.on('error', () => socket.destroy());
  upstream.end();
});
proxy.listen(port, '127.0.0.1', () =>
  console.log(`Staff portal: http://127.0.0.1:${port}/`),
);

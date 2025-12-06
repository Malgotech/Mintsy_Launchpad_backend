import http from 'http';
import { initSocket } from './utils/socket';
import app from './index';

let server: http.Server;

beforeAll((done) => {
  server = http.createServer(app);
  initSocket(server);
  server.listen(done);
});

afterAll((done) => {
  server.close(done);
});

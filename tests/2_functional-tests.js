const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

const board = 'fcc-test-board';
let threadId;  // thread used for most tests
let threadId2; // thread deleted with the correct password
let replyId;

suite('Functional Tests', function () {

  test('Creating a new thread: POST request to /api/threads/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/' + board)
      .send({ text: 'Test thread', delete_password: 'pass' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.text, 'Test thread');
        assert.property(res.body, '_id');
        assert.property(res.body, 'created_on');
        assert.equal(res.body.created_on, res.body.bumped_on);
        assert.isArray(res.body.replies);
        threadId = res.body._id;

        // a second thread to delete later
        chai.request(server)
          .post('/api/threads/' + board)
          .send({ text: 'Thread to delete', delete_password: 'pass' })
          .end(function (err2, res2) {
            threadId2 = res2.body._id;
            done();
          });
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
    chai.request(server)
      .get('/api/threads/' + board)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        res.body.forEach(thread => {
          assert.property(thread, '_id');
          assert.property(thread, 'text');
          assert.property(thread, 'created_on');
          assert.property(thread, 'bumped_on');
          assert.isArray(thread.replies);
          assert.isAtMost(thread.replies.length, 3);
          assert.notProperty(thread, 'reported');
          assert.notProperty(thread, 'delete_password');
        });
        done();
      });
  });

  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function (done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({ thread_id: threadId2, delete_password: 'wrong' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function (done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({ thread_id: threadId2, delete_password: 'pass' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
    chai.request(server)
      .put('/api/threads/' + board)
      .send({ thread_id: threadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Creating a new reply: POST request to /api/replies/{board}', function (done) {
    chai.request(server)
      .post('/api/replies/' + board)
      .send({ thread_id: threadId, text: 'Test reply', delete_password: 'pass' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        const reply = res.body.replies[res.body.replies.length - 1];
        assert.equal(reply.text, 'Test reply');
        assert.equal(res.body.bumped_on, reply.created_on);
        replyId = reply._id;
        done();
      });
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
    chai.request(server)
      .get('/api/replies/' + board)
      .query({ thread_id: threadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body._id, threadId);
        assert.isArray(res.body.replies);
        assert.notProperty(res.body, 'reported');
        assert.notProperty(res.body, 'delete_password');
        res.body.replies.forEach(reply => {
          assert.notProperty(reply, 'reported');
          assert.notProperty(reply, 'delete_password');
        });
        done();
      });
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function (done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'wrong' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function (done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'pass' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
    chai.request(server)
      .put('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

});

'use strict';

const crypto = require('crypto');

// in-memory storage: { boardName: [thread, ...] }
const boards = {};

const getBoard = (name) => {
  if (!boards[name]) boards[name] = [];
  return boards[name];
};
const newId = () => crypto.randomBytes(12).toString('hex');

// remove private fields before sending a reply to the client
const publicReply = (r) => ({ _id: r._id, text: r.text, created_on: r.created_on });

const publicThread = (t, replyLimit) => {
  const replies = replyLimit ? t.replies.slice(-replyLimit) : t.replies; // most recent N
  return {
    _id: t._id,
    text: t.text,
    created_on: t.created_on,
    bumped_on: t.bumped_on,
    replies: replies.map(publicReply),
    replycount: t.replies.length
  };
};

module.exports = function (app) {

  app.route('/api/threads/:board')

    // create a thread
    .post(function (req, res) {
      const { text, delete_password } = req.body;
      if (!text || !delete_password) return res.send('text and delete_password are required');

      const now = new Date();
      const thread = {
        _id: newId(),
        text,
        created_on: now,
        bumped_on: now,
        reported: false,
        delete_password,
        replies: []
      };
      getBoard(req.params.board).push(thread);
      res.json(thread);
    })

    // 10 most recently bumped threads, each with its 3 most recent replies
    .get(function (req, res) {
      const threads = getBoard(req.params.board)
        .slice()
        .sort((a, b) => b.bumped_on - a.bumped_on)
        .slice(0, 10)
        .map(t => publicThread(t, 3));
      res.json(threads);
    })

    // delete a thread (needs the right password)
    .delete(function (req, res) {
      const { thread_id, delete_password } = req.body;
      const board = getBoard(req.params.board);
      const index = board.findIndex(t => t._id === thread_id);
      if (index === -1) return res.send('thread not found');
      if (board[index].delete_password !== delete_password) return res.send('incorrect password');
      board.splice(index, 1);
      res.send('success');
    })

    // report a thread
    .put(function (req, res) {
      const thread_id = req.body.thread_id || req.body.report_id;
      const thread = getBoard(req.params.board).find(t => t._id === thread_id);
      if (!thread) return res.send('thread not found');
      thread.reported = true;
      res.send('reported');
    });

  app.route('/api/replies/:board')

    // add a reply to a thread (bumps the thread)
    .post(function (req, res) {
      const { text, delete_password, thread_id } = req.body;
      const thread = getBoard(req.params.board).find(t => t._id === thread_id);
      if (!thread) return res.send('thread not found');
      if (!text || !delete_password) return res.send('text and delete_password are required');

      const now = new Date();
      const reply = { _id: newId(), text, created_on: now, delete_password, reported: false };
      thread.replies.push(reply);
      thread.bumped_on = now;
      res.json(thread);
    })

    // a single thread with all of its replies
    .get(function (req, res) {
      const thread = getBoard(req.params.board).find(t => t._id === req.query.thread_id);
      if (!thread) return res.send('thread not found');
      res.json(publicThread(thread));
    })

    // "delete" a reply: its text becomes [deleted]
    .delete(function (req, res) {
      const { thread_id, reply_id, delete_password } = req.body;
      const thread = getBoard(req.params.board).find(t => t._id === thread_id);
      if (!thread) return res.send('thread not found');
      const reply = thread.replies.find(r => r._id === reply_id);
      if (!reply) return res.send('reply not found');
      if (reply.delete_password !== delete_password) return res.send('incorrect password');
      reply.text = '[deleted]';
      res.send('success');
    })

    // report a reply
    .put(function (req, res) {
      const { thread_id, reply_id } = req.body;
      const thread = getBoard(req.params.board).find(t => t._id === thread_id);
      if (!thread) return res.send('thread not found');
      const reply = thread.replies.find(r => r._id === reply_id);
      if (!reply) return res.send('reply not found');
      reply.reported = true;
      res.send('reported');
    });

};

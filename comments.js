// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { randomBytes } = require('crypto');

// Create web server
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments
const commentsByPostId = {};

// Get comments
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
    const commentId = randomBytes(4).toString('hex');
    const { content } = req.body;

    // Get comments
    const comments = commentsByPostId[req.params.id] || [];

    // Push comment
    comments.push({ id: commentId, content, status: 'pending' });

    // Update comments
    commentsByPostId[req.params.id] = comments;

    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: 'pending',
        },
    });

    // Send response
    res.status(201).send(comments);
});

// Receive events
app.post('/events', async (req, res) => {
    console.log('Event Received:', req.body.type);

    const { type, data } = req.body;

    // Comment moderation
    if (type === 'CommentModerated') {
        const { id, postId, status, content } = data;

        // Get comments
        const comments = commentsByPostId[postId];

        // Find comment
        const comment = comments.find((comment) => {
            return comment.id === id;
        });

        // Update comment
        comment.status = status;

        // Send event to event bus
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status,
                content,
            },
        });
    }

    // Send response
    res.send({});
});

// Listen
app.listen(4001, () => {
    console.log('Listening on 4001');
});

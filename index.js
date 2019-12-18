const core = require('@actions/core');
const fetch = require('node-fetch');

const {
  env: {
    GITHUB_ACTOR,
    GITHUB_REF,
    GITHUB_REPOSITORY,
    GITHUB_SHA,
    SLACK_BOT_TOKEN,
    SLACK_CHANNEL,
  },
} = process;

// Pluck branch name from push git ref
const BRANCH_NAME = GITHUB_REF.replace(/refs\/heads\//, '');

let status = core.getInput('status').trim();
const ts = core.getInput('ts');

console.log('input ts: ', ts);

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

let color;
switch (status) {
  case 'success':
    color = '#32CD32'; // limegreen
  case 'failure':
    color = '#DC143C'; // crimson
  case 'cancelled':
    color = '#DDDDDD'; // default Slack attachment grey color
  default:
    color = '#FFD700'; // gold
    status += '...';
}

// Create Slack message object
const body = {
  channel: SLACK_CHANNEL,
  attachments: [
    {
      color,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${GITHUB_ACTOR} pushed to ${GITHUB_REPOSITORY}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Status: ${capitalize(status)}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Workflow' },
              url: `https://github.com/${GITHUB_REPOSITORY}/commit/${GITHUB_SHA}/checks`,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Repo' },
              url: `https://github.com/${GITHUB_REPOSITORY}`,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Branch' },
              url: `https://github.com/${GITHUB_REPOSITORY}/tree/${BRANCH_NAME}`,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Commit' },
              url: `https://github.com/${GITHUB_REPOSITORY}/commit/${GITHUB_SHA}`,
            },
          ],
        },
      ],
    },
  ],
};

// If message has already been posted to Slack, update existing message
if (ts) body.ts = ts;

// Send Slack message
(async () => {
  console.log('Sending message');
  try {
    const url = `https://slack.com/api/chat.${ts ? 'update' : 'postMessage'}`;
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const { ts: timestamp } = await res.json();
    console.log('response ts: ', timestamp);
    core.setOutput('ts', timestamp);
    console.log('Message sent');
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    console.error(err.response.data);
    process.exit(1);
  }
})();

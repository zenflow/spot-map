module.exports = {
    port: 3000,
    imap: {
        host: "imap.gmail.com",
        port: 993,
        user: "omnipresent.robot@gmail.com",
        pass: "what am i stupid?",
        box: "INBOX"
    },
    criteria: [
        ["SUBJECT", "message from SPOT"],
        ["ALL"]
    ],
    interval: 30
};
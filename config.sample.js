module.exports = {
    port: 3000,
    imap: {
        host: "imap.gmail.com",
        port: 993,
        box: "INBOX",
        user: "your.email@gmail.com",
        password: "your password"
    },
    criteria: [
        ["SUBJECT", "message from SPOT"],
        ["ALL"]
    ],
    interval: 30
};
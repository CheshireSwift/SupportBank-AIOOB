class Account {
    constructor(name) {
        this.name = name;
        this.balance = 0;
        this.transactions = [];
    }
}

class Transaction {
    constructor(srcAccount, dstAccount, date, reason, amount) {
        this.srcAccount = srcAccount;
        this.dstAccount = dstAccount;
        this.date = date;
        this.reason = reason;
        this.amount = amount;

        srcAccount.transactions.push(this);
        dstAccount.transactions.push(this);
        srcAccount.balance -= amount;
        dstAccount.balance += amount;
    }
}

module.exports = {
    Account,
    Transaction,
}
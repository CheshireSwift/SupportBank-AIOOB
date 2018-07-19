class Account {
    constructor(name) {
        this.name = name;
        this.balance = 0;
        this.transactions = [];
    }

    pay(account, date, reason, amount) {
        const transaction = new Transaction(this, account, date, reason, amount);
        this.transactions.push(transaction);
        account.transactions.push(transaction);

        this.balance -= amount;
        account.balance += amount;
    }

    prettyPrint() {
        return `
Account: ${this.name}
Balance: ${(this.balance / 100).toFixed(2)}
Transactions:
  ${this.transactions.map(transaction => transaction.prettyPrint()).join('\n  ')}
        `.trim();
    }
}

class Transaction {
    constructor(srcAccount, dstAccount, date, reason, amount) {
        this.srcAccount = srcAccount;
        this.dstAccount = dstAccount;
        this.date = date;
        this.reason = reason;
        this.amount = amount;
    }

    prettyPrint() {
        const dateString = this.date.format('DD/MM/YYYY');
        const amountString = (this.amount / 100).toFixed(2);
        return `[${dateString}] ${amountString} from ${this.srcAccount.name} to ${this.dstAccount.name} for ${this.reason}`;
    }
}

module.exports = Account;
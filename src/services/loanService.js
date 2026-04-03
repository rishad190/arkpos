import {
  ref,
  push,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  get,
  serverTimestamp,
} from "firebase/database";

const LOANS_PATH = "loans";

export class LoanService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Add a new loan
   * @param {Object} loanData
   * @returns {Promise<string>} loanId
   */
  async addLoan(loanData) {
    try {
      const loansRef = ref(this.db, LOANS_PATH);
      const newLoanRef = push(loansRef);
      
      const payload = {
        ...loanData,
        createdAt: serverTimestamp(),
        status: 'ACTIVE',
      };
      
      await update(newLoanRef, payload);
      this.logger.info(`Loan added: ${newLoanRef.key}`);
      return newLoanRef.key;
    } catch (error) {
      this.logger.error("Error adding loan:", error);
      throw error;
    }
  }

  /**
   * Update an existing loan
   * @param {string} id 
   * @param {Object} updates 
   */
  async updateLoan(id, updates) {
    try {
      const loanRef = ref(this.db, `${LOANS_PATH}/${id}`);
      await update(loanRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      this.logger.info(`Loan updated: ${id}`);
    } catch (error) {
      this.logger.error("Error updating loan:", error);
      throw error;
    }
  }

  /**
   * Delete a loan
   * @param {string} id 
   */
  async deleteLoan(id) {
    try {
      const loanRef = ref(this.db, `${LOANS_PATH}/${id}`);
      await remove(loanRef);
      this.logger.info(`Loan deleted: ${id}`);
    } catch (error) {
      this.logger.error("Error deleting loan:", error);
      throw error;
    }
  }

  /**
   * Subscribe to loans
   * @param {Function} callback 
   * @returns {Function} unsubscribe
   */
  subscribeToLoans(callback) {
    const loansRef = ref(this.db, LOANS_PATH);
    const q = query(loansRef, orderByChild("createdAt"));

    const unsubscribe = onValue(
      q,
      (snapshot) => {
        const data = snapshot.val();
        const loans = data
          ? Object.entries(data).map(([id, value]) => ({
              id,
              ...value,
            }))
          : [];
        
        // Calculate dynamic values (Interest, Total Due)
        const enrichedLoans = loans.map(loan => this.enrichLoanData(loan));
        
        // Sort by date desc
        enrichedLoans.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        callback(enrichedLoans);
      },
      (error) => {
        this.logger.error("Error subscribing to loans:", error);
        callback([]);
      }
    );

    return unsubscribe;
  }

  /**
   * Add a transaction to an existing loan
   * @param {string} loanId 
   * @param {Object} transactionData - { type: "PRINCIPAL" | "PROFIT", amount: Number (positive for taking more/giving more, negative for repayment), date: String, note: String, isCashbookLinked: Boolean, cashbookRefId: String }
   */
  async addLoanTransaction(loanId, transactionData) {
    try {
      const loanTxRef = push(ref(this.db, `${LOANS_PATH}/${loanId}/transactions`));
      await update(loanTxRef, {
        ...transactionData,
        createdAt: serverTimestamp()
      });
      this.logger.info(`Loan transaction added to ${loanId}`);
      return loanTxRef.key;
    } catch (error) {
      this.logger.error("Error adding loan transaction:", error);
      throw error;
    }
  }

  /**
   * Update a specific loan transaction
   * @param {string} loanId 
   * @param {string} transactionId 
   * @param {Object} updates 
   */
  async updateLoanTransaction(loanId, transactionId, updates) {
    try {
      const loanTxRef = ref(this.db, `${LOANS_PATH}/${loanId}/transactions/${transactionId}`);
      await update(loanTxRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      this.logger.info(`Loan transaction updated: ${transactionId} for loan ${loanId}`);
    } catch (error) {
      this.logger.error("Error updating loan transaction:", error);
      throw error;
    }
  }

  /**
   * Delete a specific loan transaction
   * @param {string} loanId 
   * @param {string} transactionId 
   */
  async deleteLoanTransaction(loanId, transactionId) {
    try {
      const loanTxRef = ref(this.db, `${LOANS_PATH}/${loanId}/transactions/${transactionId}`);
      await remove(loanTxRef);
      this.logger.info(`Loan transaction deleted: ${transactionId} from loan ${loanId}`);
    } catch (error) {
      this.logger.error("Error deleting loan transaction:", error);
      throw error;
    }
  }

  /**
   * Calculate manual ledger totals from sub-transactions
   * @param {Object} loan 
   * @returns {Object} enriched loan
   */
  enrichLoanData(loan) {
    let totalTaken = Number(loan.principal) || 0;
    let totalRepaid = 0;
    let totalProfit = 0;

    if (loan.transactions) {
       // Convert transactions object to array and calculate
       Object.values(loan.transactions).forEach(t => {
           const amt = Number(t.amount) || 0;
           if (t.type === 'PRINCIPAL') {
               // Positive amount means loan size increased (took more / gave more)
               // Negative amount means loan was repaid (paid back / received back)
               if (amt > 0) {
                 totalTaken += amt;
               } else {
                 totalRepaid += Math.abs(amt);
               }
           } else if (t.type === 'PROFIT') {
               // Profit paid/received
               totalProfit += Math.abs(amt);
           }
       });
    }

    return {
      ...loan,
      totalTaken,
      totalRepaid,
      totalProfit,
      balance: totalTaken - totalRepaid,
      daysElapsed: Math.ceil(Math.abs(new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24))
    };
  }
}

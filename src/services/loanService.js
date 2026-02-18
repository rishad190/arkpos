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
   * Calculate accrued interest and total due
   * @param {Object} loan 
   * @returns {Object} enriched loan
   */
  enrichLoanData(loan) {
    if (!loan.startDate || !loan.principal || !loan.rate) return loan;

    const start = new Date(loan.startDate);
    // If endDate is defined, use it as the calculation limit (Fixed Term / Closed Loan)
    // Otherwise, use current date (Running Loan)
    const end = loan.endDate ? new Date(loan.endDate) : new Date();
    
    // Ensure we don't calculate negative time if start > end
    if (start > end) return { ...loan, calculatedInterest: 0, totalDue: Number(loan.principal), daysElapsed: 0 };

    // Difference in milliseconds
    const diffTime = Math.abs(end - start);
    // Difference in days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Calculate Interest
    // Formula: Principal * Rate * Time
    // Rate is entered as Percentage (e.g., 5 for 5%)
    
    let interest = 0;
    const principal = Number(loan.principal);
    const rate = Number(loan.rate);

    if (loan.rateType === 'MONTHLY') {
      // Rate is per month.
      // Time = Months
      // Using precise day calculation: Days / 30 offers a rough month count
      // Or (Principal * Rate/100) * (Days / 30)
      const months = diffDays / 30;
      interest = principal * (rate / 100) * months;
    } else {
      // Rate is per year
      // Time = Years
      const years = diffDays / 365;
      interest = principal * (rate / 100) * years;
    }

    return {
      ...loan,
      calculatedInterest: interest,
      totalDue: principal + interest,
      daysElapsed: diffDays
    };
  }
}

import axios from 'axios';

const API_URL = 'http://localhost:8000/api/payroll';

// Create axios instance with default config
const payrollAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request
payrollAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Service functions for payroll
const payrollService = {
  // Get my payslips (current employee)
  getMyPayslips: async (params = {}) => {
    try {
      const response = await payrollAPI.get('/me/payslips', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my latest payslip (current employee)
  getMyLatestPayslip: async () => {
    try {
      const response = await payrollAPI.get('/me/payslips/latest');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get specific payslip by ID (for current user or admin/HR)
  getPayslipById: async (payslipId) => {
    try {
      const response = await payrollAPI.get(`/payslips/${payslipId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Download payslip as PDF
  downloadPayslip: async (payslipId) => {
    try {
      const response = await payrollAPI.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my salary information
  getMySalaryInfo: async () => {
    try {
      const response = await payrollAPI.get('/me/salary');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my tax information
  getMyTaxInfo: async () => {
    try {
      const response = await payrollAPI.get('/me/tax');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update my tax information
  updateMyTaxInfo: async (taxData) => {
    try {
      const response = await payrollAPI.put('/me/tax', taxData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my bank account information
  getMyBankInfo: async () => {
    try {
      const response = await payrollAPI.get('/me/bank');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update my bank account information
  updateMyBankInfo: async (bankData) => {
    try {
      const response = await payrollAPI.put('/me/bank', bankData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my deductions
  getMyDeductions: async () => {
    try {
      const response = await payrollAPI.get('/me/deductions');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my benefits
  getMyBenefits: async () => {
    try {
      const response = await payrollAPI.get('/me/benefits');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my annual salary statements
  getMySalaryStatements: async (params = {}) => {
    try {
      const response = await payrollAPI.get('/me/statements', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Download annual salary statement
  downloadSalaryStatement: async (year) => {
    try {
      const response = await payrollAPI.get(`/me/statements/${year}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin/HR functions

  // Get employee's payslips (admin/HR function)
  getEmployeePayslips: async (employeeId, params = {}) => {
    try {
      const response = await payrollAPI.get(`/${employeeId}/payslips`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all payslips for a specific pay period (admin/HR function)
  getAllPayslips: async (params = {}) => {
    try {
      const response = await payrollAPI.get('/payslips', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate payslips for a pay period (admin/HR function)
  generatePayslips: async (payPeriodData) => {
    try {
      const response = await payrollAPI.post('/generate', payPeriodData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get pay periods (admin/HR function)
  getPayPeriods: async (params = {}) => {
    try {
      const response = await payrollAPI.get('/periods', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create pay period (admin/HR function)
  createPayPeriod: async (periodData) => {
    try {
      const response = await payrollAPI.post('/periods', periodData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee salary information (admin/HR function)
  getEmployeeSalary: async (employeeId) => {
    try {
      const response = await payrollAPI.get(`/${employeeId}/salary`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update employee salary (admin/HR function)
  updateEmployeeSalary: async (employeeId, salaryData) => {
    try {
      const response = await payrollAPI.put(`/${employeeId}/salary`, salaryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee tax information (admin/HR function)
  getEmployeeTaxInfo: async (employeeId) => {
    try {
      const response = await payrollAPI.get(`/${employeeId}/tax`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update employee tax information (admin/HR function)
  updateEmployeeTaxInfo: async (employeeId, taxData) => {
    try {
      const response = await payrollAPI.put(`/${employeeId}/tax`, taxData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee bank information (admin/HR function)
  getEmployeeBankInfo: async (employeeId) => {
    try {
      const response = await payrollAPI.get(`/${employeeId}/bank`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update employee bank information (admin/HR function)
  updateEmployeeBankInfo: async (employeeId, bankData) => {
    try {
      const response = await payrollAPI.put(`/${employeeId}/bank`, bankData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all deduction types (admin/HR function)
  getDeductionTypes: async () => {
    try {
      const response = await payrollAPI.get('/deduction-types');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create deduction type (admin/HR function)
  createDeductionType: async (deductionTypeData) => {
    try {
      const response = await payrollAPI.post('/deduction-types', deductionTypeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update deduction type (admin/HR function)
  updateDeductionType: async (deductionTypeId, deductionTypeData) => {
    try {
      const response = await payrollAPI.put(`/deduction-types/${deductionTypeId}`, deductionTypeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete deduction type (admin/HR function)
  deleteDeductionType: async (deductionTypeId) => {
    try {
      const response = await payrollAPI.delete(`/deduction-types/${deductionTypeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee deductions (admin/HR function)
  getEmployeeDeductions: async (employeeId) => {
    try {
      const response = await payrollAPI.get(`/${employeeId}/deductions`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add employee deduction (admin/HR function)
  addEmployeeDeduction: async (employeeId, deductionData) => {
    try {
      const response = await payrollAPI.post(`/${employeeId}/deductions`, deductionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update employee deduction (admin/HR function)
  updateEmployeeDeduction: async (employeeId, deductionId, deductionData) => {
    try {
      const response = await payrollAPI.put(`/${employeeId}/deductions/${deductionId}`, deductionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Remove employee deduction (admin/HR function)
  removeEmployeeDeduction: async (employeeId, deductionId) => {
    try {
      const response = await payrollAPI.delete(`/${employeeId}/deductions/${deductionId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all benefit types (admin/HR function)
  getBenefitTypes: async () => {
    try {
      const response = await payrollAPI.get('/benefit-types');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create benefit type (admin/HR function)
  createBenefitType: async (benefitTypeData) => {
    try {
      const response = await payrollAPI.post('/benefit-types', benefitTypeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update benefit type (admin/HR function)
  updateBenefitType: async (benefitTypeId, benefitTypeData) => {
    try {
      const response = await payrollAPI.put(`/benefit-types/${benefitTypeId}`, benefitTypeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete benefit type (admin/HR function)
  deleteBenefitType: async (benefitTypeId) => {
    try {
      const response = await payrollAPI.delete(`/benefit-types/${benefitTypeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee benefits (admin/HR function)
  getEmployeeBenefits: async (employeeId) => {
    try {
      const response = await payrollAPI.get(`/${employeeId}/benefits`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add employee benefit (admin/HR function)
  addEmployeeBenefit: async (employeeId, benefitData) => {
    try {
      const response = await payrollAPI.post(`/${employeeId}/benefits`, benefitData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update employee benefit (admin/HR function)
  updateEmployeeBenefit: async (employeeId, benefitId, benefitData) => {
    try {
      const response = await payrollAPI.put(`/${employeeId}/benefits/${benefitId}`, benefitData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Remove employee benefit (admin/HR function)
  removeEmployeeBenefit: async (employeeId, benefitId) => {
    try {
      const response = await payrollAPI.delete(`/${employeeId}/benefits/${benefitId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payroll settings (admin/HR function)
  getPayrollSettings: async () => {
    try {
      const response = await payrollAPI.get('/settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update payroll settings (admin/HR function)
  updatePayrollSettings: async (settingsData) => {
    try {
      const response = await payrollAPI.put('/settings', settingsData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate payroll reports (admin/HR function)
  generatePayrollReport: async (reportParams) => {
    try {
      const response = await payrollAPI.post('/reports', reportParams, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payroll summary statistics (admin/HR function)
  getPayrollStatistics: async (params = {}) => {
    try {
      const response = await payrollAPI.get('/statistics', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Recalculate a specific payslip (admin/HR function)
  recalculatePayslip: async (payslipId) => {
    try {
      const response = await payrollAPI.post(`/payslips/${payslipId}/recalculate`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get tax tables (admin/HR function)
  getTaxTables: async (year) => {
    try {
      const params = year ? { year } : {};
      const response = await payrollAPI.get('/tax-tables', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update tax tables (admin function)
  updateTaxTables: async (year, taxTablesData) => {
    try {
      const response = await payrollAPI.put(`/tax-tables/${year}`, taxTablesData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default payrollService; 
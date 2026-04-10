import axios from 'axios';

const API_URL = 'http://localhost:8000/api/employees';

// No mock data - rely on backend or fail

// Create axios instance with default config
const employeeAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request
employeeAPI.interceptors.request.use(
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

// Service functions for employee management
const employeeService = {
  // Get current user's profile
  getMyProfile: async () => {
    try {
      const response = await employeeAPI.get('/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update current user's profile
  updateMyProfile: async (profileData) => {
    try {
      const response = await employeeAPI.put('/me', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Change password for current user
  changePassword: async (passwordData) => {
    try {
      const response = await employeeAPI.put('/me/password', passwordData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload profile picture for current user
  uploadProfilePicture: async (formData) => {
    try {
      const response = await employeeAPI.post('/me/upload-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all employees (admin/HR function)
  getAllEmployees: async (params = {}) => {
    try {
      console.log('🔥 DEBUG: Starting getAllEmployees call');
      console.log('🔥 DEBUG: API_URL is', API_URL);
      console.log('🔥 DEBUG: Request params:', params);
      console.log('🔥 DEBUG: Token available:', !!localStorage.getItem('token'));

      // Set default pagination if not provided
      const requestParams = {
        limit: params.limit || 1000,  // Increased from 20 to 1000 to show all employees
        page: params.page || 1,
        // Add a timestamp to prevent caching
        _t: new Date().getTime(),
        ...params
      };

      console.log('🔥 DEBUG: Final request params:', requestParams);

      // Try debug endpoint first as it returns all employees without pagination
      try {
        console.log('🔥 DEBUG: Trying debug endpoint first for all employees');
        const debugResponse = await employeeAPI.get('/debug/', {
          params: {
            _t: new Date().getTime()
          },
          cache: 'no-cache',
          timeout: 10000  // 10 second timeout
        });

        console.log('🔥 DEBUG: Debug API response data:', debugResponse.data);

        if (debugResponse.data && debugResponse.data.employees && Array.isArray(debugResponse.data.employees)) {
          const employeeList = debugResponse.data.employees;
          console.log(`🔥 DEBUG: Found ${employeeList.length} employees in debug endpoint`);

          // Map MongoDB employee fields to frontend expected format
          const mappedEmployees = employeeList.map(employee => {
            return {
              _id: employee._id,
              id: employee._id, // Add id field as some components might use this instead
              employee_id: employee.employee_id || '',
              first_name: employee.first_name || '',
              last_name: employee.last_name || '',
              name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(), // Add name field for components that expect it
              email: employee.email || '',
              phone: employee.phone || '',
              department: employee.department_name || employee.department || 'Unknown',
              position: employee.position || '',
              hire_date: employee.hire_date || '',
              status: employee.employment_status || employee.status || 'Active',
              employment_type: employee.employment_type || '',
              salary: employee.salary || '',
              address: employee.address || '',
              department_id: employee.department_id || '',
              manager_id: employee.manager_id || '',
              team: employee.team || ''
            };
          });

          return mappedEmployees;
        } else {
          console.log('🔥 DEBUG: Debug endpoint missing expected data structure:', debugResponse.data);
        }
      } catch (debugError) {
        console.log('🔥 DEBUG: Debug endpoint failed with error:', debugError.message);
        if (debugError.response) {
          console.log('🔥 DEBUG: Error status:', debugError.response.status);
          console.log('🔥 DEBUG: Error data:', debugError.response.data);
        } else if (debugError.request) {
          console.log('🔥 DEBUG: No response received:', debugError.request);
        } else {
          console.log('🔥 DEBUG: Error setting up request:', debugError.message);
        }
      }

      // If debug endpoint fails, try regular endpoint
      try {
        console.log('🔥 DEBUG: Trying regular employee endpoint');
        const startTime = new Date().getTime();
        const response = await employeeAPI.get('/', {
          params: requestParams,
          cache: 'no-cache',
          timeout: 10000  // 10 second timeout
        });
        const endTime = new Date().getTime();

        console.log(`🔥 DEBUG: Regular API call completed in ${endTime - startTime}ms`);
        console.log('🔥 DEBUG: Response status:', response.status);
        console.log('🔥 DEBUG: Response data:', response.data);

        // Check if we have results in the expected format
        if (response.data && response.data.results && Array.isArray(response.data.results)) {
          const employeeList = response.data.results;
          console.log(`🔥 DEBUG: Found ${employeeList.length} employees in regular endpoint`);

          // Map MongoDB employee fields to frontend expected format
          const mappedEmployees = employeeList.map(employee => {
            return {
              _id: employee._id,
              id: employee._id, // Add id field as some components might use this instead
              employee_id: employee.employee_id || '',
              first_name: employee.first_name || '',
              last_name: employee.last_name || '',
              name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(), // Add name field for components that expect it
              email: employee.email || '',
              phone: employee.phone || '',
              department: employee.department_name || employee.department || 'Unknown',
              position: employee.position || '',
              hire_date: employee.hire_date || '',
              status: employee.employment_status || employee.status || 'Active',
              employment_type: employee.employment_type || '',
              salary: employee.salary || '',
              address: employee.address || '',
              department_id: employee.department_id || '',
              manager_id: employee.manager_id || '',
              team: employee.team || ''
            };
          });

          return mappedEmployees;
        } else {
          console.log('🔥 DEBUG: Regular endpoint response missing expected structure:', response.data);
        }
      } catch (regularError) {
        console.log('🔥 DEBUG: Regular endpoint failed with error:', regularError.message);
        if (regularError.response) {
          console.log('🔥 DEBUG: Error status:', regularError.response.status);
          console.log('🔥 DEBUG: Error data:', regularError.response.data);
        } else if (regularError.request) {
          console.log('🔥 DEBUG: No response received:', regularError.request);
        } else {
          console.log('🔥 DEBUG: Error setting up request:', regularError.message);
        }
      }

      // If both endpoints fail, try direct database access
      try {
        console.log('🔥 DEBUG: Trying direct database access');
        const directResponse = await employeeAPI.get('/debug/', {
          params: {
            direct_access: true,
            _t: new Date().getTime()
          },
          cache: 'no-cache',
          timeout: 10000  // 10 second timeout
        });

        console.log('🔥 DEBUG: Direct database access response:', directResponse.data);

        if (directResponse.data && directResponse.data.employees && Array.isArray(directResponse.data.employees)) {
          const rawEmployees = directResponse.data.employees;

          // Map the employees with consistent field naming
          const mappedEmployees = rawEmployees.map(employee => ({
            _id: employee._id,
            id: employee._id, // Add id field as some components might use this instead
            employee_id: employee.employee_id || '',
            first_name: employee.first_name || '',
            last_name: employee.last_name || '',
            name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(), // Add name field for components that expect it
            email: employee.email || '',
            phone: employee.phone || '',
            department: employee.department_name || employee.department || 'Unknown',
            position: employee.position || '',
            hire_date: employee.hire_date || '',
            status: employee.employment_status || employee.status || 'Active',
            employment_type: employee.employment_type || '',
            salary: employee.salary || '',
            address: employee.address || '',
            department_id: employee.department_id || '',
            manager_id: employee.manager_id || '',
            team: employee.team || ''
          }));

          return mappedEmployees;
        } else {
          console.log('🔥 DEBUG: Direct database access missing expected data structure:', directResponse.data);
        }
      } catch (directError) {
        console.log('🔥 DEBUG: Direct database access failed with error:', directError.message);
        if (directError.response) {
          console.log('🔥 DEBUG: Error status:', directError.response.status);
          console.log('🔥 DEBUG: Error data:', directError.response.data);
        } else if (directError.request) {
          console.log('🔥 DEBUG: No response received:', directError.request);
        } else {
          console.log('🔥 DEBUG: Error setting up request:', directError.message);
        }
      }

      console.log('🔥 DEBUG: All methods failed, throwing error');
      throw new Error('Failed to fetch employees from backend');
    } catch (error) {
      console.error('❌ Error in getAllEmployees:', error);
      throw error;
    }
  },

  // Get employee by ID (admin/HR function)
  getEmployeeById: async (employeeId) => {
    try {
      console.log(`🔍 SERVICE: Fetching employee with ID: ${employeeId}`);

      // First try the regular endpoint
      try {
        const response = await employeeAPI.get(`/${employeeId}`, {
          params: { _t: new Date().getTime() }
        });
        console.log('🔍 SERVICE: Employee response data:', response.data);

        // Check for expected data structure
        if (response.data && (response.data._id || response.data.id)) {
          const employeeData = {
            _id: response.data._id || response.data.id || employeeId,
            ...response.data
          };
          return employeeData;
        }
      } catch (error) {
        console.log('🔍 SERVICE: Regular endpoint failed, trying debug endpoint');
      }

      // If regular endpoint fails, try debug endpoint to get all employees
      const debugResponse = await employeeAPI.get('/debug/');
      console.log('🔍 SERVICE: Debug API response data:', debugResponse.data);

      if (debugResponse.data && debugResponse.data.employees && Array.isArray(debugResponse.data.employees)) {
        // Find the specific employee in the debug data
        const employee = debugResponse.data.employees.find(emp =>
          emp._id === employeeId || emp.id === employeeId
        );

        if (employee) {
          console.log('🔍 SERVICE: Found employee in debug data:', employee);
          return {
            _id: employee._id || employee.id || employeeId,
            ...employee
          };
        }
      }

      // If still not found, throw an error
      throw new Error('Employee not found in any data source');
    } catch (error) {
      console.error('❌ SERVICE: Error in getEmployeeById:', error);
      console.error('❌ SERVICE: Error details:', error.response?.data || error.message);
      throw error;
    }
  },

  // Create new employee (admin/HR function)
  createEmployee: async (employeeData) => {
    try {
      console.log('🔍 SERVICE: Creating new employee with data:', employeeData);

      // Add required employee_id if missing
      if (!employeeData.employee_id) {
        // Generate a simple employee ID if not provided
        employeeData.employee_id = `EMP${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        console.log('🔍 SERVICE: Generated employee_id:', employeeData.employee_id);
      }

      // Ensure name fields are properly set
      if (!employeeData.first_name && employeeData.name) {
        const nameParts = employeeData.name.split(' ');
        employeeData.first_name = nameParts[0] || '';
        employeeData.last_name = nameParts.slice(1).join(' ') || '';
        console.log('🔍 SERVICE: Split name into first/last:', employeeData.first_name, employeeData.last_name);
      }

      // Convert department to department_id if needed
      if (employeeData.department && !employeeData.department_id) {
        // For now, we'll just use a mock ID - in a real app, you'd look up the department ID from a departments API
        console.log('🔍 SERVICE: Generating department_id from department name:', employeeData.department);

        // Convert department name to a simple ID - this would normally come from the department API
        const deptIdMap = {
          'Engineering': '6073a5f27b7dcd7d93cec8f4',
          'HR': '6073a5f27b7dcd7d93cec8f5',
          'Marketing': '6073a5f27b7dcd7d93cec8f6',
          'Sales': '6073a5f27b7dcd7d93cec8f7',
          'Finance': '6073a5f27b7dcd7d93cec8f8'
        };

        if (deptIdMap[employeeData.department]) {
          employeeData.department_id = deptIdMap[employeeData.department];
        } else {
          // Generate a mock ID
          employeeData.department_id = `dept_${employeeData.department.toLowerCase().replace(/\s+/g, '_')}`;
        }
        console.log('🔍 SERVICE: Set department_id:', employeeData.department_id);
      }

      // Convert team to team_id if needed
      if (employeeData.team && !employeeData.team_id) {
        // Generate a mock ID for the team - in a real app, you'd look up the team ID from a teams API
        employeeData.team_id = `team_${employeeData.team.toLowerCase().replace(/\s+/g, '_')}`;
        console.log('🔍 SERVICE: Generated team_id from team name:', employeeData.team_id);
      }

      // Add defaults for required fields if not present
      const requiredDefaults = {
        employment_status: 'Active',
        employment_type: 'Full-time',
        hire_date: employeeData.date_joined || new Date().toISOString().split('T')[0],
        leave_balance: {
          annual: 20,
          sick: 10,
          personal: 5
        },
        emergency_contact: {
          name: '',
          phone: '',
          relationship: ''
        }
      };

      for (const [key, value] of Object.entries(requiredDefaults)) {
        // Only set default if it's completely missing, or if it's just a raw number but supposed to be an object (like leave_balance)
        if (employeeData[key] === undefined || (key === 'leave_balance' && typeof employeeData[key] !== 'object')) {
          employeeData[key] = value;
          console.log(`🔍 SERVICE: Added/corrected default for ${key}:`, value);
        }
      }

      // Add timestamps if not present
      if (!employeeData.created_at) {
        employeeData.created_at = new Date().toISOString();
      }

      // Try different endpoints - first try the standard create endpoint
      try {
        console.log('🔍 SERVICE: Trying standard create endpoint');
        const response = await employeeAPI.post('/', employeeData);
        console.log('🔍 SERVICE: Create employee response from standard endpoint:', response.data);

        // Format response for consistency with the rest of the app
        const newEmployee = {
          _id: response.data.id || response.data._id,
          id: response.data.id || response.data._id, // Add id field as some components might use this instead
          ...employeeData,
          ...response.data
        };

        console.log('🔍 SERVICE: Successfully created employee with _id:', newEmployee._id);
        return newEmployee;
      } catch (error) {
        console.log('🔍 SERVICE: Standard create endpoint failed, trying /new/ endpoint');
        console.log('🔍 SERVICE: Error:', error.message, error.response?.data);

        // If standard endpoint fails, try the /new/ endpoint
        const response = await employeeAPI.post('/new/', employeeData);
        console.log('🔍 SERVICE: Create employee response from /new/ endpoint:', response.data);

        // Format response for consistency with the rest of the app
        const newEmployee = {
          _id: response.data.id || response.data._id,
          id: response.data.id || response.data._id, // Add id field as some components might use this instead
          ...employeeData,
          ...response.data
        };

        console.log('🔍 SERVICE: Successfully created employee with _id:', newEmployee._id);
        return newEmployee;
      }
    } catch (error) {
      console.error('❌ SERVICE: Error creating employee:', error);

      if (error.response) {
        console.error('❌ SERVICE: Error status:', error.response.status);
        console.error('❌ SERVICE: Error data:', error.response.data);
      }

      throw error;
    }
  },

  // Update employee details (admin/HR function)
  updateEmployee: async (employeeId, employeeData) => {
    try {
      const response = await employeeAPI.put(`/${employeeId}/update/`, employeeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Partial update employee details (admin/HR/self function)
  partialUpdateEmployee: async (employeeId, employeeData) => {
    try {
      const response = await employeeAPI.patch(`/${employeeId}/partial/`, employeeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete employee (admin function)
  deleteEmployee: async (employeeId) => {
    try {
      console.log(`🔍 SERVICE: Deleting employee with ID: ${employeeId}`);

      // Try the specific delete endpoint first
      try {
        const response = await employeeAPI.delete(`/${employeeId}/delete/`);
        console.log('🔍 SERVICE: Delete response:', response.data);
        return response.data;
      } catch (specificError) {
        console.log('🔍 SERVICE: Specific delete endpoint failed, trying alternative endpoint');

        // If the specific endpoint fails, try the general delete endpoint
        const response = await employeeAPI.delete(`/${employeeId}`);
        console.log('🔍 SERVICE: Alternative delete response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ SERVICE: Error deleting employee:', error);

      if (error.response) {
        console.error('❌ SERVICE: Error status:', error.response.status);
        console.error('❌ SERVICE: Error data:', error.response.data);
      }

      throw error;
    }
  },

  // Get employee documents (admin/HR/employee function)
  getEmployeeDocuments: async (employeeId) => {
    try {
      const response = await employeeAPI.get(`/${employeeId}/documents`, {
        params: { _t: new Date().getTime() }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload employee document (admin/HR/employee function)
  uploadDocument: async (employeeId, formData) => {
    try {
      const response = await employeeAPI.post(`/${employeeId}/documents/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete employee document (admin/HR/employee function)
  deleteDocument: async (employeeId, documentId) => {
    try {
      const response = await employeeAPI.delete(`/${employeeId}/documents/${documentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee skills (admin/HR/employee function)
  getEmployeeSkills: async (employeeId) => {
    try {
      // Use our new skills API endpoint
      const response = await axios.get(`${API_URL}/skills/employee/${employeeId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching employee skills:', error);
      throw error;
    }
  },

  // Update employee skills (admin/HR/employee function)
  updateEmployeeSkills: async (employeeId, skillsData) => {
    try {
      // Use our new skills API endpoint
      const response = await axios.post(`${API_URL}/skills/employee/${employeeId}/update/`, skillsData);
      return response.data;
    } catch (error) {
      console.error('Error updating employee skills:', error);
      throw error;
    }
  },

  // Get employee emergency contacts (admin/HR/employee function)
  getEmergencyContacts: async (employeeId) => {
    try {
      const response = await employeeAPI.get(`/${employeeId}/emergency-contacts`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add/update emergency contact (admin/HR/employee function)
  updateEmergencyContact: async (employeeId, contactData) => {
    try {
      const response = await employeeAPI.put(`/${employeeId}/emergency-contacts`, contactData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete emergency contact (admin/HR/employee function)
  deleteEmergencyContact: async (employeeId, contactId) => {
    try {
      const response = await employeeAPI.delete(`/${employeeId}/emergency-contacts/${contactId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee departments
  getDepartments: async () => {
    try {
      const response = await employeeAPI.get('/departments/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee departments from MongoDB-specific endpoint
  getDepartmentsMongoDB: async () => {
    try {
      const response = await employeeAPI.get('/departments/mongodb/');
      // The backend returns { results: [...] } or just an array
      return response.data.results || response.data || [];
    } catch (error) {
      console.error('Error fetching MongoDB departments:', error);
      throw error;
    }
  },

  // Get employee roles
  getRoles: async () => {
    try {
      const response = await employeeAPI.get('/roles');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee statistics (admin/HR function)
  getEmployeeStatistics: async () => {
    try {
      const response = await employeeAPI.get('/statistics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get organization chart (admin/HR/employee function)
  getOrganizationChart: async () => {
    try {
      const response = await employeeAPI.get('/organization-chart');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get direct reports for a manager
  getDirectReports: async (managerId) => {
    try {
      const response = await employeeAPI.get(`/${managerId}/direct-reports`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default employeeService; 
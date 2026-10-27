import api, { createApiClient } from './api';


// No mock data - rely on backend or fail

const employeeAPI = createApiClient('/api/employees');


// The all-employees debug endpoint is limited to Admin/Manager/HR; other roles use the paginated list
const canUseDebugEndpoint = () => {
  try {
    return ['Admin', 'Manager', 'HR'].includes(JSON.parse(localStorage.getItem('user') || '{}').role);
  } catch (e) {
    return false;
  }
};

// Service functions for employee management
const employeeService = {

  // Change password for current user
  changePassword: async (passwordData) => {
    try {
      const response = await employeeAPI.put('/me/password', passwordData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Get all employees (admin/HR function)
  getAllEmployees: async (params = {}) => {
    try {

      // Set default pagination if not provided
      const requestParams = {
        limit: params.limit || 1000,  // Increased from 20 to 1000 to show all employees
        page: params.page || 1,
        // Add a timestamp to prevent caching
        _t: new Date().getTime(),
        ...params
      };

      // Try debug endpoint first as it returns all employees without pagination
      try {
        if (!canUseDebugEndpoint()) throw new Error('debug endpoint not available for this role');
        const debugResponse = await employeeAPI.get('/debug/', {
          params: {
            _t: new Date().getTime()
          },
          cache: 'no-cache',
          timeout: 10000  // 10 second timeout
        });

        if (debugResponse.data && debugResponse.data.employees && Array.isArray(debugResponse.data.employees)) {
          const employeeList = debugResponse.data.employees;

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
          ;
        }
      } catch (debugError) {
        if (debugError.response) {
        } else if (debugError.request) {
          ;
        } else {
          ;
        }
      }

      // If debug endpoint fails, try regular endpoint
      try {
        const startTime = new Date().getTime();
        const response = await employeeAPI.get('/', {
          params: requestParams,
          cache: 'no-cache',
          timeout: 10000  // 10 second timeout
        });
        const endTime = new Date().getTime();

        // Check if we have results in the expected format
        if (response.data && response.data.results && Array.isArray(response.data.results)) {
          const employeeList = response.data.results;

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
          ;
        }
      } catch (regularError) {
        if (regularError.response) {
        } else if (regularError.request) {
          ;
        } else {
          ;
        }
      }

      // If both endpoints fail, try direct database access
      try {
        if (!canUseDebugEndpoint()) throw new Error('debug endpoint not available for this role');
        const directResponse = await employeeAPI.get('/debug/', {
          params: {
            direct_access: true,
            _t: new Date().getTime()
          },
          cache: 'no-cache',
          timeout: 10000  // 10 second timeout
        });

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
          ;
        }
      } catch (directError) {
        if (directError.response) {
        } else if (directError.request) {
          ;
        } else {
          ;
        }
      }

      throw new Error('Failed to fetch employees from backend');
    } catch (error) {
      console.error('Error in getAllEmployees:', error);
      throw error;
    }
  },
  // Get employee by ID (admin/HR function)
  getEmployeeById: async (employeeId) => {
    try {

      // First try the regular endpoint
      try {
        const response = await employeeAPI.get(`/${employeeId}/`, {
          params: { _t: new Date().getTime() }
        });

        // Check for expected data structure
        if (response.data && (response.data._id || response.data.id)) {
          const employeeData = {
            _id: response.data._id || response.data.id || employeeId,
            ...response.data
          };
          return employeeData;
        }
      } catch (error) {
        ;
      }

      // If regular endpoint fails, try debug endpoint to get all employees
      if (!canUseDebugEndpoint()) throw new Error('Employee not found');
      const debugResponse = await employeeAPI.get('/debug/');

      if (debugResponse.data && debugResponse.data.employees && Array.isArray(debugResponse.data.employees)) {
        // Find the specific employee in the debug data
        const employee = debugResponse.data.employees.find(emp =>
          emp._id === employeeId || emp.id === employeeId
        );

        if (employee) {
          return {
            _id: employee._id || employee.id || employeeId,
            ...employee
          };
        }
      }

      // If still not found, throw an error
      throw new Error('Employee not found in any data source');
    } catch (error) {
      console.error('Error in getEmployeeById:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  },
  // Create new employee (admin/HR function)
  createEmployee: async (employeeData) => {
    try {

      // Ensure name fields are properly set
      if (!employeeData.first_name && employeeData.name) {
        const nameParts = employeeData.name.split(' ');
        employeeData.first_name = nameParts[0] || '';
        employeeData.last_name = nameParts.slice(1).join(' ') || '';
      }

      // Resolve department_id / team_id from the real departments and teams (never invent ids)
      if (employeeData.department && !employeeData.department_id) {
        try {
          const res = await api.get('/api/employees/departments/');
          const list = res.data.results || res.data.departments || res.data || [];
          const match = (Array.isArray(list) ? list : []).find(
            (d) => (d.name || '').toLowerCase() === employeeData.department.toLowerCase()
          );
          if (match) employeeData.department_id = match._id || match.id;
        } catch (lookupError) {
          console.warn('Could not resolve department id:', lookupError.message);
        }
      }
      if (employeeData.team && !employeeData.team_id) {
        try {
          const res = await api.get('/api/teams/mongodb_list/');
          const match = (Array.isArray(res.data) ? res.data : []).find(
            (t) => (t.name || '').toLowerCase() === employeeData.team.toLowerCase()
          );
          if (match) employeeData.team_id = match._id || match.id;
        } catch (lookupError) {
          console.warn('Could not resolve team id:', lookupError.message);
        }
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
        }
      }

      // Add timestamps if not present
      if (!employeeData.created_at) {
        employeeData.created_at = new Date().toISOString();
      }

      const response = await employeeAPI.post('/new/', employeeData);
      return {
        _id: response.data.id || response.data._id,
        id: response.data.id || response.data._id,
        ...employeeData,
        ...response.data,
      };
    } catch (error) {
      console.error('Error creating employee:', error);

      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
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
  // Get employee skills (admin/HR/employee function)
  getEmployeeSkills: async (employeeId) => {
    try {
      // Use our new skills API endpoint
      const response = await api.get(`/api/skills/employee/${employeeId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching employee skills:', error);
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
};

export default employeeService; 
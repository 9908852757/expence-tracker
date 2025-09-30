// Indian Expense Tracker Application with Google Drive Integration
class ExpenseTracker {
    constructor() {
        this.expenses = [];
        this.paymentMethods = [];
        this.reminders = [];
        this.currentView = 'dashboard';
        this.currentMonth = new Date();
        
        // Google Drive integration properties
        this.isGoogleConnected = false;
        this.googleAuth = null;
        this.driveFiles = {
            expenses: null,
            paymentMethods: null,
            reminders: null,
            settings: null
        };
        this.syncStatus = 'offline';
        this.lastSyncTime = null;
        this.pendingSync = [];
        
        // Credentials from provided JSON
        this.googleCredentials = {
            clientId: "233167876623-d6qu3irgp5k90em45klitumise38c329.apps.googleusercontent.com",
            scopes: [
                "https://www.googleapis.com/auth/drive.file",
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/userinfo.email"
            ],
            discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
            ]
        };
        
        this.driveConfig = {
            folderName: "ExpenseTracker",
            files: {
                expenses: "expenses_data.json",
                paymentMethods: "payment_methods.json",
                reminders: "reminders_data.json",
                settings: "app_settings.json"
            }
        };
        
        // Indian context data from provided JSON
        this.expenseCategories = [
            "Food & Dining",
            "Groceries", 
            "Transportation",
            "Fuel",
            "House Rent",
            "Utilities",
            "Internet & Phone",
            "Healthcare",
            "Entertainment",
            "Shopping",
            "Education",
            "Travel",
            "Insurance",
            "Investments",
            "EMI Payments",
            "Other"
        ];
        
        this.paymentMethodTypes = [
            "Credit Card",
            "Debit Card",
            "Bank Account", 
            "UPI",
            "Digital Wallet",
            "Cash"
        ];
        
        this.recurrenceOptions = [
            "Weekly",
            "Bi-weekly",
            "Monthly", 
            "Quarterly",
            "Half-yearly",
            "Yearly"
        ];
        
        this.currencySymbol = "₹";
        this.dateFormat = "DD/MM/YYYY";
        
        this.emptyStateMessages = {
            expenses: "Start tracking your expenses by adding your first transaction",
            paymentMethods: "Add your bank accounts, cards, and UPI methods to get started",
            reminders: "Set up bill reminders so you never miss a payment",
            analytics: "Your spending insights will appear here as you add more expenses"
        };
        
        this.init();
    }
    
    init() {
        this.loadData();
        this.setupEventListeners();
        this.populateDropdowns();
        this.updateDashboard();
        this.setCurrentDate();
        this.updateCurrentMonthDisplay();
        this.updateSyncStatus();
        this.setupTouchEvents();
        
        // Initialize Google API with improved error handling and retry logic
        this.initializeGoogleAPIWithRetry();
    }
    
    loadData() {
        // Load from localStorage if available, otherwise start empty
        try {
            const savedExpenses = JSON.parse(window.localStorage?.getItem('expenses') || '[]');
            const savedPaymentMethods = JSON.parse(window.localStorage?.getItem('paymentMethods') || '[]');
            const savedReminders = JSON.parse(window.localStorage?.getItem('reminders') || '[]');
            
            this.expenses = savedExpenses || [];
            this.paymentMethods = savedPaymentMethods || [];
            this.reminders = savedReminders || [];
            
            // Load Google settings
            this.lastSyncTime = window.localStorage?.getItem('lastSyncTime');
            this.isGoogleConnected = window.localStorage?.getItem('isGoogleConnected') === 'true';
        } catch (error) {
            console.log('LocalStorage not available, using in-memory storage');
            // If localStorage fails, start with empty data
            this.expenses = [];
            this.paymentMethods = [];
            this.reminders = [];
        }
    }
    
    saveData() {
        this.saveExpenses();
        this.savePaymentMethods();
        this.saveReminders();
        this.saveGoogleSettings();
    }
    
    saveExpenses() {
        try {
            if (window.localStorage) {
                window.localStorage.setItem('expenses', JSON.stringify(this.expenses));
            }
        } catch (error) {
            console.log('Unable to save expenses to localStorage');
        }
    }
    
    savePaymentMethods() {
        try {
            if (window.localStorage) {
                window.localStorage.setItem('paymentMethods', JSON.stringify(this.paymentMethods));
            }
        } catch (error) {
            console.log('Unable to save payment methods to localStorage');
        }
    }
    
    saveReminders() {
        try {
            if (window.localStorage) {
                window.localStorage.setItem('reminders', JSON.stringify(this.reminders));
            }
        } catch (error) {
            console.log('Unable to save reminders to localStorage');
        }
    }
    
    saveGoogleSettings() {
        try {
            if (window.localStorage) {
                if (this.lastSyncTime) window.localStorage.setItem('lastSyncTime', this.lastSyncTime);
                window.localStorage.setItem('isGoogleConnected', this.isGoogleConnected.toString());
            }
        } catch (error) {
            console.log('Unable to save Google settings to localStorage');
        }
    }
    
    setupEventListeners() {
        // Navigation - Fixed event delegation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const button = e.target.closest('.nav-item');
                const view = button?.dataset?.view;
                if (view) {
                    this.showView(view);
                }
            });
        });
        
        // Expense form
        const expenseForm = document.getElementById('expense-form');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addExpense();
            });
        }
        
        // Payment method form
        const paymentMethodForm = document.getElementById('payment-method-form');
        if (paymentMethodForm) {
            paymentMethodForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addPaymentMethod();
            });
        }
        
        // Reminder form
        const reminderForm = document.getElementById('reminder-form');
        if (reminderForm) {
            reminderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addReminder();
            });
        }
    }
    
    setupTouchEvents() {
        // Add touch event handling for better mobile experience
        document.addEventListener('touchstart', function(){}, {passive: true});
    }
    
    async initializeGoogleAPIWithRetry() {
        const maxRetries = 3;
        let attempts = 0;
        
        while (attempts < maxRetries) {
            try {
                await this.initializeGoogleAPI();
                break; // Success, exit retry loop
            } catch (error) {
                attempts++;
                console.log(`Google API initialization attempt ${attempts} failed:`, error);
                
                if (attempts < maxRetries) {
                    // Wait before retrying (exponential backoff)
                    const delay = Math.pow(2, attempts) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('Google API initialization failed after all retries');
                    this.syncStatus = 'error';
                    this.updateSyncStatus();
                }
            }
        }
    }
    
    async initializeGoogleAPI() {
        try {
            // Wait for Google API to be available with timeout
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds timeout
            
            while (typeof window.gapi === 'undefined' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }
            
            if (typeof window.gapi === 'undefined') {
                throw new Error('Google API script failed to load');
            }
            
            console.log('Google API script loaded, initializing...');
            
            // Load auth2 and client with proper promise handling
            await this.loadGapiModule('auth2');
            await this.loadGapiModule('client');
            
            console.log('GAPI modules loaded, initializing client...');
            
            // Initialize the client with comprehensive scope
            await window.gapi.client.init({
                clientId: this.googleCredentials.clientId,
                scope: this.googleCredentials.scopes.join(' '),
                discoveryDocs: this.googleCredentials.discoveryDocs,
                // Additional configuration for better compatibility
                plugin_name: "ExpenseTracker"
            });
            
            this.googleAuth = window.gapi.auth2.getAuthInstance();
            
            if (!this.googleAuth) {
                throw new Error('Failed to get auth instance');
            }
            
            // Check if already signed in
            if (this.googleAuth.isSignedIn.get()) {
                console.log('User already signed in to Google');
                this.isGoogleConnected = true;
                this.syncStatus = 'online';
                this.hideAuthBanner();
                await this.setupDriveFolder();
                this.updateSyncStatus();
            }
            
            console.log('Google API initialized successfully');
            
        } catch (error) {
            console.error('Google API initialization failed:', error);
            this.syncStatus = 'error';
            this.updateSyncStatus();
            throw error; // Re-throw for retry logic
        }
    }
    
    loadGapiModule(module) {
        return new Promise((resolve, reject) => {
            try {
                window.gapi.load(module, {
                    callback: resolve,
                    onerror: reject,
                    timeout: 10000, // 10 second timeout
                    ontimeout: () => reject(new Error(`Timeout loading ${module} module`))
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async connectGoogleDrive() {
        try {
            this.syncStatus = 'syncing';
            this.updateSyncStatus();
            this.showMessage('Connecting to Google Drive...', 'info');
            
            if (!this.googleAuth) {
                console.log('Google Auth not initialized, initializing now...');
                await this.initializeGoogleAPIWithRetry();
            }
            
            if (!this.googleAuth) {
                throw new Error('Google API not initialized');
            }
            
            console.log('Attempting Google sign in...');
            
            // Sign in to Google with additional options for better compatibility
            const user = await this.googleAuth.signIn({
                scope: this.googleCredentials.scopes.join(' '),
                prompt: 'consent' // Force consent screen for proper permissions
            });
            
            if (user && user.isSignedIn()) {
                console.log('Google sign in successful');
                this.isGoogleConnected = true;
                this.syncStatus = 'online';
                
                // Setup Drive folder and files
                await this.setupDriveFolder();
                
                // Perform initial sync
                await this.performFullSync();
                
                this.hideAuthBanner();
                this.updateSyncStatus();
                this.saveGoogleSettings();
                
                this.showMessage('Successfully connected to Google Drive!', 'success');
            } else {
                throw new Error('Sign in was not successful');
            }
        } catch (error) {
            console.error('Google Drive connection failed:', error);
            this.syncStatus = 'error';
            this.updateSyncStatus();
            
            // Provide more specific error messages
            let errorMessage = 'Failed to connect to Google Drive. ';
            if (error.error === 'popup_blocked_by_browser') {
                errorMessage += 'Please allow popups for this site and try again.';
            } else if (error.error === 'access_denied') {
                errorMessage += 'Access was denied. Please try again and grant the necessary permissions.';
            } else {
                errorMessage += 'Please check your internet connection and try again.';
            }
            
            this.showMessage(errorMessage, 'error');
        }
    }
    
    async setupDriveFolder() {
        try {
            console.log('Setting up Drive folder...');
            
            // Check if ExpenseTracker folder exists
            const folderResponse = await window.gapi.client.drive.files.list({
                q: `name='${this.driveConfig.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                spaces: 'drive'
            });
            
            let folderId;
            if (folderResponse.result.files.length === 0) {
                console.log('Creating ExpenseTracker folder...');
                // Create folder
                const createResponse = await window.gapi.client.drive.files.create({
                    resource: {
                        name: this.driveConfig.folderName,
                        mimeType: 'application/vnd.google-apps.folder'
                    }
                });
                folderId = createResponse.result.id;
                console.log('Folder created with ID:', folderId);
            } else {
                folderId = folderResponse.result.files[0].id;
                console.log('Found existing folder with ID:', folderId);
            }
            
            this.driveFolderId = folderId;
            
            // Setup individual data files
            await this.setupDataFiles();
            
        } catch (error) {
            console.error('Drive folder setup failed:', error);
            throw error;
        }
    }
    
    async setupDataFiles() {
        const fileNames = Object.values(this.driveConfig.files);
        
        for (const fileName of fileNames) {
            try {
                console.log(`Setting up file: ${fileName}`);
                
                // Check if file exists
                const fileResponse = await window.gapi.client.drive.files.list({
                    q: `name='${fileName}' and '${this.driveFolderId}' in parents and trashed=false`,
                    spaces: 'drive'
                });
                
                if (fileResponse.result.files.length === 0) {
                    console.log(`Creating file: ${fileName}`);
                    // Create empty file
                    const createResponse = await window.gapi.client.request({
                        path: 'https://www.googleapis.com/upload/drive/v3/files',
                        method: 'POST',
                        params: {
                            uploadType: 'multipart'
                        },
                        headers: {
                            'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
                        },
                        body: this.createMultipartBody({
                            name: fileName,
                            parents: [this.driveFolderId]
                        }, JSON.stringify([]))
                    });
                    
                    // Store file reference
                    const dataType = Object.keys(this.driveConfig.files).find(
                        key => this.driveConfig.files[key] === fileName
                    );
                    if (dataType) {
                        this.driveFiles[dataType] = createResponse.result.id;
                        console.log(`File ${fileName} created with ID: ${createResponse.result.id}`);
                    }
                } else {
                    // Store existing file reference
                    const dataType = Object.keys(this.driveConfig.files).find(
                        key => this.driveConfig.files[key] === fileName
                    );
                    if (dataType) {
                        this.driveFiles[dataType] = fileResponse.result.files[0].id;
                        console.log(`Found existing file ${fileName} with ID: ${fileResponse.result.files[0].id}`);
                    }
                }
            } catch (error) {
                console.error(`Failed to setup file ${fileName}:`, error);
            }
        }
    }
    
    createMultipartBody(metadata, data) {
        const delimiter = 'foo_bar_baz';
        const close_delim = `\r\n--${delimiter}--`;
        
        let body = `--${delimiter}\r\n`;
        body += 'Content-Type: application/json\r\n\r\n';
        body += JSON.stringify(metadata) + '\r\n';
        body += `--${delimiter}\r\n`;
        body += 'Content-Type: application/json\r\n\r\n';
        body += data;
        body += close_delim;
        
        return body;
    }
    
    async performFullSync() {
        if (!this.isGoogleConnected) return;
        
        try {
            console.log('Performing full sync...');
            this.syncStatus = 'syncing';
            this.updateSyncStatus();
            
            // Sync all data types
            await this.syncDataToDrive('expenses', this.expenses);
            await this.syncDataToDrive('paymentMethods', this.paymentMethods);
            await this.syncDataToDrive('reminders', this.reminders);
            
            this.lastSyncTime = new Date().toISOString();
            this.syncStatus = 'online';
            this.saveGoogleSettings();
            this.updateSyncStatus();
            
            console.log('Full sync completed successfully');
            
        } catch (error) {
            console.error('Full sync failed:', error);
            this.syncStatus = 'error';
            this.updateSyncStatus();
        }
    }
    
    async syncDataToDrive(dataType, data) {
        if (!this.driveFiles[dataType]) return;
        
        try {
            console.log(`Syncing ${dataType} to Drive...`);
            await window.gapi.client.request({
                path: `https://www.googleapis.com/upload/drive/v3/files/${this.driveFiles[dataType]}`,
                method: 'PATCH',
                params: {
                    uploadType: 'media'
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            console.log(`${dataType} synced successfully`);
        } catch (error) {
            console.error(`Failed to sync ${dataType}:`, error);
        }
    }
    
    async loadDataFromDrive(dataType) {
        if (!this.driveFiles[dataType]) return [];
        
        try {
            const response = await window.gapi.client.drive.files.get({
                fileId: this.driveFiles[dataType],
                alt: 'media'
            });
            
            return JSON.parse(response.body || '[]');
        } catch (error) {
            console.error(`Failed to load ${dataType} from Drive:`, error);
            return [];
        }
    }
    
    async manualSync() {
        if (!this.isGoogleConnected) {
            this.showMessage('Please connect to Google Drive first', 'error');
            return;
        }
        
        try {
            await this.performFullSync();
            this.showMessage('Manual sync completed successfully!', 'success');
        } catch (error) {
            this.showMessage('Manual sync failed. Please try again.', 'error');
        }
    }
    
    showSyncSettings() {
        const modal = document.getElementById('sync-settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.updateSyncSettingsModal();
        }
    }
    
    hideSyncSettings() {
        const modal = document.getElementById('sync-settings-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    updateSyncSettingsModal() {
        const connectionStatus = document.getElementById('connection-status');
        const lastSync = document.getElementById('last-sync');
        const dataCount = document.getElementById('data-count');
        const manualSyncBtn = document.querySelector('[onclick="app.manualSync()"]');
        
        if (connectionStatus) {
            connectionStatus.textContent = this.isGoogleConnected ? 'Google Drive Connected' : 'Local Storage Only';
        }
        
        if (lastSync) {
            if (this.lastSyncTime) {
                const syncDate = new Date(this.lastSyncTime);
                lastSync.textContent = syncDate.toLocaleString();
            } else {
                lastSync.textContent = 'Never';
            }
        }
        
        if (dataCount) {
            dataCount.textContent = `${this.expenses.length} expenses, ${this.paymentMethods.length} methods, ${this.reminders.length} reminders`;
        }
        
        if (manualSyncBtn) {
            manualSyncBtn.disabled = !this.isGoogleConnected;
        }
    }
    
    updateSyncStatus() {
        const syncDot = document.getElementById('sync-dot');
        const syncText = document.getElementById('sync-text');
        const authBanner = document.getElementById('auth-banner');
        const syncStatus = document.getElementById('sync-status');
        
        if (syncDot && syncText) {
            syncDot.className = `sync-dot ${this.syncStatus}`;
            
            switch (this.syncStatus) {
                case 'online':
                    syncText.textContent = 'Google Drive Connected';
                    break;
                case 'syncing':
                    syncText.textContent = 'Syncing...';
                    break;
                case 'error':
                    syncText.textContent = 'Sync Error';
                    break;
                default:
                    syncText.textContent = 'Local Storage';
            }
        }
        
        // Show/hide appropriate status bars
        if (this.isGoogleConnected) {
            if (authBanner) authBanner.classList.add('hidden');
            if (syncStatus) syncStatus.classList.remove('hidden');
        } else {
            if (authBanner) authBanner.classList.remove('hidden');
            if (syncStatus) syncStatus.classList.add('hidden');
        }
    }
    
    hideAuthBanner() {
        const authBanner = document.getElementById('auth-banner');
        if (authBanner) {
            authBanner.classList.add('hidden');
        }
        
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            syncStatus.classList.remove('hidden');
        }
    }
    
    updateSettingsView() {
        const connectionStatus = document.getElementById('google-connection-status');
        if (connectionStatus) {
            const statusIndicator = connectionStatus.querySelector('.status-indicator');
            const statusDot = connectionStatus.querySelector('.status-dot');
            const statusText = statusIndicator?.querySelector('span:last-child');
            
            if (this.isGoogleConnected && statusDot && statusText) {
                statusDot.className = 'status-dot online';
                statusText.textContent = 'Connected to Google Drive';
                const descP = connectionStatus.querySelector('p');
                if (descP) descP.textContent = 'Your data is syncing with Google Drive automatically.';
            } else if (statusDot && statusText) {
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'Not Connected';
                const descP = connectionStatus.querySelector('p');
                if (descP) descP.textContent = 'Connect to Google Drive to sync your data across devices.';
            }
        }
    }
    
    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        const expenseDateField = document.getElementById('expense-date');
        if (expenseDateField) {
            expenseDateField.value = today;
        }
        
        // Set reminder due date to tomorrow by default
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const reminderDateField = document.getElementById('reminder-due-date');
        if (reminderDateField) {
            reminderDateField.value = tomorrow.toISOString().split('T')[0];
        }
    }
    
    populateDropdowns() {
        // Expense categories
        const categorySelect = document.getElementById('expense-category');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            this.expenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }
        
        // Payment method types
        const typeSelect = document.getElementById('pm-type');
        if (typeSelect) {
            typeSelect.innerHTML = '<option value="">Select Type</option>';
            this.paymentMethodTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                typeSelect.appendChild(option);
            });
        }
        
        // Recurrence options
        const recurrenceSelect = document.getElementById('reminder-recurrence');
        if (recurrenceSelect) {
            recurrenceSelect.innerHTML = '<option value="">Select Recurrence</option>';
            this.recurrenceOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                recurrenceSelect.appendChild(optionElement);
            });
        }
        
        // Always populate payment method dropdowns after initialization
        this.updatePaymentMethodDropdowns();
    }
    
    updatePaymentMethodDropdowns() {
        // Update payment method dropdowns - make sure elements exist first
        const expenseDropdown = document.getElementById('expense-payment-method');
        const reminderDropdown = document.getElementById('reminder-payment-method');
        
        // Clear and repopulate expense payment method dropdown
        if (expenseDropdown) {
            const currentValue = expenseDropdown.value; // Preserve selection if any
            expenseDropdown.innerHTML = '<option value="">Select Payment Method</option>';
            this.paymentMethods.forEach(method => {
                const option = document.createElement('option');
                option.value = method.id;
                option.textContent = `${method.name}${method.lastFour ? ` (*${method.lastFour})` : ''}`;
                if (method.id === currentValue) {
                    option.selected = true;
                }
                expenseDropdown.appendChild(option);
            });
        }
        
        // Clear and repopulate reminder payment method dropdown
        if (reminderDropdown) {
            const currentValue = reminderDropdown.value; // Preserve selection if any
            reminderDropdown.innerHTML = '<option value="">Select Payment Method</option>';
            this.paymentMethods.forEach(method => {
                const option = document.createElement('option');
                option.value = method.id;
                option.textContent = `${method.name}${method.lastFour ? ` (*${method.lastFour})` : ''}`;
                if (method.id === currentValue) {
                    option.selected = true;
                }
                reminderDropdown.appendChild(option);
            });
        }
    }
    
    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show selected view
        const targetView = document.getElementById(viewName);
        if (targetView) {
            targetView.classList.add('active');
        }
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        this.currentView = viewName;
        
        // Update view-specific content and refresh dropdowns IMMEDIATELY for all views
        this.updatePaymentMethodDropdowns(); // Always update dropdowns when switching views
        
        if (viewName === 'dashboard') {
            this.updateDashboard();
        } else if (viewName === 'add-expense') {
            this.setCurrentDate();
            // Additional refresh for add expense view to ensure dropdowns are populated
            setTimeout(() => this.updatePaymentMethodDropdowns(), 50);
        } else if (viewName === 'payment-methods') {
            this.updatePaymentMethodsList();
        } else if (viewName === 'reminders') {
            this.updateRemindersList();
        } else if (viewName === 'analytics') {
            this.updateAnalytics();
        } else if (viewName === 'settings') {
            this.updateSettingsView();
        }
    }
    
    async addExpense() {
        const expense = {
            id: Date.now(),
            date: document.getElementById('expense-date').value,
            amount: parseFloat(document.getElementById('expense-amount').value),
            description: document.getElementById('expense-description').value,
            category: document.getElementById('expense-category').value,
            paymentMethod: document.getElementById('expense-payment-method').value,
            paymentMethodName: this.getPaymentMethodName(document.getElementById('expense-payment-method').value),
            createdDate: new Date().toISOString()
        };
        
        this.expenses.unshift(expense); // Add to beginning for recent display
        this.saveExpenses();
        this.resetExpenseForm();
        this.updateDashboard();
        this.showView('dashboard');
        
        // Auto-sync to Google Drive
        if (this.isGoogleConnected) {
            try {
                await this.syncDataToDrive('expenses', this.expenses);
                this.lastSyncTime = new Date().toISOString();
                this.saveGoogleSettings();
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }
        
        // Show success message
        this.showMessage('Expense added successfully!', 'success');
    }
    
    getPaymentMethodName(id) {
        const method = this.paymentMethods.find(m => m.id === id);
        return method ? method.name : '';
    }
    
    resetExpenseForm() {
        const form = document.getElementById('expense-form');
        if (form) {
            form.reset();
            this.setCurrentDate();
        }
    }
    
    async addPaymentMethod() {
        const paymentMethod = {
            id: 'pm_' + Date.now().toString(),
            name: document.getElementById('pm-name').value,
            type: document.getElementById('pm-type').value,
            lastFour: document.getElementById('pm-last-four').value,
            color: document.getElementById('pm-color').value,
            isDefault: this.paymentMethods.length === 0,
            createdDate: new Date().toISOString()
        };
        
        this.paymentMethods.push(paymentMethod);
        this.savePaymentMethods();
        
        // Update ALL relevant UI components immediately and multiple times to ensure consistency
        this.updatePaymentMethodDropdowns(); // Update dropdowns immediately
        this.updatePaymentMethodsList(); // Update the list view
        this.hidePaymentMethodForm();
        
        // Auto-sync to Google Drive
        if (this.isGoogleConnected) {
            try {
                await this.syncDataToDrive('paymentMethods', this.paymentMethods);
                this.lastSyncTime = new Date().toISOString();
                this.saveGoogleSettings();
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }
        
        this.showMessage('Payment method added successfully!', 'success');
        
        // Multiple delayed refreshes to ensure dropdowns are populated across all views
        setTimeout(() => {
            this.updatePaymentMethodDropdowns();
        }, 100);
        
        setTimeout(() => {
            this.updatePaymentMethodDropdowns();
        }, 500);
    }
    
    async deletePaymentMethod(id) {
        if (confirm('Are you sure you want to delete this payment method?')) {
            this.paymentMethods = this.paymentMethods.filter(method => method.id !== id);
            this.savePaymentMethods();
            this.updatePaymentMethodDropdowns();
            this.updatePaymentMethodsList();
            
            // Auto-sync to Google Drive
            if (this.isGoogleConnected) {
                try {
                    await this.syncDataToDrive('paymentMethods', this.paymentMethods);
                    this.lastSyncTime = new Date().toISOString();
                    this.saveGoogleSettings();
                } catch (error) {
                    console.error('Auto-sync failed:', error);
                }
            }
            
            this.showMessage('Payment method deleted successfully!', 'success');
        }
    }
    
    async setDefaultPaymentMethod(id) {
        this.paymentMethods.forEach(method => {
            method.isDefault = method.id === id;
        });
        this.savePaymentMethods();
        this.updatePaymentMethodsList();
        
        // Auto-sync to Google Drive
        if (this.isGoogleConnected) {
            try {
                await this.syncDataToDrive('paymentMethods', this.paymentMethods);
                this.lastSyncTime = new Date().toISOString();
                this.saveGoogleSettings();
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }
        
        this.showMessage('Default payment method updated!', 'success');
    }
    
    async addReminder() {
        const reminderPaymentMethodId = document.getElementById('reminder-payment-method').value;
        
        const reminder = {
            id: Date.now(),
            name: document.getElementById('reminder-name').value,
            amount: parseFloat(document.getElementById('reminder-amount').value) || 0,
            dueDate: document.getElementById('reminder-due-date').value,
            recurrence: document.getElementById('reminder-recurrence').value,
            paymentMethod: reminderPaymentMethodId,
            paymentMethodName: this.getPaymentMethodName(reminderPaymentMethodId),
            reminderDays: parseInt(document.getElementById('reminder-days').value),
            isActive: true,
            createdDate: new Date().toISOString()
        };
        
        this.reminders.push(reminder);
        this.saveReminders();
        this.updateRemindersList();
        this.hideReminderForm();
        this.updateDashboard();
        
        // Auto-sync to Google Drive
        if (this.isGoogleConnected) {
            try {
                await this.syncDataToDrive('reminders', this.reminders);
                this.lastSyncTime = new Date().toISOString();
                this.saveGoogleSettings();
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }
        
        this.showMessage('Reminder added successfully!', 'success');
    }
    
    async deleteReminder(id) {
        if (confirm('Are you sure you want to delete this reminder?')) {
            this.reminders = this.reminders.filter(reminder => reminder.id !== id);
            this.saveReminders();
            this.updateRemindersList();
            this.updateDashboard();
            
            // Auto-sync to Google Drive
            if (this.isGoogleConnected) {
                try {
                    await this.syncDataToDrive('reminders', this.reminders);
                    this.lastSyncTime = new Date().toISOString();
                    this.saveGoogleSettings();
                } catch (error) {
                    console.error('Auto-sync failed:', error);
                }
            }
            
            this.showMessage('Reminder deleted successfully!', 'success');
        }
    }
    
    async markReminderPaid(reminderId) {
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (!reminder) return;
        
        // Create expense from reminder
        const expense = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            amount: reminder.amount,
            description: `${reminder.name} - Paid`,
            category: 'Other',
            paymentMethod: reminder.paymentMethod,
            paymentMethodName: reminder.paymentMethodName,
            createdDate: new Date().toISOString()
        };
        
        this.expenses.unshift(expense);
        this.saveExpenses();
        
        // Update reminder due date based on recurrence
        const nextDueDate = this.calculateNextDueDate(reminder.dueDate, reminder.recurrence);
        const reminderIndex = this.reminders.findIndex(r => r.id === reminder.id);
        if (reminderIndex !== -1) {
            this.reminders[reminderIndex].dueDate = nextDueDate;
            this.saveReminders();
        }
        
        // Auto-sync both to Google Drive
        if (this.isGoogleConnected) {
            try {
                await this.syncDataToDrive('expenses', this.expenses);
                await this.syncDataToDrive('reminders', this.reminders);
                this.lastSyncTime = new Date().toISOString();
                this.saveGoogleSettings();
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }
        
        this.updateRemindersList();
        this.updateDashboard();
        this.showMessage('Payment recorded and reminder updated!', 'success');
    }
    
    calculateNextDueDate(currentDate, recurrence) {
        const date = new Date(currentDate);
        
        switch (recurrence) {
            case 'Weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'Bi-weekly':
                date.setDate(date.getDate() + 14);
                break;
            case 'Monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'Quarterly':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'Half-yearly':
                date.setMonth(date.getMonth() + 6);
                break;
            case 'Yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }
        
        return date.toISOString().split('T')[0];
    }
    
    // Data Management Methods
    exportData() {
        const data = {
            expenses: this.expenses,
            paymentMethods: this.paymentMethods,
            reminders: this.reminders,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `expense-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showMessage('Data exported successfully!', 'success');
    }
    
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.expenses) this.expenses = data.expenses;
                    if (data.paymentMethods) this.paymentMethods = data.paymentMethods;
                    if (data.reminders) this.reminders = data.reminders;
                    
                    this.saveData();
                    this.updateDashboard();
                    this.updatePaymentMethodDropdowns();
                    
                    // Auto-sync to Google Drive
                    if (this.isGoogleConnected) {
                        await this.performFullSync();
                    }
                    
                    this.showMessage('Data imported successfully!', 'success');
                } catch (error) {
                    this.showMessage('Failed to import data. Please check the file format.', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    async clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.expenses = [];
            this.paymentMethods = [];
            this.reminders = [];
            
            this.saveData();
            this.updateDashboard();
            this.updatePaymentMethodDropdowns();
            this.updatePaymentMethodsList();
            this.updateRemindersList();
            
            // Auto-sync to Google Drive
            if (this.isGoogleConnected) {
                await this.performFullSync();
            }
            
            this.showMessage('All data cleared successfully!', 'success');
        }
    }
    
    // Existing methods continue below...
    formatCurrency(amount) {
        return `${this.currencySymbol}${amount.toFixed(2)}`;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    updateDashboard() {
        this.updateMonthlyTotal();
        this.updatePaymentBreakdown();
        this.updateRecentTransactions();
        this.updateUpcomingReminders();
    }
    
    updateMonthlyTotal() {
        const currentMonthExpenses = this.getCurrentMonthExpenses();
        const total = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalElement = document.getElementById('monthly-total');
        if (totalElement) {
            totalElement.textContent = this.formatCurrency(total);
        }
    }
    
    getCurrentMonthExpenses() {
        const currentMonth = this.currentMonth.getMonth();
        const currentYear = this.currentMonth.getFullYear();
        
        return this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });
    }
    
    updatePaymentBreakdown() {
        const container = document.getElementById('payment-breakdown');
        if (!container) return;
        
        const currentMonthExpenses = this.getCurrentMonthExpenses();
        
        // If no payment methods exist, show appropriate message
        if (this.paymentMethods.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4>No payment methods</h4>
                    <p>${this.emptyStateMessages.paymentMethods}</p>
                </div>
            `;
            return;
        }
        
        // Group expenses by payment method
        const paymentTotals = {};
        currentMonthExpenses.forEach(expense => {
            if (!paymentTotals[expense.paymentMethod]) {
                paymentTotals[expense.paymentMethod] = 0;
            }
            paymentTotals[expense.paymentMethod] += expense.amount;
        });
        
        container.innerHTML = '';
        
        if (Object.keys(paymentTotals).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4>No expenses this month</h4>
                    <p>Your payment method usage will appear here</p>
                </div>
            `;
            return;
        }
        
        Object.entries(paymentTotals).forEach(([methodId, total]) => {
            const method = this.paymentMethods.find(m => m.id === methodId);
            if (method) {
                const item = document.createElement('div');
                item.className = 'payment-item';
                item.innerHTML = `
                    <div class="payment-item__color" style="background: ${method.color}"></div>
                    <div class="payment-item__info">
                        <div class="payment-item__name">${method.name}</div>
                        <div class="payment-item__amount">${this.formatCurrency(total)}</div>
                    </div>
                `;
                container.appendChild(item);
            }
        });
    }
    
    updateRecentTransactions() {
        const container = document.getElementById('recent-transactions');
        if (!container) return;
        
        const recentExpenses = this.expenses
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
        
        container.innerHTML = '';
        
        if (recentExpenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4>No transactions yet</h4>
                    <p>${this.emptyStateMessages.expenses}</p>
                </div>
            `;
            return;
        }
        
        recentExpenses.forEach(expense => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="transaction-info">
                    <h4>${expense.description}</h4>
                    <div class="transaction-meta">
                        <span>${this.formatDate(expense.date)}</span>
                        <span>${expense.category}</span>
                        <span>${expense.paymentMethodName}</span>
                    </div>
                </div>
                <div class="transaction-amount">-${this.formatCurrency(expense.amount)}</div>
            `;
            container.appendChild(item);
        });
    }
    
    updateUpcomingReminders() {
        const container = document.getElementById('upcoming-reminders');
        if (!container) return;
        
        const today = new Date();
        const upcomingReminders = this.reminders
            .filter(reminder => {
                const dueDate = new Date(reminder.dueDate);
                const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                return reminder.isActive && daysDiff <= reminder.reminderDays;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        container.innerHTML = '';
        
        if (upcomingReminders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4>No upcoming payments</h4>
                    <p>${this.emptyStateMessages.reminders}</p>
                </div>
            `;
            return;
        }
        
        upcomingReminders.forEach(reminder => {
            const dueDate = new Date(reminder.dueDate);
            const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            const item = document.createElement('div');
            item.className = 'reminder-item';
            item.innerHTML = `
                <div class="reminder-info">
                    <h4>${reminder.name}</h4>
                    <div class="reminder-due">Due: ${this.formatDate(reminder.dueDate)} (${daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Tomorrow' : `${daysDiff} days`})</div>
                </div>
                <div class="reminder-amount">${this.formatCurrency(reminder.amount)}</div>
            `;
            container.appendChild(item);
        });
    }
    
    updatePaymentMethodsList() {
        const container = document.getElementById('payment-methods-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.paymentMethods.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No payment methods</h3>
                    <p>${this.emptyStateMessages.paymentMethods}</p>
                    <button class="btn btn--primary" onclick="showAddPaymentMethodForm()">Add First Payment Method</button>
                </div>
            `;
            return;
        }
        
        this.paymentMethods.forEach(method => {
            const card = document.createElement('div');
            card.className = 'payment-method-card';
            card.innerHTML = `
                ${method.isDefault ? '<div class="default-badge">Default</div>' : ''}
                <div class="payment-method-header">
                    <div class="payment-method-color" style="background: ${method.color}"></div>
                    <div class="payment-method-name">${method.name}</div>
                </div>
                <div class="payment-method-details">
                    <div>${method.type}</div>
                    ${method.lastFour ? `<div>**** ${method.lastFour}</div>` : ''}
                </div>
                <div class="payment-method-actions">
                    <button onclick="app.setDefaultPaymentMethod('${method.id}')" title="Set as default">⭐ Default</button>
                    <button onclick="app.deletePaymentMethod('${method.id}')" title="Delete">🗑️ Delete</button>
                </div>
            `;
            container.appendChild(card);
        });
    }
    
    updateRemindersList() {
        const container = document.getElementById('reminders-list');
        if (!container) return;
        
        const today = new Date();
        
        container.innerHTML = '';
        
        if (this.reminders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No reminders</h3>
                    <p>${this.emptyStateMessages.reminders}</p>
                    <button class="btn btn--primary" onclick="showAddReminderForm()">Add First Reminder</button>
                </div>
            `;
            return;
        }
        
        this.reminders.forEach(reminder => {
            const dueDate = new Date(reminder.dueDate);
            const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let statusClass = '';
            if (daysDiff < 0) statusClass = 'overdue';
            else if (daysDiff <= reminder.reminderDays) statusClass = 'due-soon';
            
            const card = document.createElement('div');
            card.className = `reminder-card ${statusClass}`;
            card.innerHTML = `
                <div class="reminder-header">
                    <div class="reminder-title">${reminder.name}</div>
                    <div class="reminder-due-date">Due: ${this.formatDate(reminder.dueDate)}</div>
                </div>
                <div class="reminder-body">
                    <div class="reminder-amount-display">${this.formatCurrency(reminder.amount)}</div>
                    <div class="reminder-recurrence">${reminder.recurrence} • ${reminder.paymentMethodName}</div>
                </div>
                <div class="reminder-actions">
                    <button class="btn btn--primary btn--sm" onclick="app.markReminderPaid(${reminder.id})">Mark as Paid</button>
                    <button class="btn btn--outline btn--sm" onclick="app.deleteReminder(${reminder.id})">Delete</button>
                </div>
            `;
            container.appendChild(card);
        });
    }
    
    updateAnalytics() {
        const currentMonthExpenses = this.getCurrentMonthExpenses();
        
        if (currentMonthExpenses.length === 0) {
            const analyticsContent = document.getElementById('analytics-content');
            if (analyticsContent) {
                analyticsContent.innerHTML = `
                    <div class="empty-state">
                        <h3>No data available</h3>
                        <p>${this.emptyStateMessages.analytics}</p>
                    </div>
                `;
            }
            return;
        }
        
        // Restore the charts container if it was replaced by empty state
        if (!document.getElementById('category-chart')) {
            const analyticsContent = document.getElementById('analytics-content');
            if (analyticsContent) {
                analyticsContent.innerHTML = `
                    <div class="card">
                        <div class="card__body">
                            <h3>Spending by Category</h3>
                            <div class="chart-container" style="position: relative; height: 300px;">
                                <canvas id="category-chart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card__body">
                            <h3>Payment Method Usage</h3>
                            <div class="chart-container" style="position: relative; height: 300px;">
                                <canvas id="payment-method-chart"></canvas>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        this.updateCategoryChart();
        this.updatePaymentMethodChart();
    }
    
    updateCategoryChart() {
        const currentMonthExpenses = this.getCurrentMonthExpenses();
        const categoryTotals = {};
        
        currentMonthExpenses.forEach(expense => {
            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = 0;
            }
            categoryTotals[expense.category] += expense.amount;
        });
        
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;
        
        if (this.categoryChart) {
            this.categoryChart.destroy();
        }
        
        this.categoryChart = new Chart(ctx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: Object.keys(categoryTotals),
                datasets: [{
                    data: Object.values(categoryTotals),
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.label}: ${this.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    updatePaymentMethodChart() {
        const currentMonthExpenses = this.getCurrentMonthExpenses();
        const paymentTotals = {};
        
        currentMonthExpenses.forEach(expense => {
            if (!paymentTotals[expense.paymentMethodName]) {
                paymentTotals[expense.paymentMethodName] = 0;
            }
            paymentTotals[expense.paymentMethodName] += expense.amount;
        });
        
        const ctx = document.getElementById('payment-method-chart');
        if (!ctx) return;
        
        if (this.paymentChart) {
            this.paymentChart.destroy();
        }
        
        this.paymentChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(paymentTotals),
                datasets: [{
                    label: 'Amount Spent',
                    data: Object.values(paymentTotals),
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Amount: ${this.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => {
                                return this.formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }
    
    changeMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.updateCurrentMonthDisplay();
        this.updateDashboard();
        if (this.currentView === 'analytics') {
            this.updateAnalytics();
        }
    }
    
    updateCurrentMonthDisplay() {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        const display = `${monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
        const displayElement = document.getElementById('current-month-display');
        if (displayElement) {
            displayElement.textContent = display;
        }
    }
    
    showAddPaymentMethodForm() {
        const modal = document.getElementById('payment-method-modal');
        const form = document.getElementById('payment-method-form');
        if (modal && form) {
            modal.classList.remove('hidden');
            form.reset();
        }
    }
    
    hidePaymentMethodForm() {
        const modal = document.getElementById('payment-method-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    showAddReminderForm() {
        const modal = document.getElementById('reminder-modal');
        const form = document.getElementById('reminder-form');
        if (modal && form) {
            modal.classList.remove('hidden');
            form.reset();
            this.setCurrentDate();
            // Ensure dropdowns are populated when reminder form opens
            setTimeout(() => this.updatePaymentMethodDropdowns(), 100);
        }
    }
    
    hideReminderForm() {
        const modal = document.getElementById('reminder-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `status status--${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            max-width: 300px;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            if (document.body.contains(messageEl)) {
                document.body.removeChild(messageEl);
            }
        }, 3000);
    }
}

// Global functions for template usage
function showView(viewName) {
    if (window.app) {
        window.app.showView(viewName);
    }
}

function resetExpenseForm() {
    if (window.app) {
        window.app.resetExpenseForm();
    }
}

function showAddPaymentMethodForm() {
    if (window.app) {
        window.app.showAddPaymentMethodForm();
    }
}

function hidePaymentMethodForm() {
    if (window.app) {
        window.app.hidePaymentMethodForm();
    }
}

function showAddReminderForm() {
    if (window.app) {
        window.app.showAddReminderForm();
    }
}

function hideReminderForm() {
    if (window.app) {
        window.app.hideReminderForm();
    }
}

function changeMonth(direction) {
    if (window.app) {
        window.app.changeMonth(direction);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ExpenseTracker();
});
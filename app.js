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
            "Food & Dining", "Groceries", "Transportation", "Fuel", "House Rent",
            "Utilities", "Internet & Phone", "Healthcare", "Entertainment", "Shopping",
            "Education", "Travel", "Insurance", "Investments", "EMI Payments", "Other"
        ];
        
        this.paymentMethodTypes = [
            "Credit Card", "Debit Card", "Bank Account", "UPI", "Digital Wallet", "Cash"
        ];
        
        this.recurrenceOptions = [
            "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Half-yearly", "Yearly"
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
        console.log('Data loaded:', {
            expenses: this.expenses.length,
            paymentMethods: this.paymentMethods.length,
            reminders: this.reminders.length
        });
        
        this.setupEventListeners();
        this.populateDropdowns();
        this.updateDashboard();
        this.setCurrentDate();
        this.updateCurrentMonthDisplay();
        this.updateSyncStatus();
        this.setupTouchEvents();
        
        // Set initial sync status to offline until Google connects
        this.syncStatus = 'offline';
        this.updateSyncStatus();
    }
    
    // ✨ REPLACED FUNCTION
    async initializeGoogleDrive() {
        try {
            // This function now only loads the GAPI client library.
            // Authentication is handled by the new connectGoogleDrive method.
            await new Promise((resolve, reject) => {
                if (window.gapi) {
                    window.gapi.load('client', {
                        callback: resolve,
                        onerror: reject,
                        timeout: 5000, // Add a timeout
                        ontimeout: reject
                    });
                } else {
                    console.error("GAPI script not loaded yet.");
                    reject("GAPI not loaded");
                }
            });
    
            // Initialize the GAPI client with the Drive discovery document
            await window.gapi.client.init({
                discoveryDocs: this.googleCredentials.discoveryDocs,
            });
    
            console.log('GAPI client initialized for Drive API.');
            this.syncStatus = 'offline';
            this.updateSyncStatus();
    
        } catch (error) {
            console.error('GAPI client initialization failed:', error);
            this.syncStatus = 'offline';
            this.updateSyncStatus();
            this.showMessage('Could not initialize Google connection.', 'error');
        }
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
            
            console.log('Loaded payment methods:', this.paymentMethods);
            
            // Load Google settings
            this.lastSyncTime = window.localStorage?.getItem('lastSyncTime');
            this.isGoogleConnected = window.localStorage?.getItem('isGoogleConnected') === 'true';
        } catch (error) {
            console.error('Error loading data:', error);
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
                console.log('Saved payment methods:', this.paymentMethods);
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

    // ✨ REPLACED FUNCTION
    connectGoogleDrive() {
        this.syncStatus = 'syncing';
        this.updateSyncStatus();
        this.showMessage('Connecting to Google Drive...', 'info');
    
        try {
            // Initialize a token client for the user to grant scopes
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.googleCredentials.clientId,
                scope: this.googleCredentials.scopes.join(' '),
                callback: async (tokenResponse) => {
                    if (tokenResponse.error) {
                        throw new Error(tokenResponse.error);
                    }
                    console.log('Access token received.');
    
                    // Authorize the GAPI client library with the user's token
                    window.gapi.client.setToken(tokenResponse);
    
                    this.isGoogleConnected = true;
                    this.syncStatus = 'online';
    
                    // Setup Drive folder and files
                    await this.setupDriveFolder();
    
                    // Perform initial sync
                    await this.performFullSync();
    
                    this.updateSyncStatus();
                    this.saveGoogleSettings();
                    this.updateSettingsView();
    
                    this.showMessage('Successfully connected to Google Drive!', 'success');
                },
            });
    
            // Prompt the user to select an account and grant access
            tokenClient.requestAccessToken();
    
        } catch (error) {
            console.error('Google Drive connection failed:', error);
            this.syncStatus = 'offline';
            this.updateSyncStatus();
            this.showMessage('Unable to connect to Google Drive.', 'error');
        }
    }
    
    async setupDriveFolder() {
        try {
            // Check if ExpenseTracker folder exists
            const folderResponse = await window.gapi.client.drive.files.list({
                q: `name='${this.driveConfig.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                spaces: 'drive'
            });
            
            let folderId;
            if (folderResponse.result.files.length === 0) {
                // Create folder
                const createResponse = await window.gapi.client.drive.files.create({
                    resource: {
                        name: this.driveConfig.folderName,
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                });
                folderId = createResponse.result.id;
            } else {
                folderId = folderResponse.result.files[0].id;
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
        for (const dataType in this.driveConfig.files) {
            const fileName = this.driveConfig.files[dataType];
            try {
                // Check if file exists
                const fileResponse = await window.gapi.client.drive.files.list({
                    q: `name='${fileName}' and '${this.driveFolderId}' in parents and trashed=false`,
                    spaces: 'drive',
                    fields: 'files(id)'
                });
                
                if (fileResponse.result.files.length === 0) {
                    // Create empty file
                    const fileMetadata = {
                        name: fileName,
                        parents: [this.driveFolderId]
                    };
                    const createResponse = await window.gapi.client.drive.files.create({
                        resource: fileMetadata,
                        media: {
                            mimeType: 'application/json',
                            body: JSON.stringify([])
                        },
                        fields: 'id'
                    });
                    this.driveFiles[dataType] = createResponse.result.id;
                } else {
                    this.driveFiles[dataType] = fileResponse.result.files[0].id;
                }
            } catch (error) {
                console.error(`Failed to setup file ${fileName}:`, error);
            }
        }
    }

    async performFullSync() {
        if (!this.isGoogleConnected) return;
        
        try {
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
            
        } catch (error) {
            console.error('Full sync failed:', error);
            this.syncStatus = 'online'; // Keep online status even if sync fails
            this.updateSyncStatus();
        }
    }
    
    async syncDataToDrive(dataType, data) {
        if (!this.driveFiles[dataType]) return;
        
        try {
            await window.gapi.client.request({
                path: `/upload/drive/v3/files/${this.driveFiles[dataType]}`,
                method: 'PATCH',
                params: {
                    uploadType: 'media'
                },
                body: JSON.stringify(data)
            });
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
            this.showMessage('Please connect to Google Drive first', 'info');
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
        const manualSyncBtn = document.querySelector('#sync-settings-modal .btn--primary');
        
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
        
        if (syncDot && syncText) {
            syncDot.className = `sync-dot ${this.syncStatus}`;
            
            switch (this.syncStatus) {
                case 'online':
                    syncText.textContent = 'Google Drive Connected';
                    break;
                case 'syncing':
                    syncText.textContent = 'Syncing...';
                    break;
                case 'offline':
                default:
                    syncText.textContent = 'Local Storage Only';
            }
        }
    }
    
    updateSettingsView() {
        const statusContainer = document.getElementById('google-connection-status');
        if (statusContainer) {
            const statusIndicator = statusContainer.querySelector('.status-indicator');
            const statusDot = statusContainer.querySelector('.status-dot');
            const statusText = statusIndicator?.querySelector('span:last-child');
            
            if (this.isGoogleConnected && statusDot && statusText) {
                statusDot.className = 'status-dot online';
                statusText.textContent = 'Connected to Google Drive';
                const descP = statusContainer.querySelector('p');
                if (descP) descP.textContent = 'Your data is syncing with Google Drive automatically.';
            } else if (statusDot && statusText) {
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'Not Connected';
                const descP = statusContainer.querySelector('p');
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
        console.log('Updating payment method dropdowns, current methods:', this.paymentMethods);
        
        const expenseDropdown = document.getElementById('expense-payment-method');
        const reminderDropdown = document.getElementById('reminder-payment-method');
        
        const populate = (dropdown) => {
            if (!dropdown) return;
            const currentValue = dropdown.value;
            dropdown.innerHTML = '<option value="">Select Payment Method</option>';
            
            if (this.paymentMethods.length === 0) {
                dropdown.innerHTML += '<option value="" disabled>No payment methods</option>';
            } else {
                this.paymentMethods.forEach(method => {
                    const option = document.createElement('option');
                    option.value = method.id;
                    option.textContent = `${method.name}${method.lastFour ? ` (*${method.lastFour})` : ''}`;
                    if (method.id === currentValue) {
                        option.selected = true;
                    }
                    dropdown.appendChild(option);
                });
            }
        };

        populate(expenseDropdown);
        populate(reminderDropdown);
    }
    
    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(viewName);
        if (targetView) targetView.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNavItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
        if (activeNavItem) activeNavItem.classList.add('active');
        
        this.currentView = viewName;
        
        switch(viewName) {
            case 'dashboard': this.updateDashboard(); break;
            case 'add-expense':
                this.setCurrentDate();
                this.updatePaymentMethodDropdowns();
                break;
            case 'payment-methods': this.updatePaymentMethodsList(); break;
            case 'reminders':
                this.updateRemindersList();
                this.updatePaymentMethodDropdowns();
                break;
            case 'analytics': this.updateAnalytics(); break;
            case 'settings': this.updateSettingsView(); break;
        }
    }
    
    async addExpense() {
        const paymentMethodId = document.getElementById('expense-payment-method').value;
        const paymentMethod = this.paymentMethods.find(m => m.id === paymentMethodId);

        const expense = {
            id: 'exp_' + Date.now(),
            date: document.getElementById('expense-date').value,
            amount: parseFloat(document.getElementById('expense-amount').value),
            description: document.getElementById('expense-description').value,
            category: document.getElementById('expense-category').value,
            paymentMethod: paymentMethodId,
            paymentMethodName: paymentMethod ? paymentMethod.name : 'N/A',
            createdDate: new Date().toISOString()
        };
        
        this.expenses.unshift(expense);
        this.saveExpenses();
        await this.syncDataToDrive('expenses', this.expenses);

        this.resetExpenseForm();
        this.showView('dashboard');
        this.showMessage('Expense added successfully!', 'success');
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
            id: 'pm_' + Date.now(),
            name: document.getElementById('pm-name').value,
            type: document.getElementById('pm-type').value,
            lastFour: document.getElementById('pm-last-four').value,
            color: document.getElementById('pm-color').value,
            isDefault: this.paymentMethods.length === 0,
            createdDate: new Date().toISOString()
        };
        
        this.paymentMethods.push(paymentMethod);
        this.savePaymentMethods();
        await this.syncDataToDrive('paymentMethods', this.paymentMethods);
        
        this.updatePaymentMethodsList();
        this.updatePaymentMethodDropdowns();
        this.hidePaymentMethodForm();
        this.showMessage('Payment method added successfully!', 'success');
    }
    
    async deletePaymentMethod(id) {
        if (confirm('Are you sure you want to delete this payment method?')) {
            this.paymentMethods = this.paymentMethods.filter(method => method.id !== id);
            this.savePaymentMethods();
            await this.syncDataToDrive('paymentMethods', this.paymentMethods);

            this.updatePaymentMethodDropdowns();
            this.updatePaymentMethodsList();
            this.showMessage('Payment method deleted!', 'success');
        }
    }
    
    async setDefaultPaymentMethod(id) {
        this.paymentMethods.forEach(method => method.isDefault = (method.id === id));
        this.savePaymentMethods();
        await this.syncDataToDrive('paymentMethods', this.paymentMethods);

        this.updatePaymentMethodsList();
        this.showMessage('Default payment method updated!', 'success');
    }
    
    async addReminder() {
        const paymentMethodId = document.getElementById('reminder-payment-method').value;
        const paymentMethod = this.paymentMethods.find(m => m.id === paymentMethodId);

        const reminder = {
            id: 'rem_' + Date.now(),
            name: document.getElementById('reminder-name').value,
            amount: parseFloat(document.getElementById('reminder-amount').value) || 0,
            dueDate: document.getElementById('reminder-due-date').value,
            recurrence: document.getElementById('reminder-recurrence').value,
            paymentMethod: paymentMethodId,
            paymentMethodName: paymentMethod ? paymentMethod.name : 'N/A',
            reminderDays: parseInt(document.getElementById('reminder-days').value),
            isActive: true,
            createdDate: new Date().toISOString()
        };
        
        this.reminders.push(reminder);
        this.saveReminders();
        await this.syncDataToDrive('reminders', this.reminders);

        this.updateRemindersList();
        this.hideReminderForm();
        this.updateDashboard();
        this.showMessage('Reminder added successfully!', 'success');
    }
    
    async deleteReminder(id) {
        if (confirm('Are you sure you want to delete this reminder?')) {
            this.reminders = this.reminders.filter(reminder => reminder.id !== id);
            this.saveReminders();
            await this.syncDataToDrive('reminders', this.reminders);

            this.updateRemindersList();
            this.updateDashboard();
            this.showMessage('Reminder deleted!', 'success');
        }
    }
    
    async markReminderPaid(reminderId) {
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (!reminder) return;
        
        const expense = {
            id: 'exp_' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            amount: reminder.amount,
            description: `${reminder.name} - Paid`,
            category: 'EMI Payments',
            paymentMethod: reminder.paymentMethod,
            paymentMethodName: reminder.paymentMethodName,
            createdDate: new Date().toISOString()
        };
        this.expenses.unshift(expense);
        
        if (reminder.recurrence !== "One-time") {
            reminder.dueDate = this.calculateNextDueDate(reminder.dueDate, reminder.recurrence);
        } else {
            this.reminders = this.reminders.filter(r => r.id !== reminderId);
        }
        
        this.saveExpenses();
        this.saveReminders();
        
        if (this.isGoogleConnected) {
            await this.syncDataToDrive('expenses', this.expenses);
            await this.syncDataToDrive('reminders', this.reminders);
        }
        
        this.updateRemindersList();
        this.updateDashboard();
        this.showMessage('Payment recorded and reminder updated!', 'success');
    }
    
    calculateNextDueDate(currentDate, recurrence) {
        const date = new Date(currentDate);
        date.setUTCDate(date.getUTCDate() + 1); // Fix off-by-one day issue with date parsing
        
        switch (recurrence) {
            case 'Weekly': date.setDate(date.getDate() + 7); break;
            case 'Bi-weekly': date.setDate(date.getDate() + 14); break;
            case 'Monthly': date.setMonth(date.getMonth() + 1); break;
            case 'Quarterly': date.setMonth(date.getMonth() + 3); break;
            case 'Half-yearly': date.setMonth(date.getMonth() + 6); break;
            case 'Yearly': date.setFullYear(date.getFullYear() + 1); break;
        }
        return date.toISOString().split('T')[0];
    }
    
    exportData() {
        const data = JSON.stringify({
            expenses: this.expenses,
            paymentMethods: this.paymentMethods,
            reminders: this.reminders
        }, null, 2);
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showMessage('Data exported successfully!', 'success');
    }
    
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (confirm('This will overwrite current data. Continue?')) {
                        this.expenses = data.expenses || [];
                        this.paymentMethods = data.paymentMethods || [];
                        this.reminders = data.reminders || [];
                        this.saveData();
                        await this.performFullSync();
                        this.showView('dashboard');
                        this.showMessage('Data imported successfully!', 'success');
                    }
                } catch (err) {
                    this.showMessage('Failed to import data.', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    async clearAllData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            this.expenses = [];
            this.paymentMethods = [];
            this.reminders = [];
            this.saveData();
            await this.performFullSync();
            this.showView('dashboard');
            this.showMessage('All data has been cleared!', 'success');
        }
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    }
    
    updateDashboard() {
        this.updateMonthlyTotal();
        this.updatePaymentBreakdown();
        this.updateRecentTransactions();
        this.updateUpcomingReminders();
    }
    
    getCurrentMonthExpenses() {
        const start = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const end = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
        return this.expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= start && expDate <= end;
        });
    }

    updateMonthlyTotal() {
        const total = this.getCurrentMonthExpenses().reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('monthly-total').textContent = this.formatCurrency(total);
    }
    
    updatePaymentBreakdown() {
        const container = document.getElementById('payment-breakdown');
        const breakdown = this.getCurrentMonthExpenses().reduce((acc, exp) => {
            const method = this.paymentMethods.find(m => m.id === exp.paymentMethod) || { name: 'Unknown', color: '#ccc' };
            if (!acc[method.id]) acc[method.id] = { ...method, total: 0 };
            acc[method.id].total += exp.amount;
            return acc;
        }, {});

        if (Object.keys(breakdown).length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No expenses this month to show here.</p></div>`;
            return;
        }

        container.innerHTML = Object.values(breakdown).map(item => `
            <div class="payment-item">
                <div class="payment-item__color" style="background-color: ${item.color};"></div>
                <div class="payment-item__info">
                    <div class="payment-item__name">${item.name}</div>
                    <div class="payment-item__amount">${this.formatCurrency(item.total)}</div>
                </div>
            </div>
        `).join('');
    }
    
    updateRecentTransactions() {
        const container = document.getElementById('recent-transactions');
        const recent = [...this.expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

        if (recent.length === 0) {
            container.innerHTML = `<div class="empty-state"><h4>No transactions yet</h4><p>${this.emptyStateMessages.expenses}</p></div>`;
            return;
        }

        container.innerHTML = recent.map(exp => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <h4>${exp.description}</h4>
                    <div class="transaction-meta">
                        <span>${this.formatDate(exp.date)}</span>
                        <span>• ${exp.category}</span>
                        <span>• ${exp.paymentMethodName}</span>
                    </div>
                </div>
                <div class="transaction-amount">-${this.formatCurrency(exp.amount)}</div>
            </div>
        `).join('');
    }
    
    updateUpcomingReminders() {
        const container = document.getElementById('upcoming-reminders');
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const upcoming = this.reminders
            .map(rem => {
                const dueDate = new Date(rem.dueDate);
                const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                return { ...rem, daysUntilDue: diff };
            })
            .filter(rem => rem.daysUntilDue >= 0 && rem.daysUntilDue <= (rem.reminderDays || 7))
            .sort((a,b) => a.daysUntilDue - b.daysUntilDue);

        if (upcoming.length === 0) {
            container.innerHTML = `<div class="empty-state"><h4>All clear!</h4><p>No upcoming payments due soon.</p></div>`;
            return;
        }

        container.innerHTML = upcoming.map(rem => {
            let dueText = `in ${rem.daysUntilDue} days`;
            if (rem.daysUntilDue === 0) dueText = 'Today';
            if (rem.daysUntilDue === 1) dueText = 'Tomorrow';
            return `
                <div class="reminder-item">
                    <div class="reminder-info">
                        <h4>${rem.name}</h4>
                        <div class="reminder-due">Due: ${this.formatDate(rem.dueDate)} (${dueText})</div>
                    </div>
                    <div class="reminder-amount">${this.formatCurrency(rem.amount)}</div>
                </div>
            `;
        }).join('');
    }
    
    updatePaymentMethodsList() {
        const container = document.getElementById('payment-methods-list');
        if (this.paymentMethods.length === 0) {
            container.innerHTML = `<div class="empty-state"><h3>No payment methods</h3><p>${this.emptyStateMessages.paymentMethods}</p><button class="btn btn--primary" onclick="showAddPaymentMethodForm()">Add First Method</button></div>`;
            return;
        }
        
        container.innerHTML = this.paymentMethods.map(method => `
            <div class="payment-method-card">
                ${method.isDefault ? '<div class="default-badge">Default</div>' : ''}
                <div class="payment-method-header">
                    <div class="payment-method-color" style="background-color: ${method.color};"></div>
                    <div class="payment-method-name">${method.name}</div>
                </div>
                <div class="payment-method-details">
                    <div>${method.type}</div>
                    ${method.lastFour ? `<div>**** ${method.lastFour}</div>` : ''}
                </div>
                <div class="payment-method-actions">
                    ${!method.isDefault ? `<button class="btn btn--sm" onclick="app.setDefaultPaymentMethod('${method.id}')" title="Set as default">⭐</button>` : ''}
                    <button class="btn btn--sm btn--outline" onclick="app.deletePaymentMethod('${method.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    updateRemindersList() {
        const container = document.getElementById('reminders-list');
        if (this.reminders.length === 0) {
            container.innerHTML = `<div class="empty-state"><h3>No reminders</h3><p>${this.emptyStateMessages.reminders}</p><button class="btn btn--primary" onclick="showAddReminderForm()">Add First Reminder</button></div>`;
            return;
        }

        const today = new Date();
        today.setHours(0,0,0,0);
        
        const sortedReminders = [...this.reminders].sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

        container.innerHTML = sortedReminders.map(reminder => {
            const dueDate = new Date(reminder.dueDate);
            const isOverdue = dueDate < today;
            return `
                <div class="reminder-card ${isOverdue ? 'overdue' : ''}">
                    <div class="reminder-header">
                        <div class="reminder-title">${reminder.name}</div>
                        <div class="reminder-due-date">Due: ${this.formatDate(reminder.dueDate)} ${isOverdue ? '(Overdue)' : ''}</div>
                    </div>
                    <div class="reminder-body">
                        <div class="reminder-amount-display">${this.formatCurrency(reminder.amount)}</div>
                        <div class="reminder-recurrence">${reminder.recurrence} • ${reminder.paymentMethodName}</div>
                    </div>
                    <div class="reminder-actions">
                        <button class="btn btn--primary btn--sm" onclick="app.markReminderPaid('${reminder.id}')">Mark as Paid</button>
                        <button class="btn btn--outline btn--sm" onclick="app.deleteReminder('${reminder.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateAnalytics() {
        const expenses = this.getCurrentMonthExpenses();
        const analyticsContent = document.getElementById('analytics-content');
        if (expenses.length === 0) {
            analyticsContent.innerHTML = `<div class="empty-state card"><h3>No data for this month</h3><p>${this.emptyStateMessages.analytics}</p></div>`;
            if (this.categoryChart) this.categoryChart.destroy();
            if (this.paymentChart) this.paymentChart.destroy();
            return;
        }

        if (!document.getElementById('category-chart')) {
            analyticsContent.innerHTML = `
                <div class="card"><div class="card__body"><h3>Spending by Category</h3><div class="chart-container" style="position: relative; height: 300px;"><canvas id="category-chart"></canvas></div></div></div>
                <div class="card"><div class="card__body"><h3>Payment Method Usage</h3><div class="chart-container" style="position: relative; height: 300px;"><canvas id="payment-method-chart"></canvas></div></div></div>
            `;
        }
        
        this.renderCategoryChart(expenses);
        this.renderPaymentMethodChart(expenses);
    }
    
    renderCategoryChart(expenses) {
        const totals = expenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
            return acc;
        }, {});
        
        const ctx = document.getElementById('category-chart').getContext('2d');
        if (this.categoryChart) this.categoryChart.destroy();
        this.categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(totals),
                datasets: [{ data: Object.values(totals), backgroundColor: ['#32B8C6', '#2D9A6D', '#F2C94C', '#EB5757', '#56CCF2', '#BB6BD9'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    renderPaymentMethodChart(expenses) {
        const totals = expenses.reduce((acc, exp) => {
            acc[exp.paymentMethodName] = (acc[exp.paymentMethodName] || 0) + exp.amount;
            return acc;
        }, {});

        const ctx = document.getElementById('payment-method-chart').getContext('2d');
        if (this.paymentChart) this.paymentChart.destroy();
        this.paymentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(totals),
                datasets: [{ label: 'Amount Spent', data: Object.values(totals), backgroundColor: '#2D9A6D' }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
    
    changeMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.updateCurrentMonthDisplay();
        this.updateDashboard();
        if (this.currentView === 'analytics') this.updateAnalytics();
    }
    
    updateCurrentMonthDisplay() {
        const display = this.currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
        document.getElementById('current-month-display').textContent = display;
    }
    
    showAddPaymentMethodForm() {
        document.getElementById('payment-method-modal').classList.remove('hidden');
        document.getElementById('payment-method-form').reset();
    }
    
    hidePaymentMethodForm() {
        document.getElementById('payment-method-modal').classList.add('hidden');
    }
    
    showAddReminderForm() {
        document.getElementById('reminder-modal').classList.remove('hidden');
        document.getElementById('reminder-form').reset();
        this.setCurrentDate();
        this.updatePaymentMethodDropdowns();
    }
    
    hideReminderForm() {
        document.getElementById('reminder-modal').classList.add('hidden');
    }
    
    showMessage(message, type = 'info') {
        const container = document.body;
        const messageEl = document.createElement('div');
        messageEl.className = `status status--${type} temp-message`;
        messageEl.textContent = message;
        messageEl.style.cssText = `position: fixed; top: 80px; right: 20px; z-index: 9999;`;
        container.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 3000);
    }
}

// Global functions for template usage
function showView(viewName) { window.app?.showView(viewName); }
function resetExpenseForm() { window.app?.resetExpenseForm(); }
function showAddPaymentMethodForm() { window.app?.showAddPaymentMethodForm(); }
function hidePaymentMethodForm() { window.app?.hidePaymentMethodForm(); }
function showAddReminderForm() { window.app?.showAddReminderForm(); }
function hideReminderForm() { window.app?.hideReminderForm(); }
function changeMonth(direction) { window.app?.changeMonth(direction); }

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ExpenseTracker();
});

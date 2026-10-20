// js/store.js
const Store = {
    // Load data from local storage
    get(key) {
        const data = localStorage.getItem(`alpha_tech_${key}`);
        return data ? JSON.parse(data) : null;
    },

    // Save data to local storage
    set(key, value) {
        localStorage.setItem(`alpha_tech_${key}`, JSON.stringify(value));
    },

    // Initialize the database on first run
    init() {
        // Check if we already have data
        if (!this.get('initialized')) {
            console.log("First time running. Seeding database...");
            Seed.generate();
            this.set('initialized', true);
        } else {
            console.log("Database already exists. Loading data...");
        }
        
        // Log the data to the console so you can see it
        console.log("Classes:", this.get('classes'));
    }
};
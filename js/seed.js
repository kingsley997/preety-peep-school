// js/seed.js
console.log("✅ seed.js loaded successfully!");

const Seed = {
    // FIX: Added the exact same local date function to prevent timezone mismatches
    getLocalDateStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    generate() {
        const classes = [
            { id: 'creche', name: 'Creche', fee: 150 }, 
            { id: 'nursery1', name: 'Nursery 1', fee: 150 },
            { id: 'nursery2', name: 'Nursery 2', fee: 200 },
            { id: 'kg1', name: 'KG 1', fee: 200 },
            { id: 'kg2', name: 'KG 2', fee: 200 },
            { id: 'basic1', name: 'Basic 1', fee: 250 },
            { id: 'basic2', name: 'Basic 2', fee: 250 },
            { id: 'basic3', name: 'Basic 3', fee: 250 },
            { id: 'basic4', name: 'Basic 4', fee: 300 },
            { id: 'basic5', name: 'Basic 5', fee: 300 },
            { id: 'basic6', name: 'Basic 6', fee: 300 },
            { id: 'jhs1', name: 'JHS 1', fee: 300 },
            { id: 'jhs2', name: 'JHS 2', fee: 300 },
            { id: 'jhs3', name: 'JHS 3', fee: 300 }
        ];

        const firstNames = ['Kwame', 'Kofi', 'Kwesi', 'Yaw', 'Kweku', 'Ama', 'Abena', 'Akua', 'Yaa', 'Esi', 'Adwoa', 'Efua', 'Nana', 'Kojo', 'Ato'];
        const lastNames = ['Mensah', 'Owusu', 'Asante', 'Boateng', 'Osei', 'Appiah', 'Acheampong', 'Tetteh', 'Quaye', 'Adjei', 'Mensah-Bonsu', 'Darko', 'Frimpong', 'Addo'];

        classes.forEach(cls => {
            cls.students = [];
            const studentCount = Math.floor(Math.random() * 16) + 15; 
            
            for (let i = 0; i < studentCount; i++) {
                const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                
                cls.students.push({
                    id: `${cls.id}_s${i + 1}`,
                    name: `${firstName} ${lastName}`,
                    guardian: `Mr/Mrs ${lastName}`,
                    phone: `024${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
                    notes: ''
                });
            }
        });

        Store.set('classes', classes);
        
        // FIX: Use local date instead of UTC so it perfectly matches logic.js
        const today = this.getLocalDateStr(); 
        
        const roster = classes.map(cls => ({
            classId: cls.id,
            className: cls.name,
            fee: cls.fee,
            students: cls.students.map(s => ({
                ...s,
                status: 'unpaid', 
                time: null
            }))
        }));
        
        Store.set(`roster_${today}`, roster);
        console.log("✅ Database seeded with classes and students for local date:", today);
    }
};
// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ App starting...");
    
    const splashContainer = document.getElementById('splash-container');
    const mainApp = document.getElementById('app');

    // Timing settings
    const SCHOOL_DISPLAY_TIME = 1500; 
    const ALPHA_DISPLAY_TIME = 1500;  
    const FADE_SPEED = 500;           

    setTimeout(() => {
        if (splashContainer) splashContainer.style.backgroundColor = '#0B1120'; 

        setTimeout(() => {
            setTimeout(() => {
                // FORCEFULLY HIDE SPLASH SCREEN SO IT CAN'T BLOCK CLICKS
                if (splashContainer) {
                    splashContainer.style.display = 'none';
                    splashContainer.style.pointerEvents = 'none'; // Double insurance
                    splashContainer.style.zIndex = '-1'; // Push it to the very back
                }
                
                // SHOW MAIN APP
                if (mainApp) {
                    mainApp.style.display = 'block';
                }
                
                console.log("✅ Splash screen destroyed. App is fully clickable.");
                
                // Initialize Database and UI
                if (typeof Store !== 'undefined') Store.init();
                if (typeof UI !== 'undefined') UI.init();
                
            }, FADE_SPEED);
        }, ALPHA_DISPLAY_TIME);
    }, SCHOOL_DISPLAY_TIME);
});
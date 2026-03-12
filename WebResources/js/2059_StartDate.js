function effectiveDateHandler() {
    let listenerAttached = false;
    let maxAttempts = 5;
    let attempts = 0;

    const checkDate = () => {
        // Logic to handle date if needed
        if (!listenerAttached && attempts < maxAttempts) {
            // Attach listener
            listenerAttached = true;
            attempts++;
            // Example of retry logic
            setTimeout(checkDate, 1000);
        } else if (listenerAttached) {
            console.log('Listener already attached.');
        } else {
            console.error('Max attempts reached. Halting retry.');
        }
    };

    checkDate();
}

function autoFormatHandler() {
    // Existing autoFormatHandler function body
}

function formatDate(date) {
    // Existing formatDate function body
}
